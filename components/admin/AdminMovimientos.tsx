"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { euros, type TipoMov } from "@/lib/euromillones";
import { describirMovimiento, signoMovimiento } from "@/lib/movimientos";

type Miembro = { id: string; nombre: string };
type Mov = {
  id: string;
  fecha: string;
  tipo: TipoMov;
  importeCent: number;
  concepto: string;
  miembro: Miembro;
  destino: Miembro | null;
};

const TIPOS: { v: TipoMov; t: string; ayuda: string }[] = [
  { v: "TRASPASO", t: "Le pasa dinero a otro", ayuda: "Cambia quién tiene el dinero; el bote total no cambia." },
  { v: "RETIRADA", t: "Reparte (−)", ayuda: "Ha repartido dinero del bote entre el grupo." },
  { v: "GASTO", t: "Paga con el bote (−)", ayuda: "Ha pagado una semana (u otra cosa) con dinero del bote." },
  { v: "INGRESO", t: "Tiene dinero del grupo (+)", ayuda: "Saldo que ya tenía de antes, premio cobrado fuera de la app…" },
];

export default function AdminMovimientos({ movimientos, miembros, hoy }: { movimientos: Mov[]; miembros: Miembro[]; hoy: string }) {
  const router = useRouter();
  const [fecha, setFecha] = useState(hoy);
  const [tipo, setTipo] = useState<TipoMov>("TRASPASO");
  const [miembroId, setMiembroId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [importe, setImporte] = useState("");
  const [concepto, setConcepto] = useState("");
  const [error, setError] = useState("");

  const esTraspaso = tipo === "TRASPASO";
  const listo = importe && miembroId && (!esTraspaso || (destinoId && destinoId !== miembroId));

  async function crear() {
    setError("");
    const res = await fetch("/api/admin/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha,
        tipo,
        miembroId,
        destinoId: esTraspaso ? destinoId : null,
        importeCent: Math.round(Number(importe.replace(",", ".")) * 100),
        concepto,
      }),
    });
    if (!res.ok) return setError((await res.json()).error);
    setImporte("");
    setConcepto("");
    router.refresh();
  }

  async function borrar(id: string) {
    if (!confirm("¿Borrar este movimiento?")) return;
    await fetch(`/api/admin/movimientos?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const selectMiembro = (valor: string, set: (v: string) => void, placeholder: string) => (
    <select className="input" value={valor} onChange={(e) => set(e.target.value)}>
      <option value="">{placeholder}</option>
      {miembros.map((m) => (
        <option key={m.id} value={m.id}>{m.nombre}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-tinta/60">
        Los premios se apuntan solos a quien echó el boleto de esa semana. Aquí se registra cuando ese dinero se mueve: se pasa a otro, se
        reparte o se usa para jugar.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {selectMiembro(miembroId, setMiembroId, "¿Quién?")}
        <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMov)}>
          {TIPOS.map((t) => (
            <option key={t.v} value={t.v}>{t.t}</option>
          ))}
        </select>
        {esTraspaso && selectMiembro(destinoId, setDestinoId, "¿A quién?")}
        <input className="input" inputMode="decimal" placeholder="Importe en €" value={importe} onChange={(e) => setImporte(e.target.value)} />
        <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <input className="input" placeholder="Concepto (opcional)" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
      </div>
      <p className="text-xs text-tinta/50">{TIPOS.find((t) => t.v === tipo)?.ayuda}</p>
      <button className="btn-oro text-sm" onClick={crear} disabled={!listo}>Añadir movimiento</button>
      {error && <p className="text-sm text-coral">{error}</p>}

      {movimientos.length > 0 && (
        <ul className="divide-y divide-tinta/10 text-sm">
          {movimientos.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="text-tinta/50">{m.fecha}</span> · {describirMovimiento(m)}
                {m.concepto && <span className="text-tinta/50"> · {m.concepto}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className={signoMovimiento(m.tipo).clase}>
                  {signoMovimiento(m.tipo).signo}
                  {euros(m.importeCent)}
                </span>
                <button className="text-tinta/40 hover:text-coral" onClick={() => borrar(m.id)} aria-label="Borrar">✕</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
