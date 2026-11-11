import { describe, expect, it } from "vitest";
import { lunesDe, semanaActiva, semanasEntre, sorteoCelebrado, sorteosDeSemana, sumarDias } from "./fechas";

describe("fechas", () => {
  it("lunesDe devuelve el lunes de la semana", () => {
    expect(lunesDe("2026-11-10")).toBe("2026-11-09"); // martes
    expect(lunesDe("2026-11-09")).toBe("2026-11-09"); // lunes
    expect(lunesDe("2026-11-15")).toBe("2026-11-09"); // domingo
  });

  it("sorteosDeSemana da martes y viernes", () => {
    expect(sorteosDeSemana("2026-11-09")).toEqual(["2026-11-10", "2026-11-13"]);
  });

  it("semanasEntre cuenta semanas completas, también cruzando el cambio de hora", () => {
    expect(semanasEntre("2026-10-19", "2026-11-09")).toBe(3);
    expect(semanasEntre("2026-11-09", "2026-11-09")).toBe(0);
    expect(sumarDias("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("semanaActiva salta a la siguiente el fin de semana", () => {
    expect(semanaActiva(new Date("2026-11-13T12:00:00Z"))).toBe("2026-11-09"); // viernes
    expect(semanaActiva(new Date("2026-11-14T12:00:00Z"))).toBe("2026-11-16"); // sábado
  });

  it("sorteoCelebrado espera a las 23:00 de Madrid del mismo día", () => {
    expect(sorteoCelebrado("2026-11-10", new Date("2026-11-10T20:00:00Z"))).toBe(false); // 21:00 Madrid
    expect(sorteoCelebrado("2026-11-10", new Date("2026-11-10T22:30:00Z"))).toBe(true); // 23:30 Madrid
    expect(sorteoCelebrado("2026-11-10", new Date("2026-11-11T08:00:00Z"))).toBe(true);
  });
});
