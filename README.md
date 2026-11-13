# EuroAmigus

App para el Euromillones del grupo: 10 amigos, cada semana a uno le toca
echar el boleto (2 apuestas para martes y viernes, 10 €).

- **🎟️ Turnos**: a quién le toca esta semana y las próximas 10. Cada uno
  puede intercambiar su turno con otra semana. Quien lo echa sube la foto
  del boleto y marca los números de la apuesta variable (la fija
  13 17 23 28 41 ★ 2 12 se añade sola).
- **📜 Histórico**: todas las semanas con foto, números, combinación ganadora
  de martes y viernes, aciertos y premio. Arriba, el **bote del grupo**, el
  **balance** (ganado − jugado) y **quién tiene el dinero**: el premio de
  cada semana lo tiene quien echó el boleto, hasta que el admin apunte que
  se lo ha pasado a otro, lo ha repartido o lo ha usado para jugar.
- **Resultados automáticos**: se descargan solos (al abrir la app y en la
  tarea diaria de las 11:00) de **elgordo.com**, que da los premios exactos
  de España. Si no responde, de reserva el histórico oficial de la **FDJ**
  francesa (premios redondeados a 0,10 €, marcados con ≈ y corregidos solos
  en cuanto responde elgordo.com). Los premios se muestran en bruto.
- **★ El Millón**: quien registra el boleto mete los códigos de El Millón
  (martes y viernes). El código ganador oficial de España se rellena solo
  desde elgordo.com (también corrige uno metido a mano que no coincida) y la
  app comprueba si ha tocado. Mientras falte, la semana sale como
  "pendiente de comprobar".
- **⚙️ Admin**: miembros y orden de la rotación, semana de inicio, apuesta
  fija, movimientos del bote (saldo inicial, repartos, pagos con el bote) y
  meter/corregir un sorteo a mano si la API falla.

- **✉️ Avisos por email** (Gmail SMTP): el lunes a quien le toca, el martes
  si aún no se ha subido el boleto, a todos cuando alguien lo sube y a todos
  cuando toca un premio (Euromillones o El Millón). Cada uno puede poner en
  **👤 Ajustes** un email de avisos distinto del de Google, o desactivarlos.
  Una tarea diaria de Vercel Schedules (`/api/cron/diario`, a las 11:00 de
  Madrid) manda los de lunes/martes y descarga resultados; cada ejecución
  queda en Admin → Ejecución automática. Fuera de producción los avisos solo
  llegan a los admins.

Solo pueden entrar los emails dados de alta como miembros (y los admins).

## Puesta en marcha

Es el mismo stack que Tarados Malibú (Next.js + Prisma + NextAuth con
Google + Neon + Vercel + Vercel Blob), así que puedes reaprovechar las
cuentas.

1. **Base de datos**: en Neon, crea un proyecto nuevo (o una base de datos
   nueva en el mismo proyecto) y copia las dos URLs en `DATABASE_URL` y
   `DIRECT_URL`.
2. **Google OAuth**: en Google Cloud Console crea un cliente OAuth "Aplicación
   web" (o reutiliza el de Tarados añadiendo los orígenes nuevos) con:
   - Origen: `http://localhost:3000` y `https://<tu-app>.vercel.app`
   - Redirección: `http://localhost:3000/api/auth/callback/google` y
     `https://<tu-app>.vercel.app/api/auth/callback/google`
3. **Local**: copia `.env.example` a `.env`, rellénalo y ejecuta:
   ```
   npm install
   npm run db:push
   npm run dev
   ```
4. **Vercel**: sube el repo a GitHub, impórtalo en Vercel y añade las
   variables de `.env` (con `NEXTAUTH_URL` = la URL de Vercel). En
   *Storage* crea un **Blob** y conéctalo al proyecto (rellena solo
   `BLOB_READ_WRITE_TOKEN`). Pon un `CRON_SECRET` cualquiera: la tarea
   diaria de `vercel.json` (Vercel Schedules) lo manda para que la app sepa
   que la llamada es de Vercel. Tras desplegar, compruébala en Vercel →
   **Schedules** → `diario` → *Run Schedule*.
5. **Primer uso**: entra con tu cuenta (la de `ADMIN_EMAILS`), ve a
   **Admin**, añade a los 10 con su email de Google en el orden de los
   turnos y elige la semana de inicio (esa semana le toca al primero).
   Si ya tenéis dinero guardado, apúntalo como *Ingreso* en el bote.

## Tests

```
npm test
```
