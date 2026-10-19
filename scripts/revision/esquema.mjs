/**
 * esquema.mjs — lee el esquema REAL de la base desde src/types/database.ts,
 * que es el archivo que genera Supabase y que ya vive versionado en el
 * repositorio. Asi el revisor nunca trabaja con una foto vieja: si alguien
 * regenera los tipos, el revisor se entera solo.
 */
import { readFileSync } from 'node:fs';

export function leerEsquema(ruta = 'src/types/database.ts') {
  const src = readFileSync(ruta, 'utf8');

  // Tablas y vistas: cada entrada tiene un bloque "Row: { ... }".
  const tablas = new Map();
  const reBloque = /(\n\s{6})([a-z0-9_]+):\s*\{\s*\n\s*Row:\s*\{([\s\S]*?)\n\s{8}\}/g;
  let m;
  while ((m = reBloque.exec(src)) !== null) {
    const nombre = m[2];
    const cols = [...m[3].matchAll(/\n\s*([a-z0-9_]+)\??:/g)].map((x) => x[1]);
    if (cols.length) tablas.set(nombre, new Set(cols));
  }

  // Funciones: viven bajo "Functions: {" hasta "Enums: {".
  const iF = src.indexOf('Functions: {');
  const iE = src.indexOf('Enums: {', iF);
  const funciones = new Set();
  if (iF > -1 && iE > iF) {
    // Hay funciones sobrecargadas que se declaran como union en varias lineas
    // (nombre: seguido de salto), asi que NO se puede exigir la llave.
    for (const x of src.slice(iF, iE).matchAll(/\n {6}([a-z0-9_]+):/g)) funciones.add(x[1]);
  }

  return { tablas, funciones };
}
