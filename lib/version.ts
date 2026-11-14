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
    version: "1.4.1",
    fecha: "2026-11-14",
    cambios: [
      "Icono propio de EuroAmigus: al guardar la web en la pantalla de inicio del móvil sale el logo, y se abre a pantalla completa como una app más.",
    ],
  },
  {
    version: "1.4.0",
    fecha: "2026-11-13",
    cambios: [
      "Resultados con los premios exactos de España (de elgordo.com), al céntimo. La fuente anterior fallaba a menudo y además daba los importes de otro país, que a veces se diferencian en un céntimo.",
      "El código ganador de El Millón se rellena solo con el oficial de España: ya no hay que meterlo a mano.",
      "El admin recibe también el email de \"Boleto subido\" cuando es él quien lo sube, como confirmación.",
    ],
  },
  {
    version: "1.3.0",
    fecha: "2026-11-12",
    cambios: [
      "En la portada se ve el bote del próximo sorteo del Euromillones, que se actualiza solo después de cada sorteo.",
      "La tarea automática diaria (avisos, resultados y bote) se ejecuta ahora siempre a las 11:00 hora de España, también en verano, y más puntual.",
    ],
  },
  {
    version: "1.2.1",
    fecha: "2026-11-11",
    cambios: ["En el móvil, Ajustes tiene su propia pestaña en la barra de abajo (antes estaba dentro de \"Tú\")."],
  },
  {
    version: "1.2.0",
    fecha: "2026-11-11",
    cambios: [
      "Admin: nuevo apartado \"Ejecución automática\" que muestra cuándo se ejecutó por última vez la tarea diaria (avisos y resultados) y qué hizo, con aviso en rojo si lleva más de un día sin ejecutarse o falló.",
      "Admin: las secciones se pliegan y despliegan; Miembros y Movimientos del bote empiezan plegadas.",
    ],
  },
  {
    version: "1.1.0",
    fecha: "2026-11-11",
    cambios: [
      "Los resultados ya no dependen de una sola fuente: si la principal no responde, se cogen del histórico oficial de la lotería francesa (FDJ). En ese caso el premio sale con \"≈\" (redondeado a 10 céntimos) y se ajusta solo al céntimo en cuanto la principal vuelve a responder.",
      "Al subir el boleto se puede indicar qué día se echó, por si se sube a la app otro día.",
      "Botón \"Corregir boleto\" también en la tarjeta de \"Esta semana\" de la portada.",
    ],
  },
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
