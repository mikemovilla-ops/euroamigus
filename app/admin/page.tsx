import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/turnos";
import { aDate, aIso, formatearFecha, hoyMadrid, sorteoCelebrado, sorteosDeSemana } from "@/lib/fechas";
import AdminMiembros from "@/components/admin/AdminMiembros";
import AdminConfig from "@/components/admin/AdminConfig";
import AdminMovimientos from "@/components/admin/AdminMovimientos";
import AdminSorteos from "@/components/admin/AdminSorteos";
import AdminMillon from "@/components/admin/AdminMillon";
import EstadoCron from "@/components/admin/EstadoCron";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const session = await getServerSession(authOptions);
  if (!session?.user.isAdmin) redirect("/");

  const [config, miembros, movimientos, echadas, millones] = await Promise.all([
    getConfig(),
    prisma.miembro.findMany({ orderBy: [{ activo: "desc" }, { orden: "asc" }] }),
    prisma.movimiento.findMany({
      orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
      include: { miembro: { select: { id: true, nombre: true } }, destino: { select: { id: true, nombre: true } } },
    }),
    prisma.jugada.findMany({
      where: { echada: true },
      select: { semana: true, millonMartes: true, millonViernes: true },
      orderBy: { semana: "desc" },
    }),
    prisma.millon.findMany(),
  ]);

  // El Millón: todos los sorteos jugados y celebrados, pendientes primero;
  // de los ya comprobados solo los últimos para no hacer la lista eterna.
  const ganadoresMillon = new Map(millones.map((m) => [aIso(m.fecha), m.codigos]));
  const sorteosMillon = echadas
    .flatMap((j) => {
      const [martes, viernes] = sorteosDeSemana(aIso(j.semana));
      return [
        { fecha: viernes, nuestros: j.millonViernes },
        { fecha: martes, nuestros: j.millonMartes },
      ];
    })
    .filter((s) => sorteoCelebrado(s.fecha))
    .map((s) => ({
      ...s,
      fechaTexto: formatearFecha(s.fecha, { weekday: "long", day: "numeric", month: "short", year: "numeric" }),
      ganadores: ganadoresMillon.get(s.fecha) ?? null,
    }));
  const filasMillon = [...sorteosMillon.filter((s) => !s.ganadores), ...sorteosMillon.filter((s) => s.ganadores).slice(0, 6)];

  const fechas = echadas.flatMap((j) => sorteosDeSemana(aIso(j.semana))).filter((f) => sorteoCelebrado(f));
  const guardados = new Set(
    (await prisma.sorteo.findMany({ where: { fecha: { in: fechas.map(aDate) } }, select: { fecha: true } })).map((s) => aIso(s.fecha))
  );
  const pendientes = fechas.filter((f) => !guardados.has(f)).sort();
  const primero = miembros.find((m) => m.activo)?.nombre ?? null;

  // Registro del cron. Si la tabla aún no existe en esta base de datos (falta
  // el db:push), que no se caiga la página de Admin entera.
  let ejecuciones: { id: string; fecha: Date; ok: boolean; resumen: string }[] | null;
  try {
    ejecuciones = await prisma.ejecucionCron.findMany({ orderBy: { fecha: "desc" }, take: 10 });
  } catch {
    ejecuciones = null;
  }

  // Secciones desplegables: las de uso diario abiertas, Miembros y
  // Movimientos plegadas (se tocan poco y ocupan mucho).
  const Seccion = ({
    titulo,
    resumen,
    id,
    plegada = false,
    children,
  }: {
    titulo: string;
    resumen?: string;
    id?: string;
    plegada?: boolean;
    children: React.ReactNode;
  }) => (
    <details id={id} open={!plegada} className="card group scroll-mt-20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="text-lg font-bold">{titulo}</span>
          {resumen && <span className="ml-2 text-sm text-tinta/50">{resumen}</span>}
        </span>
        <span className="text-tinta/50 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
    </details>
  );

  return (
    <div className="space-y-4">
      <h1 className="mb-2 font-display text-3xl font-extrabold">Admin</h1>

      <Seccion titulo="Ejecución automática">
        <EstadoCron ejecuciones={ejecuciones} />
      </Seccion>

      <Seccion titulo="Miembros y orden de turnos" resumen={`${miembros.filter((m) => m.activo).length} activos`} plegada>
        <AdminMiembros
          iniciales={miembros.map((m) => ({ id: m.id, nombre: m.nombre, email: m.email, emailAvisos: m.emailAvisos, activo: m.activo }))}
        />
      </Seccion>

      <Seccion titulo="Configuración">
        <AdminConfig
          inicioRotacion={config.inicioRotacion ? aIso(config.inicioRotacion) : null}
          primero={primero}
          fija={{ numeros: config.numerosFijos, estrellas: config.estrellasFijas }}
          importeSemanalCent={config.importeSemanalCent}
        />
      </Seccion>

      <Seccion titulo="Bote del grupo: movimientos" resumen={`${movimientos.length}`} plegada>
        <AdminMovimientos
          hoy={hoyMadrid()}
          miembros={miembros.map((m) => ({ id: m.id, nombre: m.nombre }))}
          movimientos={movimientos.map((m) => ({
            id: m.id,
            fecha: aIso(m.fecha),
            tipo: m.tipo,
            importeCent: m.importeCent,
            concepto: m.concepto,
            miembro: m.miembro,
            destino: m.destino,
          }))}
        />
      </Seccion>

      <Seccion titulo="El Millón" id="millon">
        <AdminMillon filas={filasMillon} />
      </Seccion>

      <Seccion titulo="Resultados de los sorteos">
        <AdminSorteos pendientes={pendientes} />
      </Seccion>
    </div>
  );
}
