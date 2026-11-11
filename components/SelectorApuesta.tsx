"use client";

type Props = {
  numeros: number[];
  estrellas: number[];
  onChange: (v: { numeros: number[]; estrellas: number[] }) => void;
};

// Rejilla para marcar 5 números (1-50) y 2 estrellas (1-12), como en el
// boleto de papel.
export default function SelectorApuesta({ numeros, estrellas, onChange }: Props) {
  const toggle = (lista: number[], x: number, max: number) =>
    lista.includes(x) ? lista.filter((y) => y !== x) : lista.length < max ? [...lista, x] : lista;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="etiqueta">Números</span>
          <span className={`text-xs ${numeros.length === 5 ? "text-acierto" : "text-tinta/50"}`}>{numeros.length}/5</span>
        </div>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => {
            const sel = numeros.includes(n);
            return (
              <button
                type="button"
                key={n}
                onClick={() => onChange({ numeros: toggle(numeros, n, 5), estrellas })}
                className={`aspect-square rounded-full text-[13px] font-bold transition sm:text-sm ${
                  sel ? "bg-tinta text-noche shadow-[0_0_0_2px_#F5C542]" : "border border-tinta/30 bg-white/[0.04] text-tinta/90 hover:border-tinta/70"
                } ${!sel && numeros.length === 5 ? "opacity-35" : ""}`}
                aria-pressed={sel}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="etiqueta">Estrellas</span>
          <span className={`text-xs ${estrellas.length === 2 ? "text-acierto" : "text-tinta/50"}`}>{estrellas.length}/2</span>
        </div>
        <div className="mx-auto grid max-w-sm grid-cols-6 gap-x-2 gap-y-1 sm:max-w-none sm:grid-cols-12">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((e) => {
            const sel = estrellas.includes(e);
            return (
              <button
                type="button"
                key={e}
                onClick={() => onChange({ numeros, estrellas: toggle(estrellas, e, 2) })}
                className={`estrella mx-auto aspect-square w-full max-w-[3rem] pt-1 text-[13px] font-bold transition ${
                  sel ? "bg-oro text-nochedark" : "bg-oro/35 text-tinta hover:bg-oro/55"
                } ${!sel && estrellas.length === 2 ? "opacity-35" : ""}`}
                aria-pressed={sel}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
