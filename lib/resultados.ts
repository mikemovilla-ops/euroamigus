import { prisma } from "@/lib/prisma";
import { aDate, aIso, sorteoCelebrado, sorteosDeSemana } from "@/lib/fechas";
import { avisarPremioMillon, avisarPremioSorteo } from "@/lib/avisos";
import { parsearCsvFdj, URL_FDJ, type SorteoFuente } from "@/lib/fdj";
import { parsearElGordo, urlElGordo, type SorteoElGordo } from "@/lib/elgordo";
import { primerArchivoDelZip } from "@/lib/zip";

// Fuentes de resultados (la web oficial de Loterías bloquea las peticiones
// desde servidores):
// 1. elgordo.com (fuente "elgordo"): premios EXACTOS de España y código
//    ganador de El Millón en España (que se guarda siempre, aunque el admin
//    hubiera metido otro a mano). Una página por sorteo.
// 2. Histórico oficial de la FDJ francesa (fuente "fdj"): siempre
//    disponible, pero redondea los premios hacia abajo a 0,10 €, así que es
//    solo de reserva y se marca como aproximado.
// Si un sorteo solo se ha podido sacar de la FDJ (o viene de la API
// portuguesa que se usaba antes, "api", que difería en algún céntimo), en
// cada sincronización se vuelve a intentar elgordo.com para dejar los
// importes exactos (sin repetir el aviso de premio). Los metidos a mano por
// el admin ("manual") no se tocan nunca.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const POR_MEJORAR = ["fdj", "api"];

// Para no machacar las fuentes en cada visita: como mucho una vez cada
// 15 min (salvo que se fuerce desde el botón de admin o el cron).
const ESPERA_MS = 15 * 60 * 1000;

const completo = (s: SorteoFuente) => s.numeros.length === 5 && s.estrellas.length === 2 && s.premios.length > 0;

async function deElGordo(fechas: string[]): Promise<{ sorteos: Map<string, SorteoElGordo>; errores: string[] }> {
  const sorteos = new Map<string, SorteoElGordo>();
  const errores: string[] = [];
  for (const fecha of fechas) {
    try {
      const res = await fetch(urlElGordo(fecha), { cache: "no-store", headers: { "user-agent": UA }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`respondió ${res.status}`);
      const s = parsearElGordo(await res.text(), fecha);
      // null = todavía no está publicado (la web enseña otro sorteo).
      if (s && completo(s)) sorteos.set(fecha, s);
    } catch (e) {
      errores.push(`elgordo.com ${fecha}: ${(e as Error).message}`);
    }
  }
  return { sorteos, errores };
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

// Sorteos ya celebrados de semanas echadas: los que faltan, los que tenemos
// con importes aproximados y los que no tienen aún código de El Millón.
async function fechasPorActualizar() {
  const jugadas = await prisma.jugada.findMany({ where: { echada: true }, select: { semana: true } });
  const fechas = jugadas.flatMap((j) => sorteosDeSemana(aIso(j.semana))).filter((f) => sorteoCelebrado(f));
  if (fechas.length === 0) return { faltan: [], aMejorar: [], sinMillon: [] };
  const [guardados, millones] = await Promise.all([
    prisma.sorteo.findMany({ where: { fecha: { in: fechas.map(aDate) } }, select: { fecha: true, fuente: true } }),
    prisma.millon.findMany({ where: { fecha: { in: fechas.map(aDate) } }, select: { fecha: true } }),
  ]);
  const fuente = new Map(guardados.map((s) => [aIso(s.fecha), s.fuente]));
  const conMillon = new Set(millones.map((m) => aIso(m.fecha)));
  return {
    faltan: fechas.filter((f) => !fuente.has(f)),
    aMejorar: fechas.filter((f) => POR_MEJORAR.includes(fuente.get(f) ?? "")),
    sinMillon: fechas.filter((f) => !conMillon.has(f)),
  };
}

export type ResultadoSync = { pendientes: number; guardados: number; aproximados: number; millon: number; error?: string };

export async function sincronizarSorteos({ forzar = false } = {}): Promise<ResultadoSync> {
  const { faltan, aMejorar, sinMillon } = await fechasPorActualizar();
  const consultar = Array.from(new Set([...faltan, ...aMejorar, ...sinMillon])).sort();
  if (consultar.length === 0) return { pendientes: 0, guardados: 0, aproximados: 0, millon: 0 };

  const config = await prisma.config.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (!forzar && config.ultimaSync && Date.now() - config.ultimaSync.getTime() < ESPERA_MS) {
    return { pendientes: faltan.length, guardados: 0, aproximados: aMejorar.length, millon: 0 };
  }
  await prisma.config.update({ where: { id: 1 }, data: { ultimaSync: new Date() } });

  const { sorteos: exactos, errores } = await deElGordo(consultar);

  // Los que elgordo.com no ha dado y aún no tenemos: de la FDJ.
  const sinExacto = faltan.filter((f) => !exactos.has(f));
  let deReserva = new Map<string, SorteoFuente>();
  if (sinExacto.length > 0) {
    try {
      deReserva = await deLaFdj(sinExacto);
    } catch (e) {
      errores.push((e as Error).message);
    }
  }

  // 1. Sorteos nuevos (con aviso de premio).
  let guardados = 0;
  let guardadosFdj = 0;
  for (const fecha of faltan) {
    const s = exactos.get(fecha) ?? deReserva.get(fecha);
    if (!s) continue;
    const fuente = exactos.has(fecha) ? "elgordo" : "fdj";
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

  // 2. Importes aproximados → exactos, sin volver a avisar.
  let corregidos = 0;
  for (const fecha of aMejorar) {
    const s = exactos.get(fecha);
    if (!s) continue;
    const r = await prisma.sorteo.updateMany({
      where: { fecha: aDate(fecha), fuente: { in: POR_MEJORAR } },
      data: { numeros: s.numeros, estrellas: s.estrellas, premios: s.premios, fuente: "elgordo" },
    });
    corregidos += r.count;
  }

  // 3. Código ganador de El Millón: siempre el oficial de España que da
  //    elgordo.com, también si el admin lo había metido a mano y no coincide.
  //    Se revisa en cada sorteo que se consulta (nuevo, por mejorar o sin
  //    Millón); el aviso solo sale si un código nuestro pasa a ser ganador.
  let millon = 0;
  for (const [fecha, s] of exactos) {
    if (s.millon.length === 0) continue;
    const antes = await prisma.millon.findUnique({ where: { fecha: aDate(fecha) } });
    const iguales = antes && antes.codigos.length === s.millon.length && s.millon.every((c) => antes.codigos.includes(c));
    if (iguales) continue;
    await prisma.millon.upsert({
      where: { fecha: aDate(fecha) },
      update: { codigos: s.millon },
      create: { fecha: aDate(fecha), codigos: s.millon },
    });
    millon++;
    await avisarPremioMillon(fecha, antes?.codigos ?? []);
  }

  const pendientes = faltan.length - guardados;
  return {
    pendientes,
    guardados,
    aproximados: aMejorar.length - corregidos + guardadosFdj,
    millon,
    // Solo es un error de verdad si ha quedado algo sin resultado.
    ...(pendientes > 0 && errores.length ? { error: errores.join(" · ") } : {}),
  };
}
