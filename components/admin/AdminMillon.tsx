"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Fila = { fecha: string; fechaTexto: string; nuestros: string[]; ganadores: string[] | null };

// Código ganador de El Millón de cada sorteo jugado (no viene en la API).
// Primero salen los pendientes; al guardar, la app comprueba sola si alguno
// de nuestros códigos coincide.
export default function AdminMillon({ filas }: { filas: Fila[] }) {
  if (filas.length === 0) return <p className="text-sm text-tinta/60">Todavía no hay sorteos jugados que comprobar.</p>;
  return (
    <div className="space-y-2">
      <p className="mb-3 text-sm text-tinta/60">
        Mira el código ganador en loteriasyapuestas.es y pégalo aquí. Si un sorteo tiene varios (Millón extra), sepáralos con comas.
      </p>
      {filas.map((f) => (
        <FilaMillon key={f.fecha} fila={f} />
      ))}
    </div>
  );
}

function FilaMillon({ fila }: { fila: Fila }) {
  const router = useRouter();
  const [valor, setValor] = useState(fila.ganadores?.join(", ") ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const cambiado = valor !== (fila.ganadores?.join(", ") ?? "");
  const premiado = fila.ganadores && fila.nuestros.some((c) => fila.ganadores!.includes(c));

  async function guardar() {
    setMsg(null);
    const res = await fetch("/api/admin/millon", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: fila.fecha, codigos: valor }),
    });
    if (!res.ok) return setMsg({ ok: false, texto: (await res.json()).error });
    setMsg({ ok: true, texto: "Guardado" });
    router.refresh();
  }

  return (
    <div className={`rounded-xl p-3 ${!fila.ganadores ? "bg-oro/10" : "bg-white/[0.03]"}`}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold capitalize">{fila.fechaTexto}</span>
        <span className="text-xs text-tinta/60">
          Nuestro: <code className="font-mono text-tinta">{fila.nuestros.join(", ") || "—"}</code>
          {fila.ganadores && (premiado ? <b className="ml-2 text-acierto">🎉 ¡PREMIADO!</b> : <span className="ml-2">· sin premio</span>)}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          className="input font-mono uppercase tracking-wider"
          placeholder="Código ganador"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
        />
        <button className="btn-oro shrink-0 text-sm" onClick={guardar} disabled={!cambiado}>
          Guardar
        </button>
      </div>
      {msg && <p className={`mt-1 text-xs ${msg.ok ? "text-acierto" : "text-coral"}`}>{msg.texto}</p>}
    </div>
  );
}
