import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorJson, requiereSesion } from "@/lib/sesion";
import { aIso, semanaActiva } from "@/lib/fechas";

// Intercambia el responsable de dos semanas que aún no se han echado.
// Puede hacerlo el admin o cualquiera de los dos afectados.
export async function POST(req: Request) {
  const r = await requiereSesion();
  if (r.error) return r.error;
  const { miembroId, isAdmin } = r.session.user;

  const { a, b } = (await req.json()) as { a: string; b: string };
  if (!a || !b || a === b) return errorJson("Elige dos semanas distintas.");

  const [ja, jb] = await Promise.all([
    prisma.jugada.findUnique({ where: { id: a } }),
    prisma.jugada.findUnique({ where: { id: b } }),
  ]);
  if (!ja || !jb) return errorJson("Semana no encontrada.", 404);
  if (ja.echada || jb.echada) return errorJson("No se puede cambiar una semana que ya está echada.");
  const activa = semanaActiva();
  if (aIso(ja.semana) < activa || aIso(jb.semana) < activa) return errorJson("No se pueden cambiar semanas pasadas.");
  if (!isAdmin && miembroId !== ja.responsableId && miembroId !== jb.responsableId) {
    return errorJson("Solo puedes cambiar un turno tuyo.", 403);
  }

  await prisma.$transaction([
    prisma.jugada.update({ where: { id: ja.id }, data: { responsableId: jb.responsableId } }),
    prisma.jugada.update({ where: { id: jb.id }, data: { responsableId: ja.responsableId } }),
  ]);
  return NextResponse.json({ ok: true });
}
