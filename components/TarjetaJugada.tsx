import { Combinacion } from "@/components/Bolas";
import ResultadosJugada from "@/components/ResultadosJugada";
import RegistrarJugada from "@/components/RegistrarJugada";
import { euros } from "@/lib/euromillones";
import { formatearSemana } from "@/lib/fechas";
import type { JugadaVista } from "@/lib/datos";

type Props = {
  jugada: JugadaVista;
  fija: { numeros: number[]; estrellas: number[] };
  puedeEditar: boolean;
};

// Una semana del histórico: quién la echó, foto, números y resultados.
export default function TarjetaJugada({ jugada, fija, puedeEditar }: Props) {
  const { resultado } = jugada;
  const premiada = resultado.premioCent > 0;
  const variable = jugada.apuestas.find((a) => !a.fija);

  return (
    <article className={`card overflow-hidden ${premiada ? "border-acierto/50" : ""}`}>
      <header className="flex items-start justify-between gap-3 border-b border-tinta/10 px-4 py-3">
        <div>
          <p className="font-display text-lg font-bold">{formatearSemana(jugada.semana)}</p>
          <p className="text-sm text-tinta/60">
            Turno de <b className="text-tinta">{jugada.responsable.nombre}</b>
            {jugada.echadaPor && jugada.echadaPor.id !== jugada.responsable.id && <> · lo echó {jugada.echadaPor.nombre}</>}
          </p>
        </div>
        <div className="text-right">
          {!jugada.echada ? (
            <span className="rounded-full bg-coral/15 px-2.5 py-1 text-xs font-semibold text-coral">Sin registrar</span>
          ) : premiada ? (
            <>
              <span className="rounded-full bg-acierto/15 px-2.5 py-1 text-sm font-bold text-acierto">🎉 {euros(resultado.premioCent)}</span>
              <p className="mt-1 text-xs text-tinta/60">Lo tiene {(jugada.echadaPor ?? jugada.responsable).nombre}</p>
            </>
          ) : resultado.pendiente || resultado.millonPendiente || resultado.porSorteo.some((s) => !s.sorteo) ? (
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-tinta/70">Pendiente</span>
          ) : (
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-tinta/50">Sin premio</span>
          )}
        </div>
      </header>

      {jugada.echada && (
        <div className="space-y-4 p-4">
          <div className="flex gap-4">
            {jugada.fotoUrl && (
              <a href={jugada.fotoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={jugada.fotoUrl} alt="Foto del boleto" className="h-24 w-20 rounded-lg object-cover ring-1 ring-tinta/10 hover:ring-oro" />
              </a>
            )}
            <div className="min-w-0 space-y-2">
              {jugada.apuestas.map((a, i) => (
                <div key={i}>
                  <p className="mb-1 text-[11px] text-tinta/50">{a.fija ? "Apuesta fija" : "Apuesta variable"}</p>
                  <Combinacion numeros={a.numeros} estrellas={a.estrellas} tam="sm" />
                </div>
              ))}
            </div>
          </div>
          {jugada.nota && <p className="text-sm italic text-tinta/60">“{jugada.nota}”</p>}
          <ResultadosJugada jugada={jugada} />
        </div>
      )}

      {puedeEditar && (
        <div className="border-t border-tinta/10 px-4 py-2">
          <RegistrarJugada
            jugadaId={jugada.id}
            semana={jugada.semana}
            fija={fija}
            variante="sec"
            textoBoton={jugada.echada ? "Corregir" : "Registrar tarde"}
            inicial={
              jugada.echada
                ? { apuesta: variable ? { numeros: variable.numeros, estrellas: variable.estrellas } : null, fotoUrl: jugada.fotoUrl, nota: jugada.nota, millon: jugada.millon }
                : undefined
            }
          />
        </div>
      )}
    </article>
  );
}
