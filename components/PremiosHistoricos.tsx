import { euros } from "@/lib/euromillones";
import { formatearFecha } from "@/lib/fechas";

type Premio = { id: string; fecha: string | null; nombre: string; importeCent: number; nota: string | null };

// Premios de antes de usar la app, agrupados por año (los más recientes
// arriba). Solo hay fecha, quién lo cobró e importe.
export default function PremiosHistoricos({ premios, desde }: { premios: Premio[]; desde: string | null }) {
  if (premios.length === 0) return null;
  const total = premios.reduce((s, p) => s + p.importeCent, 0);

  const grupos = new Map<string, Premio[]>();
  for (const p of premios) {
    const clave = p.fecha?.slice(0, 4) ?? "Sin fecha";
    grupos.set(clave, [...(grupos.get(clave) ?? []), p]);
  }

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">Antes de la app</h2>
        <span className="font-display text-lg font-bold text-acierto">{euros(total)}</span>
      </div>
      <p className="mb-4 text-xs text-tinta/50">
        {premios.length} premios{desde && ` desde el ${formatearFecha(desde, { day: "numeric", month: "long", year: "numeric" })}`}. Sin números: solo
        quién lo cobró y cuánto.
      </p>
      <div className="space-y-2">
        {Array.from(grupos.entries()).map(([año, lista], i) => (
          <details key={año} open={i === 0} className="rounded-xl bg-white/[0.03] px-3 py-2">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
              <span>{año}</span>
              <span className="text-tinta/60">
                {lista.length} · {euros(lista.reduce((s, p) => s + p.importeCent, 0))}
              </span>
            </summary>
            <ul className="mt-2 divide-y divide-tinta/5 text-sm">
              {lista.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-1.5">
                  <span className="min-w-0">
                    <span className="inline-block w-24 text-tinta/50">{p.fecha ? formatearFecha(p.fecha) : "—"}</span>
                    {p.nombre}
                    {p.nota && <span className="text-xs text-tinta/40"> · {p.nota}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-acierto">{euros(p.importeCent)}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
