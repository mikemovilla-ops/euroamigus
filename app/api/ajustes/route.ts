import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorJson, requiereSesion } from "@/lib/sesion";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cada miembro cambia su propio email de avisos y si quiere recibirlos.
export async function PATCH(req: Request) {
  const r = await requiereSesion();
  if (r.error) return r.error;
  const { miembroId } = r.session.user;
  if (!miembroId) return errorJson("Tu email no está en la lista de miembros.", 403);

  const b = (await req.json()) as { emailAvisos?: string | null; recibirAvisos?: boolean };
  const emailAvisos = b.emailAvisos?.trim().toLowerCase() || null;
  if (emailAvisos && !EMAIL.test(emailAvisos)) return errorJson("Ese email no parece válido.");

  await prisma.miembro.update({
    where: { id: miembroId },
    data: { emailAvisos, ...(typeof b.recibirAvisos === "boolean" ? { recibirAvisos: b.recibirAvisos } : {}) },
  });
  return NextResponse.json({ ok: true });
}
