import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorJson, requiereAdmin } from "@/lib/sesion";
import { parsearCodigos } from "@/lib/euromillones";
import { aDate } from "@/lib/fechas";
import { avisarPremioMillon } from "@/lib/avisos";

// Guarda el código (o códigos) ganador(es) de El Millón de un sorteo. Vacío
// = borrar (vuelve a quedar pendiente de comprobar).
export async function PUT(req: Request) {
  const r = await requiereAdmin();
  if (r.error) return r.error;

  const { fecha, codigos: texto } = (await req.json()) as { fecha: string; codigos: string };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? "")) return errorJson("Fecha incorrecta.");
  const dia = aDate(fecha).getUTCDay();
  if (dia !== 2 && dia !== 5) return errorJson("Los sorteos son martes y viernes.");
  const codigos = parsearCodigos(texto ?? "");
  if (!codigos) return errorJson("Código incorrecto: son 3 letras y 5 números (p. ej. ABC12345).");

  const antes = await prisma.millon.findUnique({ where: { fecha: aDate(fecha) } });
  if (codigos.length === 0) {
    await prisma.millon.deleteMany({ where: { fecha: aDate(fecha) } });
  } else {
    await prisma.millon.upsert({
      where: { fecha: aDate(fecha) },
      update: { codigos },
      create: { fecha: aDate(fecha), codigos },
    });
    await avisarPremioMillon(fecha, antes?.codigos ?? []);
  }
  return NextResponse.json({ ok: true });
}
