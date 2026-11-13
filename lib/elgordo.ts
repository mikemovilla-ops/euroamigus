import { CATEGORIAS } from "@/lib/euromillones";
import { aDate } from "@/lib/fechas";
import type { SorteoFuente } from "@/lib/fdj";

// Fuente principal de resultados: elgordo.com (web española de venta de
// lotería). Cada sorteo tiene su página, p. ej.
// https://www.elgordo.com/es/resultados/euromillones--2026-11-10-martes
// con la combinación, el escrutinio de ESPAÑA (premios exactos al céntimo,
// que difieren en algún céntimo de los de otros países) y el código ganador
// de El Millón en España. No hay API: se lee el HTML como texto.

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function urlElGordo(fecha: string): string {
  return `https://www.elgordo.com/es/resultados/euromillones--${fecha}-${DIAS[aDate(fecha).getUTCDay()]}`;
}

export type SorteoElGordo = SorteoFuente & { millon: string[] };

const aCent = (txt: string) => Math.round(Number(txt.replace(/\./g, "").replace(",", ".")) * 100);
const aEntero = (txt: string) => Number(txt.replace(/\./g, ""));

// Texto plano de la página: sin etiquetas, comentarios ni espacios repetidos.
function aTexto(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

// Devuelve el sorteo de `fecha` o null si la página no es de esa fecha (si
// el sorteo no existe, la web enseña otro) o le falta algo.
export function parsearElGordo(html: string, fecha: string): SorteoElGordo | null {
  const texto = aTexto(html);
  const [a, m, d] = fecha.split("-").map(Number);
  const cabecera = `${DIAS[aDate(fecha).getUTCDay()]}, ${d} ${MESES[m - 1]} ${a}`;
  const i = texto.indexOf(cabecera);
  if (i < 0) return null;

  // Tras la fecha: 5 números, 2 estrellas y la tabla "Categoría Ganadores Premio".
  const bloque = texto.slice(i + cabecera.length, i + cabecera.length + 1500);
  const comb = bloque.match(/^\s*((?:\d{1,2}\s+){7})Categoría/);
  if (!comb) return null;
  const nums = comb[1].trim().split(/\s+/).map(Number);
  const numeros = nums.slice(0, 5).sort((x, y) => x - y);
  const estrellas = nums.slice(5, 7).sort((x, y) => x - y);
  if (numeros.some((n) => n < 1 || n > 50) || estrellas.some((n) => n < 1 || n > 12)) return null;

  const filas = new Map<string, { ganadores: number; premioCent: number }>();
  for (const f of bloque.matchAll(/(\d)\+(\d)\s+([\d.]+)\s+([\d.]+,\d{2})\s*€/g)) {
    filas.set(`${f[1]}+${f[2]}`, { ganadores: aEntero(f[3]), premioCent: aCent(f[4]) });
  }
  if (!CATEGORIAS.every(({ n, e }) => filas.has(`${n}+${e}`))) return null;

  // "El Millón en España: HJL 03816" (puede haber más de un código).
  const tramoMillon = bloque.match(/El Millón en España:\s*(.*?)(?:Recaudación|Bote|$)/);
  const millon = Array.from(tramoMillon?.[1].matchAll(/([A-Z]{3})\s?(\d{5})/g) ?? [], (c) => c[1] + c[2]);

  return {
    fecha,
    numeros,
    estrellas,
    premios: CATEGORIAS.map(({ n, e }) => ({ n, e, ...filas.get(`${n}+${e}`)! })),
    millon,
  };
}
