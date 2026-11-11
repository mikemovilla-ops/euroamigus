import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function esEmailAdmin(email: string | null | undefined) {
  return ADMIN_EMAILS.includes((email ?? "").toLowerCase());
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "database" },
  // El error de acceso (email que no es del grupo) se muestra en la portada.
  pages: { error: "/" },
  callbacks: {
    // Solo entran los emails dados de alta como miembros (o los admins).
    async signIn({ user }) {
      const email = (user.email ?? "").toLowerCase();
      if (!email) return false;
      if (esEmailAdmin(email)) return true;
      const miembro = await prisma.miembro.findUnique({ where: { email } });
      return !!miembro;
    },
    async session({ session, user }) {
      if (session.user) {
        const email = (user.email ?? "").toLowerCase();
        const miembro = email
          ? await prisma.miembro.findUnique({ where: { email }, select: { id: true } })
          : null;
        session.user.id = user.id;
        session.user.isAdmin = esEmailAdmin(email);
        session.user.miembroId = miembro?.id ?? null;
      }
      return session;
    },
  },
};
