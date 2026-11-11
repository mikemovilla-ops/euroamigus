import { prisma } from "@/lib/prisma";
import { aDate, aIso, sorteoCelebrado, sorteosDeSemana } from "@/lib/fechas";
import type { PremioCategoria } from "@/lib/euromillones";
import { avisarPremioSorteo } from "@/lib/avisos";
import { parsearCsvFdj, URL_FDJ, type SorteoFuente } from "@/lib/fdj";
import { primerArchivoDelZip } from "@/lib/zip";

// Dos fuentes de resultados (la web oficial de Loterías bloquea las
// peticiones desde servidores):
// 1. API pública pedromealha: importes EXACTOS (fuente "api"). Es gratuita y
//    a veces corta con 429 "demasiadas peticiones" durante horas.
// 2. Histórico oficial de la FDJ francesa: siempre disponible, pero redondea
//    los premios hacia abajo a 0,10 € (fuente "fdj" = importe aproximado).
// Si solo se ha podido sacar de la FDJ, en cada sincronización se vuelve a
// intentar la API para cambiar los importes por los exactos (sin repetir el
// aviso de premio). Los metidos a mano por el admin ("manual") no se tocan.
const API = "https://euromillions.api.pedromealha.dev/v1/draws";

// Para no machacar las fuentes en cada visita: como mucho una vez cada
// 15 min (salvo que se fuerce desde el botón de admin o el cron).
const ESPERA_MS = 15 * 60 * 1000;

type SorteoApi = {
  date: string;
  numbers: string[];
  stars: string[];
  prizes: { matched_numbers: number; matched_stars: number; prize: number; winners: number }[];
};

export function convertirSorteoApi(s: SorteoApi): SorteoFuente {
  return {
    fecha: s.date,
    numeros: s.numbers.map(Number).sort((a, b) => a - b),
    estrellas: s.stars.map(Number).sort((a, b) => a - b),
    premios: s.prizes.map<PremioCategoria>((p) => ({
      n: p.matched_numbers,
      e: p.matched_stars,
      premioCent: Math.round(p.prize * 100),
      ganadores: p.winners,
    })),
  };
}

const completo = (s: SorteoFuente) => s.numeros.length === 5 && s.estrellas.length === 2 && s.premios.length > 0;

async function deLaApi(fechas: string[]): Promise<Map<string, SorteoFuente>> {
  const out = new Map<string, SorteoFuente>();
  for (const año of Array.from(new Set(fechas.map((f) => f.slice(0, 4))))) {
    const res = await fetch(`${API}?year=${año}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`API principal: respondió ${res.status}`);
    for (const s of (await res.json()) as SorteoApi[]) {
      if (fechas.includes(s.date)) {
        const c = convertirSorteoApi(s);
        if (completo(c)) out.set(c.fecha, c);
      }
    }
  }
  return out;
}

async function deLaFdj(fechas: string[]): Promise<Map<string, SorteoFuente>> {
  const res = await fetch(URL_FDJ, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`FDJ: respondió ${res.status}`);
  const { datos } = primerArchivoDelZip(Buffer.from(await res.arrayBuffer()));
  return new Map(
    parsearCsvFdj(datos.toString("latin1"))
      .filter((s) => fechas.includes(s.fecha) && completo(s))
      .map((s) => [s.fecha, s])
  );
}

// Sorteos ya celebrados de semanas echadas: los que faltan y los que solo
// tenemos con importe aproximado de la FDJ.
async function fechasPorActualizar(): Promise<{ faltan: string[]; aproximados: string[] }> {
  const jugadas = await prisma.jugada.findMany({ where: { echada: true }, select: { semana: true } });
  const fechas = jugadas.flatMap((j) => sorteosDeSemana(aIso(j.semana))).filter((f) => sorteoCelebrado(f));
  if (fechas.length === 0) return { faltan: [], aproximados: [] };
  const guardados = await prisma.sorteo.findMany({
    where: { fecha: { in: fechas.map(aDate) } },
    select: { fecha: true, fuente: true },
  });
  const fuente = new Map(guardados.map((s) => [aIso(s.fecha), s.fuente]));
  return {
    faltan: fechas.filter((f) => !fuente.has(f)),
    aproximados: fechas.filter((f) => fuente.get(f) === "fdj"),
  };
}

export type ResultadoSync = { pendientes: number; guardados: number; aproximados: number; error?: string };

export async function sincronizarSorteos({ forzar = false } = {}): Promise<ResultadoSync> {
  const { faltan, aproximados } = await fechasPorActualizar();
  if (faltan.length === 0 && aproximados.length === 0) return { pendientes: 0, guardados: 0, aproximados: 0 };

  const config = await prisma.config.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (!forzar && config.ultimaSync && Date.now() - config.ultimaSync.getTime() < ESPERA_MS) {
    return { pendientes: faltan.length, guardados: 0, aproximados: aproximados.length };
  }
  await prisma.config.update({ where: { id: 1 }, data: { ultimaSync: new Date() } });

  const errores: string[] = [];
  let exactos = new Map<string, SorteoFuente>();
  try {
    exactos = await deLaApi([...faltan, ...aproximados]);
  } catch (e) {
    errores.push((e as Error).message);
  }

  // Los que la API no ha dado y aún no tenemos: de la FDJ.
  const sinApi = faltan.filter((f) => !exactos.has(f));
  let deReserva = new Map<string, SorteoFuente>();
  if (sinApi.length > 0) {
    try {
      deReserva = await deLaFdj(sinApi);
    } catch (e) {
      errores.push((e as Error).message);
    }
  }

  let guardados = 0;
  let guardadosFdj = 0;
  for (const fecha of faltan) {
    const s = exactos.get(fecha) ?? deReserva.get(fecha);
    if (!s) continue;
    const fuente = exactos.has(fecha) ? "api" : "fdj";
    // create (no upsert): si dos visitas sincronizan a la vez, solo una lo
    // guarda, y así el aviso de premio no sale dos veces.
    try {
      await prisma.sorteo.create({
        data: { fecha: aDate(fecha), numeros: s.numeros, estrellas: s.estrellas, premios: s.premios, fuente },
      });
    } catch {
      continue;
    }
    guardados++;
    if (fuente === "fdj") guardadosFdj++;
    await avisarPremioSorteo(fecha);
  }

  // Importes aproximados de la FDJ → exactos, sin volver a avisar.
  let corregidos = 0;
  for (const fecha of aproximados) {
    const s = exactos.get(fecha);
    if (!s) continue;
    await prisma.sorteo.updateMany({
      where: { fecha: aDate(fecha), fuente: "fdj" },
      data: { numeros: s.numeros, estrellas: s.estrellas, premios: s.premios, fuente: "api" },
    });
    corregidos++;
  }

  const pendientes = faltan.length - guardados;
  return {
    pendientes,
    guardados,
    aproximados: aproximados.length - corregidos + guardadosFdj,
    // Solo es un error de verdad si ha quedado algo sin resultado.
    ...(pendientes > 0 && errores.length ? { error: errores.join(" · ") } : {}),
  };
}
