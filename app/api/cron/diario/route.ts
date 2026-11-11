import { NextResponse } from "next/server";
import { sincronizarSorteos } from "@/lib/resultados";
import { asegurarSemanas } from "@/lib/turnos";
import { avisarRecordatorio, avisarTurno } from "@/lib/avisos";
import { aDate, hoyMadrid } from "@/lib/fechas";

export const dynamic = "force-dynamic";

// Lo llama Vercel Cron una vez al día (vercel.json, hacia las 11-12 h de
// Madrid; el plan gratuito solo permite crons diarios):
// - lunes: aviso "te toca" al responsable de la semana
// - martes: recordatorio si aún no se ha subido el boleto
// - todos los días: descarga resultados pendientes (y avisa si hay premio)
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const dia = aDate(hoyMadrid()).getUTCDay();
  await asegurarSemanas();
  if (dia === 1) await avisarTurno();
  if (dia === 2) await avisarRecordatorio();
  const resultados = await sincronizarSorteos({ forzar: true });
  return NextResponse.json({ dia, resultados });
}
