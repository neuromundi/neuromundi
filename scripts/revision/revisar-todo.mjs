#!/usr/bin/env node
/**
 * revisar-todo.mjs — ejecuta los revisores que no necesitan navegador y
 * SIEMPRE los ejecuta todos, aunque el primero encuentre algo.
 *
 * Encadenarlos con && hacia que el primer hallazgo cortara la cadena y los
 * demas no llegaran a correr: justo lo contrario de lo que se quiere de una
 * revision. Al final resume y sale con 1 si alguno encontro algo.
 */
import { spawnSync } from 'node:child_process';

const REVISORES = [
  ['base', 'scripts/revision/revisar-base.mjs', []],
  ['textos', 'scripts/revision/revisar-textos.mjs', []],
  ['formularios', 'scripts/revision/revisar-formularios.mjs', []],
  // Del revisor de conteos solo la parte estatica: la que compara la base con
  // la pantalla necesita navegador y se corre aparte (revisar:conteos).
  ['conteos', 'scripts/revision/revisar-conteos.mjs', ['--solo-estatico']],
  ['redaccion', 'scripts/revision/revisar-redaccion.mjs', []],
];

const conHallazgos = [];
for (const [nombre, guion, extra] of REVISORES) {
  console.log(`\n──────── ${nombre} ────────`);
  const r = spawnSync(process.execPath, [guion, ...extra], { stdio: 'inherit' });
  if (r.status !== 0) conHallazgos.push(nombre);
}

console.log('\n════════ resumen ════════');
if (conHallazgos.length === 0) {
  console.log('Todos los revisores pasaron sin hallazgos.');
  process.exit(0);
}
console.log(`Con hallazgos: ${conHallazgos.join(', ')}.`);
console.log(`Sin hallazgos: ${REVISORES.map(([n]) => n).filter((n) => !conHallazgos.includes(n)).join(', ') || 'ninguno'}.`);
process.exit(1);
