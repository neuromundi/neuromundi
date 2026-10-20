#!/usr/bin/env node
/**
 * revisar-adversario.mjs — AUDITOR 8: el repaso adversario, con constancia.
 *
 * POR QUE EXISTE
 * Los siete auditores anteriores comprueban cosas que alguien supo formular.
 * Pero los defectos del 19 de octubre de 2026 tenian todos la misma forma y
 * NINGUNO estaba formulado: eran recortes y sustituciones CALLADAS. El
 * directorio mostraba 1,000 de 1,818. El envio cortaba a 50. La cola saltaba
 * 746 fichas. La pantalla imprimia "service_provider" en vez de
 * "Especialista". Quince fichas publicadas no salian en ningun filtro.
 *
 * Los encontre leyendo, uno por uno, haciendo la siguiente cosa con cuidado.
 * Eso funciono y no sirve: depende de que alguien pase por ahi. Un auditor
 * escrito por quien escribio el codigo comprueba lo que su autor esperaba, y
 * por definicion no puede ver lo que su autor no se planteo. El unico remedio
 * es un repaso hecho con la pregunta contraria —"que haria que esto fallara
 * SIN avisar"— y, sobre todo, con CONSTANCIA de lo repasado.
 *
 * QUE HACE ESTE GUION
 * No lee la mente de nadie: lleva la cuenta. Enumera todas las pantallas y
 * todas las secciones de panel que existen, las cruza con el registro de
 * repasos (repaso-adversario.json) y dice tres cosas:
 *   1. que pantallas NUNCA se han repasado;
 *   2. que pantallas se repasaron y su codigo CAMBIO despues, asi que el
 *      repaso ya no vale;
 *   3. que hallazgos quedaron abiertos de los repasos hechos.
 *
 * Esa tercera parte es la que convierte un dia de lectura en un inventario que
 * se puede retomar, en vez de un esfuerzo que se pierde. El metodo y la lista
 * de modos de fallo silencioso estan en REPASO-ADVERSARIO.md, al lado.
 *
 * Uso:
 *   node scripts/revision/revisar-adversario.mjs
 *   node scripts/revision/revisar-adversario.mjs --pendientes
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const soloPendientes = args.includes('--pendientes');
// En la cadena de `npm run revisar` va como INFORME: un repaso pendiente no es
// un defecto, y un hallazgo abierto que espera una decision de Enyoria tampoco
// debe tumbar la cadena todos los dias. Suelto, si avisa.
const informativo = args.includes('--informativo');
const REGISTRO = 'scripts/revision/repaso-adversario.json';

// --- 1. Que pantallas existen ---------------------------------------------
const app = readFileSync('src/App.tsx', 'utf8');
const rutas = [...app.matchAll(/path:\s*'([^']+)'/g)]
  .map((m) => m[1])
  .filter((r) => r !== '*' && !r.startsWith('/:'));

// Secciones de panel: las listas de secciones viven en los paneles.
function seccionesDe(archivo, etiqueta) {
  if (!existsSync(archivo)) return [];
  const src = readFileSync(archivo, 'utf8');
  // Las secciones se declaran como union de cadenas en un type/const.
  const bloques = [...src.matchAll(/(?:AdminSection|PanelSection|Section)\s*=\s*([^;]+);/g)];
  const claves = new Set();
  for (const b of bloques) {
    for (const m of b[1].matchAll(/'([a-zA-Z_][\w-]*)'/g)) claves.add(m[1]);
  }
  return [...claves].map((c) => `${etiqueta}:${c}`);
}

const pantallas = [
  ...rutas,
  ...seccionesDe('src/components/admin/AdminDashboard.tsx', 'admin'),
  ...seccionesDe('src/pages/Dashboard.tsx', 'panel'),
];

// --- 2. El registro de repasos --------------------------------------------
let registro = { repasos: [] };
if (existsSync(REGISTRO)) {
  registro = JSON.parse(readFileSync(REGISTRO, 'utf8'));
}
const porPantalla = new Map(registro.repasos.map((r) => [r.pantalla, r]));

// --- 3. ¿Cambio el codigo desde el repaso? --------------------------------
function huellaDe(archivos) {
  if (!archivos || !archivos.length) return null;
  // Hash del CONTENIDO de los archivos repasados. Si cambia, el repaso caduca:
  // la pantalla ya no es la que se repaso.
  //
  // La primera version usaba el hash del ultimo commit de git. Dos problemas:
  // llamar a git una vez por repaso tardaba tanto en Windows que el guion se
  // quedaba colgado, y un cambio sin commitear no caducaba el repaso aunque la
  // pantalla ya fuera otra. El contenido no tiene esos dos problemas.
  const h = createHash('sha256');
  for (const a of [...archivos].sort()) {
    try { h.update(readFileSync(a)); } catch { h.update(`(falta:${a})`); }
  }
  return h.digest('hex').slice(0, 16);
}

const nunca = [];
const caducados = [];
const abiertos = [];

for (const p of pantallas) {
  const r = porPantalla.get(p);
  if (!r) { nunca.push(p); continue; }
  const huellaAhora = huellaDe(r.archivos);
  if (huellaAhora && r.huella && huellaAhora !== r.huella) {
    caducados.push(`${p}  repasado el ${r.fecha}, pero su codigo cambio despues`);
  }
  for (const h of r.hallazgos_abiertos ?? []) abiertos.push(`${p}  ${h}`);
}

// --- 4. Informe ------------------------------------------------------------
const total = pantallas.length;
const repasadas = total - nunca.length;
console.log(`Repaso adversario: ${repasadas} de ${total} pantallas con constancia de repaso.\n`);

if (abiertos.length) {
  console.log(`Hallazgos abiertos (${abiertos.length}):`);
  for (const a of abiertos) console.log('  ' + a);
  console.log('');
}
if (caducados.length) {
  console.log(`Repasos caducados por cambio de codigo (${caducados.length}):`);
  for (const c of caducados) console.log('  ' + c);
  console.log('');
}
if (nunca.length) {
  console.log(`Sin repasar nunca (${nunca.length}):`);
  const porLinea = 4;
  for (let i = 0; i < nunca.length; i += porLinea) {
    console.log('  ' + nunca.slice(i, i + porLinea).join('   '));
  }
  console.log('');
  console.log('El metodo y la lista de modos de fallo silencioso: scripts/revision/REPASO-ADVERSARIO.md');
}

if (informativo) process.exit(0);
if (soloPendientes) process.exit(nunca.length || caducados.length ? 1 : 0);
// Un repaso pendiente NO es un defecto de la plataforma: es trabajo por hacer.
// Por eso este revisor no tumba la cadena; informa. Lo que si la tumba son los
// hallazgos abiertos, que son defectos conocidos y sin arreglar.
process.exit(abiertos.length ? 1 : 0);
