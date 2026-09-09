#!/usr/bin/env node
/**
 * Barrido · residencias, asilos, centros de día y hospitales de especialidades
 *
 * Uso:  node barrido-residencias.mjs
 *
 * No hay que preparar nada: las clases vienen puestas y el token se lee de
 * denue.env. Es reanudable — si se corta la conexión o cierras la ventana,
 * lo vuelves a correr y sigue donde iba, sin volver a descargar lo que ya bajó.
 *
 * Salida:
 *   residencias_fichas.json   todas las fichas, sin duplicados por CLEE
 *   residencias_fichas.csv    lo mismo, en tabular
 *   avance_residencias.json   el progreso (no lo borres a media descarga)
 *
 * Para cambiar las clases:  $env:CLASES="623211,623212"
 * Para limitar estados:     $env:ESTADOS="09,15,14"
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
const PAGINA = 1000;
const MAX = parseInt(process.env.MAX || '20000', 10);

/* Las diez clases que elegimos. El nombre de cada una lo trae el propio DENUE
   en cada ficha, así que el sector se lee de ahí y no de la paridad del código. */
const CLASES = (process.env.CLASES ||
  '623211,623212,' +   // residencias para discapacidad intelectual
  '623311,623312,' +   // asilos y residencias para ancianos
  '624121,624122,' +   // centros de atención y cuidado diurno
  '623111,623112,' +   // residencias con cuidados de enfermería
  '622311,622312'      // hospitales de otras especialidades médicas
).split(',').map(s => s.trim()).filter(Boolean);

const ESTADOS = {
  '01':'Aguascalientes','02':'Baja California','03':'Baja California Sur','04':'Campeche',
  '05':'Coahuila','06':'Colima','07':'Chiapas','08':'Chihuahua','09':'Ciudad de México',
  '10':'Durango','11':'Guanajuato','12':'Guerrero','13':'Hidalgo','14':'Jalisco',
  '15':'México','16':'Michoacán','17':'Morelos','18':'Nayarit','19':'Nuevo León',
  '20':'Oaxaca','21':'Puebla','22':'Querétaro','23':'Quintana Roo','24':'San Luis Potosí',
  '25':'Sinaloa','26':'Sonora','27':'Tabasco','28':'Tamaulipas','29':'Tlaxcala',
  '30':'Veracruz','31':'Yucatán','32':'Zacatecas',
};
const AREAS = (process.env.ESTADOS || Object.keys(ESTADOS).join(','))
  .split(',').map(s => s.trim().padStart(2, '0')).filter(Boolean);

if (!TOKEN) {
  console.error('No encontré el token. Crea denue.env junto a este script con:');
  console.error('  DENUE_TOKEN=tu-token');
  process.exit(1);
}

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
      if (r.status === 429 || r.status >= 500) { await dormir(3000 * (i + 1)); continue; }
      if (!r.ok) { tally.http[r.status] = (tally.http[r.status] || 0) + 1; console.warn(`  ! ${etiqueta}: HTTP ${r.status}`); return null; }
      const t = await r.text();
      if (!t.trim() || t.trim() === '[]') { tally.vacias++; return []; }
      try { const j = JSON.parse(t); tally.ok++; return j; }
      catch { console.warn(`  ! ${etiqueta}: respuesta no-JSON`); return null; }
    } catch (e) {
      if (i === reintentos) { tally.red++; console.warn(`  ! ${etiqueta}: ${e.message}`); return null; }
      await dormir(3000 * (i + 1));
    }
  }
  return null;
}

/** BuscarAreaAct · 14 parámetros. La CLASE va en la novena posición y exige
 *  los seis dígitos completos; el Id va justo antes del token. */
const url = (ent, clase, ini, fin) =>
  `${BASE}/BuscarAreaAct/${ent}/0/0/0/0/0/0/0/${clase}/0/${ini}/${fin}/0/${TOKEN}`;

function partesUbicacion(u) {
  const p = String(u || '').split(',').map(s => s.trim());
  return { localidad: p[0] || '', municipio: p[1] || '', entidad: p[2] || '' };
}

function normalizar(x, claveEstado) {
  const ub = partesUbicacion(campo(x, 'Ubicacion'));
  const dir = [
    [campo(x, 'Tipo_vialidad'), campo(x, 'Calle')].filter(Boolean).join(' '),
    campo(x, 'Num_Exterior'), campo(x, 'Num_Interior'),
    campo(x, 'Colonia'), campo(x, 'CP'),
  ].filter(v => v && String(v).trim()).join(', ');

  return {
    clee: campo(x, 'CLEE', 'Id') || '',
    nombre: campo(x, 'Nombre') || '',
    razon_social: campo(x, 'Razon_social') || '',
    clase_id: String(campo(x, 'CLASE_ACTIVIDAD_ID') || ''),
    clase: campo(x, 'Clase_actividad') || '',
    estrato: campo(x, 'Estrato') || '',
    direccion: dir,
    colonia: campo(x, 'Colonia') || '',
    cp: campo(x, 'CP') || '',
    localidad: ub.localidad,
    municipio: ub.municipio,
    entidad: ub.entidad || ESTADOS[claveEstado] || '',
    estado_clave: claveEstado,
    telefono: String(campo(x, 'Telefono') || '').trim(),
    email: String(campo(x, 'Correo_e') || '').trim().toLowerCase(),
    sitio_web: String(campo(x, 'Sitio_internet') || '').trim(),
    lat: parseFloat(campo(x, 'Latitud')) || null,
    lng: parseFloat(campo(x, 'Longitud')) || null,
  };
}

const CSV = ['clee','nombre','razon_social','clase_id','clase','estrato','direccion',
             'colonia','cp','localidad','municipio','entidad','telefono','email',
             'sitio_web','lat','lng'];

async function main() {
  // Control: si la primera consulta falla, es el token o la red, y conviene
  // saberlo ahora y no después de veinte minutos de reintentos silenciosos.
  const control = await pedir(url('09', CLASES[0], 1, 2), 'control');
  if (control === null) {
    console.error('\nLa consulta de control falló: revisa el token o la conexión.');
    console.error('Códigos vistos:', JSON.stringify(tally.http), '· errores de red:', tally.red);
    process.exit(1);
  }
  console.log(`Control bien. Barriendo ${CLASES.length} clases × ${AREAS.length} estados.\n`);

  let avance = {};
  try { avance = JSON.parse(await fs.readFile('avance_residencias.json', 'utf8')); } catch { /* primera vez */ }

  const fichas = new Map();
  for (const f of Object.values(avance).flat()) fichas.set(f.clee || Math.random(), f);

  const pares = [];
  for (const c of CLASES) for (const e of AREAS) pares.push([c, e]);

  let hechas = 0;
  for (const [clase, ent] of pares) {
    hechas++;
    const llave = `${clase}|${ent}`;
    if (avance[llave]) { continue; }

    const lote = [];
    for (let i = 1; i <= MAX; i += PAGINA) {
      const r = await pedir(url(ent, clase, i, Math.min(i + PAGINA - 1, MAX)),
                            `${clase} ${ESTADOS[ent]} ${i}`);
      if (!r || !r.length) break;
      for (const x of r) lote.push(normalizar(x, ent));
      if (r.length < PAGINA) break;
      await dormir(300);
    }

    const ajenas = lote.filter(f => f.clase_id && f.clase_id !== clase).length;
    if (ajenas) console.warn(`    ! ${ajenas} registros con clase distinta a ${clase}`);

    avance[llave] = lote;
    for (const f of lote) if (f.clee) fichas.set(f.clee, f);
    await fs.writeFile('avance_residencias.json', JSON.stringify(avance), 'utf8');
    if (lote.length) console.log(`  ${String(hechas).padStart(3)}/${pares.length}  ${clase} ${ESTADOS[ent]}: ${lote.length}`);
    await dormir(300);
  }

  const todas = [...fichas.values()];
  await fs.writeFile('residencias_fichas.json', JSON.stringify(todas, null, 2), 'utf8');

  const esc = v => `"${String(v ?? '').replace(/"/g, "'")}"`;
  await fs.writeFile('residencias_fichas.csv',
    [CSV.join(','), ...todas.map(f => CSV.map(c => esc(f[c])).join(','))].join('\n'), 'utf8');

  const con = c => todas.filter(f => f[c]).length;
  console.log(`\n${todas.length.toLocaleString('es-MX')} fichas únicas (por CLEE)`);
  console.log(`  con teléfono   ${con('telefono')}`);
  console.log(`  con correo     ${con('email')}`);
  console.log(`  con sitio      ${con('sitio_web')}`);
  console.log(`  con coordenada ${todas.filter(f => f.lat && f.lng).length}`);
  console.log(`\nLlamadas: ${tally.ok} con datos · ${tally.vacias} vacías · HTTP ${JSON.stringify(tally.http)} · red ${tally.red}`);
  console.log('\n→ residencias_fichas.json · residencias_fichas.csv');
  console.log('\nAhora:  node clasificar-residencias.mjs residencias_fichas.json');
}

main().catch(e => { console.error('\n' + (e.stack || e.message)); process.exitCode = 1; });
