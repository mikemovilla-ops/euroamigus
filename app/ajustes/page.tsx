import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FormAjustes from "@/components/FormAjustes";

export const dynamic = "force-dynamic";

export default async function Ajustes() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const miembro = session.user.miembroId ? await prisma.miembro.findUnique({ where: { id: session.user.miembroId } }) : null;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold">Ajustes</h1>
      <section className="card p-4 sm:p-5">
        {miembro ? (
          <>
            <h2 className="mb-4 text-lg font-bold">{miembro.nombre}</h2>
            <FormAjustes emailGoogle={miembro.email ?? session.user.email ?? ""} emailAvisos={miembro.emailAvisos} recibirAvisos={miembro.recibirAvisos} />
          </>
        ) : (
          <p className="text-tinta/70">
            Tu email de Google ({session.user.email}) no está asignado a ningún miembro. {session.user.isAdmin && "Asígnatelo en Admin → Miembros."}
          </p>
        )}
      </section>
    </div>
  );
}
