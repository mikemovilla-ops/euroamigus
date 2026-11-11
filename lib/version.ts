// Historial de versiones de la app. Añade una entrada nueva ARRIBA del todo
// cada vez que despliegues una mejora — `APP_VERSION` se calcula siempre a
// partir de la primera entrada, así que no hace falta tocar nada más. El
// pop-up de novedades (components/VersionPopup.tsx) usa este mismo listado
// para mostrar, a cada usuario, lo que ha cambiado desde la última vez que
// entró. (Mismo sistema que en Tarados Malibú.)
export type Cambio =
  | string
  | {
      texto: string;
      // Etiqueta destacada al lado del texto, p. ej. "Idea de Padilla".
      origen: string;
    };

export type EntradaVersion = {
  version: string;
  fecha: string; // YYYY-MM-DD
  cambios: Cambio[];
  // Marca un hito: se dibuja una línea divisoria encima de esta entrada.
  hito?: boolean;
};

export const HISTORIAL_VERSIONES: EntradaVersion[] = [
  {
    version: "1.0.1",
    fecha: "2026-11-11",
    cambios: [
      "Arreglado el formulario para subir el boleto: salía recortado dentro de la tarjeta de \"Esta semana\" y no se veían la foto ni los números. Ahora se abre como ventana a pantalla completa.",
    ],
  },
  {
    version: "1.0.0",
    fecha: "2026-11-11",
    hito: true,
    cambios: [
      "🎉 Primera versión de EuroAmigus.",
      "Turnos: a quién le toca cada semana y los próximos 10; cada uno puede intercambiar su semana con otra.",
      "Registrar el boleto desde el móvil: foto (cámara o galería), la apuesta variable y los códigos de El Millón. La apuesta fija se pone sola. Si lo echa otro en tu lugar, también puede subirlo.",
      "Resultados automáticos de martes y viernes, con los aciertos y el premio de cada apuesta. El código ganador de El Millón lo mete el admin.",
      "Histórico con bote, balance aproximado desde 2020 y quién tiene el dinero, incluidos los premios de antes de la app.",
      "Avisos por email: te toca (lunes), recordatorio si el martes no está subido, boleto subido y premios. Cada uno elige el email en Ajustes.",
    ],
  },
];

export const APP_VERSION = HISTORIAL_VERSIONES[0].version;
