import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/auth", () => ({ ADMIN_EMAILS: ["admin@gmail.com"] }));

import { direccionAvisos, escapeHtml } from "./email";

describe("avisos por email", () => {
  it("usa el email de avisos si lo hay, si no el de Google", () => {
    expect(direccionAvisos({ email: "pepe@gmail.com", emailAvisos: "pepe@trabajo.es", recibirAvisos: true })).toBe("pepe@trabajo.es");
    expect(direccionAvisos({ email: "pepe@gmail.com", emailAvisos: null, recibirAvisos: true })).toBe("pepe@gmail.com");
    expect(direccionAvisos({ email: null, emailAvisos: null, recibirAvisos: true })).toBeNull();
  });

  it("no manda nada a quien ha desactivado los avisos", () => {
    expect(direccionAvisos({ email: "pepe@gmail.com", emailAvisos: "pepe@trabajo.es", recibirAvisos: false })).toBeNull();
  });

  it("escapa el HTML de los nombres", () => {
    expect(escapeHtml(`<b>"Ruso"</b>`)).toBe("&lt;b&gt;&quot;Ruso&quot;&lt;/b&gt;");
  });
});
