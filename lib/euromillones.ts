// Lógica pura del Euromillones y El Millón: validar apuestas y códigos,
// contar aciertos, calcular premios (en bruto) y los totales de bote y
// balance. Sin Prisma ni red, para poder testearla.

export type Combinacion = { numeros: number[]; estrellas: number[] };
export type PremioCategoria = { n: number; e: number; premioCent: number; ganadores: number };
export type SorteoDatos = Combinacion & { fecha: string; premios: PremioCategoria[] };

export const PRECIO_APUESTA_CENT = 250;

// Las 13 categorías con premio, de mayor a menor.
export const CATEGORIAS: { n: number; e: number }[] = [
  { n: 5, e: 2 }, { n: 5, e: 1 }, { n: 5, e: 0 }, { n: 4, e: 2 }, { n: 4, e: 1 },
  { n: 3, e: 2 }, { n: 4, e: 0 }, { n: 2, e: 2 }, { n: 3, e: 1 }, { n: 3, e: 0 },
  { n: 1, e: 2 }, { n: 2, e: 1 }, { n: 2, e: 0 },
];

export function validarApuesta(a: Combinacion): string | null {
  const ok = (xs: number[], cuantos: number, max: number) =>
    xs.length === cuantos &&
    new Set(xs).size === cuantos &&
    xs.every((x) => Number.isInteger(x) && x >= 1 && x <= max);
  if (!ok(a.numeros, 5, 50)) return "Hacen falta 5 números distintos del 1 al 50.";
  if (!ok(a.estrellas, 2, 12)) return "Hacen falta 2 estrellas distintas del 1 al 12.";
  return null;
}

export function ordenar(a: Combinacion): Combinacion {
  return {
    numeros: [...a.numeros].sort((x, y) => x - y),
    estrellas: [...a.estrellas].sort((x, y) => x - y),
  };
}

// ---------- El Millón ----------
// Sorteo exclusivo de España asociado al Euromillones: el boleto lleva un
// código (3 letras + 5 números, p. ej. "ABC12345") por sorteo. El código
// ganador no viene en la API: lo mete el admin a mano.

export const PREMIO_MILLON_CENT = 1_000_000_00;

// Acepta uno o varios códigos escritos como sea ("abc 12345, XYZ-67890")
// y devuelve los válidos normalizados, o null si sobra algo que no encaja.
export function parsearCodigos(texto: string): string[] | null {
  const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const codigos = limpio.match(/[A-Z]{3}\d{5}/g) ?? [];
  if (codigos.join("") !== limpio) return null;
  return Array.from(new Set(codigos));
}

export type ResultadoMillon = {
  codigos: string[]; // los nuestros
  ganadores: string[] | null; // null = el admin aún no lo ha metido
  premiados: string[];
  premioCent: number;
};

export function comprobarMillon(codigos: string[], ganadores: string[] | null): ResultadoMillon {
  const premiados = ganadores ? codigos.filter((c) => ganadores.includes(c)) : [];
  return { codigos, ganadores, premiados, premioCent: premiados.length * PREMIO_MILLON_CENT };
}

// ---------- Euromillones ----------
// Los premios se muestran siempre en bruto (sin la retención de Hacienda).

export type ResultadoApuesta = {
  aciertosNumeros: number[];
  aciertosEstrellas: number[];
  categoria: string | null; // "4 + 1★" si tiene premio
  premioCent: number;
};

export function comprobarApuesta(apuesta: Combinacion, sorteo: SorteoDatos): ResultadoApuesta {
  const aciertosNumeros = apuesta.numeros.filter((x) => sorteo.numeros.includes(x));
  const aciertosEstrellas = apuesta.estrellas.filter((x) => sorteo.estrellas.includes(x));
  const n = aciertosNumeros.length;
  const e = aciertosEstrellas.length;
  const premio = sorteo.premios.find((p) => p.n === n && p.e === e);
  const premioCent = premio?.premioCent ?? 0;
  return {
    aciertosNumeros,
    aciertosEstrellas,
    categoria: premioCent > 0 ? `${n} + ${e}★` : null,
    premioCent,
  };
}

export type JugadaParaCalculo = {
  semana: string;
  echada: boolean;
  importeCent: number;
  apuestas: Combinacion[];
  millon: string[][]; // códigos de El Millón, uno por fecha de `fechasSorteo` (mismo orden)
};

export type ResultadoSorteoJugada = {
  fecha: string;
  sorteo: SorteoDatos | null;
  apuestas: ResultadoApuesta[] | null;
  millon: ResultadoMillon;
};

export type ResultadoJugada = {
  porSorteo: ResultadoSorteoJugada[];
  premioCent: number;
  pendiente: boolean; // algún sorteo celebrado sin resultado todavía
  millonPendiente: boolean; // algún sorteo celebrado sin código ganador de El Millón
};

export function calcularJugada(
  jugada: JugadaParaCalculo,
  fechasSorteo: string[],
  sorteos: Map<string, SorteoDatos>,
  ganadoresMillon: Map<string, string[]>,
  celebrado: (fecha: string) => boolean
): ResultadoJugada {
  let premioCent = 0;
  let pendiente = false;
  let millonPendiente = false;
  const porSorteo = fechasSorteo.map<ResultadoSorteoJugada>((fecha, i) => {
    const sorteo = sorteos.get(fecha) ?? null;
    const millon = comprobarMillon(jugada.millon[i] ?? [], ganadoresMillon.get(fecha) ?? null);
    if (!jugada.echada) return { fecha, sorteo, apuestas: null, millon };

    if (celebrado(fecha) && !millon.ganadores && millon.codigos.length > 0) millonPendiente = true;
    premioCent += millon.premioCent;
    if (!sorteo) {
      if (celebrado(fecha)) pendiente = true;
      return { fecha, sorteo, apuestas: null, millon };
    }
    const apuestas = jugada.apuestas.map((a) => comprobarApuesta(a, sorteo));
    premioCent += apuestas.reduce((s, r) => s + r.premioCent, 0);
    return { fecha, sorteo, apuestas, millon };
  });
  return { porSorteo, premioCent, pendiente, millonPendiente };
}

export type TipoMov = "INGRESO" | "RETIRADA" | "GASTO" | "TRASPASO";

export type MovimientoCalculo = {
  tipo: TipoMov;
  importeCent: number;
  miembroId: string; // quién tiene / reparte / paga / pasa el dinero
  destinoId?: string | null; // solo TRASPASO: a quién se lo pasa
};

// Efecto de un movimiento en el bote total (los traspasos no lo cambian).
export function efectoEnBote(m: MovimientoCalculo): number {
  if (m.tipo === "INGRESO") return m.importeCent;
  if (m.tipo === "TRASPASO") return 0;
  return -m.importeCent;
}

// Quién tiene el dinero del bote: el premio de cada semana lo tiene quien
// echó el boleto (tiene el resguardo y lo cobra); luego los movimientos lo
// suman, restan o pasan de uno a otro. La suma de todos = bote del grupo.
export function calcularTenencia(
  jugadas: { echada: boolean; premioCent: number; titularId: string }[],
  movimientos: MovimientoCalculo[],
  premiosHistoricos: { miembroId: string; importeCent: number }[] = []
): Map<string, number> {
  const t = new Map<string, number>();
  const sumar = (id: string, cent: number) => t.set(id, (t.get(id) ?? 0) + cent);
  for (const j of jugadas) if (j.echada && j.premioCent > 0) sumar(j.titularId, j.premioCent);
  for (const p of premiosHistoricos) sumar(p.miembroId, p.importeCent);
  for (const m of movimientos) {
    if (m.tipo === "TRASPASO") {
      sumar(m.miembroId, -m.importeCent);
      if (m.destinoId) sumar(m.destinoId, m.importeCent);
    } else {
      sumar(m.miembroId, efectoEnBote(m));
    }
  }
  return t;
}

export type Totales = {
  premiosCent: number;
  gastadoCent: number;
  balanceCent: number; // premios − gastado
  boteCent: number; // premios + ingresos − retiradas − gastos del bote
  semanasJugadas: number;
};

// Lo de antes de usar la app: premios importados y lo jugado entonces.
export type Historico = { premiosCent: number; gastadoCent: number; semanas: number };
const SIN_HISTORICO: Historico = { premiosCent: 0, gastadoCent: 0, semanas: 0 };

export function calcularTotales(
  jugadas: { echada: boolean; importeCent: number; premioCent: number }[],
  movimientos: MovimientoCalculo[],
  historico: Historico = SIN_HISTORICO
): Totales {
  const echadas = jugadas.filter((j) => j.echada);
  const premiosCent = echadas.reduce((s, j) => s + j.premioCent, 0) + historico.premiosCent;
  const gastadoCent = echadas.reduce((s, j) => s + j.importeCent, 0) + historico.gastadoCent;
  const ajusteBote = movimientos.reduce((s, m) => s + efectoEnBote(m), 0);
  return {
    premiosCent,
    gastadoCent,
    balanceCent: premiosCent - gastadoCent,
    boteCent: premiosCent + ajusteBote,
    semanasJugadas: echadas.length + historico.semanas,
  };
}

export function euros(cent: number, conSigno = false): string {
  const txt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cent / 100);
  return conSigno && cent > 0 ? `+${txt}` : txt;
}
