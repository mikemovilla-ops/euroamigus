import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { responsableSegunRotacion } from "./turnos";

describe("rotación", () => {
  const grupo = ["Ana", "Bea", "Carlos"];

  it("empieza por el primero y da la vuelta", () => {
    expect(responsableSegunRotacion(grupo, "2026-11-09", "2026-11-09")).toBe("Ana");
    expect(responsableSegunRotacion(grupo, "2026-11-09", "2026-11-16")).toBe("Bea");
    expect(responsableSegunRotacion(grupo, "2026-11-09", "2026-11-23")).toBe("Carlos");
    expect(responsableSegunRotacion(grupo, "2026-11-09", "2026-11-30")).toBe("Ana");
  });

  it("no asigna semanas anteriores al inicio ni sin miembros", () => {
    expect(responsableSegunRotacion(grupo, "2026-11-09", "2026-11-02")).toBeNull();
    expect(responsableSegunRotacion([], "2026-11-09", "2026-11-09")).toBeNull();
  });
});
