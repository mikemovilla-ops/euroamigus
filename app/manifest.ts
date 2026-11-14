import type { MetadataRoute } from "next";

// Para "Añadir a pantalla de inicio": nombre, colores e iconos de la app
// (el iPhone usa además app/apple-icon.png). Iconos generados desde
// logo1.png con scripts/generar-iconos.ps1.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EuroAmigus",
    short_name: "EuroAmigus",
    description: "Turnos, boletos y premios del Euromillones del grupo",
    start_url: "/",
    display: "standalone",
    background_color: "#0B1437",
    theme_color: "#0B1437",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
