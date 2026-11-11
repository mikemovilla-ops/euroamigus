import { NextResponse } from "next/server";
import type { TipoMovimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorJson, requiereAdmin } from "@/lib/sesion";
import { aDate } from "@/lib/fechas";

const TIPOS: TipoMovimiento[] = ["INGRESO", "RETIRADA", "GASTO", "TRASPASO"];

export async function POST(req: Request) {
  const r = await requiereAdmin();
  if (r.error) return r.error;

  const b = (await req.json()) as {
    fecha: string;
    tipo: TipoMovimiento;
    importeCent: number;
    concepto: string;
    miembroId: string;
    destinoId?: string | null;
  };
  if (!TIPOS.includes(b.tipo)) return errorJson("Tipo incorrecto.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.fecha ?? "")) return errorJson("Fecha incorrecta.");
  if (!Number.isInteger(b.importeCent) || b.importeCent <= 0) return errorJson("El importe tiene que ser mayor que 0.");
  if (!b.miembroId) return errorJson("Elige quién.");
  const esTraspaso = b.tipo === "TRASPASO";
  if (esTraspaso && (!b.destinoId || b.destinoId === b.miembroId)) return errorJson("Elige a quién se le pasa el dinero.");

  const ids = [b.miembroId, ...(esTraspaso ? [b.destinoId!] : [])];
  if ((await prisma.miembro.count({ where: { id: { in: ids } } })) !== ids.length) return errorJson("Miembro no encontrado.");

  await prisma.movimiento.create({
    data: {
      fecha: aDate(b.fecha),
      tipo: b.tipo,
      importeCent: b.importeCent,
      concepto: b.concepto?.trim() ?? "",
      miembroId: b.miembroId,
      destinoId: esTraspaso ? b.destinoId : null,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const r = await requiereAdmin();
  if (r.error) return r.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return errorJson("Falta el id.");
  await prisma.movimiento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
