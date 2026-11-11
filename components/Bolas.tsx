type Tam = "sm" | "md";

const TAM_BOLA: Record<Tam, string> = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm" };
const TAM_ESTRELLA: Record<Tam, string> = { sm: "h-8 w-8 text-[11px]", md: "h-10 w-10 text-xs" };

export function Bola({ n, acierto, tam = "md" }: { n: number; acierto?: boolean; tam?: Tam }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold ${TAM_BOLA[tam]} ${
        acierto ? "bg-acierto text-nochedark ring-2 ring-acierto/50 ring-offset-2 ring-offset-noche" : "bg-tinta text-noche"
      }`}
    >
      {n}
    </span>
  );
}

export function Estrella({ n, acierto, tam = "md" }: { n: number; acierto?: boolean; tam?: Tam }) {
  return (
    <span
      className={`estrella inline-flex shrink-0 items-center justify-center pt-1 font-display font-bold ${TAM_ESTRELLA[tam]} ${
        acierto ? "bg-acierto text-nochedark" : "bg-oro text-nochedark"
      }`}
    >
      {n}
    </span>
  );
}

export function Combinacion({
  numeros,
  estrellas,
  aciertosNumeros = [],
  aciertosEstrellas = [],
  tam = "md",
}: {
  numeros: number[];
  estrellas: number[];
  aciertosNumeros?: number[];
  aciertosEstrellas?: number[];
  tam?: Tam;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {numeros.map((n) => (
        <Bola key={`n${n}`} n={n} tam={tam} acierto={aciertosNumeros.includes(n)} />
      ))}
      <span className="w-1" />
      {estrellas.map((e) => (
        <Estrella key={`e${e}`} n={e} tam={tam} acierto={aciertosEstrellas.includes(e)} />
      ))}
    </div>
  );
}
