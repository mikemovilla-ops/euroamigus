import { euros } from "@/lib/euromillones";
import type { Tenencia } from "@/lib/datos";

// Recuento de cuánto dinero del bote tiene cada uno. La suma es el bote.
export default function QuienTieneElBote({ tenencia, boteCent, miembroId }: { tenencia: Tenencia; boteCent: number; miembroId: string | null }) {
  const max = Math.max(...tenencia.map((t) => Math.abs(t.cent)), 1);
  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">¿Quién tiene el dinero?</h2>
        <span className="font-display text-lg font-bold text-oro">{euros(boteCent)}</span>
      </div>
      <p className="mb-4 text-xs text-tinta/50">
        El premio de cada semana lo tiene quien echó el boleto, hasta que lo pase, lo reparta o lo use para jugar.
      </p>
      {tenencia.every((t) => t.cent === 0) ? (
        <p className="text-sm text-tinta/60">Nadie tiene dinero del grupo ahora mismo.</p>
      ) : (
        <ul className="space-y-2">
          {tenencia.map(({ miembro, cent }) => (
            <li key={miembro.id} className={`grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-sm ${cent === 0 ? "opacity-40" : ""}`}>
              <span className={`truncate ${miembro.id === miembroId ? "font-bold text-oro" : ""}`}>{miembro.nombre}</span>
              <span className="h-2 overflow-hidden rounded-full bg-white/5">
                {cent !== 0 && (
                  <span
                    className={`block h-full rounded-full ${cent > 0 ? "bg-oro" : "bg-coral"}`}
                    style={{ width: `${(Math.abs(cent) / max) * 100}%` }}
                  />
                )}
              </span>
              <span className={`text-right font-semibold tabular-nums ${cent < 0 ? "text-coral" : ""}`}>{euros(cent)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
