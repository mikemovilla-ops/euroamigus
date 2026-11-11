import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/avisos", () => ({ avisarPremioSorteo: vi.fn() }));
vi.mock("@/lib/auth", () => ({ ADMIN_EMAILS: [] }));

import { convertirSorteoApi } from "./resultados";
import { comprobarApuesta } from "./euromillones";

// Formato real de euromillions.api.pedromealha.dev (sorteo del 30/01/2026, recortado).
const api = {
  date: "2026-01-30",
  numbers: ["14", "18", "31", "35", "46"],
  stars: ["7", "11"],
  prizes: [
    { matched_numbers: 2, matched_stars: 0, prize: 4.38, winners: 1257673 },
    { matched_numbers: 4, matched_stars: 2, prize: 1262.67, winners: 50 },
    { matched_numbers: 5, matched_stars: 2, prize: 123555827, winners: 1 },
  ],
};

describe("convertirSorteoApi", () => {
  it("pasa a números, ordena y convierte los premios a céntimos", () => {
    const s = convertirSorteoApi(api);
    expect(s.numeros).toEqual([14, 18, 31, 35, 46]);
    expect(s.estrellas).toEqual([7, 11]);
    expect(s.premios[0]).toEqual({ n: 2, e: 0, premioCent: 438, ganadores: 1257673 });
    expect(s.premios[1].premioCent).toBe(126267);
  });

  it("encaja con el cálculo de premios", () => {
    const s = convertirSorteoApi(api);
    const r = comprobarApuesta({ numeros: [14, 18, 1, 2, 3], estrellas: [1, 2] }, s);
    expect(r.categoria).toBe("2 + 0★");
    expect(r.premioCent).toBe(438);
  });
});
