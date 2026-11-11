"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SelectorApuesta from "@/components/SelectorApuesta";
import { CATEGORIAS } from "@/lib/euromillones";

type Sorteo = { fecha: string; numeros: number[]; estrellas: number[]; premios: { n: number; e: number; premioCent: number }[]; fuente: string };

// Descarga forzada de resultados y, por si la API falla, formulario para
// meter o corregir un sorteo a mano.
export default function AdminSorteos({ pendientes }: { pendientes: string[] }) {
  const router = useRouter();
  const [sync, setSync] = useState("");
  const [fecha, setFecha] = useState(pendientes[0] ?? "");
  const [comb, setComb] = useState({ numeros: [] as number[], estrellas: [] as number[] });
  const [premios, setPremios] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [fuente, setFuente] = useState("");

  async function sincronizar() {
    setSync("Buscando…");
    const res = await fetch("/api/admin/sorteos", { method: "POST" });
    const r = await res.json();
    setSync(r.error ? `Error: ${r.error}` : `${r.guardados} guardados · ${r.pendientes} pendientes`);
    router.refresh();
  }

  async function cargar(f: string) {
    setFecha(f);
    setMsg(null);
    setFuente("");
    if (!f) return;
    const s = (await (await fetch(`/api/admin/sorteos?fecha=${f}`)).json()) as Sorteo | null;
    if (s) {
      setComb({ numeros: s.numeros, estrellas: s.estrellas });
      setPremios(Object.fromEntries(s.premios.map((p) => [`${p.n}-${p.e}`, String(p.premioCent / 100)])));
      setFuente(s.fuente === "api" ? "Guardado desde la API" : "Metido a mano");
    } else {
      setComb({ numeros: [], estrellas: [] });
      setPremios({});
    }
  }

  async function guardar() {
    setMsg(null);
    const res = await fetch("/api/admin/sorteos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha,
        ...comb,
        premios: CATEGORIAS.map(({ n, e }) => ({ n, e, premioCent: Math.round(Number((premios[`${n}-${e}`] ?? "0").replace(",", ".")) * 100) || 0 })),
      }),
    });
    if (!res.ok) return setMsg({ ok: false, texto: (await res.json()).error });
    setMsg({ ok: true, texto: "Sorteo guardado." });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-sec text-sm" onClick={sincronizar}>Buscar resultados ahora</button>
        <span className="text-sm text-tinta/60">
          {sync || (pendientes.length ? `Pendientes: ${pendientes.join(", ")}` : "No hay sorteos pendientes")}
        </span>
      </div>

      <details className="rounded-xl bg-white/[0.03] p-3">
        <summary className="cursor-pointer text-sm font-semibold">Meter o corregir un sorteo a mano</summary>
        <div className="mt-4 space-y-4">
          <div>
            <label className="etiqueta mb-1 block">Fecha del sorteo (martes o viernes)</label>
            <input type="date" className="input max-w-xs" value={fecha} onChange={(e) => cargar(e.target.value)} />
            {fuente && <p className="mt-1 text-xs text-tinta/50">{fuente}</p>}
          </div>
          <SelectorApuesta numeros={comb.numeros} estrellas={comb.estrellas} onChange={setComb} />
          <div>
            <p className="etiqueta mb-2">Premio por acertante (€) — deja en blanco las que no sepas</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIAS.map(({ n, e }) => (
                <label key={`${n}-${e}`} className="flex items-center gap-2 text-sm">
                  <span className="w-12 shrink-0 text-tinta/70">{n}+{e}★</span>
                  <input
                    className="input py-1"
                    inputMode="decimal"
                    value={premios[`${n}-${e}`] ?? ""}
                    onChange={(ev) => setPremios((p) => ({ ...p, [`${n}-${e}`]: ev.target.value }))}
                  />
                </label>
              ))}
            </div>
          </div>
          <button className="btn-oro text-sm" onClick={guardar} disabled={!fecha}>Guardar sorteo</button>
          {msg && <p className={`text-sm ${msg.ok ? "text-acierto" : "text-coral"}`}>{msg.texto}</p>}
        </div>
      </details>
    </div>
  );
}
