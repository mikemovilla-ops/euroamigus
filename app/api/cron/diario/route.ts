import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sincronizarSorteos, type ResultadoSync } from "@/lib/resultados";
import { asegurarSemanas } from "@/lib/turnos";
import { avisarRecordatorio, avisarTurno } from "@/lib/avisos";
import { actualizarBote } from "@/lib/bote";
import { aDate, hoyMadrid } from "@/lib/fechas";

export const dynamic = "force-dynamic";

// Ejecuciones que se guardan en el registro (Admin → Ejecución automática).
const MAX_REGISTRO = 30;

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// (Sin export: un route.ts de Next solo puede exportar GET, POST, dynamic...)
function describirResultados(r: ResultadoSync): string {
  if (r.guardados === 0 && r.pendientes === 0 && r.aproximados === 0 && r.millon === 0) return "Resultados: nada pendiente";
  const partes = [];
  if (r.guardados) partes.push(`${r.guardados} ${r.guardados === 1 ? "sorteo guardado" : "sorteos guardados"}`);
  if (r.millon) partes.push(`El Millón: ${r.millon} ${r.millon === 1 ? "código ganador guardado" : "códigos ganadores guardados"}`);
  if (r.pendientes) partes.push(`${r.pendientes} aún sin publicar`);
  if (r.aproximados) partes.push(`${r.aproximados} con importe aproximado (FDJ)`);
  return `Resultados: ${partes.join(", ")}${r.error ? ` · ${r.error}` : ""}`;
}

// Lo llama Vercel Schedules (el sustituto de Vercel Cron, ver vercel.json)
// cada día a las 11:00 hora de Madrid, con hasta 15 min de retraso en el
// plan gratuito. Llega por GET con "Authorization: Bearer <CRON_SECRET>".
// Puede llegar alguna vez duplicado: todo lo de aquí es seguro de repetir
// (los avisos se marcan como enviados y los sorteos no se guardan dos veces).
// - lunes: aviso "te toca" al responsable de la semana
// - martes: recordatorio si aún no se ha subido el boleto
// - todos los días: actualiza el bote del próximo sorteo y descarga
//   resultados pendientes (y avisa si hay premio)
// Cada ejecución queda apuntada en EjecucionCron para verla en Admin.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const dia = aDate(hoyMadrid()).getUTCDay();
  const lineas: string[] = [];
  let ok = true;

  // Cada paso por separado: si uno falla, los demás se hacen igual.
  const paso = async (nombre: string, fn: () => Promise<string | void>) => {
    try {
      const r = await fn();
      if (r) lineas.push(r);
    } catch (e) {
      ok = false;
      lineas.push(`ERROR en ${nombre}: ${(e as Error).message}`);
    }
  };

  await paso("turnos", async () => {
    await asegurarSemanas();
  });
  if (dia === 1) await paso("aviso «te toca»", avisarTurno);
  if (dia === 2) await paso("recordatorio", avisarRecordatorio);
  await paso("bote", () => actualizarBote({ forzar: true }));
  await paso("resultados", async () => {
    const r = await sincronizarSorteos({ forzar: true });
    if (r.error && r.pendientes > 0) ok = false;
    return describirResultados(r);
  });

  const resumen = `${DIAS[dia][0].toUpperCase()}${DIAS[dia].slice(1)}. ${lineas.join(" · ")}`;
  try {
    await prisma.ejecucionCron.create({ data: { ok, resumen } });
    const viejas = await prisma.ejecucionCron.findMany({ orderBy: { fecha: "desc" }, skip: MAX_REGISTRO, select: { id: true } });
    if (viejas.length) await prisma.ejecucionCron.deleteMany({ where: { id: { in: viejas.map((v) => v.id) } } });
  } catch (e) {
    console.error("No se pudo guardar el registro del cron:", e);
  }
  return NextResponse.json({ ok, resumen });
}
