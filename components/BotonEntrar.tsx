"use client";

import { signIn } from "next-auth/react";

export default function BotonEntrar() {
  return (
    <button className="btn-oro" onClick={() => signIn("google")}>
      Entrar con Google
    </button>
  );
}
