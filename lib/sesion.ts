import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";

type Ok = { session: Session; error?: undefined };
type Err = { session?: undefined; error: NextResponse };

export async function requiereSesion(): Promise<Ok | Err> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "Tienes que entrar primero." }, { status: 401 }) };
  return { session };
}

export async function requiereAdmin(): Promise<Ok | Err> {
  const r = await requiereSesion();
  if (r.error) return r;
  if (!r.session.user.isAdmin) return { error: NextResponse.json({ error: "Solo el admin puede hacer esto." }, { status: 403 }) };
  return r;
}

export function errorJson(mensaje: string, status = 400) {
  return NextResponse.json({ error: mensaje }, { status });
}
