import { describe, expect, it } from "vitest";
import { parsearElGordo, urlElGordo } from "./elgordo";
import { comprobarApuesta } from "./euromillones";

// Recorte del HTML real de elgordo.com (sorteo del 10/11/2026), con sus
// comentarios de React y etiquetas, para probar la limpieza.
const html10nov = `<div class="c"><span>Último Resultado</span><!-- --> <h2>martes, 10 noviembre 2026</h2>
<ul><li>15</li><li>18</li><li>31</li><li>37</li><li>41</li><li class="e">1</li><li class="e">5</li></ul>
<table><tr><th>Categoría</th><th>Ganadores</th><th>Premio</th></tr>
<tr><td class="i txt-color bold">5+2</td><td>1</td><td>141.899.445,00 €</td></tr>
<tr><td>5+1</td><td>2</td><td>369.732,75 €</td></tr><tr><td>5+0</td><td>3</td><td>57.608,42 €</td></tr>
<tr><td>4+2</td><td>32</td><td>1.682,21 €</td></tr><tr><td>4+1</td><td>733</td><td>135,28 €</td></tr>
<tr><td>3+2</td><td>1.479</td><td>70,88 €</td></tr><tr><td>4+0</td><td>1.541</td><td>47,80 €</td></tr>
<tr><td>2+2</td><td>23.501</td><td>15,67 €</td></tr><tr><td>3+1</td><td>32.343</td><td>12,70 €</td></tr>
<tr><td>3+0</td><td>72.258</td><td>10,59 €</td></tr><tr><td>1+2</td><td>130.007</td><td>7,13 €</td></tr>
<tr><td>2+1</td><td>488.308</td><td>5,98 €</td></tr><tr><td>2+0</td><td>1.091.588</td><td>4,31 €</td></tr></table>
<p>El Millón en España: <!-- --> <b>HJL 03816</b></p><p>Recaudación 56.664.022,80 €</p><p>Bote 141.000.000,00 €</p>
<p>Próximo bote 17.000.000,00 €</p></div>`;

describe("resultados de elgordo.com", () => {
  it("construye la dirección de cada sorteo", () => {
    expect(urlElGordo("2026-11-10")).toBe("https://www.elgordo.com/es/resultados/euromillones--2026-11-10-martes");
    expect(urlElGordo("2026-11-13")).toBe("https://www.elgordo.com/es/resultados/euromillones--2026-11-13-viernes");
  });

  it("lee combinación, premios exactos de España y El Millón", () => {
    const s = parsearElGordo(html10nov, "2026-11-10")!;
    expect(s.numeros).toEqual([15, 18, 31, 37, 41]);
    expect(s.estrellas).toEqual([1, 5]);
    expect(s.premios).toHaveLength(13);
    expect(s.premios[0]).toEqual({ n: 5, e: 2, ganadores: 1, premioCent: 14_189_944_500 });
    expect(s.premios.find((p) => p.n === 2 && p.e === 0)).toEqual({ n: 2, e: 0, ganadores: 1_091_588, premioCent: 431 });
    expect(s.premios.find((p) => p.n === 4 && p.e === 2)?.premioCent).toBe(168221);
    expect(s.millon).toEqual(["HJL03816"]);
  });

  it("encaja con el cálculo de premios", () => {
    const s = parsearElGordo(html10nov, "2026-11-10")!;
    expect(comprobarApuesta({ numeros: [15, 18, 2, 3, 4], estrellas: [6, 7] }, s).premioCent).toBe(431);
  });

  it("no acepta la página si es de otro sorteo (la web enseña el último si no existe)", () => {
    expect(parsearElGordo(html10nov, "2026-11-13")).toBeNull();
  });

  it("no acepta una tabla incompleta", () => {
    expect(parsearElGordo(html10nov.replace(/<tr><td>2\+0<\/td>.*?<\/tr>/, ""), "2026-11-10")).toBeNull();
  });
});
