import { describe, expect, it } from "vitest";
import {
  calcularJugada,
  calcularTenencia,
  calcularTotales,
  comprobarApuesta,
  comprobarMillon,
  parsearCodigos,
  PREMIO_MILLON_CENT,
  validarApuesta,
  type SorteoDatos,
} from "./euromillones";

const sorteo: SorteoDatos = {
  fecha: "2026-11-10",
  numeros: [13, 17, 30, 31, 44],
  estrellas: [2, 9],
  premios: [
    { n: 2, e: 0, premioCent: 438, ganadores: 1 },
    { n: 2, e: 1, premioCent: 594, ganadores: 1 },
    { n: 5, e: 2, premioCent: 100_000_000_00, ganadores: 1 },
  ],
};

const fija = { numeros: [13, 17, 23, 28, 41], estrellas: [2, 12] };

describe("euromillones", () => {
  it("valida apuestas", () => {
    expect(validarApuesta(fija)).toBeNull();
    expect(validarApuesta({ numeros: [1, 1, 2, 3, 4], estrellas: [1, 2] })).toMatch(/números/);
    expect(validarApuesta({ numeros: [1, 2, 3, 4, 51], estrellas: [1, 2] })).toMatch(/números/);
    expect(validarApuesta({ numeros: [1, 2, 3, 4, 5], estrellas: [1, 13] })).toMatch(/estrellas/);
  });

  it("cuenta aciertos y busca la categoría (premio en bruto)", () => {
    const r = comprobarApuesta(fija, sorteo);
    expect(r.aciertosNumeros).toEqual([13, 17]);
    expect(r.aciertosEstrellas).toEqual([2]);
    expect(r.categoria).toBe("2 + 1★");
    expect(r.premioCent).toBe(594);
    expect(comprobarApuesta({ numeros: [13, 17, 30, 31, 44], estrellas: [2, 9] }, sorteo).premioCent).toBe(100_000_000_00);
  });

  it("sin categoría no hay premio", () => {
    const r = comprobarApuesta({ numeros: [1, 2, 3, 4, 5], estrellas: [1, 3] }, sorteo);
    expect(r.categoria).toBeNull();
    expect(r.premioCent).toBe(0);
  });

  it("calcula jugada y marca pendientes los sorteos sin resultado ni código de El Millón", () => {
    const r = calcularJugada(
      { semana: "2026-11-09", echada: true, importeCent: 1000, apuestas: [fija, fija], millon: [["ABC12345"], ["ABC12346"]] },
      ["2026-11-10", "2026-11-13"],
      new Map([["2026-11-10", sorteo]]),
      new Map([["2026-11-10", ["ZZZ00000"]]]),
      () => true
    );
    expect(r.premioCent).toBe(1188);
    expect(r.pendiente).toBe(true);
    expect(r.millonPendiente).toBe(true);
    expect(r.porSorteo[0].millon.premiados).toEqual([]);
  });

  it("suma El Millón si coincide el código", () => {
    const r = calcularJugada(
      { semana: "2026-11-09", echada: true, importeCent: 1000, apuestas: [fija], millon: [["ABC12345"], []] },
      ["2026-11-10", "2026-11-13"],
      new Map(),
      new Map([["2026-11-10", ["ABC12345"]]]),
      () => false
    );
    expect(r.porSorteo[0].millon.premiados).toEqual(["ABC12345"]);
    expect(r.premioCent).toBe(PREMIO_MILLON_CENT);
  });

  it("calcula bote y balance", () => {
    const t = calcularTotales(
      [
        { echada: true, importeCent: 1000, premioCent: 1188 },
        { echada: true, importeCent: 1000, premioCent: 0 },
        { echada: false, importeCent: 1000, premioCent: 0 },
      ],
      [
        { tipo: "INGRESO", importeCent: 5000, miembroId: "ana" },
        { tipo: "GASTO", importeCent: 1000, miembroId: "ana" },
        { tipo: "TRASPASO", importeCent: 2000, miembroId: "ana", destinoId: "bea" },
      ]
    );
    expect(t.gastadoCent).toBe(2000);
    expect(t.balanceCent).toBe(-812);
    expect(t.boteCent).toBe(1188 + 5000 - 1000);
    expect(t.semanasJugadas).toBe(2);
  });
});

describe("quién tiene el dinero", () => {
  it("el premio lo tiene el titular y los movimientos lo mueven; la suma cuadra con el bote", () => {
    const jugadas = [
      { echada: true, importeCent: 1000, premioCent: 5000, titularId: "ana" },
      { echada: true, importeCent: 1000, premioCent: 1200, titularId: "bea" },
      { echada: true, importeCent: 1000, premioCent: 0, titularId: "carlos" },
    ];
    const movimientos = [
      { tipo: "TRASPASO" as const, importeCent: 2000, miembroId: "ana", destinoId: "bea" },
      { tipo: "GASTO" as const, importeCent: 1000, miembroId: "bea" },
      { tipo: "RETIRADA" as const, importeCent: 3000, miembroId: "ana" },
      { tipo: "INGRESO" as const, importeCent: 700, miembroId: "carlos" },
    ];
    const t = calcularTenencia(jugadas, movimientos);
    expect(t.get("ana")).toBe(0);
    expect(t.get("bea")).toBe(2200);
    expect(t.get("carlos")).toBe(700);
    const suma = Array.from(t.values()).reduce((a, b) => a + b, 0);
    expect(suma).toBe(calcularTotales(jugadas, movimientos).boteCent);
  });

  it("los premios de antes de la app suman a quien los cobró y al bote, y lo jugado entonces al balance", () => {
    const historicos = [
      { miembroId: "ana", importeCent: 376 },
      { miembroId: "carlos", importeCent: 500 },
    ];
    const t = calcularTenencia([], [{ tipo: "GASTO", importeCent: 1000, miembroId: "ana" }], historicos);
    expect(t.get("ana")).toBe(-624);
    expect(t.get("carlos")).toBe(500);
    const tot = calcularTotales([{ echada: true, importeCent: 1000, premioCent: 0 }], [], { premiosCent: 876, gastadoCent: 3000, semanas: 3 });
    expect(tot.premiosCent).toBe(876);
    expect(tot.gastadoCent).toBe(4000);
    expect(tot.balanceCent).toBe(876 - 4000);
    expect(tot.boteCent).toBe(876);
    expect(tot.semanasJugadas).toBe(4);
  });
});

describe("El Millón", () => {
  it("parsea códigos escritos de cualquier forma", () => {
    expect(parsearCodigos("abc 12345")).toEqual(["ABC12345"]);
    expect(parsearCodigos("ABC12345, xyz-67890\nABC12345")).toEqual(["ABC12345", "XYZ67890"]);
    expect(parsearCodigos("")).toEqual([]);
    expect(parsearCodigos("AB123456")).toBeNull();
    expect(parsearCodigos("ABC1234")).toBeNull();
  });

  it("sin código ganador no hay premio ni se da por perdido", () => {
    expect(comprobarMillon(["ABC12345"], null)).toEqual({ codigos: ["ABC12345"], ganadores: null, premiados: [], premioCent: 0 });
  });
});
