import { describe, expect, it } from "vitest";
import { deflateRawSync } from "zlib";
import { parsearCsvFdj } from "./fdj";
import { primerArchivoDelZip } from "./zip";
import { comprobarApuesta } from "./euromillones";

// Cabecera y fila con el formato real del CSV de la FDJ (sorteo del
// 10/11/2026; solo las columnas que usamos, en otro orden a propósito).
function csvDePrueba() {
  const rapports = ["141899445,00", "369732,70", "57608,40", "1682,20", "135,20", "70,80", "47,80", "15,60", "12,70", "10,50", "7,10", "5,90", "4,30"];
  const cab = ["annee_numero_de_tirage", "date_de_tirage", "boule_1", "boule_2", "boule_3", "boule_4", "boule_5", "etoile_1", "etoile_2"];
  const fila = ["26090", "10/11/2026", "15", "18", "37", "41", "31", "1", "5"];
  rapports.forEach((r, i) => {
    cab.push(`nombre_de_gagnant_au_rang${i + 1}_Euro_Millions_en_europe`, `rapport_du_rang${i + 1}_Euro_Millions`);
    fila.push(String(i + 1), r);
  });
  return `${cab.join(";")}\r\n${fila.join(";")}\r\n`;
}

// ZIP de un solo archivo con compresión deflate, como el de la FDJ.
function zipDe(nombre: string, datos: Buffer) {
  const comp = deflateRawSync(datos);
  const n = Buffer.from(nombre);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(comp.length, 18);
  local.writeUInt32LE(datos.length, 22);
  local.writeUInt16LE(n.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(comp.length, 20);
  central.writeUInt32LE(datos.length, 24);
  central.writeUInt16LE(n.length, 28);
  central.writeUInt32LE(0, 42);
  const inicioCentral = local.length + n.length + comp.length;
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(1, 8);
  fin.writeUInt16LE(1, 10);
  fin.writeUInt32LE(central.length + n.length, 12);
  fin.writeUInt32LE(inicioCentral, 16);
  return Buffer.concat([local, n, comp, central, n, fin]);
}

describe("resultados de la FDJ", () => {
  it("lee el CSV: fecha, combinación ordenada y premios en céntimos por categoría", () => {
    const [s] = parsearCsvFdj(csvDePrueba());
    expect(s.fecha).toBe("2026-11-10");
    expect(s.numeros).toEqual([15, 18, 31, 37, 41]);
    expect(s.estrellas).toEqual([1, 5]);
    expect(s.premios[0]).toEqual({ n: 5, e: 2, premioCent: 14_189_944_500, ganadores: 1 });
    expect(s.premios.find((p) => p.n === 2 && p.e === 0)?.premioCent).toBe(430);
    expect(s.premios.find((p) => p.n === 4 && p.e === 2)?.premioCent).toBe(168220);
  });

  it("encaja con el cálculo de premios (nuestra apuesta fija ese día)", () => {
    const [s] = parsearCsvFdj(csvDePrueba());
    const r = comprobarApuesta({ numeros: [13, 17, 23, 28, 41], estrellas: [2, 12] }, s);
    expect(r.aciertosNumeros).toEqual([41]);
    expect(r.premioCent).toBe(0);
  });

  it("descomprime el ZIP y lee el CSV de dentro", () => {
    const csv = csvDePrueba();
    const { nombre, datos } = primerArchivoDelZip(zipDe("euromillions_202002.csv", Buffer.from(csv, "latin1")));
    expect(nombre).toBe("euromillions_202002.csv");
    expect(datos.toString("latin1")).toBe(csv);
  });

  it("falla con un archivo que no es ZIP", () => {
    expect(() => primerArchivoDelZip(Buffer.from("esto no es un zip, es texto de sobra para la prueba"))).toThrow(/ZIP/);
  });
});
