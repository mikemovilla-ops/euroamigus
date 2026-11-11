import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAILS } from "@/lib/auth";

// Envío por Gmail SMTP con contraseña de aplicación (igual que en Tarados
// Malibú, ver README). Sin credenciales el envío se ignora: un aviso nunca
// debe romper la acción que lo dispara.
const transporter =
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
    : null;

export const URL_APP = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Fuera de producción (en local o en previews de Vercel) los avisos solo
// llegan a los admins: la base de datos es la misma que la de verdad y no
// queremos mandar correos al grupo mientras se prueba.
const EN_PRODUCCION = process.env.VERCEL_ENV === "production";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type MiembroAvisos = { email: string | null; emailAvisos: string | null; recibirAvisos: boolean };

export function direccionAvisos(m: MiembroAvisos): string | null {
  if (!m.recibirAvisos) return null;
  return m.emailAvisos || m.email || null;
}

// Direcciones de los admins: su email de avisos si son miembros y lo han
// puesto, si no el de ADMIN_EMAILS.
async function direccionesAdmins(): Promise<string[]> {
  const comoMiembros = await prisma.miembro.findMany({
    where: { email: { in: ADMIN_EMAILS } },
    select: { email: true, emailAvisos: true },
  });
  return ADMIN_EMAILS.map((e) => comoMiembros.find((m) => m.email === e)?.emailAvisos || e);
}

// Direcciones a las que mandar: de unos miembros concretos o de todo el
// grupo activo (opcionalmente quitando a alguien, p. ej. quien hizo la acción).
// `conAdmins`: los admins reciben copia siempre (aunque no sean del grupo o
// hayan desactivado los avisos), p. ej. para los recordatorios de turno.
export async function destinatarios(
  opc: { miembroIds?: string[]; excepto?: string | null; conAdmins?: boolean } = {}
): Promise<string[]> {
  const miembros = await prisma.miembro.findMany({
    where: opc.miembroIds ? { id: { in: opc.miembroIds } } : { activo: true },
    select: { id: true, email: true, emailAvisos: true, recibirAvisos: true },
  });
  const dirs = miembros
    .filter((m) => m.id !== opc.excepto)
    .map(direccionAvisos)
    .filter((d): d is string => !!d);
  const admins = opc.conAdmins ? await direccionesAdmins() : [];
  if (EN_PRODUCCION) return Array.from(new Set([...dirs, ...admins]));
  return dirs.length > 0 || admins.length > 0 ? ADMIN_EMAILS : [];
}

// Devuelve true si Gmail ha aceptado el correo.
export async function enviar(para: string[], asunto: string, texto: string, html: string): Promise<boolean> {
  if (!transporter || para.length === 0) return false;
  try {
    await transporter.sendMail({
      from: `"EuroAmigus" <${process.env.GMAIL_USER}>`,
      bcc: para,
      subject: EN_PRODUCCION ? asunto : `[PRUEBA] ${asunto}`,
      text: `${texto}\n\n${URL_APP}`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#0B1437">${html}<p style="margin-top:24px"><a href="${URL_APP}" style="background:#F5C542;color:#070D26;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">Abrir EuroAmigus</a></p><p style="font-size:12px;color:#888">Puedes cambiar el email o dejar de recibir avisos en ${URL_APP}/ajustes</p></div>`,
    });
    return true;
  } catch (e) {
    console.error(`No se pudo enviar el aviso "${asunto}":`, e);
    return false;
  }
}
