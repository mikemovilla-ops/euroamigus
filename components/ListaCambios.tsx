import type { EntradaVersion } from "@/lib/version";

// Lista de cambios de una versión (compartida por el pop-up y /novedades).
export default function ListaCambios({ entrada }: { entrada: EntradaVersion }) {
  return (
    <ul className="mt-1 list-inside list-disc space-y-1.5 text-sm text-tinta/80">
      {entrada.cambios.map((cambio, i) => (
        <li key={i}>
          {typeof cambio === "string" ? (
            cambio
          ) : (
            <>
              {cambio.texto}{" "}
              <span className="ml-1 inline-block rounded-full bg-oro/15 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-oro">
                {cambio.origen}
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SeparadorHito() {
  return (
    <div className="flex items-center gap-2 pb-2">
      <div className="h-px flex-1 bg-oro/30" />
      <span className="font-display text-[10px] uppercase tracking-widest text-oro">Primera versión</span>
      <div className="h-px flex-1 bg-oro/30" />
    </div>
  );
}
