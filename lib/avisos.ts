import { prisma } from "@/lib/prisma";
import { destinatarios, enviar, escapeHtml } from "@/lib/email";
import { aDate, aIso, formatearFecha, formatearSemana, lunesDe, semanaActiva, sorteosDeSemana } from "@/lib/fechas";
import { comprobarApuesta, euros, PREMIO_MILLON_CENT, type PremioCategoria } from "@/lib/euromillones";
import { getConfig } from "@/lib/turnos";

const combinacionTexto = (numeros: number[], estrellas: number[]) => `${numeros.join(" · ")}  ★ ${estrellas.join(" · ")}`;

// Lunes: "te toca esta semana" al responsable (una sola vez por semana).
// Devuelve qué ha pasado, para el registro del cron (ver Admin).
export async function avisarTurno(): Promise<string> {
  const jugada = await prisma.jugada.findUnique({
    where: { semana: aDate(semanaActiva()) },
    include: { responsable: true },
  });
  if (!jugada) return "Aviso «te toca»: no hay turno esta semana";
  if (jugada.echada) return "Aviso «te toca»: no hace falta, el boleto ya está subido";
  if (jugada.avisoTurnoEn) return `Aviso «te toca»: ya se había enviado a ${jugada.responsable.nombre}`;
  const config = await getConfig();
  const fija = combinacionTexto(config.numerosFijos, config.estrellasFijas);
  const semana = formatearSemana(aIso(jugada.semana));
  const enviado = await enviar(
    await destinatarios({ miembroIds: [jugada.responsableId], conAdmins: true }),
    "🎟️ Esta semana te toca echar el Euromillones",
    `Hola ${jugada.responsable.nombre}: esta semana (${semana}) te toca echar el Euromillones.\n2 apuestas para martes y viernes (10 €). La fija: ${fija}.\nCuando lo eches, sube la foto y los números en la app.`,
    `<p>Hola <b>${escapeHtml(jugada.responsable.nombre)}</b>:</p><p>Esta semana (<b>${semana}</b>) te toca echar el Euromillones: 2 apuestas para martes y viernes (10 €).</p><p>La fija: <b>${fija}</b></p><p>Cuando lo eches, sube la foto y los números en la app.</p>`
  );
  await prisma.jugada.update({ where: { id: jugada.id }, data: { avisoTurnoEn: new Date() } });
  return enviado
    ? `Aviso «te toca» enviado a ${jugada.responsable.nombre} (y copia al admin)`
    : `Aviso «te toca» para ${jugada.responsable.nombre} NO enviado (sin email o fallo de Gmail)`;
}

// Martes: si aún nadie ha subido el boleto, recordatorio al responsable.
export async function avisarRecordatorio(): Promise<string> {
  const jugada = await prisma.jugada.findUnique({
    where: { semana: aDate(semanaActiva()) },
    include: { responsable: true },
  });
  if (!jugada) return "Recordatorio: no hay turno esta semana";
  if (jugada.echada) return "Recordatorio: no hace falta, el boleto ya está subido";
  if (jugada.avisoRecordatorioEn) return `Recordatorio: ya se había enviado a ${jugada.responsable.nombre}`;
  const enviado = await enviar(
    await destinatarios({ miembroIds: [jugada.responsableId], conAdmins: true }),
    "⏰ Hoy hay sorteo y el boleto aún no está subido",
    `Hola ${jugada.responsable.nombre}: hoy es el sorteo del martes y todavía no hay boleto registrado esta semana. Si ya lo has echado, súbelo a la app; si no puedes, avisa al grupo para que lo eche otro.`,
    `<p>Hola <b>${escapeHtml(jugada.responsable.nombre)}</b>:</p><p>Hoy es el sorteo del martes y todavía <b>no hay boleto registrado</b> esta semana.</p><p>Si ya lo has echado, súbelo a la app. Si no puedes, avisa al grupo para que lo eche otro.</p>`
  );
  await prisma.jugada.update({ where: { id: jugada.id }, data: { avisoRecordatorioEn: new Date() } });
  return enviado
    ? `Recordatorio «sin subir» enviado a ${jugada.responsable.nombre} (y copia al admin)`
    : `Recordatorio para ${jugada.responsable.nombre} NO enviado (sin email o fallo de Gmail)`;
}

// Al registrar el boleto por primera vez: aviso a todo el grupo (menos a
// quien lo ha subido) con la foto y los números.
export async function avisarBoletoSubido(jugadaId: string) {
  const j = await prisma.jugada.findUnique({
    where: { id: jugadaId },
    include: { responsable: true, echadaPor: true, apuestas: { orderBy: { fija: "desc" } } },
  });
  if (!j?.echada) return;
  const quien = j.echadaPor?.nombre ?? j.responsable.nombre;
  const enLugarDe = j.echadaPor && j.echadaPor.id !== j.responsable.id ? ` (turno de ${j.responsable.nombre})` : "";
  const semana = formatearSemana(aIso(j.semana));
  const lineas = j.apuestas.map((a) => `${a.fija ? "Fija" : "Variable"}: ${combinacionTexto(a.numeros, a.estrellas)}`);
  const millon = [...j.millonMartes, ...j.millonViernes];
  await enviar(
    await destinatarios({ excepto: j.echadaPorId }),
    `✅ Boleto echado: ${semana}`,
    `${quien} ha echado el boleto de esta semana${enLugarDe}.\n${lineas.join("\n")}${millon.length ? `\nEl Millón: ${millon.join(", ")}` : ""}${j.fotoUrl ? `\nFoto: ${j.fotoUrl}` : ""}`,
    `<p><b>${escapeHtml(quien)}</b> ha echado el boleto de esta semana${escapeHtml(enLugarDe)}.</p><ul>${lineas.map((l) => `<li>${l}</li>`).join("")}</ul>${millon.length ? `<p>El Millón: <code>${millon.join(", ")}</code></p>` : ""}${j.fotoUrl ? `<p><img src="${j.fotoUrl}" alt="Boleto" style="max-width:320px;border-radius:12px"></p>` : ""}`
  );
}

async function avisarPremio(titulo: string, quien: string, detalle: string, cent: number) {
  await enviar(
    await destinatarios(),
    `🎉 ${titulo}: ${euros(cent)}`,
    `${titulo}: ${euros(cent)}.\n${detalle}\nEl dinero lo tiene ${quien}.`,
    `<p style="font-size:20px"><b>🎉 ${escapeHtml(titulo)}: ${euros(cent)}</b></p><p>${escapeHtml(detalle)}</p><p>El dinero lo tiene <b>${escapeHtml(quien)}</b>.</p>`
  );
}

// Tras descargar un sorteo nuevo: si alguna apuesta de esa semana tiene
// premio, aviso a todo el grupo.
export async function avisarPremioSorteo(fecha: string) {
  const sorteo = await prisma.sorteo.findUnique({ where: { fecha: aDate(fecha) } });
  const j = await prisma.jugada.findUnique({
    where: { semana: aDate(lunesDe(fecha)) },
    include: { responsable: true, echadaPor: true, apuestas: { orderBy: { fija: "desc" } } },
  });
  if (!sorteo || !j?.echada) return;
  const datos = { fecha, numeros: sorteo.numeros, estrellas: sorteo.estrellas, premios: sorteo.premios as PremioCategoria[] };
  const resultados = j.apuestas.map((a) => ({ fija: a.fija, r: comprobarApuesta(a, datos) })).filter((x) => x.r.premioCent > 0);
  const total = resultados.reduce((s, x) => s + x.r.premioCent, 0);
  if (total === 0) return;
  const dia = formatearFecha(fecha, { weekday: "long", day: "numeric", month: "long" });
  const detalle = `Sorteo del ${dia}. ${resultados.map((x) => `Apuesta ${x.fija ? "fija" : "variable"}: ${x.r.categoria} → ${euros(x.r.premioCent)}`).join(". ")}.`;
  await avisarPremio("¡Ha tocado el Euromillones!", (j.echadaPor ?? j.responsable).nombre, detalle, total);
}

// Al meter el código ganador de El Millón: si coincide con alguno nuestro
// (y antes no coincidía), aviso a todo el grupo.
export async function avisarPremioMillon(fecha: string, ganadoresAntes: string[]) {
  const millon = await prisma.millon.findUnique({ where: { fecha: aDate(fecha) } });
  const j = await prisma.jugada.findUnique({
    where: { semana: aDate(lunesDe(fecha)) },
    include: { responsable: true, echadaPor: true },
  });
  if (!millon || !j?.echada) return;
  const [martes] = sorteosDeSemana(aIso(j.semana));
  const nuestros = fecha === martes ? j.millonMartes : j.millonViernes;
  const nuevos = nuestros.filter((c) => millon.codigos.includes(c) && !ganadoresAntes.includes(c));
  if (nuevos.length === 0) return;
  const dia = formatearFecha(fecha, { weekday: "long", day: "numeric", month: "long" });
  await avisarPremio("¡Ha tocado El Millón!", (j.echadaPor ?? j.responsable).nombre, `Sorteo del ${dia}, código ${nuevos.join(", ")}.`, nuevos.length * PREMIO_MILLON_CENT);
}
