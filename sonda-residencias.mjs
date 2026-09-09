#!/usr/bin/env node
/**
 * Sonda · DENUE — descubre y cuenta las clases de residencias, asilos y
 * hospitales que faltan en el directorio.
 *
 * Uso:  node sonda-residencias.mjs
 * El token se lee de denue.env (esta carpeta, o C:\NEUROMUNDI, o Downloads).
 *
 * ---------------------------------------------------------------------------
 * Por qué esta versión es distinta a la anterior
 *
 * La primera versión no devolvió nada, y no era el token: yo puse el código de
 * rama de cuatro dígitos en el parámetro de CLASE de BuscarAreaAct, que exige
 * los seis dígitos completos. La API contestó bien, con una lista vacía, y el
 * script lo interpretó como "no hay clases".
 *
 * Esta versión no supone cuál es el parámetro correcto: prueba dos caminos y
 * dice cuál funcionó.
 *
 *   A · Cuantificar con el código de rama. Es el barato: una llamada por rama.
 *   B · BuscarAreaAct por SECTOR (el parámetro que sí acepta códigos cortos,
 *       el mismo que usó la sonda original), muestreando estados y contando
 *       qué clases de seis dígitos aparecen. Es el que ya funcionó antes.
 *
 * Además arranca con una llamada de control conocida: si esa falla, el
 * problema es el token o la red, y el script lo dice en vez de dejarte
 * adivinando. Silenciar los errores fue justo lo que nos costó una tarde la
 * vez pasada.
 * ---------------------------------------------------------------------------
 */
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

function tokenDeArchivo() {
  const fsx = require('node:fs');
  for (const ruta of ['denue.env', '../denue.env', 'C:/NEUROMUNDI/denue.env',
                      (process.env.USERPROFILE || '') + '/Downloads/denue.env']) {
    try {
      const m = fsx.readFileSync(ruta, 'utf8').match(/^\s*DENUE_TOKEN\s*=\s*(.+)$/m);
      if (m) { console.log(`token leído de ${ruta}`); return m[1].trim().replace(/^["']|["']$/g, ''); }
    } catch { /* siguiente */ }
  }
  return null;
}

const TOKEN = process.env.DENUE_TOKEN || tokenDeArchivo();
const BASE = 'https://www.inegi.org.mx/app/api/denue/v1/consulta';

if (!TOKEN) {
  console.error('No encontré el token. Crea denue.env con:  DENUE_TOKEN=tu-token');
  process.exit(1);
}

const RAMAS = (process.env.RAMAS || '6221,6222,6223,6231,6232,6233,6239').split(',');
const SECTOR = process.env.SECTOR || '62';   // Servicios de salud y de asistencia social

/** Cuántos registros se muestrean por estado en el camino B. */
const MUESTRA = parseInt(process.env.MUESTRA || '1500', 10);

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

/** Estados que se muestrean en el camino B: los más poblados de cada región,
 *  para que ninguna clase se escape por no tener presencia en el centro. */
const MUESTREO = ['09', '15', '14', '19', '21', '30', '02', '31', '25', '11'];

const dormir = ms => new Promise(r => setTimeout(r, ms));
const campo = (o, ...ns) => {
  for (const n of ns) for (const k of Object.keys(o))
    if (k.toLowerCase() === n.toLowerCase()) return o[k];
  return null;
};

const tally = { ok: 0, vacias: 0, http: {}, red: 0 };

async function pedir(url, etiqueta, reintentos = 2) {
  for (let i = 0; i <= reintentos; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(120000) });
      if (r.status === 429 || r.status >= 500) { await dormir(2500 * (i + 1)); continue; }
      if (!r.ok) { tally.http[r.status] = (tally.http[r.status] || 0) + 1; return null; }
      const t = await r.text();
      if (!t.trim() || t.trim() === '[]') { tally.vacias++; return []; }
      try { const j = JSON.parse(t); tally.ok++; return j; }
      catch { console.warn(`  ! ${etiqueta}: respuesta no-JSON`); return null; }
    } catch (e) {
      if (i === reintentos) { tally.red++; console.warn(`  ! ${etiqueta}: ${e.message}`); return null; }
      await dormir(2500 * (i + 1));
    }
  }
  return null;
}

/* --- control: si esto falla, no tiene caso seguir ------------------------- */
console.log('\nControl · una consulta conocida que ya funcionó antes…');
const control = await pedir(
  `${BASE}/BuscarAreaAct/09/0/0/0/0/0/0/0/621331/0/1/2/0/${TOKEN}`, 'control');
if (control === null) {
  console.error('\n  La consulta de control falló. El problema es el token o la red,');
  console.error('  no las clases. Códigos vistos:', JSON.stringify(tally.http), 'errores de red:', tally.red);
  process.exit(1);
}
if (!control.length) {
  console.error('\n  La consulta de control devolvió vacío con una clase que sí existe.');
  console.error('  Eso apunta a que el token ya no tiene permisos. Genera uno nuevo en el INEGI.');
  process.exit(1);
}
console.log(`  bien: el DENUE respondió (${campo(control[0], 'Clase_actividad')})\n`);

const clases = new Map();   // codigo -> nombre

/* --- camino A: Cuantificar con el código de rama -------------------------- */
console.log('Camino A · Cuantificar por rama de cuatro dígitos…');
let sirvioA = false;
for (const rama of RAMAS) {
  const r = await pedir(`${BASE}/Cuantificar/${rama}/${AREAS.join(',')}/0/${TOKEN}`, `A ${rama}`);
  const total = (r || []).reduce((t, x) => t + parseInt(campo(x, 'Total') || '0', 10), 0);
  console.log(`  ${rama}: ${r === null ? 'error' : total.toLocaleString('es-MX') + ' establecimientos'}`);
  if (total > 0) sirvioA = true;
  await dormir(250);
}
console.log(sirvioA
  ? '  → Cuantificar sí acepta códigos de rama. Sirve para el total, pero no\n'
    + '    desglosa las clases de seis dígitos; para eso va el camino B.\n'
  : '  → Cuantificar no acepta códigos de rama en esta API.\n');

/* --- camino B: recorrer el sector y ver qué clases salen ------------------ */
console.log(`Camino B · muestreando el sector ${SECTOR} en ${MUESTREO.length} estados…`);
for (const ent of MUESTREO) {
  const antes = clases.size;
  for (let i = 1; i <= MUESTRA; i += 1000) {
    const fin = Math.min(i + 999, MUESTRA);
    // El parámetro de SECTOR es el sexto; es el que acepta códigos cortos.
    const u = `${BASE}/BuscarAreaAct/${ent}/0/0/0/0/${SECTOR}/0/0/0/0/${i}/${fin}/0/${TOKEN}`;
    const r = await pedir(u, `B ${ESTADOS[ent]} ${i}`);
    if (!r || !r.length) break;
    for (const x of r) {
      const id = String(campo(x, 'CLASE_ACTIVIDAD_ID') || '').trim();
      if (id.length === 6) clases.set(id, campo(x, 'Clase_actividad') || '');
    }
    if (r.length < 1000) break;
    await dormir(250);
  }
  console.log(`  ${ESTADOS[ent]}: ${clases.size} clases acumuladas (+${clases.size - antes})`);
  await dormir(250);
}

if (!clases.size) {
  console.error('\n  El sector tampoco devolvió clases. Resumen de lo que pasó:');
  console.error(`    respuestas con datos ${tally.ok} · vacías ${tally.vacias} · HTTP ${JSON.stringify(tally.http)} · red ${tally.red}`);
  process.exit(1);
}

/* --- quedarse con lo que nos interesa ------------------------------------- */
const INTERES = /ASILO|ANCIAN|RESIDENCIA|GERI[AÁ]TRIC|HOSPITAL|REPOSO|CUIDADO|CONVALEC|ENFERMER|DISCAPACID|RETIRO|ALBERGUE|CASA HOGAR|ASISTENCIA SOCIAL/i;
const relevantes = [...clases].filter(([, n]) => INTERES.test(n));

console.log(`\n${clases.size} clases vistas en el sector ${SECTOR}; ${relevantes.length} son del tema.\n`);

/* --- contar las relevantes en los 32 estados ------------------------------ */
console.log(`Contando ${relevantes.length} clases en los 32 estados…\n`);
const codigos = relevantes.map(([c]) => c).sort();
const filas = [];
for (let i = 0; i < codigos.length; i += 4) {
  const lote = codigos.slice(i, i + 4);
  const r = await pedir(`${BASE}/Cuantificar/${lote.join(',')}/${AREAS.join(',')}/0/${TOKEN}`, `conteo ${lote}`);
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

console.log('CLASES DEL TEMA  (último dígito par = sector público)\n');
for (const [c, t] of [...porClase].sort((a, b) => b[1] - a[1]))
  console.log(`  ${c}  ${String(t).padStart(7)}  ${(clases.get(c) || '').slice(0, 74)}`);

const csv = [['clase', 'nombre_clase', 'estado_clave', 'estado', 'total']];
for (const [k, t] of matriz) {
  const [ae, ag] = k.split('|');
  csv.push([ae, (clases.get(ae) || '').replace(/"/g, "'"), ag, ESTADOS[ag] || ag, t]);
}
await fs.writeFile('residencias_clases.csv',
  csv.map(f => f.map(v => `"${v}"`).join(',')).join('\n'), 'utf8');

// La lista completa también se guarda: si alguna clase que descarté te
// interesa, está ahí y no hay que volver a descargar nada.
await fs.writeFile('sector62_clases.json',
  JSON.stringify([...clases].map(([codigo, nombre]) =>
    ({ codigo, nombre, interes: INTERES.test(nombre) })), null, 2), 'utf8');

console.log(`\nTOTAL: ${[...porClase.values()].reduce((a, b) => a + b, 0).toLocaleString('es-MX')} establecimientos`);
console.log(`Llamadas: ${tally.ok} con datos · ${tally.vacias} vacías · HTTP ${JSON.stringify(tally.http)} · red ${tally.red}`);
console.log('\n→ residencias_clases.csv   (lo que hay que pasarme)');
console.log('→ sector62_clases.json     (las 200-y-pico clases del sector, por si falta alguna)');
