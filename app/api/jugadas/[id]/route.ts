import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorJson, requiereAdmin, requiereSesion } from "@/lib/sesion";
import { ordenar, parsearCodigos, validarApuesta } from "@/lib/euromillones";
import { aIso, semanaActiva } from "@/lib/fechas";
import { getConfig } from "@/lib/turnos";
import { sincronizarSorteos } from "@/lib/resultados";
import { avisarBoletoSubido } from "@/lib/avisos";

// Registrar (o corregir) el boleto de una semana: la apuesta variable, la
// foto y una nota. La apuesta fija se añade sola desde la configuración.
// Puede hacerlo cualquiera del grupo (por si alguien cubre a otro); queda
// apuntado quién lo hizo.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const r = await requiereSesion();
  if (r.error) return r.error;
  const { miembroId, isAdmin } = r.session.user;
  if (!miembroId && !isAdmin) return errorJson("Tu email no está en la lista de miembros.", 403);

  const body = (await req.json()) as {
    apuesta?: { numeros: number[]; estrellas: number[] };
    fotoUrl?: string | null;
    nota?: string | null;
    millonMartes?: string;
    millonViernes?: string;
  };
  const jugada = await prisma.jugada.findUnique({ where: { id: params.id } });
  if (!jugada) return errorJson("Esa semana no existe.", 404);
  if (aIso(jugada.semana) > semanaActiva()) return errorJson("Todavía no se puede registrar esta semana.");

  if (!body.apuesta) return errorJson("Falta la apuesta.");
  const error = validarApuesta(body.apuesta);
  if (error) return errorJson(error);
  if (!jugada.fotoUrl && !body.fotoUrl) return errorJson("Sube la foto del boleto.");

  const millonMartes = parsearCodigos(body.millonMartes ?? "");
  const millonViernes = parsearCodigos(body.millonViernes ?? "");
  if (!millonMartes || !millonViernes) return errorJson("Código de El Millón incorrecto: son 3 letras y 5 números (p. ej. ABC12345).");
  if (millonMartes.length === 0 || millonViernes.length === 0) return errorJson("Falta el código de El Millón del martes y/o del viernes.");

  const config = await getConfig();
  const variable = ordenar(body.apuesta);
  const fija = ordenar({ numeros: config.numerosFijos, estrellas: config.estrellasFijas });

  await prisma.$transaction([
    prisma.apuesta.deleteMany({ where: { jugadaId: jugada.id } }),
    prisma.apuesta.createMany({
      data: [
        { jugadaId: jugada.id, ...fija, fija: true },
        { jugadaId: jugada.id, ...variable, fija: false },
      ],
    }),
    prisma.jugada.update({
      where: { id: jugada.id },
      data: {
        echada: true,
        echadaEn: jugada.echadaEn ?? new Date(),
        echadaPorId: jugada.echadaPorId ?? miembroId,
        fotoUrl: body.fotoUrl ?? jugada.fotoUrl,
        nota: body.nota?.trim() || null,
        millonMartes,
        millonViernes,
      },
    }),
  ]);

  // Primera vez que se registra: aviso al grupo.
  if (!jugada.echada) await avisarBoletoSubido(jugada.id);
  // Si se registra tarde (sorteos ya celebrados), que salga el resultado ya.
  await sincronizarSorteos();
  return NextResponse.json({ ok: true });
}

// Solo admin: deshacer el registro (p. ej. se marcó la semana equivocada).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const r = await requiereAdmin();
  if (r.error) return r.error;
  await prisma.$transaction([
    prisma.apuesta.deleteMany({ where: { jugadaId: params.id } }),
    prisma.jugada.update({
      where: { id: params.id },
      data: { echada: false, echadaEn: null, echadaPorId: null, fotoUrl: null, nota: null, millonMartes: [], millonViernes: [] },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
