"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SelectorApuesta from "@/components/SelectorApuesta";

type Props = {
  inicioRotacion: string | null;
  primero: string | null;
  fija: { numeros: number[]; estrellas: number[] };
  importeSemanalCent: number;
};

export default function AdminConfig({ inicioRotacion, primero, fija: fijaInicial, importeSemanalCent }: Props) {
  const router = useRouter();
  const [inicio, setInicio] = useState(inicioRotacion ?? "");
  const [fija, setFija] = useState(fijaInicial);
  const [importe, setImporte] = useState(String(importeSemanalCent / 100));
  const [editarFija, setEditarFija] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function guardar(datos: Record<string, unknown>) {
    setMsg(null);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    if (!res.ok) return setMsg({ ok: false, texto: (await res.json()).error });
    setMsg({ ok: true, texto: "Guardado." });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="etiqueta mb-1 block">Semana de inicio de la rotación</label>
        <p className="mb-2 text-xs text-tinta/50">
          Esa semana le toca al nº 1 de la lista{primero ? ` (${primero})` : ""}, la siguiente al nº 2, etc. Cualquier día vale: se toma su lunes.
        </p>
        <div className="flex gap-2">
          <input type="date" className="input max-w-xs" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <button className="btn-oro text-sm" disabled={!inicio} onClick={() => guardar({ inicioRotacion: inicio })}>
            Guardar
          </button>
        </div>
      </div>

      <div>
        <label className="etiqueta mb-1 block">Importe por semana (€)</label>
        <div className="flex gap-2">
          <input type="number" min="1" step="0.5" className="input max-w-[8rem]" value={importe} onChange={(e) => setImporte(e.target.value)} />
          <button className="btn-sec text-sm" onClick={() => guardar({ importeSemanalCent: Math.round(Number(importe) * 100) })}>
            Guardar
          </button>
        </div>
        <p className="mt-1 text-xs text-tinta/50">2 apuestas × 2 sorteos × 2,50 € = 10 €. Solo afecta a las semanas futuras.</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="etiqueta">Apuesta fija</span>
          <button className="text-xs text-oro underline" onClick={() => setEditarFija(!editarFija)}>
            {editarFija ? "Cancelar" : "Cambiar"}
          </button>
        </div>
        {editarFija ? (
          <div className="space-y-3">
            <SelectorApuesta numeros={fija.numeros} estrellas={fija.estrellas} onChange={setFija} />
            <button
              className="btn-oro text-sm"
              onClick={() => guardar({ numerosFijos: fija.numeros, estrellasFijas: fija.estrellas }).then(() => setEditarFija(false))}
            >
              Guardar apuesta fija
            </button>
          </div>
        ) : (
          <p className="font-display text-lg">
            {fija.numeros.join(" · ")} <span className="text-oro">★ {fija.estrellas.join(" · ")}</span>
          </p>
        )}
      </div>

      {msg && <p className={`text-sm ${msg.ok ? "text-acierto" : "text-coral"}`}>{msg.texto}</p>}
    </div>
  );
}
