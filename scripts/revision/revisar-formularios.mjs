#!/usr/bin/env node
/**
 * revisar-formularios.mjs — AUDITOR 4: campos que el formulario EXIGE pero
 * nunca dibuja, y campos que dibuja pero el esquema no conoce.
 *
 * El defecto mas caro del 19 de octubre de 2026 fue exactamente esto: el
 * esquema exigia contrasena, la pantalla no la dibujaba en el alta social, y
 * el formulario se negaba a avanzar sin decir por que. Un campo obligatorio
 * invisible es imposible de diagnosticar desde la pantalla.
 *
 * Uso:  node scripts/revision/revisar-formularios.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ESQUEMAS = 'src/lib/schemas.ts';
const RAIZ = 'src';

// ── 1. Campos de cada esquema y si son obligatorios ──────────────────────────
const src = readFileSync(ESQUEMAS, 'utf8');
const esquemas = new Map();
/** Toma el objeto que sigue a una posicion contando llaves (soporta anidado). */
function objetoTras(texto, desde) {
  const abre = texto.indexOf('{', desde);
  if (abre === -1) return '';
  let n = 0;
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '{') n++;
    else if (texto[i] === '}') { n--; if (n === 0) return texto.slice(abre + 1, i); }
  }
  return '';
}
for (const m of src.matchAll(/export const (\w+Schema) = z[\s\S]{0,40}?\.object\(/g)) {
  const campos = new Map();
  const cuerpo = objetoTras(src, m.index + m[0].length - 1);
  for (const linea of cuerpo.split('\n')) {
    const c = /^\s{2,6}([a-z0-9_]+):\s*(.*)$/.exec(linea);
    if (!c) continue;
    const obligatorio = !/\.optional\(\)|\.default\(|\.nullish\(\)/.test(c[2]);
    campos.set(c[1], obligatorio);
  }
  if (campos.size) esquemas.set(m[1], campos);
}

// ── 2. Qué dibuja cada componente que usa un esquema ─────────────────────────
function archivos(dir) {
  const s = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) s.push(...archivos(p));
    else if (/\.tsx$/.test(e) && !/\.test\./.test(e)) s.push(p);
  }
  return s;
}

const hallazgos = [];
const sinPoderMirar = [];

for (const archivo of archivos(RAIZ)) {
  const t = readFileSync(archivo, 'utf8');
  const usa = /zodResolver\((\w+Schema)\)/.exec(t);
  if (!usa) continue;
  const campos = esquemas.get(usa[1]);
  if (!campos) continue;
  const rel = relative('.', archivo);

  const vistos = new Set();
  for (const m of t.matchAll(/register\(\s*['"]([a-z0-9_]+)['"]/g)) vistos.add(m[1]);
  for (const m of t.matchAll(/setValue\(\s*['"]([a-z0-9_]+)['"]/g)) vistos.add(m[1]);
  for (const m of t.matchAll(/(?<![a-zA-Z])name=["']([a-z0-9_]+)["']/g)) vistos.add(m[1]);
  // Lo que el formulario rellena solo tambien cuenta como "resuelto".
  const iDef = t.indexOf('defaultValues:');
  const bloqueDefaults = iDef === -1 ? null : [null, objetoTras(t, iDef)];
  if (bloqueDefaults) {
    // Con frontera por delante: sin ella, 'regType:' colaba un falso 'ype'.
    for (const m of bloqueDefaults[1].matchAll(/(?<![a-zA-Z0-9_])([a-z0-9_]+):/g)) vistos.add(m[1]);
  }
  // Un relleno importado de otro modulo cuenta, pero hay que decir cual.
  const rellenos = [...t.matchAll(/\.\.\.([A-Z_][A-Z0-9_]*)/g)].map((m) => m[1]);

  const faltan = [...campos.entries()]
    .filter(([c, obligatorio]) => obligatorio && !vistos.has(c))
    .map(([c]) => c);

  // Si los valores iniciales llegan por un "...algo", desde aqui NO se puede
  // saber que trae; decir que falta seria una falsa alarma. Se anota aparte y
  // esos casos se cubren con una prueba automatica, no con este revisor.
  const hayDerrame = bloqueDefaults ? /\.\.\./.test(bloqueDefaults[1]) : rellenos.length > 0;
  if (faltan.length && !hayDerrame) {
    hallazgos.push(`${rel}  usa ${usa[1]} y NO dibuja ni rellena: ${faltan.join(', ')}`);
  } else if (faltan.length) {
    sinPoderMirar.push(`${rel}  (${usa[1]}) rellena ${faltan.join(", ")} desde fuera: este revisor no puede verlo, conviene una prueba`);
  }

  const sobran = [...vistos].filter((c) => !campos.has(c) && /^[a-z]/.test(c));
  if (sobran.length) {
    hallazgos.push(`${rel}  dibuja campos que ${usa[1]} no conoce: ${sobran.join(', ')}`);
  }
}

if (!esquemas.size) {
  console.log('Revision de formularios: no se pudo leer ningun esquema; revisa la ruta ' + ESQUEMAS);
  process.exit(2);
}
const nota = sinPoderMirar.length ? `  (${sinPoderMirar.length} formulario(s) con valores iniciales externos, no comprobables aqui)` : '';
if (hallazgos.length === 0) {
  console.log(`Revision de formularios (${esquemas.size} esquemas): sin hallazgos.${nota}`);
  for (const s of sinPoderMirar) console.log('  · ' + s);
  process.exit(0);
}
console.log(`Revision de formularios (${esquemas.size} esquemas): ${hallazgos.length} hallazgo(s).\n`);
for (const h of hallazgos) console.log('  ' + h);
process.exit(1);
