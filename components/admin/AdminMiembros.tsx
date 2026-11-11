"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type M = { id?: string; nombre: string; email: string | null; emailAvisos: string | null; activo: boolean };

// Lista editable de miembros. El orden de la lista es el orden de la
// rotación de turnos (se reordena con las flechas).
export default function AdminMiembros({ iniciales }: { iniciales: M[] }) {
  const router = useRouter();
  const [lista, setLista] = useState<M[]>(iniciales);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const cambiar = (i: number, cambios: Partial<M>) => setLista((l) => l.map((m, j) => (j === i ? { ...m, ...cambios } : m)));
  const mover = (i: number, d: number) =>
    setLista((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  async function guardar() {
    setGuardando(true);
    setMsg(null);
    const res = await fetch("/api/admin/miembros", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ miembros: lista }),
    });
    setGuardando(false);
    if (!res.ok) return setMsg({ ok: false, texto: (await res.json()).error });
    setMsg({ ok: true, texto: "Guardado. Los turnos futuros se han recalculado." });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {lista.map((m, i) => (
          <li key={m.id ?? `nuevo-${i}`} className={`flex flex-wrap items-center gap-2 rounded-xl bg-white/[0.03] p-2 ${!m.activo ? "opacity-50" : ""}`}>
            <span className="w-6 text-center font-display font-bold text-oro">{i + 1}</span>
            <input className="input min-w-0 flex-1 basis-32" placeholder="Nombre" value={m.nombre} onChange={(e) => cambiar(i, { nombre: e.target.value })} />
            <input
              className="input min-w-0 flex-[2] basis-48"
              placeholder="email de Google (para entrar)"
              type="email"
              value={m.email ?? ""}
              onChange={(e) => cambiar(i, { email: e.target.value })}
            />
            <input
              className="input min-w-0 flex-[2] basis-48"
              placeholder="email de avisos (opcional)"
              type="email"
              value={m.emailAvisos ?? ""}
              onChange={(e) => cambiar(i, { emailAvisos: e.target.value })}
            />
            <div className="flex items-center gap-1">
              <label className="flex items-center gap-1 px-1 text-xs text-tinta/70" title="Si no está activo, no entra en la rotación">
                <input type="checkbox" checked={m.activo} onChange={(e) => cambiar(i, { activo: e.target.checked })} />
                Activo
              </label>
              <button className="btn-sec px-2 py-1 text-xs" onClick={() => mover(i, -1)} aria-label="Subir">↑</button>
              <button className="btn-sec px-2 py-1 text-xs" onClick={() => mover(i, 1)} aria-label="Bajar">↓</button>
              <button className="btn-sec px-2 py-1 text-xs text-coral" onClick={() => setLista((l) => l.filter((_, j) => j !== i))} aria-label="Quitar">
                ✕
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button className="btn-sec text-sm" onClick={() => setLista((l) => [...l, { nombre: "", email: "", emailAvisos: "", activo: true }])}>
          + Añadir miembro
        </button>
        <button className="btn-oro text-sm" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar miembros"}
        </button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-acierto" : "text-coral"}`}>{msg.texto}</p>}
      <p className="text-xs text-tinta/50">
        Al guardar se recalculan las semanas futuras que aún no se han echado (se pierden los cambios de turno hechos en ellas).
      </p>
    </div>
  );
}
