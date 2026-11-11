// Todas las fechas de semanas y sorteos se manejan como texto "YYYY-MM-DD"
// (día natural en Madrid) para no pelearse con zonas horarias. En la BD van
// como @db.Date (medianoche UTC de ese día).

const ZONA = "Europe/Madrid";

export function hoyMadrid(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ahora);
}

export function horaMadrid(ahora: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", hourCycle: "h23" }).format(ahora)
  );
}

export function aDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function aIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function sumarDias(iso: string, dias: number): string {
  const d = aDate(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return aIso(d);
}

export function lunesDe(iso: string): string {
  const dia = aDate(iso).getUTCDay(); // 0 = domingo
  return sumarDias(iso, -((dia + 6) % 7));
}

export function semanasEntre(desdeIso: string, hastaIso: string): number {
  const ms = aDate(hastaIso).getTime() - aDate(desdeIso).getTime();
  return Math.floor(Math.round(ms / 86_400_000) / 7);
}

// Martes y viernes de la semana de ese lunes.
export function sorteosDeSemana(lunes: string): [string, string] {
  return [sumarDias(lunes, 1), sumarDias(lunes, 4)];
}

// La semana "en juego": de lunes a viernes es la actual; sábado y domingo,
// como los dos sorteos ya han pasado, pasa a ser la siguiente.
export function semanaActiva(ahora: Date = new Date()): string {
  const hoy = hoyMadrid(ahora);
  const dia = aDate(hoy).getUTCDay();
  const lunes = lunesDe(hoy);
  return dia === 0 || dia === 6 ? sumarDias(lunes, 7) : lunes;
}

// El sorteo es a las 21:00 y los premios tardan un rato en publicarse.
export function sorteoCelebrado(fecha: string, ahora: Date = new Date()): boolean {
  const hoy = hoyMadrid(ahora);
  return fecha < hoy || (fecha === hoy && horaMadrid(ahora) >= 23);
}

export function formatearFecha(iso: string, opciones: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat("es-ES", { ...opciones, timeZone: "UTC" }).format(aDate(iso));
}

export function formatearSemana(lunes: string): string {
  const [martes, viernes] = sorteosDeSemana(lunes);
  const d = (iso: string) => new Intl.DateTimeFormat("es-ES", { day: "numeric", timeZone: "UTC" }).format(aDate(iso));
  const mes = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" }).format(aDate(viernes));
  return `Mar ${d(martes)} y vie ${d(viernes)} ${mes}`;
}
