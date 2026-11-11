import Link from "next/link";
import { HISTORIAL_VERSIONES } from "@/lib/version";
import ListaCambios, { SeparadorHito } from "@/components/ListaCambios";

export default function Novedades() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Novedades</h1>
        <p className="mt-1 text-sm text-tinta/60">Todo lo que ha ido cambiando en la app, versión a versión.</p>
      </div>

      {HISTORIAL_VERSIONES.map((entrada) => (
        <div key={entrada.version}>
          {entrada.hito && <SeparadorHito />}
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold text-oro">
              {entrada.version} <span className="text-sm font-normal text-tinta/40">({entrada.fecha})</span>
            </h2>
            <ListaCambios entrada={entrada} />
          </div>
        </div>
      ))}

      <p className="text-center">
        <Link href="/" className="text-sm text-tinta/50 underline hover:text-tinta">
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}
