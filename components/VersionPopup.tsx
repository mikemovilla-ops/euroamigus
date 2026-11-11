"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { APP_VERSION, HISTORIAL_VERSIONES, type EntradaVersion } from "@/lib/version";
import ListaCambios, { SeparadorHito } from "@/components/ListaCambios";

const STORAGE_KEY = "euroamigus_version_vista";

// Al entrar, enseña lo que ha cambiado desde la última versión que vio este
// navegador (guardada en localStorage). Solo con sesión iniciada.
export default function VersionPopup() {
  const { status } = useSession();
  const [entradas, setEntradas] = useState<EntradaVersion[] | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let vista: string | null = null;
    try {
      vista = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (vista === APP_VERSION) return;
    if (!vista) {
      setEntradas([HISTORIAL_VERSIONES[0]]);
      return;
    }
    const idxVista = HISTORIAL_VERSIONES.findIndex((h) => h.version === vista);
    setEntradas(idxVista === -1 ? [HISTORIAL_VERSIONES[0]] : HISTORIAL_VERSIONES.slice(0, idxVista));
  }, [status]);

  function cerrar() {
    try {
      window.localStorage.setItem(STORAGE_KEY, APP_VERSION);
    } catch {}
    setEntradas(null);
  }

  if (!entradas || entradas.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-tinta/15 bg-noche p-6 shadow-2xl">
        <h2 className="font-display text-xl font-bold text-oro">Novedades · v{APP_VERSION}</h2>
        <div className="max-h-80 space-y-4 overflow-y-auto">
          {entradas.map((entrada) => (
            <div key={entrada.version}>
              {entrada.hito && <SeparadorHito />}
              <p className="font-semibold">
                {entrada.version} <span className="text-tinta/40">({entrada.fecha})</span>
              </p>
              <ListaCambios entrada={entrada} />
            </div>
          ))}
        </div>
        <button onClick={cerrar} className="btn-oro w-full">
          Entendido
        </button>
        <Link href="/novedades" onClick={cerrar} className="block text-center text-xs text-tinta/40 underline hover:text-tinta/70">
          Ver todo el historial de versiones
        </Link>
      </div>
    </div>
  );
}
