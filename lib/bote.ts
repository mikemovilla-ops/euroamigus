import { prisma } from "@/lib/prisma";
import { aDate, aIso, hoyMadrid, horaMadrid, sumarDias } from "@/lib/fechas";
import { aTexto, primeraFechaSorteo } from "@/lib/elgordo";

// Bote del próximo sorteo del Euromillones. OJO: aunque el bote es común,
// cada país anuncia su propia ESTIMACIÓN (p. ej. para el 20/11/2026 España y
// Francia decían 37 M€ e Irlanda 40 M€), así que se usa la de España.
// Fuentes, por orden:
// 1. elgordo.com (España): la página del último resultado dice
//    "Próximo bote 37.000.000,00 €"; el sorteo es el siguiente martes o
//    viernes después de ese resultado.
// 2. FDJ francesa (coincide con España): "Jackpot EuroMillions de 37 M€".
// 3. Lotería irlandesa, solo si fallan las otras (su estimación puede ser
//    distinta): __NEXT_DATA__ → props.pageProps.dbgConfig.jackpotInfo.
// Se guarda en Config y se refresca en la tarea diaria y, como mucho cada
// 3 h, al abrir la portada.

export const URL_ELGORDO_ULTIMO = "https://www.elgordo.com/es/resultados/euromillones";
export const URL_IRLANDA = "https://www.lottery.ie/draw-games/euromillions";
export const URL_FDJ_EUROMILLIONS = "https://www.fdj.fr/jeux-de-tirage/euromillions-my-million";
const ESPERA_MS = 3 * 60 * 60 * 1000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// El bote del Euromillones va de 17 M€ (mínimo garantizado) a 250 M€ (tope):
// fuera de eso, el dato leído no es el que buscamos.
const MIN_CENT = 10_000_000_00;
const MAX_CENT = 300_000_000_00;
const razonable = (cent: number) => cent >= MIN_CENT && cent <= MAX_CENT;

export type Bote = { cent: number; sorteo: string | null }; // sorteo: YYYY-MM-DD

// Próximo sorteo (martes o viernes) desde `ahora`, en hora de Madrid. El del
// mismo día cuenta hasta las 21:00, que es cuando se sortea.
export function proximoSorteo(ahora: Date = new Date()): string {
  const hoy = hoyMadrid(ahora);
  for (let i = 0; i < 8; i++) {
    const f = sumarDias(hoy, i);
    const dia = aDate(f).getUTCDay();
    if ((dia === 2 || dia === 5) && (i > 0 || horaMadrid(ahora) < 21)) return f;
  }
  return hoy;
}

// Siguiente sorteo (martes o viernes) estrictamente después de `fecha`.
export function sorteoSiguienteA(fecha: string): string {
  for (let i = 1; i <= 7; i++) {
    const f = sumarDias(fecha, i);
    const dia = aDate(f).getUTCDay();
    if (dia === 2 || dia === 5) return f;
  }
  return sumarDias(fecha, 3);
}

export function parsearBoteElGordo(html: string): Bote | null {
  const texto = aTexto(html);
  const ultimo = primeraFechaSorteo(texto);
  const m = texto.match(/Próximo bote\s*([\d.]+,\d{2})\s*€/);
  if (!ultimo || !m) return null;
  const cent = Math.round(Number(m[1].replace(/\./g, "").replace(",", ".")) * 100);
  return razonable(cent) ? { cent, sorteo: sorteoSiguienteA(ultimo) } : null;
}

const enMadrid = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(iso));

export function parsearBoteIrlanda(html: string): Bote | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let datos: unknown;
  try {
    datos = JSON.parse(m[1]);
  } catch {
    return null;
  }
  const info = (datos as { props?: { pageProps?: { dbgConfig?: { jackpotInfo?: unknown } } } })?.props?.pageProps?.dbgConfig?.jackpotInfo;
  if (!Array.isArray(info)) return null;
  const candidatos = info
    .filter((x): x is { nextDrawDate: string; amount: number } => typeof x?.amount === "number" && typeof x?.nextDrawDate === "string")
    .filter((x) => razonable(x.amount))
    .sort((a, b) => a.nextDrawDate.localeCompare(b.nextDrawDate));
  if (!candidatos.length) return null;
  return { cent: candidatos[0].amount, sorteo: enMadrid(candidatos[0].nextDrawDate) };
}

export function parsearBoteFdj(html: string): Bote | null {
  // "Jackpot EuroMillions de 17  M€" / "de 130 M€" / "de 17,5 M€"
  const m = html.match(/Jackpot EuroMillions de\s*([\d\s.,]+?)\s*M(?:€|&euro;)/i);
  if (!m) return null;
  const millones = Number(m[1].replace(/\s/g, "").replace(",", "."));
  const cent = Math.round(millones * 1_000_000 * 100);
  return razonable(cent) ? { cent, sorteo: null } : null;
}

async function descargar(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store", headers: { "user-agent": UA }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} respondió ${res.status}`);
  return res.text();
}

export async function obtenerBote(): Promise<Bote & { fuente: string }> {
  const errores: string[] = [];
  const proximo = proximoSorteo();
  try {
    const b = parsearBoteElGordo(await descargar(URL_ELGORDO_ULTIMO));
    // Si la web aún no ha publicado el último sorteo, su "próximo bote" es
    // el de un sorteo ya pasado: no vale.
    if (b && b.sorteo! >= proximo) return { ...b, fuente: "elgordo.com" };
    errores.push(b ? "elgordo.com: aún no ha publicado el último sorteo" : "elgordo.com: no se encuentra el bote en la página");
  } catch (e) {
    errores.push((e as Error).message);
  }
  try {
    const b = parsearBoteFdj(await descargar(URL_FDJ_EUROMILLIONS));
    if (b) return { ...b, sorteo: proximo, fuente: "FDJ" };
    errores.push("FDJ: no se encuentra el bote en la página");
  } catch (e) {
    errores.push((e as Error).message);
  }
  try {
    const b = parsearBoteIrlanda(await descargar(URL_IRLANDA));
    if (b) return { ...b, fuente: "Irlanda (estimación irlandesa)" };
    errores.push("Irlanda: no se encuentra el bote en la página");
  } catch (e) {
    errores.push((e as Error).message);
  }
  throw new Error(`No se ha podido leer el bote (${errores.join(" · ")})`);
}

// Refresca el bote guardado. Devuelve una línea para el registro del cron.
export async function actualizarBote({ forzar = false } = {}): Promise<string> {
  const config = await prisma.config.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (!forzar && config.boteActualizado && Date.now() - config.boteActualizado.getTime() < ESPERA_MS) {
    return "Bote: actualizado hace poco";
  }
  try {
    const b = await obtenerBote();
    await prisma.config.update({
      where: { id: 1 },
      // BigInt: 250 M€ en céntimos no cabe en un Int de 32 bits.
      data: { boteCent: BigInt(b.cent), boteSorteo: b.sorteo ? aDate(b.sorteo) : null, boteActualizado: new Date() },
    });
    return `Bote: ${formatearBote(b.cent)} para el ${b.sorteo ?? "próximo sorteo"} (${b.fuente})`;
  } catch (e) {
    // Aunque falle, se apunta la hora para no reintentar en cada visita.
    await prisma.config.update({ where: { id: 1 }, data: { boteActualizado: new Date() } });
    throw e;
  }
}

// "17 millones €", "141,9 millones €"
export function formatearBote(cent: number): string {
  const millones = cent / 100 / 1_000_000;
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(millones)} millones €`;
}

// Bote guardado, solo si es del próximo sorteo (si ya se ha celebrado y no
// se ha podido refrescar, mejor no enseñar un dato viejo).
export async function boteGuardado(ahora: Date = new Date()): Promise<Bote | null> {
  const c = await prisma.config.findUnique({ where: { id: 1 }, select: { boteCent: true, boteSorteo: true } });
  if (!c?.boteCent || !c.boteSorteo) return null;
  const sorteo = aIso(c.boteSorteo);
  return sorteo >= proximoSorteo(ahora) ? { cent: Number(c.boteCent), sorteo } : null;
}
