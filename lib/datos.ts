import { prisma } from "@/lib/prisma";
import { aIso, sorteoCelebrado, sorteosDeSemana } from "@/lib/fechas";
import {
  calcularJugada,
  calcularTenencia,
  calcularTotales,
  type PremioCategoria,
  type ResultadoJugada,
  type SorteoDatos,
  type Totales,
} from "@/lib/euromillones";

export type JugadaVista = {
  id: string;
  semana: string;
  responsable: { id: string; nombre: string };
  echada: boolean;
  echadaEn: string | null;
  echadaPor: { id: string; nombre: string } | null;
  fotoUrl: string | null;
  nota: string | null;
  importeCent: number;
  apuestas: { numeros: number[]; estrellas: number[]; fija: boolean }[];
  millon: [string[], string[]]; // códigos de El Millón [martes, viernes]
  resultado: ResultadoJugada;
};

// Carga todas las jugadas con sus resultados calculados y los totales de
// bote y balance. Para un grupo de 10 con una jugada por semana son unas
// 50 filas al año, así que se calcula todo al vuelo sin problema.
export type Tenencia = { miembro: { id: string; nombre: string }; cent: number }[];

export async function cargarJugadas(): Promise<{ jugadas: JugadaVista[]; totales: Totales; tenencia: Tenencia }> {
  const [filas, sorteosDb, movimientos, millonesDb, miembros, historicos, config] = await Promise.all([
    prisma.jugada.findMany({
      orderBy: { semana: "desc" },
      include: {
        responsable: { select: { id: true, nombre: true } },
        echadaPor: { select: { id: true, nombre: true } },
        apuestas: { orderBy: { fija: "desc" } },
      },
    }),
    prisma.sorteo.findMany(),
    prisma.movimiento.findMany({ select: { tipo: true, importeCent: true, miembroId: true, destinoId: true } }),
    prisma.millon.findMany(),
    prisma.miembro.findMany({ select: { id: true, nombre: true, activo: true }, orderBy: { orden: "asc" } }),
    prisma.premioHistorico.findMany({ select: { miembroId: true, importeCent: true } }),
    prisma.config.findUnique({ where: { id: 1 } }),
  ]);
  const historico = {
    premiosCent: historicos.reduce((s, p) => s + p.importeCent, 0),
    gastadoCent: config?.gastoHistoricoCent ?? 0,
    semanas: config?.semanasHistoricas ?? 0,
  };
  const ganadoresMillon = new Map(millonesDb.map((m) => [aIso(m.fecha), m.codigos]));

  const sorteos = new Map<string, SorteoDatos>(
    sorteosDb.map((s) => [
      aIso(s.fecha),
      { fecha: aIso(s.fecha), numeros: s.numeros, estrellas: s.estrellas, premios: s.premios as PremioCategoria[] },
    ])
  );

  const jugadas = filas.map<JugadaVista>((j) => {
    const semana = aIso(j.semana);
    const apuestas = j.apuestas.map((a) => ({ numeros: a.numeros, estrellas: a.estrellas, fija: a.fija }));
    return {
      id: j.id,
      semana,
      responsable: j.responsable,
      echada: j.echada,
      echadaEn: j.echadaEn?.toISOString() ?? null,
      echadaPor: j.echadaPor,
      fotoUrl: j.fotoUrl,
      nota: j.nota,
      importeCent: j.importeCent,
      apuestas,
      millon: [j.millonMartes, j.millonViernes],
      resultado: calcularJugada(
        { semana, echada: j.echada, importeCent: j.importeCent, apuestas, millon: [j.millonMartes, j.millonViernes] },
        sorteosDeSemana(semana),
        sorteos,
        ganadoresMillon,
        (f) => sorteoCelebrado(f)
      ),
    };
  });

  const totales = calcularTotales(
    jugadas.map((j) => ({ echada: j.echada, importeCent: j.importeCent, premioCent: j.resultado.premioCent })),
    movimientos,
    historico
  );

  const porMiembro = calcularTenencia(
    jugadas.map((j) => ({
      echada: j.echada,
      premioCent: j.resultado.premioCent,
      titularId: j.echadaPor?.id ?? j.responsable.id,
    })),
    movimientos,
    historicos
  );
  // Todos los activos (aunque tengan 0) y los inactivos que aún tengan algo.
  const tenencia = miembros
    .map((m) => ({ miembro: { id: m.id, nombre: m.nombre }, cent: porMiembro.get(m.id) ?? 0, activo: m.activo }))
    .filter((t) => t.activo || t.cent !== 0)
    .map(({ miembro, cent }) => ({ miembro, cent }))
    .sort((a, b) => b.cent - a.cent);

  return { jugadas, totales, tenencia };
}
