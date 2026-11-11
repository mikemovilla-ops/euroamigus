import { Combinacion } from "@/components/Bolas";
import { euros, type ResultadoMillon } from "@/lib/euromillones";
import { formatearFecha, sorteoCelebrado } from "@/lib/fechas";
import type { JugadaVista } from "@/lib/datos";

function Millon({ fecha, millon }: { fecha: string; millon: ResultadoMillon }) {
  if (millon.codigos.length === 0) return null;
  let estado: React.ReactNode;
  if (millon.premiados.length > 0) estado = <span className="font-bold text-acierto">🎉 {euros(millon.premioCent)}</span>;
  else if (millon.ganadores) estado = <span className="text-tinta/40">Nada</span>;
  else if (sorteoCelebrado(fecha)) estado = <span className="text-xs text-oro">Pendiente de comprobar</span>;
  else estado = null;

  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-tinta/10 pt-2 text-sm">
      <span className="min-w-0 text-tinta/70">
        El Millón:{" "}
        {millon.codigos.map((c) => (
          <code key={c} className={`mr-1 font-mono ${millon.premiados.includes(c) ? "font-bold text-acierto" : "text-tinta"}`}>
            {c}
          </code>
        ))}
        {millon.ganadores && millon.premiados.length === 0 && (
          <span className="block text-[11px] text-tinta/40">Ganador: {millon.ganadores.join(", ")}</span>
        )}
      </span>
      {estado}
    </div>
  );
}

// Para cada sorteo de la semana (martes y viernes): la combinación ganadora,
// cada apuesta nuestra con sus aciertos y premio (en bruto) y El Millón.
export default function ResultadosJugada({ jugada }: { jugada: JugadaVista }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {jugada.resultado.porSorteo.map(({ fecha, sorteo, apuestas, millon }) => (
        <div key={fecha} className="rounded-xl bg-white/[0.03] p-3">
          <p className="etiqueta mb-2 capitalize">{formatearFecha(fecha, { weekday: "long", day: "numeric", month: "short" })}</p>
          {!sorteo ? (
            <p className="text-sm text-tinta/50">
              {sorteoCelebrado(fecha) ? "Esperando resultado oficial…" : "Aún no se ha celebrado"}
            </p>
          ) : (
            <>
              <div className="mb-3">
                <p className="mb-1 text-[11px] text-tinta/50">Combinación ganadora</p>
                <Combinacion numeros={sorteo.numeros} estrellas={sorteo.estrellas} tam="sm" />
              </div>
              <ul className="space-y-1.5">
                {apuestas?.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-tinta/70">
                      {jugada.apuestas[i]?.fija ? "Fija" : "Variable"}:{" "}
                      <b className="text-tinta">
                        {r.aciertosNumeros.length} + {r.aciertosEstrellas.length}★
                      </b>
                    </span>
                    {r.premioCent > 0 ? (
                      <span className="font-bold text-acierto" title={sorteo.aproximado ? "Importe aproximado" : undefined}>
                        {sorteo.aproximado && "≈ "}
                        {euros(r.premioCent)}
                      </span>
                    ) : (
                      <span className="text-tinta/40">Nada</span>
                    )}
                  </li>
                ))}
              </ul>
              {sorteo.aproximado && apuestas?.some((r) => r.premioCent > 0) && (
                <p className="mt-2 text-[11px] text-tinta/50">≈ Importe provisional (redondeado); se ajusta solo al céntimo en cuanto esté el oficial.</p>
              )}
            </>
          )}
          <Millon fecha={fecha} millon={millon} />
        </div>
      ))}
    </div>
  );
}
