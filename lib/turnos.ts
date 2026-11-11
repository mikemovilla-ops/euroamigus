import { prisma } from "@/lib/prisma";
import { aDate, aIso, semanaActiva, semanasEntre, sumarDias } from "@/lib/fechas";

// Cuántas semanas por delante se generan (una vuelta completa del grupo).
export const SEMANAS_POR_DELANTE = 10;

// A quién le toca la semana `lunes` según la rotación: el primero de la
// lista activa la semana de inicio, el segundo la siguiente, etc.
export function responsableSegunRotacion<T>(activosOrdenados: T[], inicio: string, lunes: string): T | null {
  if (activosOrdenados.length === 0 || lunes < inicio) return null;
  const k = semanasEntre(inicio, lunes);
  return activosOrdenados[k % activosOrdenados.length];
}

export async function getConfig() {
  return prisma.config.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

// Crea las jugadas que falten desde la semana activa hasta N semanas
// después. Las ya existentes (con intercambios hechos) no se tocan.
export async function asegurarSemanas() {
  const config = await getConfig();
  if (!config.inicioRotacion) return;
  const inicio = aIso(config.inicioRotacion);
  const activos = await prisma.miembro.findMany({ where: { activo: true }, orderBy: { orden: "asc" } });
  if (activos.length === 0) return;

  const desde = semanaActiva() < inicio ? inicio : semanaActiva();
  const existentes = await prisma.jugada.findMany({
    where: { semana: { gte: aDate(desde) } },
    select: { semana: true },
  });
  const yaHay = new Set(existentes.map((j) => aIso(j.semana)));

  const nuevas = [];
  for (let i = 0; i < SEMANAS_POR_DELANTE; i++) {
    const lunes = sumarDias(desde, i * 7);
    if (yaHay.has(lunes)) continue;
    const r = responsableSegunRotacion(activos, inicio, lunes);
    if (r) nuevas.push({ semana: aDate(lunes), responsableId: r.id, importeCent: config.importeSemanalCent });
  }
  if (nuevas.length) await prisma.jugada.createMany({ data: nuevas, skipDuplicates: true });
}

// Tras cambiar miembros, orden o fecha de inicio: borra las semanas futuras
// que aún no se han echado y las vuelve a generar con la rotación nueva.
export async function regenerarSemanasFuturas() {
  await prisma.jugada.deleteMany({
    where: { semana: { gte: aDate(semanaActiva()) }, echada: false },
  });
  await asegurarSemanas();
}
