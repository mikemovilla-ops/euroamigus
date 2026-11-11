import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { asegurarSemanas, getConfig } from "@/lib/turnos";
import { sincronizarSorteos } from "@/lib/resultados";
import { cargarJugadas } from "@/lib/datos";
import { formatearFecha, formatearSemana, semanaActiva } from "@/lib/fechas";
import BotonEntrar from "@/components/BotonEntrar";
import RegistrarJugada from "@/components/RegistrarJugada";
import ProximosTurnos from "@/components/ProximosTurnos";
import ResumenDinero from "@/components/ResumenDinero";
import ResultadosJugada from "@/components/ResultadosJugada";
import { Combinacion } from "@/components/Bolas";
import { euros } from "@/lib/euromillones";

export const dynamic = "force-dynamic";

export default async function Inicio({ searchParams }: { searchParams: { error?: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`estrella inline-block bg-oro ${i === 1 ? "h-14 w-14" : "h-9 w-9 self-end"}`} />
          ))}
        </div>
        <div>
          <h1 className="font-display text-5xl font-extrabold">
            Euro<span className="text-oro">Amigus</span>
          </h1>
          <p className="mt-2 text-tinta/70">Turnos, boletos y premios del Euromillones del grupo.</p>
        </div>
        {searchParams.error === "AccessDenied" && (
          <p className="max-w-sm rounded-xl bg-coral/15 px-4 py-3 text-sm text-coral">
            Ese email no está en la lista del grupo. Pide al admin que te añada con el email de tu cuenta de Google.
          </p>
        )}
        <BotonEntrar />
      </div>
    );
  }

  const { miembroId, isAdmin } = session.user;
  await asegurarSemanas();
  await sincronizarSorteos();
  const [config, { jugadas, totales }] = await Promise.all([getConfig(), cargarJugadas()]);

  if (!config.inicioRotacion || jugadas.length === 0) {
    return (
      <div className="card p-6 text-center">
        <h1 className="text-2xl font-bold">Aún no hay turnos</h1>
        <p className="mt-2 text-tinta/70">
          {isAdmin ? "Añade a los miembros y elige la semana de inicio para generar la rotación." : "El admin todavía está configurando el grupo."}
        </p>
        {isAdmin && <Link href="/admin" className="btn-oro mt-4">Ir a configuración</Link>}
      </div>
    );
  }

  const activa = semanaActiva();
  const actual = jugadas.find((j) => j.semana === activa);
  // La semana actual también se puede cambiar mientras no esté echada.
  const proximas = jugadas.filter((j) => j.semana > activa || (j.semana === activa && !j.echada)).reverse();
  const fija = { numeros: config.numerosFijos, estrellas: config.estrellasFijas };
  const meToca = actual?.responsable.id === miembroId;
  const ultimaConPremio = jugadas.find((j) => j.echada && j.resultado.premioCent > 0);
  const millonSinComprobar = jugadas.filter((j) => j.resultado.millonPendiente).length;
  // Semanas pasadas que nadie registró: aviso para que no se queden sin apuntar.
  const olvidadas = jugadas.filter((j) => j.semana < activa && !j.echada).length;

  return (
    <div className="space-y-6">
      {actual && (
        <section className={`card relative overflow-hidden p-5 sm:p-6 ${meToca && !actual.echada ? "border-oro/60" : ""}`}>
          <span className="estrella absolute -right-6 -top-6 h-32 w-32 bg-oro/10" aria-hidden />
          <p className="etiqueta">Esta semana · {formatearSemana(actual.semana)}</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
            {meToca ? (
              <>Te toca a <span className="text-oro">ti</span></>
            ) : (
              <>Le toca a <span className="text-oro">{actual.responsable.nombre}</span></>
            )}
          </h1>

          {!actual.echada ? (
            <div className="mt-4 space-y-4">
              <p className="text-tinta/70">
                {meToca
                  ? "Echa las 2 apuestas para martes y viernes (10 €), haz una foto al boleto y regístralo aquí."
                  : "Todavía no lo ha registrado. Si lo echa otro, también puede subirlo."}
              </p>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="mb-1.5 text-[11px] text-tinta/50">Apuesta fija de siempre</p>
                <Combinacion numeros={fija.numeros} estrellas={fija.estrellas} tam="sm" />
              </div>
              {(miembroId || isAdmin) && (
                <RegistrarJugada
                  jugadaId={actual.id}
                  semana={actual.semana}
                  fija={fija}
                  textoBoton={meToca ? "📷 Ya lo he echado: subir boleto" : "📷 Lo he echado yo: subir boleto"}
                  variante={meToca ? "oro" : "sec"}
                />
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full bg-acierto/15 px-3 py-1 text-sm font-semibold text-acierto">
                ✓ Echado{actual.echadaPor && actual.echadaPor.id !== actual.responsable.id ? ` por ${actual.echadaPor.nombre}` : ""}
                {actual.echadaEn && ` el ${formatearFecha(actual.echadaEn.slice(0, 10))}`}
              </p>
              <div className="flex gap-4">
                {actual.fotoUrl && (
                  <a href={actual.fotoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={actual.fotoUrl} alt="Foto del boleto" className="h-28 w-24 rounded-lg object-cover ring-1 ring-tinta/10" />
                  </a>
                )}
                <div className="space-y-2">
                  {actual.apuestas.map((a, i) => (
                    <div key={i}>
                      <p className="mb-1 text-[11px] text-tinta/50">{a.fija ? "Apuesta fija" : "Apuesta variable"}</p>
                      <Combinacion numeros={a.numeros} estrellas={a.estrellas} tam="sm" />
                    </div>
                  ))}
                </div>
              </div>
              <ResultadosJugada jugada={actual} />
              {(isAdmin || (!!miembroId && (actual.responsable.id === miembroId || actual.echadaPor?.id === miembroId))) && (
                <RegistrarJugada
                  jugadaId={actual.id}
                  semana={actual.semana}
                  fija={fija}
                  variante="sec"
                  textoBoton="✏️ Corregir boleto"
                  inicial={{
                    apuesta: actual.apuestas.find((a) => !a.fija) ?? null,
                    fotoUrl: actual.fotoUrl,
                    nota: actual.nota,
                    millon: actual.millon,
                    fechaEchada: actual.echadaEn?.slice(0, 10) ?? null,
                  }}
                />
              )}
            </div>
          )}
        </section>
      )}

      {olvidadas > 0 && (
        <Link href="/historico" className="block rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral hover:bg-coral/15">
          ⚠ Hay {olvidadas} {olvidadas === 1 ? "semana pasada" : "semanas pasadas"} sin registrar. Ver histórico →
        </Link>
      )}

      {isAdmin && millonSinComprobar > 0 && (
        <Link href="/admin#millon" className="block rounded-xl bg-oro/10 px-4 py-3 text-sm text-oro hover:bg-oro/15">
          ★ Falta meter el código ganador de El Millón en {millonSinComprobar} {millonSinComprobar === 1 ? "semana" : "semanas"}. Ir a Admin →
        </Link>
      )}

      <ResumenDinero totales={totales} compacto />

      {ultimaConPremio && (
        <p className="text-center text-sm text-tinta/60">
          Último premio: <b className="text-acierto">{euros(ultimaConPremio.resultado.premioCent)}</b> la semana de {ultimaConPremio.responsable.nombre} ({formatearSemana(ultimaConPremio.semana)})
        </p>
      )}

      <section className="card p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-bold">Próximos turnos</h2>
        <ProximosTurnos
          miembroId={miembroId}
          esAdmin={isAdmin}
          turnos={proximas.map((j) => ({
            id: j.id,
            semanaTexto: (j.semana === activa ? "Esta semana · " : "") + formatearSemana(j.semana),
            responsable: j.responsable,
          }))}
        />
      </section>
    </div>
  );
}
