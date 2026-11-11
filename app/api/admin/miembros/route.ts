import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorJson, requiereAdmin } from "@/lib/sesion";
import { regenerarSemanasFuturas } from "@/lib/turnos";

type MiembroInput = { id?: string; nombre: string; email: string | null; emailAvisos?: string | null; activo: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Guarda la lista completa de miembros en el orden recibido (= orden de la
// rotación). Los que falten en la lista se borran si no tienen historial;
// si lo tienen, se marcan como inactivos para no perderlo.
export async function PUT(req: Request) {
  const r = await requiereAdmin();
  if (r.error) return r.error;

  const { miembros } = (await req.json()) as { miembros: MiembroInput[] };
  if (!Array.isArray(miembros)) return errorJson("Formato incorrecto.");

  const limpios = miembros.map((m) => ({
    ...m,
    nombre: m.nombre.trim(),
    email: m.email?.trim().toLowerCase() || null,
    emailAvisos: m.emailAvisos?.trim().toLowerCase() || null,
  }));
  if (limpios.some((m) => !m.nombre)) return errorJson("Todos los miembros necesitan un nombre.");
  const malos = limpios.filter((m) => (m.email && !EMAIL.test(m.email)) || (m.emailAvisos && !EMAIL.test(m.emailAvisos)));
  if (malos.length) return errorJson(`Email no válido en: ${malos.map((m) => m.nombre).join(", ")}.`);
  const emails = limpios.map((m) => m.email).filter(Boolean);
  if (new Set(emails).size !== emails.length) return errorJson("Hay emails repetidos.");

  const actuales = await prisma.miembro.findMany({
    include: {
      _count: {
        select: { turnos: { where: { echada: true } }, echadas: true, movimientos: true, movimientosRecibidos: true, premiosHistoricos: true },
      },
    },
  });
  const idsRecibidos = new Set(limpios.map((m) => m.id).filter(Boolean));

  await prisma.$transaction(async (tx) => {
    // Primero se liberan los emails para que un cambio de email entre dos
    // miembros no choque con el índice único.
    await tx.miembro.updateMany({ data: { email: null } });
    for (const m of actuales.filter((a) => !idsRecibidos.has(a.id))) {
      const c = m._count;
      const tieneHistorial =
        c.turnos > 0 || c.echadas > 0 || c.movimientos > 0 || c.movimientosRecibidos > 0 || c.premiosHistoricos > 0;
      if (tieneHistorial) {
        await tx.miembro.update({ where: { id: m.id }, data: { activo: false, email: m.email, orden: 999 } });
      } else {
        await tx.jugada.deleteMany({ where: { responsableId: m.id, echada: false } });
        await tx.miembro.delete({ where: { id: m.id } });
      }
    }
    for (const [orden, m] of limpios.entries()) {
      const data = { nombre: m.nombre, email: m.email, emailAvisos: m.emailAvisos, activo: m.activo, orden };
      if (m.id) await tx.miembro.update({ where: { id: m.id }, data });
      else await tx.miembro.create({ data });
    }
  });

  await regenerarSemanasFuturas();
  return NextResponse.json({ ok: true });
}
