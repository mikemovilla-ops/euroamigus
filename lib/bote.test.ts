import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { formatearBote, parsearBoteFdj, parsearBoteIrlanda, proximoSorteo } from "./bote";

// Recorte con la estructura real de lottery.ie (__NEXT_DATA__ de Next.js).
const htmlIrlanda = (jackpotInfo: unknown) =>
  `<html><body><h2>€17 Million</h2><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { pageProps: { dbgConfig: { jackpotInfo } } },
  })}</script></body></html>`;

describe("bote del próximo sorteo", () => {
  it("lee el bote de la web irlandesa (céntimos) y pasa la fecha a hora de Madrid", () => {
    const b = parsearBoteIrlanda(
      htmlIrlanda([
        { gameId: "4", nextDrawDate: "2026-11-13T19:30:00.000Z", amount: 1700000000, guaranteed: true, drawId: 0 },
        { gameId: "4", nextDrawDate: "2026-11-17T19:30:00.000Z", amount: 0, guaranteed: false, drawId: 1965 },
      ])
    );
    expect(b).toEqual({ cent: 1700000000, sorteo: "2026-11-13" });
  });

  it("descarta importes que no pueden ser el bote del Euromillones", () => {
    expect(parsearBoteIrlanda(htmlIrlanda([{ nextDrawDate: "2026-11-13T19:30:00.000Z", amount: 100000 }]))).toBeNull();
    expect(parsearBoteIrlanda("<html>sin datos</html>")).toBeNull();
  });

  it("lee el bote de la FDJ como reserva", () => {
    expect(parsearBoteFdj(`<meta content="Jackpot EuroMillions de 17  M€."/>`)?.cent).toBe(1700000000);
    expect(parsearBoteFdj(`Jackpot EuroMillions de 130,5 M€`)?.cent).toBe(13050000000);
    expect(parsearBoteFdj(`otra cosa`)).toBeNull();
  });

  it("calcula el próximo sorteo (martes o viernes, el del día cuenta hasta las 21:00)", () => {
    expect(proximoSorteo(new Date("2026-11-12T10:00:00Z"))).toBe("2026-11-13"); // jueves → viernes
    expect(proximoSorteo(new Date("2026-11-13T18:00:00Z"))).toBe("2026-11-13"); // viernes 19:00 Madrid
    expect(proximoSorteo(new Date("2026-11-13T21:00:00Z"))).toBe("2026-11-17"); // viernes 22:00 Madrid → martes
    expect(proximoSorteo(new Date("2026-11-15T10:00:00Z"))).toBe("2026-11-17"); // domingo → martes
  });

  it("formatea en millones", () => {
    expect(formatearBote(1700000000)).toBe("17 millones €");
    expect(formatearBote(14189944500)).toBe("141,9 millones €");
  });
});
