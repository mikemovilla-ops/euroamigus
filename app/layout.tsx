import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import VersionPopup from "@/components/VersionPopup";

const display = Outfit({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "EuroAmigus",
  description: "Turnos, boletos e histórico del Euromillones del grupo",
  // Al guardarla en la pantalla de inicio del iPhone: se abre a pantalla
  // completa (sin barra de Safari) y con este nombre bajo el icono
  // (app/apple-icon.png).
  appleWebApp: { capable: true, title: "EuroAmigus", statusBarStyle: "black" },
};

export const viewport: Viewport = { themeColor: "#0B1437" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable} cielo flex min-h-screen flex-col bg-noche font-body text-tinta`}>
        <Providers>
          <Nav />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 pt-6">{children}</main>
          <Footer />
          <VersionPopup />
        </Providers>
      </body>
    </html>
  );
}
