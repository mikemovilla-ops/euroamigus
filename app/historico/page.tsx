import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConfig } from "@/lib/turnos";
import { sincronizarSorteos } from "@/lib/resultados";
import { cargarJugadas } from "@/lib/datos";
import { aIso, semanaActiva } from "@/lib/fechas";
import { euros } from "@/lib/euromillones";
import { prisma } from "@/lib/prisma";
import ResumenDinero from "@/components/ResumenDinero";
import TarjetaJugada from "@/components/TarjetaJugada";
import QuienTieneElBote from "@/components/QuienTieneElBote";
import PremiosHistoricos from "@/components/PremiosHistoricos";
import { describirMovimiento, signoMovimiento } from "@/lib/movimientos";

export const dynamic = "force-dynamic";


export default async function Historico() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const { miembroId, isAdmin } = session.user;

  await sincronizarSorteos();
  const [config, { jugadas, totales, tenencia }, historicos, movimientos] = await Promise.all([
    getConfig(),
    cargarJugadas(),
    prisma.premioHistorico.findMany({
      orderBy: [{ fecha: { sort: "desc", nulls: "last" } }],
      include: { miembro: { select: { nombre: true } } },
    }),
    prisma.movimiento.findMany({
      orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
      include: { miembro: { select: { nombre: true } }, destino: { select: { nombre: true } } },
    }),
  ]);
  const activa = semanaActiva();
  const pasadas = jugadas.filter((j) => j.semana <= activa && (j.echada || j.semana < activa));
  const fija = { numeros: config.numerosFijos, estrellas: config.estrellasFijas };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold">Histórico</h1>
      <ResumenDinero totales={totales} />
      <QuienTieneElBote tenencia={tenencia} boteCent={totales.boteCent} miembroId={miembroId} />

      {movimientos.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer font-semibold">Movimientos del bote ({movimientos.length})</summary>
          <ul className="mt-3 divide-y divide-tinta/10 text-sm">
            {movimientos.map((m) => (
              <li key={m.id} className="flex justify-between gap-3 py-2">
                <span>
                  <span className="text-tinta/50">{m.fecha.toISOString().slice(0, 10)}</span> · {describirMovimiento(m)}
                  {m.concepto && <span className="text-tinta/50"> · {m.concepto}</span>}
                </span>
                <span className={`shrink-0 ${signoMovimiento(m.tipo).clase}`}>
                  {signoMovimiento(m.tipo).signo}
                  {euros(m.importeCent)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {pasadas.length === 0 ? (
        <p className="card p-6 text-center text-tinta/60">Todavía no hay semanas registradas en la app.</p>
      ) : (
        <div className="space-y-4">
          {pasadas.map((j) => (
            <TarjetaJugada
              key={j.id}
              jugada={j}
              fija={fija}
              puedeEditar={isAdmin || (!!miembroId && (j.responsable.id === miembroId || j.echadaPor?.id === miembroId)) || (!j.echada && !!miembroId)}
            />
          ))}
        </div>
      )}

      <PremiosHistoricos
        desde={config.historicoDesde ? aIso(config.historicoDesde) : null}
        premios={historicos.map((p) => ({
          id: p.id,
          fecha: p.fecha ? aIso(p.fecha) : null,
          nombre: p.miembro.nombre,
          importeCent: p.importeCent,
          nota: p.nota,
        }))}
      />
    </div>
  );
}
