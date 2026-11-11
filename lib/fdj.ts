import { CATEGORIAS, type PremioCategoria } from "@/lib/euromillones";

// Resultados de reserva: el histórico oficial de la lotería francesa (FDJ),
// un ZIP con un CSV (separado por ";", decimales con coma, en latin1).
// Los "rangos" 1 a 13 de la FDJ van en el mismo orden que CATEGORIAS
// (5+2, 5+1, 5+0, 4+2, ...). OJO: la FDJ redondea los premios hacia abajo a
// múltiplos de 0,10 € (en España se cobra el importe exacto), así que estos
// importes son aproximados y se sustituyen en cuanto la API principal
// responde (ver lib/resultados.ts).
export const URL_FDJ =
  "https://www.sto.api.fdj.fr/anonymous/service-draw-info/v3/documentations/1a2b3c4d-9876-4562-b3fc-2c963f66afe6";

export type SorteoFuente = {
  fecha: string; // YYYY-MM-DD
  numeros: number[];
  estrellas: number[];
  premios: PremioCategoria[];
};

const aCent = (txt: string | undefined) => Math.round(Number((txt ?? "0").replace(/\./g, "").replace(",", ".")) * 100) || 0;

export function parsearCsvFdj(csv: string): SorteoFuente[] {
  const lineas = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lineas.length < 2) return [];
  const cab = lineas[0].split(";");
  const col = (nombre: string) => {
    const i = cab.indexOf(nombre);
    if (i < 0) throw new Error(`CSV de la FDJ sin la columna ${nombre}`);
    return i;
  };
  const iFecha = col("date_de_tirage");
  const iBolas = [1, 2, 3, 4, 5].map((n) => col(`boule_${n}`));
  const iEstrellas = [1, 2].map((n) => col(`etoile_${n}`));
  const iPremio = CATEGORIAS.map((_, r) => col(`rapport_du_rang${r + 1}_Euro_Millions`));
  const iGanadores = CATEGORIAS.map((_, r) => col(`nombre_de_gagnant_au_rang${r + 1}_Euro_Millions_en_europe`));

  const sorteos: SorteoFuente[] = [];
  for (const linea of lineas.slice(1)) {
    const c = linea.split(";");
    const [d, m, a] = (c[iFecha] ?? "").split("/");
    if (!d || !m || !a) continue;
    const numeros = iBolas.map((i) => Number(c[i])).sort((x, y) => x - y);
    const estrellas = iEstrellas.map((i) => Number(c[i])).sort((x, y) => x - y);
    if (numeros.some((n) => !n) || estrellas.some((n) => !n)) continue;
    sorteos.push({
      fecha: `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
      numeros,
      estrellas,
      premios: CATEGORIAS.map(({ n, e }, r) => ({
        n,
        e,
        premioCent: aCent(c[iPremio[r]]),
        ganadores: Number(c[iGanadores[r]]) || 0,
      })),
    });
  }
  return sorteos;
}
