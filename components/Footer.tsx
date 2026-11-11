import Link from "next/link";
import { APP_VERSION } from "@/lib/version";

export default function Footer() {
  return (
    // pb-24 en móvil: sitio para que la barra de navegación de abajo no lo tape.
    <footer className="border-t border-tinta/10 pb-24 pt-6 text-center sm:pb-6">
      <p className="text-xs text-tinta/40">
        ★ EuroAmigus ·{" "}
        <Link href="/novedades" className="underline hover:text-tinta/70">
          v{APP_VERSION}
        </Link>
      </p>
    </footer>
  );
}
