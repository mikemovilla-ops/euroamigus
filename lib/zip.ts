import { inflateRawSync } from "zlib";

// Lector mínimo de ZIP para sacar el primer archivo (el CSV de la FDJ), sin
// añadir dependencias. Lee el directorio central, que siempre trae los
// tamaños correctos (la cabecera local puede no traerlos).
export function primerArchivoDelZip(zip: Buffer): { nombre: string; datos: Buffer } {
  // Fin del directorio central: firma 0x06054b50, buscada desde el final.
  let fin = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error("ZIP no válido: no hay directorio central");
  const inicioDirectorio = zip.readUInt32LE(fin + 16);
  if (zip.readUInt32LE(inicioDirectorio) !== 0x02014b50) throw new Error("ZIP no válido: directorio central corrupto");

  const metodo = zip.readUInt16LE(inicioDirectorio + 10);
  const tamComprimido = zip.readUInt32LE(inicioDirectorio + 20);
  const largoNombre = zip.readUInt16LE(inicioDirectorio + 28);
  const cabeceraLocal = zip.readUInt32LE(inicioDirectorio + 42);
  const nombre = zip.toString("utf8", inicioDirectorio + 46, inicioDirectorio + 46 + largoNombre);

  if (zip.readUInt32LE(cabeceraLocal) !== 0x04034b50) throw new Error("ZIP no válido: cabecera local corrupta");
  const inicioDatos = cabeceraLocal + 30 + zip.readUInt16LE(cabeceraLocal + 26) + zip.readUInt16LE(cabeceraLocal + 28);
  const comprimido = zip.subarray(inicioDatos, inicioDatos + tamComprimido);

  if (metodo === 0) return { nombre, datos: Buffer.from(comprimido) };
  if (metodo === 8) return { nombre, datos: inflateRawSync(comprimido) };
  throw new Error(`ZIP con compresión no soportada (${metodo})`);
}
