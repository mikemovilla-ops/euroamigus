import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorJson, requiereAdmin } from "@/lib/sesion";
import { CATEGORIAS, ordenar, validarApuesta, type PremioCategoria } from "@/lib/euromillones";
import { aDate, aIso } from "@/lib/fechas";
import { sincronizarSorteos } from "@/lib/resultados";

// Meter o corregir a mano un sorteo (por si la API falla o se equivoca).
export async function PUT(req: Request) {
  const r = await requiereAdmin();
  if (r.error) return r.error;

  const b = (await req.json()) as {
    fecha: string;
    numeros: number[];
    estrellas: number[];
    premios: { n: number; e: number; premioCent: number }[];
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.fecha ?? "")) return errorJson("Fecha incorrecta.");
  const dia = aDate(b.fecha).getUTCDay();
  if (dia !== 2 && dia !== 5) return errorJson("Los sorteos son martes y viernes.");
  const error = validarApuesta(b);
  if (error) return errorJson(error);

  const premios: PremioCategoria[] = CATEGORIAS.map(({ n, e }) => {
    const p = b.premios?.find((x) => x.n === n && x.e === e);
    return { n, e, premioCent: Math.max(0, Math.round(p?.premioCent ?? 0)), ganadores: 0 };
  });
  const c = ordenar(b);

  await prisma.sorteo.upsert({
    where: { fecha: aDate(b.fecha) },
    update: { numeros: c.numeros, estrellas: c.estrellas, premios, fuente: "manual" },
    create: { fecha: aDate(b.fecha), numeros: c.numeros, estrellas: c.estrellas, premios, fuente: "manual" },
  });
  return NextResponse.json({ ok: true });
}

// Devuelve un sorteo guardado (para precargar el formulario de corrección).
export async function GET(req: Request) {
  const r = await requiereAdmin();
  if (r.error) return r.error;
  const fecha = new URL(req.url).searchParams.get("fecha");
  if (!fecha) return errorJson("Falta la fecha.");
  const s = await prisma.sorteo.findUnique({ where: { fecha: aDate(fecha) } });
  return NextResponse.json(s ? { ...s, fecha: aIso(s.fecha) } : null);
}

// Forzar la descarga de resultados pendientes ahora mismo.
export async function POST() {
  const r = await requiereAdmin();
  if (r.error) return r.error;
  return NextResponse.json(await sincronizarSorteos({ forzar: true }));
}
