"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Turno = { id: string; semanaTexto: string; responsable: { id: string; nombre: string } };

// Lista de los próximos turnos. Para cambiar uno: "Cambiar" en tu semana y
// luego tocar la semana con la que quieres intercambiarla.
export default function ProximosTurnos({ turnos, miembroId, esAdmin }: { turnos: Turno[]; miembroId: string | null; esAdmin: boolean }) {
  const router = useRouter();
  const [origen, setOrigen] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const puedeMover = (t: Turno) => esAdmin || t.responsable.id === miembroId;

  async function intercambiar(destino: string) {
    if (!origen) return;
    setCargando(true);
    setError("");
    const res = await fetch("/api/turnos/intercambiar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: origen, b: destino }),
    });
    setCargando(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "No se ha podido cambiar.");
      return;
    }
    setOrigen(null);
    router.refresh();
  }

  const nombreOrigen = turnos.find((t) => t.id === origen)?.responsable.nombre;

  return (
    <div>
      {origen && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-oro/15 px-3 py-2 text-sm">
          <span>Elige la semana con la que cambiar el turno de <b>{nombreOrigen}</b></span>
          <button className="text-tinta/70 underline" onClick={() => setOrigen(null)}>Cancelar</button>
        </div>
      )}
      {error && <p className="mb-3 rounded-lg bg-coral/15 px-3 py-2 text-sm text-coral">{error}</p>}
      <ol className="divide-y divide-tinta/10">
        {turnos.map((t) => {
          const esMio = t.responsable.id === miembroId;
          const elegible = origen && origen !== t.id;
          return (
            <li key={t.id}>
              <div
                className={`flex items-center justify-between gap-3 px-1 py-2.5 ${elegible ? "cursor-pointer rounded-lg hover:bg-oro/10" : ""} ${origen === t.id ? "rounded-lg bg-oro/20" : ""}`}
                onClick={() => elegible && !cargando && intercambiar(t.id)}
              >
                <div className="min-w-0">
                  <p className={`truncate font-semibold ${esMio ? "text-oro" : ""}`}>
                    {t.responsable.nombre}
                    {esMio && <span className="ml-2 text-xs font-normal text-oro/80">(tú)</span>}
                  </p>
                  <p className="text-xs text-tinta/50">{t.semanaTexto}</p>
                </div>
                {!origen && puedeMover(t) && (
                  <button className="btn-sec px-3 py-1 text-xs" onClick={() => setOrigen(t.id)}>
                    Cambiar
                  </button>
                )}
                {elegible && <span className="text-xs text-oro">Cambiar aquí ⇄</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
