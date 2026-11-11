import { prisma } from "@/lib/prisma";
import { aDate, aIso, sorteoCelebrado, sorteosDeSemana } from "@/lib/fechas";
import type { PremioCategoria } from "@/lib/euromillones";
import { avisarPremioSorteo } from "@/lib/avisos";

// API pública y gratuita con resultados y premios por categoría del
// Euromillones (los premios son comunes a todos los países en euros).
// La web oficial de Loterías bloquea las peticiones desde servidores.
const API = "https://euromillions.api.pedromealha.dev/v1/draws";

// La API corta si se le pide mucho seguido: como mucho una vez cada 15 min
// (salvo que se fuerce desde el botón de admin o el cron).
const ESPERA_MS = 15 * 60 * 1000;

type SorteoApi = {
  date: string;
  numbers: string[];
  stars: string[];
  prizes: { matched_numbers: number; matched_stars: number; prize: number; winners: number }[];
};

export function convertirSorteoApi(s: SorteoApi) {
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

// Fechas de sorteo ya celebrados de semanas echadas que aún no tienen
// resultado guardado.
async function fechasPendientes(): Promise<string[]> {
  const jugadas = await prisma.jugada.findMany({ where: { echada: true }, select: { semana: true } });
  const fechas = jugadas.flatMap((j) => sorteosDeSemana(aIso(j.semana))).filter((f) => sorteoCelebrado(f));
  if (fechas.length === 0) return [];
  const guardados = await prisma.sorteo.findMany({
    where: { fecha: { in: fechas.map(aDate) } },
    select: { fecha: true },
  });
  const ya = new Set(guardados.map((s) => aIso(s.fecha)));
  return fechas.filter((f) => !ya.has(f));
}

export type ResultadoSync = { pendientes: number; guardados: number; error?: string };

export async function sincronizarSorteos({ forzar = false } = {}): Promise<ResultadoSync> {
  const pendientes = await fechasPendientes();
  if (pendientes.length === 0) return { pendientes: 0, guardados: 0 };

  const config = await prisma.config.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (!forzar && config.ultimaSync && Date.now() - config.ultimaSync.getTime() < ESPERA_MS) {
    return { pendientes: pendientes.length, guardados: 0 };
  }
  await prisma.config.update({ where: { id: 1 }, data: { ultimaSync: new Date() } });

  const años = Array.from(new Set(pendientes.map((f) => f.slice(0, 4))));
  let guardados = 0;
  try {
    for (const año of años) {
      const res = await fetch(`${API}?year=${año}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`La API de resultados respondió ${res.status}`);
      const datos = (await res.json()) as SorteoApi[];
      for (const s of datos) {
        if (!pendientes.includes(s.date)) continue;
        const c = convertirSorteoApi(s);
        // Si aún no han publicado los premios, mejor esperar a la próxima.
        if (c.numeros.length !== 5 || c.estrellas.length !== 2 || c.premios.length === 0) continue;
        // create (no upsert): si dos visitas sincronizan a la vez, solo una
        // lo guarda, y así el aviso de premio no sale dos veces.
        try {
          await prisma.sorteo.create({
            data: { fecha: aDate(c.fecha), numeros: c.numeros, estrellas: c.estrellas, premios: c.premios, fuente: "api" },
          });
        } catch {
          continue;
        }
        guardados++;
        await avisarPremioSorteo(c.fecha);
      }
    }
    return { pendientes: pendientes.length - guardados, guardados };
  } catch (e) {
    return { pendientes: pendientes.length - guardados, guardados, error: (e as Error).message };
  }
}
