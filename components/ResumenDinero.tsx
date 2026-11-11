import { euros, type Totales } from "@/lib/euromillones";

export default function ResumenDinero({ totales, compacto = false }: { totales: Totales; compacto?: boolean }) {
  const tiles = [
    { titulo: "Bote del grupo", valor: euros(totales.boteCent), nota: "Lo que tenemos guardado", color: "text-oro" },
    {
      titulo: "Balance",
      valor: euros(totales.balanceCent, true),
      nota: `Aproximado desde 2020: ${euros(totales.premiosCent)} ganados − ${euros(totales.gastadoCent)} jugados`,
      color: totales.balanceCent >= 0 ? "text-acierto" : "text-coral",
    },
    ...(compacto
      ? []
      : [{ titulo: "Semanas jugadas", valor: String(totales.semanasJugadas), nota: "En total, contando las de antes de la app", color: "text-tinta" }]),
  ];
  return (
    <div className={`grid gap-3 ${compacto ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
      {tiles.map((t) => (
        <div key={t.titulo} className="card p-4">
          <p className="etiqueta">{t.titulo}</p>
          <p className={`mt-1 font-display text-2xl font-bold sm:text-3xl ${t.color}`}>{t.valor}</p>
          <p className="mt-1 text-xs text-tinta/50">{t.nota}</p>
        </div>
      ))}
    </div>
  );
}
