// Estado de la ejecución automática diaria (cron): cuándo fue la última, qué
// hizo y, si lleva más de un día sin ejecutarse o la última falló, aviso en
// rojo. Componente de servidor: recibe las ejecuciones ya leídas de la BD.

type Ejecucion = { id: string; fecha: Date; ok: boolean; resumen: string };

// Es diario (11:00 de Madrid, hasta 15 min tarde): margen de 26 h antes de
// dar la alarma.
const MARGEN_MS = 26 * 60 * 60 * 1000;

const fechaHora = (d: Date) =>
  new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

export default function EstadoCron({ ejecuciones, ahora = new Date() }: { ejecuciones: Ejecucion[] | null; ahora?: Date }) {
  if (ejecuciones === null) {
    return <p className="text-sm text-coral">No se puede leer el registro (¿falta hacer db:push en esta base de datos?).</p>;
  }
  const ultima = ejecuciones[0];
  const atrasada = !ultima || ahora.getTime() - ultima.fecha.getTime() > MARGEN_MS;

  return (
    <div className="space-y-3">
      {!ultima ? (
        <p className="rounded-xl bg-coral/15 px-4 py-3 text-sm text-coral">
          Todavía no se ha ejecutado nunca. Se lanza cada día a las 11:00; si mañana sigue así, revisa en Vercel → Schedules.
        </p>
      ) : (
        <div className={`rounded-xl px-4 py-3 text-sm ${atrasada || !ultima.ok ? "bg-coral/15" : "bg-acierto/10"}`}>
          <p className={`font-semibold ${atrasada || !ultima.ok ? "text-coral" : "text-acierto"}`}>
            {atrasada ? "⚠ Lleva más de un día sin ejecutarse" : ultima.ok ? "✓ Funcionando" : "⚠ La última ejecución tuvo errores"}
          </p>
          <p className="mt-1 text-tinta/80">
            Última: <b className="capitalize">{fechaHora(ultima.fecha)}</b>
          </p>
          <p className="mt-1 text-tinta/70">{ultima.resumen}</p>
        </div>
      )}

      {ejecuciones.length > 1 && (
        <details className="rounded-xl bg-white/[0.03] px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold">Ejecuciones anteriores ({ejecuciones.length - 1})</summary>
          <ul className="mt-2 divide-y divide-tinta/5 text-xs">
            {ejecuciones.slice(1).map((e) => (
              <li key={e.id} className="py-2">
                <span className={e.ok ? "text-acierto" : "text-coral"}>{e.ok ? "✓" : "⚠"}</span>{" "}
                <span className="capitalize text-tinta/60">{fechaHora(e.fecha)}</span>
                <span className="block text-tinta/70">{e.resumen}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-tinta/50">
        Se ejecuta solo cada día a las 11:00 (hora de Madrid, hasta 15 min tarde): los lunes avisa a quien le toca, los martes recuerda si
        no está subido y todos los días busca resultados. Para lanzarlo a mano: Vercel → Schedules → «diario» → Run Schedule.
      </p>
    </div>
  );
}
