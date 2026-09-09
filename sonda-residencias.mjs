#!/usr/bin/env node
/**
 * Sonda · DENUE — descubre y cuenta las clases de residencias, asilos y
 * hospitales que faltan en el directorio.
 *
 * No supone ningún código: le da al DENUE las ramas de cuatro dígitos y deja
 * que el propio INEGI diga qué clases de seis dígitos existen dentro y cómo se
 * llaman. Así no se cuela un código inventado, que es justo el error que uno
 * comete de memoria con el SCIAN.
 *
 * Uso:
 *   node sonda-residencias.mjs
 *
 * El token lo lee solo de denue.env (esta carpeta o C:\\NEUROMUNDI). No hay
 * que preparar nada más.
 *
 * Salida: residencias_clases.csv  y el resumen en pantalla.
 */
import fs from 'node:fs/promises';

/* El token se toma de denue.env (misma carpeta, o C:\\NEUROMUNDI), y si no
   está, de la variable de entorno. Así basta con `node sonda-residencias.mjs`
   sin preparar nada antes. */
function tokenDeArchivo() {
  const fsx = require('node:fs');
  for (const ruta of ['denue.env', '../denue.env', 'C:/NEUROMUNDI/denue.env',
                      process.env.USERPROFILE + '/Downloads/denue.env']) {
    try {
      const m = fsx.readFileSync(ruta, 'utf8').match(/^\s*DENUE_TOKEN\s*=\s*(.+)$/m);
      if (m) { console.log(`token leído de ${ruta}`); return m[1].trim().replace(/^["']|["']$/g, ''); }
    } catch { /* siguiente */ }
  }
  return null;
}
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const TOKEN = process.env.DENUE_TOKEN || tokenDeArchivo();
const BASE = 'https://www.inegi.org.mx/app/api/denue/v1/consulta';

// Ramas de cuatro dígitos que pueden contener lo que falta. Las de seis las
// descubre el propio DENUE.
const RAMAS = (process.env.RAMAS || '6231,6232,6233,6239,6221,6222,6223').split(',');

const ESTADOS = {
  '01':'Aguascalientes','02':'Baja California','03':'Baja California Sur','04':'Campeche',
  '05':'Coahuila','06':'Colima','07':'Chiapas','08':'Chihuahua','09':'Ciudad de México',
  '10':'Durango','11':'Guanajuato','12':'Guerrero','13':'Hidalgo','14':'Jalisco',
  '15':'México','16':'Michoacán','17':'Morelos','18':'Nayarit','19':'Nuevo León',
  '20':'Oaxaca','21':'Puebla','22':'Querétaro','23':'Quintana Roo','24':'San Luis Potosí',
  '25':'Sinaloa','26':'Sonora','27':'Tabasco','28':'Tamaulipas','29':'Tlaxcala',
  '30':'Veracruz','31':'Yucatán','32':'Zacatecas',
};
const AREAS = Object.keys(ESTADOS);

if (!TOKEN) {
  console.error('No encontré el token.\n' +
    '  Crea un archivo denue.env junto a este script con una línea:\n' +
    '    DENUE_TOKEN=tu-token\n' +
    '  o define la variable:  $env:DENUE_TOKEN = "tu-token"');
  process.exit(1);
}

const dormir = ms => new Promise(r => setTimeout(r, ms));
const campo = (o, ...ns) => {
  for (const n of ns) for (const k of Object.keys(o))
    if (k.toLowerCase() === n.toLowerCase()) return o[k];
  return null;
};

async function pedir(url, etiqueta, reintentos = 2) {
  for (let i = 0; i <= reintentos; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(120000) });
      if (r.status === 429 || r.status >= 500) { await dormir(2500 * (i + 1)); continue; }
      if (!r.ok) { console.warn(`  ! ${etiqueta}: HTTP ${r.status}`); return null; }
      const t = await r.text();
      if (!t.trim() || t.trim() === '[]') return [];
      try { return JSON.parse(t); } catch { console.warn(`  ! ${etiqueta}: no-JSON`); return null; }
    } catch (e) {
      if (i === reintentos) { console.warn(`  ! ${etiqueta}: ${e.message}`); return null; }
      await dormir(2500 * (i + 1));
    }
  }
  return null;
}

// Paso 1 · descubrir las clases de seis dígitos dentro de cada rama.
console.log(`Descubriendo clases dentro de ${RAMAS.length} ramas…\n`);
const clases = new Map();   // codigo -> nombre
for (const rama of RAMAS) {
  const antes = clases.size;
  // Se muestrean varios estados grandes: una rama puede no tener presencia en uno.
  for (const ent of ['09', '15', '14', '19', '21', '30']) {
    const u = `${BASE}/BuscarAreaAct/${ent}/0/0/0/0/0/0/0/${rama}/0/1/200/0/${TOKEN}`;
    const r = await pedir(u, `rama ${rama} ${ESTADOS[ent]}`);
    for (const x of r || []) {
      const id = String(campo(x, 'CLASE_ACTIVIDAD_ID') || '').trim();
      if (id.length === 6) clases.set(id, campo(x, 'Clase_actividad') || '');
    }
    await dormir(250);
  }
  console.log(`  ${rama}: ${clases.size - antes} clases nuevas`);
}

if (!clases.size) { console.error('\nEl DENUE no devolvió ninguna clase. Revisa el token.'); process.exit(1); }

// Paso 2 · contar cada clase en los 32 estados, sin descargar fichas.
console.log(`\nContando ${clases.size} clases en los 32 estados…\n`);
const codigos = [...clases.keys()].sort();
const filas = [];
for (let i = 0; i < codigos.length; i += 4) {
  const lote = codigos.slice(i, i + 4);
  const u = `${BASE}/Cuantificar/${lote.join(',')}/${AREAS.join(',')}/0/${TOKEN}`;
  const r = await pedir(u, `conteo ${lote.join(',')}`);
  if (r) filas.push(...r);
  await dormir(250);
}

const porClase = new Map(), matriz = new Map();
for (const r of filas) {
  const ae = String(campo(r, 'AE')), ag = String(campo(r, 'AG')).padStart(2, '0');
  const t = parseInt(campo(r, 'Total') || '0', 10);
  porClase.set(ae, (porClase.get(ae) || 0) + t);
  matriz.set(`${ae}|${ag}`, t);
}

console.log('CLASES ENCONTRADAS (el dígito final par = sector público)\n');
for (const [c, t] of [...porClase].sort((a, b) => b[1] - a[1]))
  console.log(`  ${c}  ${String(t).padStart(7)}  ${(clases.get(c) || '').slice(0, 74)}`);

const csv = [['clase', 'nombre_clase', 'estado_clave', 'estado', 'total']];
for (const [k, t] of matriz) {
  const [ae, ag] = k.split('|');
  csv.push([ae, (clases.get(ae) || '').replace(/"/g, "'"), ag, ESTADOS[ag] || ag, t]);
}
await fs.writeFile('residencias_clases.csv',
  csv.map(f => f.map(v => `"${v}"`).join(',')).join('\n'), 'utf8');

console.log(`\nTOTAL: ${[...porClase.values()].reduce((a, b) => a + b, 0).toLocaleString('es-MX')} establecimientos`);
console.log('→ residencias_clases.csv');
