#!/usr/bin/env node
/**
 * Sonda SCIAN · DENUE (INEGI) — para Neuromundi
 *
 * Responde una pregunta antes de descargar nada: ¿QUÉ CÓDIGOS de actividad
 * económica contienen a los especialistas que te interesan, y cuántos hay en
 * cada estado?
 *
 * No adivina códigos. Los descubre:
 *
 *   Fase 1 · toma una muestra de un sector completo en unos pocos estados y
 *            lee qué clases de actividad aparecen realmente, con su código.
 *   Fase 2 · marca las que coinciden con tus palabras clave, pero IMPRIME TODAS
 *            para que veas lo que descartó.
 *   Fase 3 · usa el método Cuantificar —que cuenta sin descargar— para darte el
 *            total por clase y por estado, en los 32 estados.
 *
 * Con eso decides si el barrido vale la pena, antes de gastar la tarde.
 *
 * Uso:
 *   $env:DENUE_TOKEN = "tu-token"
 *   node sonda-scian.mjs
 *
 * Ajustes por variable de entorno:
 *   SECTORES=62,61       sectores a explorar (2 dígitos)
 *   MUESTRA=09,14,22     estados de los que se toma la muestra
 *   MAX=3000             registros máximos por sector y estado
 *   PALABRAS=psicolog|neuro|...   regex para marcar las clases de interés
 */

import fs from 'node:fs/promises';

const TOKEN = process.env.DENUE_TOKEN;
const BASE  = 'https://www.inegi.org.mx/app/api/denue/v1/consulta';
const SECTORES = (process.env.SECTORES || '62,61').split(',');
const MUESTRA  = (process.env.MUESTRA  || '09,14,22').split(',');
const MAX      = parseInt(process.env.MAX || '3000', 10);
const PAGINA   = 1000;

// Ámbito de Neuromundi: neurodivergencia, neurodesarrollo y afecciones neurológicas.
const PALABRAS = new RegExp(process.env.PALABRAS ||
  'psicolog|psiquiatr|neurolog|neuro|terapia|terapeut|rehabilitaci|lenguaje|' +
  'audiolog|foniatr|educacion especial|especial|aprendizaje|desarrollo infantil|' +
  'pediatr|ocupacional|asistencia social|orientacion', 'i');

const ESTADOS = {
  '01':'Aguascalientes','02':'Baja California','03':'Baja California Sur','04':'Campeche',
  '05':'Coahuila','06':'Colima','07':'Chiapas','08':'Chihuahua','09':'Ciudad de México',
  '10':'Durango','11':'Guanajuato','12':'Guerrero','13':'Hidalgo','14':'Jalisco',
  '15':'México','16':'Michoacán','17':'Morelos','18':'Nayarit','19':'Nuevo León',
  '20':'Oaxaca','21':'Puebla','22':'Querétaro','23':'Quintana Roo','24':'San Luis Potosí',
  '25':'Sinaloa','26':'Sonora','27':'Tabasco','28':'Tamaulipas','29':'Tlaxcala',
  '30':'Veracruz','31':'Yucatán','32':'Zacatecas',
};

if (!TOKEN) {
  console.error('Falta DENUE_TOKEN.\n  PowerShell:  $env:DENUE_TOKEN = "tu-token"');
  process.exitCode = 1;
}

const dormir = ms => new Promise(r => setTimeout(r, ms));
const campo = (o, ...ns) => {
  for (const n of ns) for (const k of Object.keys(o)) if (k.toLowerCase() === n.toLowerCase()) return o[k];
  return null;
};

async function pedir(url, etiqueta) {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(90000) });
    if (!r.ok) { console.warn(`  ! ${etiqueta}: HTTP ${r.status}`); return null; }
    const t = await r.text();
    if (!t.trim() || t.trim() === '[]') return [];
    try { return JSON.parse(t); } catch { console.warn(`  ! ${etiqueta}: respuesta no-JSON`); return null; }
  } catch (e) {
    console.warn(`  ! ${etiqueta}: ${e.name === 'TimeoutError' ? 'sin respuesta a tiempo' : e.message}`);
    return null;
  }
}

/** BuscarAreaAct — 14 parámetros; el Id va justo antes del token. */
const urlSector = (ent, sector, ini, fin) =>
  `${BASE}/BuscarAreaAct/${ent}/0/0/0/0/${sector}/0/0/0/0/${ini}/${fin}/0/${TOKEN}`;

/** Cuantificar — actividad(es) / área(s) / estrato / token. Cuenta sin descargar. */
const urlContar = (codigos, areas) =>
  `${BASE}/Cuantificar/${codigos.join(',')}/${areas.join(',')}/0/${TOKEN}`;

async function main() {
  // ---- sonda de arranque: el ejemplo textual de la documentación -----------
  console.log('Validando el token con el ejemplo oficial del INEGI…');
  const ok = await pedir(`${BASE}/BuscarAreaAct/01/0/0/0/0/0/0/0/0/oxxo/1/5/0/${TOKEN}`, 'ejemplo');
  if (!ok || !ok.length) {
    throw Object.assign(new Error(
      'Ni el ejemplo de la documentación funciona: revisa el token o la conexión.\n' +
      '  $env:DENUE_TOKEN'), { esperado: true });
  }
  console.log('  ✓ token válido\n');

  // ---- Fase 1 · descubrir las clases que existen --------------------------
  console.log(`FASE 1 · muestreando sectores ${SECTORES.join(', ')} en ${MUESTRA.map(e => ESTADOS[e]).join(', ')}\n`);
  const clases = new Map();   // codigo -> { nombre, n }
  for (const sector of SECTORES) {
    for (const ent of MUESTRA) {
      let n = 0;
      for (let i = 1; i <= MAX; i += PAGINA) {
        const r = await pedir(urlSector(ent, sector, i, Math.min(i + PAGINA - 1, MAX)),
                              `sector ${sector} · ${ESTADOS[ent]} ${i}`);
        if (!r || !r.length) break;
        for (const x of r) {
          const cod = String(campo(x, 'CLASE_ACTIVIDAD_ID') || '').trim();
          const nom = campo(x, 'Clase_actividad') || '';
          if (!cod) continue;
          const c = clases.get(cod) || { nombre: nom, n: 0 };
          c.n++; clases.set(cod, c);
        }
        n += r.length;
        if (r.length < PAGINA) break;
        await dormir(250);
      }
      console.log(`  sector ${sector} · ${ESTADOS[ent]}: ${n} registros muestreados`);
    }
  }

  if (!clases.size) {
    throw Object.assign(new Error(
      `Los sectores ${SECTORES.join(',')} no devolvieron nada.\n` +
      'Prueba otros:  $env:SECTORES = "62"   o   "61"'), { esperado: true });
  }

  // ---- Fase 2 · marcar las de interés, mostrando todo ---------------------
  const orden = [...clases.entries()].sort((a, b) => b[1].n - a[1].n);
  const elegidas = orden.filter(([, c]) => PALABRAS.test(c.nombre));

  console.log(`\nFASE 2 · ${orden.length} clases distintas encontradas`);
  console.log(`         ${elegidas.length} coinciden con tus palabras clave (marcadas con ►)\n`);
  for (const [cod, c] of orden) {
    const marca = PALABRAS.test(c.nombre) ? '►' : ' ';
    console.log(`  ${marca} ${cod}  ${String(c.n).padStart(5)}  ${c.nombre.slice(0, 78)}`);
  }
  console.log('\n  Revisa la lista completa: si alguna sin ► te interesa, añádela con');
  console.log('  $env:PALABRAS o edita la lista antes de barrer.\n');

  await fs.writeFile('scian_clases.json',
    JSON.stringify(orden.map(([codigo, c]) => ({ codigo, ...c, interes: PALABRAS.test(c.nombre) })), null, 2), 'utf8');

  if (!elegidas.length) {
    throw Object.assign(new Error(
      'Ninguna clase coincidió con las palabras clave. Ajusta PALABRAS y vuelve a correr;\n' +
      'la muestra ya quedó en scian_clases.json, no hay que volver a descargarla.'), { esperado: true });
  }

  // ---- Fase 3 · contar en los 32 estados, sin descargar -------------------
  const codigos = elegidas.map(([c]) => c);
  const areas = Object.keys(ESTADOS);
  console.log(`FASE 3 · contando ${codigos.length} clases en los 32 estados…\n`);

  const conteo = await pedir(urlContar(codigos, areas), 'Cuantificar');
  if (!conteo || !conteo.length) {
    throw Object.assign(new Error(
      'Cuantificar no devolvió nada. Puede que sean demasiados códigos de un jalón:\n' +
      'reduce PALABRAS para quedarte con menos clases y reintenta.'), { esperado: true });
  }

  const porEstado = new Map(), porClase = new Map();
  for (const r of conteo) {
    const ae = String(campo(r, 'AE')), ag = String(campo(r, 'AG')), t = parseInt(campo(r, 'Total') || '0', 10);
    porEstado.set(ag, (porEstado.get(ag) || 0) + t);
    porClase.set(ae, (porClase.get(ae) || 0) + t);
  }

  const nomClase = Object.fromEntries(orden);
  console.log('POR CLASE\n');
  for (const [ae, t] of [...porClase].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(t).padStart(7)}  ${ae}  ${(nomClase[ae]?.nombre || '').slice(0, 70)}`);

  console.log('\nPOR ESTADO\n');
  for (const [ag, t] of [...porEstado].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(t).padStart(7)}  ${ESTADOS[ag] || ag}`);

  const filas = [['clase', 'nombre_clase', 'estado_clave', 'estado', 'total']];
  for (const r of conteo) {
    const ae = String(campo(r, 'AE')), ag = String(campo(r, 'AG'));
    filas.push([ae, (nomClase[ae]?.nombre || '').replace(/"/g, "'"), ag, ESTADOS[ag] || ag, campo(r, 'Total')]);
  }
  await fs.writeFile('scian_conteo.csv',
    filas.map(f => f.map(v => `"${v}"`).join(',')).join('\n'), 'utf8');

  const total = [...porClase.values()].reduce((a, b) => a + b, 0);
  console.log(`\nTOTAL NACIONAL: ${total.toLocaleString('es-MX')} establecimientos`);
  console.log('\n→ scian_clases.json   todas las clases del sector, con marca de interés');
  console.log('→ scian_conteo.csv    el conteo por clase y estado');
  console.log('\nMándame los dos y decidimos qué clases barrer y en qué orden.');
}

main().then(
  () => { process.exitCode = 0; },
  e => { console.error('\n' + (e.esperado ? e.message : (e.stack || e.message))); process.exitCode = 1; }
);
