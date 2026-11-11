import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorJson, requiereAdmin } from "@/lib/sesion";
import { ordenar, validarApuesta } from "@/lib/euromillones";
import { aDate, lunesDe } from "@/lib/fechas";
import { getConfig, regenerarSemanasFuturas } from "@/lib/turnos";

export async function PATCH(req: Request) {
  const r = await requiereAdmin();
  if (r.error) return r.error;

  const body = (await req.json()) as {
    inicioRotacion?: string;
    numerosFijos?: number[];
    estrellasFijas?: number[];
    importeSemanalCent?: number;
  };
  const antes = await getConfig();
  const data: Record<string, unknown> = {};

  if (body.inicioRotacion) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.inicioRotacion)) return errorJson("Fecha incorrecta.");
    data.inicioRotacion = aDate(lunesDe(body.inicioRotacion));
  }
  if (body.numerosFijos || body.estrellasFijas) {
    const fija = {
      numeros: body.numerosFijos ?? antes.numerosFijos,
      estrellas: body.estrellasFijas ?? antes.estrellasFijas,
    };
    const error = validarApuesta(fija);
    if (error) return errorJson(`Apuesta fija: ${error}`);
    const o = ordenar(fija);
    data.numerosFijos = o.numeros;
    data.estrellasFijas = o.estrellas;
  }
  if (body.importeSemanalCent !== undefined) {
    if (!Number.isInteger(body.importeSemanalCent) || body.importeSemanalCent <= 0) return errorJson("Importe incorrecto.");
    data.importeSemanalCent = body.importeSemanalCent;
  }

  await prisma.config.update({ where: { id: 1 }, data });
  if (data.inicioRotacion || data.importeSemanalCent) await regenerarSemanasFuturas();
  return NextResponse.json({ ok: true });
}
