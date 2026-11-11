"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { emailGoogle: string; emailAvisos: string | null; recibirAvisos: boolean };

export default function FormAjustes({ emailGoogle, emailAvisos: inicial, recibirAvisos: recibirInicial }: Props) {
  const router = useRouter();
  const [emailAvisos, setEmailAvisos] = useState(inicial ?? "");
  const [recibir, setRecibir] = useState(recibirInicial);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    setMsg(null);
    const res = await fetch("/api/ajustes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailAvisos, recibirAvisos: recibir }),
    });
    setGuardando(false);
    if (!res.ok) return setMsg({ ok: false, texto: (await res.json()).error });
    setMsg({ ok: true, texto: "Guardado." });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="etiqueta mb-1">Email para entrar (Google)</p>
        <p className="font-mono text-sm">{emailGoogle}</p>
        <p className="mt-1 text-xs text-tinta/50">Este solo lo puede cambiar el admin.</p>
      </div>

      <label className="flex items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[#F5C542]" checked={recibir} onChange={(e) => setRecibir(e.target.checked)} />
        <span>Recibir avisos por email</span>
      </label>

      <div className={recibir ? "" : "pointer-events-none opacity-40"}>
        <label className="etiqueta mb-1 block" htmlFor="emailAvisos">Email donde recibir los avisos</label>
        <input
          id="emailAvisos"
          type="email"
          className="input"
          placeholder={`Si lo dejas vacío: ${emailGoogle}`}
          value={emailAvisos}
          onChange={(e) => setEmailAvisos(e.target.value)}
        />
        <p className="mt-2 text-xs text-tinta/50">
          Avisos: cuando te toca (lunes), recordatorio si el martes aún no está subido, cuando alguien sube el boleto y cuando toca un premio.
        </p>
      </div>

      <button className="btn-oro" onClick={guardar} disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-acierto" : "text-coral"}`}>{msg.texto}</p>}
    </div>
  );
}
