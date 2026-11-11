// Arranca `next dev` mostrando además la dirección de la red local, para
// poder abrir la app desde el móvil (misma WiFi) sin tener que ir a buscar
// la IP a mano con ipconfig/ifconfig cada vez.
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PUERTO = process.env.PORT || 3000;

function ipLocal() {
  const interfaces = os.networkInterfaces();
  for (const nombre of Object.keys(interfaces)) {
    for (const iface of interfaces[nombre] ?? []) {
      // IPv4, no interna (descarta 127.0.0.1) y no una IP "virtual" de
      // Docker/WSL/VPN habituales, para quedarnos con la de verdad de casa.
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

const ip = ipLocal();
if (ip) {
  console.log(`  \x1b[36m📱 Red local:\x1b[0m   http://${ip}:${PUERTO}  (para abrir desde el móvil en la misma WiFi)\n`);
} else {
  console.log("  ⚠ No se ha encontrado una IP de red local — ¿estás conectado a alguna red?\n");
}

// Se ejecuta el propio script de next (node_modules/next/dist/bin/next) con
// el mismo Node que ya está corriendo esto, en vez de pasar por npx o por
// el .cmd de node_modules/.bin — así funciona igual en Windows/Mac/Linux
// sin necesitar `shell: true` (que en Windows exige el .cmd, pero con un
// array de argumentos Node avisa de que no es seguro).
const nextCli = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
const next = spawn(process.execPath, [nextCli, "dev"], { stdio: "inherit" });
next.on("exit", (code) => process.exit(code ?? 0));
