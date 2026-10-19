#!/usr/bin/env node
/**
 * revisar-base.mjs — AUDITOR 2: contraste entre lo que la aplicacion escribe
 * y lo que la base permite.
 *
 * El 19 de octubre de 2026 el registro por Google estuvo roto para TODOS los
 * tipos de usuario porque la aplicacion mandaba cuatro columnas que un
 * disparador de la base rechaza. No habia forma de saberlo sin ejecutarlo. Esto
 * lo detecta sin ejecutar nada:
 *
 *   1. Toda funcion que el codigo llama con rpc('x') existe en la base.
 *   2. Toda tabla o vista que el codigo usa con from('x') existe.
 *   3. Toda columna que el codigo escribe existe en esa tabla.
 *   4. Toda columna que el codigo escribe en `profiles` esta permitida por el
 *      disparador protect_profile_columns.
 *
 * Uso:  node scripts/revision/revisar-base.mjs
 * Sale con codigo 1 si encuentra algo, para poder encadenarlo a una tuberia.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { leerEsquema } from './esquema.mjs';

const RAIZ = 'src';
const { tablas, funciones } = leerEsquema();
const guardia = JSON.parse(readFileSync('scripts/revision/columnas-permitidas-perfiles.json', 'utf8'));
const permitidasPerfil = new Set(guardia.permitidas);

const hallazgos = [];
const apunta = (archivo, linea, texto) => hallazgos.push({ archivo, linea, texto });

function archivos(dir) {
  const salida = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) salida.push(...archivos(p));
    else if (/\.(ts|tsx)$/.test(e) && !/\.test\.(ts|tsx)$/.test(e)) salida.push(p);
  }
  return salida;
}

const lineaDe = (src, i) => src.slice(0, i).split('\n').length;

/** Extrae el objeto literal que sigue a una posicion, contando llaves. */
function objetoEn(src, desde) {
  const abre = src.indexOf('{', desde);
  if (abre === -1) return null;
  let nivel = 0;
  for (let i = abre; i < src.length; i++) {
    const c = src[i];
    if (c === '{') nivel++;
    else if (c === '}') { nivel--; if (nivel === 0) return src.slice(abre + 1, i); }
  }
  return null;
}

/** Claves de primer nivel de un objeto literal, ignorando lo anidado. */
function clavesDe(cuerpo) {
  const claves = [];
  let nivel = 0, prof = 0;
  let linea = '';
  for (let i = 0; i < cuerpo.length; i++) {
    const c = cuerpo[i];
    if (c === '{' || c === '[' || c === '(') prof++;
    else if (c === '}' || c === ']' || c === ')') prof--;
    if (prof === 0 && c === ',') { claves.push(linea); linea = ''; continue; }
    linea += c;
  }
  claves.push(linea);
  return claves
    .map((t) => t.trim())
    .map((t) => {
      const m = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/.exec(t) || /^['"]([a-z0-9_]+)['"]\s*:/.exec(t);
      return m ? m[1] : null;
    })
    .filter(Boolean);
}

for (const archivo of archivos(RAIZ)) {
  if (archivo.includes('types/database.ts')) continue;
  const src = readFileSync(archivo, 'utf8');
  const rel = relative('.', archivo);

  // 1. Funciones llamadas por el codigo.
  for (const m of src.matchAll(/\.rpc\(\s*['"]([a-z0-9_]+)['"]/g)) {
    if (!funciones.has(m[1])) {
      apunta(rel, lineaDe(src, m.index), `llama a la funcion '${m[1]}', que no existe en la base`);
    }
  }

  // 2. Tablas y vistas usadas. OJO: supabase.storage.from('x') NO es una tabla,
  //    es un deposito de archivos; se excluye mirando lo que precede a .from.
  for (const m of src.matchAll(/(\w+)?\s*\.from\(\s*['"]([a-z0-9_]+)['"]\s*\)/g)) {
    if (m[1] === 'storage') continue;  // supabase.storage.from('x') es un deposito, no una tabla
    const tabla = m[2];
    if (!tablas.has(tabla)) {
      apunta(rel, lineaDe(src, m.index), `usa la tabla o vista '${tabla}', que no existe en la base`);
    }
  }

  // 3 y 4. Columnas escritas. Solo cuenta lo ENCADENADO directamente a .from(),
  //    para no confundirse con cualquier objeto que haya mas abajo en el archivo.
  for (const m of src.matchAll(/\.from\(\s*['"]([a-z0-9_]+)['"]\s*\)\s*\.(update|insert|upsert)\(\s*\[?\s*(?=\{)/g)) {
    const tabla = m[1];
    const deLaTabla = tablas.get(tabla);
    if (!deLaTabla) continue;
    const cuerpo = objetoEn(src, m.index + m[0].length - 1);
    if (!cuerpo) continue;
    for (const c of clavesDe(cuerpo)) {
      if (!deLaTabla.has(c)) {
        apunta(rel, lineaDe(src, m.index), `escribe '${c}' en '${tabla}', columna que no existe`);
      } else if (tabla === 'profiles' && !permitidasPerfil.has(c)) {
        apunta(rel, lineaDe(src, m.index),
          `escribe '${c}' en 'profiles' directamente; el disparador de la base lo rechaza o lo ignora`);
      }
    }
  }
}

const dias = Math.round((Date.now() - new Date(guardia._generado_en).getTime()) / 86400000);
if (dias > 30) {
  apunta('scripts/revision/columnas-permitidas-perfiles.json', 1,
    `la lista del disparador tiene ${dias} dias: conviene regenerarla`);
}

if (hallazgos.length === 0) {
  console.log('Revision de base: sin hallazgos.');
  process.exit(0);
}
console.log(`Revision de base: ${hallazgos.length} hallazgo(s).\n`);
for (const h of hallazgos) console.log(`  ${h.archivo}:${h.linea}  ${h.texto}`);
process.exit(1);
