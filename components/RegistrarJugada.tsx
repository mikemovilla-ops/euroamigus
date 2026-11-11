"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import SelectorApuesta from "@/components/SelectorApuesta";
import { Combinacion } from "@/components/Bolas";
import { parsearCodigos } from "@/lib/euromillones";
import { formatearSemana } from "@/lib/fechas";

type Apuesta = { numeros: number[]; estrellas: number[] };

type Props = {
  jugadaId: string;
  semana: string;
  fija: Apuesta;
  inicial?: { apuesta: Apuesta | null; fotoUrl: string | null; nota: string | null; millon: [string[], string[]] };
  textoBoton?: string;
  variante?: "oro" | "sec";
};

// Reduce la foto del móvil (varios MB) a un JPEG de ~1600 px antes de
// subirla. Si el navegador no puede leerla (p. ej. HEIC en Chrome), se sube
// tal cual.
async function comprimir(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob ? new File([blob], "boleto.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export default function RegistrarJugada({
  jugadaId,
  semana,
  fija,
  inicial,
  textoBoton = "Ya lo he echado",
  variante = "oro",
}: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [apuesta, setApuesta] = useState<Apuesta>(inicial?.apuesta ?? { numeros: [], estrellas: [] });
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(inicial?.fotoUrl ?? null);
  // Algunos navegadores no saben mostrar fotos HEIC (iPhone): se sube igual.
  const [previewRota, setPreviewRota] = useState(false);
  const [nota, setNota] = useState(inicial?.nota ?? "");
  const [millonMartes, setMillonMartes] = useState(inicial?.millon[0].join(", ") ?? "");
  const [millonViernes, setMillonViernes] = useState(inicial?.millon[1].join(", ") ?? "");
  const [estado, setEstado] = useState<"" | "subiendo" | "guardando">("");
  const [error, setError] = useState("");

  const millonOk = (t: string) => {
    const c = parsearCodigos(t);
    return !!c && c.length > 0;
  };
  const completa =
    apuesta.numeros.length === 5 &&
    apuesta.estrellas.length === 2 &&
    (foto || inicial?.fotoUrl) &&
    millonOk(millonMartes) &&
    millonOk(millonViernes);

  async function guardar() {
    setError("");
    try {
      let fotoUrl: string | undefined;
      if (foto) {
        setEstado("subiendo");
        const f = await comprimir(foto);
        const ext = f.type === "image/jpeg" ? "jpg" : f.name.split(".").pop();
        const blob = await upload(`boletos/${semana}.${ext}`, f, {
          access: "public",
          handleUploadUrl: `/api/jugadas/${jugadaId}/foto`,
        });
        fotoUrl = blob.url;
      }
      setEstado("guardando");
      const res = await fetch(`/api/jugadas/${jugadaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apuesta, fotoUrl, nota, millonMartes, millonViernes }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "No se ha podido guardar.");
      setAbierto(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEstado("");
    }
  }

  if (!abierto) {
    return (
      <button className={variante === "oro" ? "btn-oro w-full sm:w-auto" : "btn-sec text-sm"} onClick={() => setAbierto(true)}>
        {textoBoton}
      </button>
    );
  }

  const elegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // para poder volver a elegir la misma
    if (!f) return;
    setFoto(f);
    setPreview(URL.createObjectURL(f));
    setPreviewRota(false);
  };

  // Qué falta, para decirlo claro junto al botón de guardar.
  const faltan = [
    !(foto || inicial?.fotoUrl) && "foto",
    apuesta.numeros.length < 5 && `${5 - apuesta.numeros.length} ${apuesta.numeros.length === 4 ? "número" : "números"}`,
    apuesta.estrellas.length < 2 && `${2 - apuesta.estrellas.length} ${apuesta.estrellas.length === 1 ? "estrella" : "estrellas"}`,
    !millonOk(millonMartes) && "Millón martes",
    !millonOk(millonViernes) && "Millón viernes",
  ].filter(Boolean) as string[];

  // Botones de cámara y galería: en el móvil, `capture` abre directamente la
  // cámara trasera; sin él, el selector de fotos.
  const BotonFoto = ({ camara, children, className }: { camara: boolean; children: React.ReactNode; className: string }) => (
    <label className={`cursor-pointer ${className}`}>
      {children}
      <input type="file" accept="image/*" {...(camara ? { capture: "environment" } : {})} className="hidden" onChange={elegirFoto} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/75 sm:items-center sm:p-4" onClick={() => !estado && setAbierto(false)}>
      <div
        className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-tinta/15 bg-noche shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-tinta/10 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold">Registrar boleto</h2>
            <p className="text-xs text-tinta/60">{formatearSemana(semana)}</p>
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl leading-none text-tinta/80 hover:bg-white/20"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar"
            disabled={!!estado}
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
        <section className="mb-6">
          <p className="etiqueta mb-2">1 · Foto del boleto</p>
          {preview ? (
            <div className="overflow-hidden rounded-2xl border border-tinta/15 bg-black/30">
              {previewRota ? (
                <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-tinta/80">
                  <span className="text-3xl" aria-hidden>✅</span>
                  Foto lista para subir
                  <span className="text-xs text-tinta/50">{foto?.name}</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Boleto" className="max-h-80 w-full object-contain" onError={() => setPreviewRota(true)} />
              )}
              <div className="grid grid-cols-2 border-t border-tinta/10 text-sm font-semibold">
                <BotonFoto camara className="flex items-center justify-center gap-2 py-3 hover:bg-white/5">📷 Repetir</BotonFoto>
                <BotonFoto camara={false} className="flex items-center justify-center gap-2 border-l border-tinta/10 py-3 hover:bg-white/5">
                  🖼️ Otra de la galería
                </BotonFoto>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <BotonFoto camara className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-oro px-3 py-6 text-center font-semibold text-nochedark hover:bg-orobrillante">
                <span className="text-3xl" aria-hidden>📷</span>
                Hacer foto
              </BotonFoto>
              <BotonFoto camara={false} className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-tinta/25 px-3 py-6 text-center font-semibold hover:border-oro/70 hover:bg-white/5">
                <span className="text-3xl" aria-hidden>🖼️</span>
                Elegir de la galería
              </BotonFoto>
            </div>
          )}
        </section>

        <section className="mb-6">
          <p className="etiqueta mb-2">2 · Apuesta fija (ya puesta)</p>
          <div className="rounded-xl bg-white/5 p-3">
            <Combinacion numeros={fija.numeros} estrellas={fija.estrellas} tam="sm" />
          </div>
        </section>

        <section className="mb-6">
          <p className="etiqueta mb-2">3 · La otra apuesta</p>
          <SelectorApuesta numeros={apuesta.numeros} estrellas={apuesta.estrellas} onChange={setApuesta} />
        </section>

        <section className="mb-6">
          <p className="etiqueta mb-1">4 · Códigos de El Millón</p>
          <p className="mb-2 text-xs text-tinta/50">Vienen en el boleto: 3 letras y 5 números (p. ej. ABC12345). Si hay varios, sepáralos con comas.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["Martes", millonMartes, setMillonMartes],
              ["Viernes", millonViernes, setMillonViernes],
            ] as const).map(([dia, valor, set]) => (
              <label key={dia} className="block">
                <span className="mb-1 block text-xs text-tinta/70">{dia}</span>
                <input
                  className={`input font-mono uppercase tracking-wider ${valor && !parsearCodigos(valor) ? "border-coral" : ""}`}
                  value={valor}
                  onChange={(e) => set(e.target.value)}
                  placeholder="ABC12345"
                  autoCapitalize="characters"
                  autoComplete="off"
                />
              </label>
            ))}
          </div>
        </section>

        <section>
          <p className="etiqueta mb-2">Nota (opcional)</p>
          <input className="input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: echado en la plaza" maxLength={140} />
        </section>

        </div>

        {/* Pie fijo: el botón de guardar siempre a mano, sin bajar hasta el final */}
        <footer className="border-t border-tinta/10 bg-nochedark/80 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {error && <p className="mb-3 rounded-lg bg-coral/15 px-3 py-2 text-sm text-coral">{error}</p>}
          <button className="btn-oro w-full py-3 text-base" disabled={!completa || !!estado} onClick={guardar}>
            {estado === "subiendo" ? "Subiendo foto…" : estado === "guardando" ? "Guardando…" : "Guardar boleto"}
          </button>
          {faltan.length > 0 && <p className="mt-2 text-center text-xs text-tinta/60">Falta: {faltan.join(" · ")}</p>}
        </footer>
      </div>
    </div>
  );
}
