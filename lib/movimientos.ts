import type { TipoMov } from "@/lib/euromillones";

type Mov = { tipo: TipoMov; miembro: { nombre: string }; destino: { nombre: string } | null };

export function describirMovimiento(m: Mov): string {
  switch (m.tipo) {
    case "TRASPASO":
      return `${m.miembro.nombre} → ${m.destino?.nombre ?? "?"}`;
    case "RETIRADA":
      return `${m.miembro.nombre} reparte`;
    case "GASTO":
      return `${m.miembro.nombre} paga con el bote`;
    default:
      return `${m.miembro.nombre} tiene`;
  }
}

export function signoMovimiento(tipo: TipoMov): { signo: string; clase: string } {
  if (tipo === "INGRESO") return { signo: "+", clase: "text-acierto" };
  if (tipo === "TRASPASO") return { signo: "", clase: "text-tinta/80" };
  return { signo: "−", clase: "text-coral" };
}
