"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { APP_VERSION } from "@/lib/version";

// Menú igual que el de Tarados Malibú: en escritorio, enlaces arriba; en
// móvil, barra flotante abajo con iconos y una pestaña "Tú" (tu foto) que
// abre Ajustes y Salir, y arriba a la derecha un botón de refrescar.

type PropsIcono = { activo: boolean };
const svg = (activo: boolean) => ({
  viewBox: "0 0 24 24",
  width: 22,
  height: 22,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: activo ? 2.2 : 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

function IconoTurnos({ activo }: PropsIcono) {
  // Boleto
  return (
    <svg {...svg(activo)}>
      <path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4z" />
      <path d="M14.5 6v12" strokeDasharray="1.5 2" />
    </svg>
  );
}

function IconoHistorico({ activo }: PropsIcono) {
  // Reloj con flecha hacia atrás
  return (
    <svg {...svg(activo)}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
      <path d="M3.5 4v4h4" />
      <path d="M12 8v4.5l3 2" />
    </svg>
  );
}

function IconoAdmin({ activo }: PropsIcono) {
  // Deslizadores de ajustes
  return (
    <svg {...svg(activo)}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

function IconoAjustes({ activo }: PropsIcono) {
  // Engranaje (Admin usa los deslizadores, para no confundirlos)
  return (
    <svg {...svg(activo)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" />
      <circle cx="12" cy="12" r="6.5" />
    </svg>
  );
}

function IconoPerfil({ activo }: PropsIcono) {
  return (
    <svg {...svg(activo)}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
    </svg>
  );
}

export default function Nav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [navegando, startTransition] = useTransition();

  if (!session) return null;

  // Mientras carga la página nueva se atenúa la barra (y se ignoran toques
  // repetidos), para que se note que el toque ha funcionado.
  function navegar(e: React.MouseEvent, href: string) {
    e.preventDefault();
    setMenuAbierto(false);
    if (navegando) return;
    startTransition(() => {
      if (pathname === href) router.refresh();
      else router.push(href);
    });
  }

  function actualizar() {
    if (navegando) return;
    startTransition(() => router.refresh());
  }

  const pestanas = [
    { href: "/", texto: "Turnos", Icono: IconoTurnos },
    { href: "/historico", texto: "Histórico", Icono: IconoHistorico },
    { href: "/ajustes", texto: "Ajustes", Icono: IconoAjustes },
    ...(session.user.isAdmin ? [{ href: "/admin", texto: "Admin", Icono: IconoAdmin }] : []),
  ];
  const activo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const enlaceEscritorio = (href: string) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activo(href) ? "bg-oro text-nochedark" : "text-tinta/80 hover:bg-white/10"}`;

  const Avatar = ({ tam, borde }: { tam: number; borde: string }) =>
    session.user.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={session.user.image} alt={session.user.name ?? "Tú"} width={tam} height={tam} referrerPolicy="no-referrer" className={`rounded-full border ${borde}`} />
    ) : null;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-tinta/10 bg-nochedark/80 backdrop-blur">
        {navegando && <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-oro" />}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          {/* Como en Tarados: la estrella va aparte y se centra por altura;
              título y versión van juntos en otro bloque para compartir la
              línea base del texto (con la estrella dentro se descuadraba). */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Link href="/" onClick={(e) => navegar(e, "/")} className="shrink-0" aria-label="Inicio">
              <span className="estrella block h-5 w-5 bg-oro" aria-hidden />
            </Link>
            <div className="flex items-baseline gap-2">
              <Link href="/" onClick={(e) => navegar(e, "/")} className="font-display text-xl font-extrabold leading-none">
                Euro<span className="text-oro">Amigus</span>
              </Link>
              <Link href="/novedades" onClick={(e) => navegar(e, "/novedades")} className="text-[10px] leading-none text-tinta/40 hover:text-tinta/70 hover:underline">
                v{APP_VERSION}
              </Link>
            </div>
          </div>

          {/* Escritorio */}
          <nav className="hidden items-center gap-1 sm:flex">
            {pestanas.map((p) => (
              <Link key={p.href} href={p.href} onClick={(e) => navegar(e, p.href)} className={enlaceEscritorio(p.href)}>
                {p.texto}
              </Link>
            ))}
            <div className="ml-2 flex items-center gap-2 border-l border-tinta/10 pl-3">
              <Avatar tam={28} borde="border-tinta/20" />
              <button onClick={() => signOut()} className="text-sm text-tinta/60 transition hover:text-coral" title={session.user.email ?? ""}>
                Salir
              </button>
            </div>
          </nav>

          {/* Móvil: refrescar la página actual */}
          <button
            onClick={actualizar}
            disabled={navegando}
            aria-label="Actualizar página"
            className="-mr-1.5 p-1.5 text-tinta/60 transition hover:text-tinta disabled:opacity-50 sm:hidden"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={navegando ? "animate-spin" : ""}>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>
        </div>
      </header>

      {/* Móvil: barra flotante abajo */}
      {menuAbierto && <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setMenuAbierto(false)} />}
      <nav
        className={`fixed inset-x-4 bottom-4 z-40 overflow-hidden rounded-2xl border border-tinta/10 bg-nochedark/95 shadow-lg shadow-black/40 backdrop-blur-sm transition-opacity sm:hidden ${
          navegando ? "opacity-50" : "opacity-100"
        }`}
      >
        {menuAbierto && (
          <div className="flex flex-col gap-3 border-b border-tinta/10 px-4 py-3 text-sm">
            <p className="truncate text-xs text-tinta/40">{session.user.email}</p>
            <Link href="/novedades" onClick={(e) => navegar(e, "/novedades")} className="text-tinta/80 transition hover:text-tinta">
              Novedades
            </Link>
            <button
              onClick={() => {
                setMenuAbierto(false);
                signOut();
              }}
              className="text-left text-tinta/80 transition hover:text-coral"
            >
              Salir
            </button>
          </div>
        )}
        <div className="flex items-stretch justify-around">
          {pestanas.map(({ href, texto, Icono }) => (
            <Link
              key={href}
              href={href}
              onClick={(e) => navegar(e, href)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition ${activo(href) ? "text-oro" : "text-tinta/50"}`}
            >
              <Icono activo={activo(href)} />
              {texto}
            </Link>
          ))}
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition ${
              menuAbierto ? "text-oro" : "text-tinta/50"
            }`}
          >
            {session.user.image ? (
              <Avatar tam={22} borde={menuAbierto ? "border-oro" : "border-tinta/30"} />
            ) : (
              <IconoPerfil activo={menuAbierto} />
            )}
            Tú
          </button>
        </div>
      </nav>
    </>
  );
}
