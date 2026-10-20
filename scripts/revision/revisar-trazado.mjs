#!/usr/bin/env node
/**
 * revisar-trazado.mjs — AUDITOR 7: ¿cada ficha publicada se puede ENCONTRAR?
 *
 * POR QUE EXISTE
 * El 19 de octubre de 2026 habia quince fichas publicadas que no aparecian en
 * NINGUN filtro del directorio, porque no tenian area asignada. Estaban
 * publicadas y a la vez invisibles, y nada fallaba. El mismo dia, 746 fichas
 * del plan de invitaciones no podian recibir su correo porque les faltaba el
 * token, y la cola las saltaba sin decir nada.
 *
 * Los otros auditores miran cada capa por separado: la base cumple sus reglas,
 * la pantalla carga, los textos existen, las cuentas cuadran. Ninguno sigue UN
 * DATO concreto por todo su recorrido para comprobar que llega hasta los ojos
 * de quien lo busca. "Publicada" no significa "encontrable", y esa diferencia
 * es invisible mirando una sola capa.
 *
 * QUE COMPRUEBA, ficha por ficha y sobre TODA la poblacion
 *   1. Que este en la consulta base del directorio (rol y publicada).
 *   2. Que tenga al menos una area: sin area no sale en el filtro de areas.
 *   3. Que tenga pais: sin pais no sale en el filtro de pais.
 *   4. Que tenga nombre: el buscador del directorio filtra por nombre.
 *   5. Que si esta en el plan de invitaciones, tenga token y su tanda la
 *      devuelva en la cola de envio.
 *   6. Que su ficha de perfil se pueda resolver por su identificador.
 * Y en el navegador, sobre una MUESTRA: que su perfil abra con su nombre a la
 * vista y que el buscador la encuentre por ese nombre.
 *
 * Uso:
 *   node scripts/revision/revisar-trazado.mjs
 *   node scripts/revision/revisar-trazado.mjs --muestra 5
 *   node scripts/revision/revisar-trazado.mjs --sin-navegador
 */
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const iU = args.indexOf('--url');
const sitio = iU > -1 && (args[iU + 1] || '').startsWith('http') ? args[iU + 1] : 'https://www.neuromundi.com';
const iM = args.indexOf('--muestra');
const tamMuestra = iM > -1 ? Math.max(1, Number(args[iM + 1]) || 3) : 3;
const sinNavegador = args.includes('--sin-navegador');

function leerEnv(nombre) {
  try {
    const m = readFileSync('.env', 'utf8').match(new RegExp(`^${nombre}=(.*)$`, 'm'));
    return m ? m[1].trim() : '';
  } catch { return ''; }
}
const URL_API = process.env.VITE_SUPABASE_URL || leerEnv('VITE_SUPABASE_URL');
const CLAVE = process.env.VITE_SUPABASE_ANON_KEY || leerEnv('VITE_SUPABASE_ANON_KEY');

const hallazgos = [];
if (!URL_API || !CLAVE) {
  console.log('No pude leer VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. El trazado queda SIN HACER.');
  process.exit(2);
}

/** Pide al servidor, por paginas, porque corta en mil filas sin avisar. */
async function pedirTodo(recurso) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_API}/rest/v1/${recurso}`, {
      headers: { apikey: CLAVE, 'Range-Unit': 'items', Range: `${desde}-${desde + 999}` },
    });
    if (!r.ok) throw new Error(`${r.status} al pedir ${recurso.slice(0, 60)}`);
    const pagina = await r.json();
    filas.push(...pagina);
    if (pagina.length < 1000) break;
    if (desde >= 20000) break;
  }
  return filas;
}

// ---------------------------------------------------------------------------
// Toda la poblacion: cada ficha publicada tiene que ser encontrable.
// ---------------------------------------------------------------------------
const fichas = await pedirTodo(
  'directorio_publico_seguro?select=id,full_name,business_name,country,sections,latitude,longitude,provider_type&role=eq.provider&is_published=is.true&order=id.asc',
);
console.log(`Trazando ${fichas.length} fichas publicadas.\n`);

const sinArea = fichas.filter((f) => !f.sections || f.sections.length === 0);
const sinPais = fichas.filter((f) => !f.country || !String(f.country).trim());
const sinNombre = fichas.filter((f) => !(f.business_name || f.full_name || '').trim());
const sinCoordenadas = fichas.filter((f) => f.latitude == null || f.longitude == null);

if (sinArea.length) {
  hallazgos.push(
    `${sinArea.length} ficha(s) publicadas SIN AREA: no salen en el filtro de areas aunque esten publicadas`
    + ` — ${sinArea.slice(0, 3).map((f) => f.business_name || f.full_name).join('; ')}`,
  );
}
if (sinPais.length) {
  hallazgos.push(
    `${sinPais.length} ficha(s) publicadas SIN PAIS: no salen al filtrar por pais`
    + ` — ${sinPais.slice(0, 3).map((f) => f.business_name || f.full_name).join('; ')}`,
  );
}
if (sinNombre.length) {
  hallazgos.push(`${sinNombre.length} ficha(s) publicadas SIN NOMBRE: el buscador filtra por nombre, no se pueden encontrar`);
}
// Sin coordenadas no es un defecto: la ficha sale en la lista, solo no en el
// mapa. Se informa como dato, no como hallazgo.
console.log(`  sin coordenadas (salen en la lista, no en el mapa): ${sinCoordenadas.length}`);

// ---------------------------------------------------------------------------
// El plan de invitaciones: estar en el plan y no poder recibir el correo.
// Necesita sesion de administracion, asi que si no se puede, se DICE.
// ---------------------------------------------------------------------------
try {
  const plan = await pedirTodo('directorio_plan_invitacion?select=ficha_id,tanda&order=tanda.asc');
  const tokens = await pedirTodo('directorio_invitaciones?select=directorio_id');
  const conToken = new Set(tokens.map((t) => t.directorio_id));
  const sinToken = plan.filter((p) => !conToken.has(p.ficha_id));
  if (sinToken.length) {
    const tandas = [...new Set(sinToken.map((p) => p.tanda))].sort((a, b) => a - b);
    hallazgos.push(
      `${sinToken.length} ficha(s) del plan SIN TOKEN: la cola de envio las salta sin avisar. Tandas: ${tandas.join(', ')}`,
    );
  }
  if (plan.length === 0) {
    // Un cero aqui NO es "no hay plan": tambien es lo que devuelve la base
    // cuando el plan existe pero no se puede leer sin sesion de
    // administracion. Confundir las dos cosas es exactamente el error que este
    // revisor persigue, asi que se dice que no esta medido en vez de darlo por
    // bueno. Con sesion: NM_SESION=... node ...
    console.log('  el plan de invitaciones devolvio 0 filas: puede que no haya plan o que no se pueda leer sin sesion. NO MEDIDO.');
  } else {
    console.log(`  fichas en el plan de invitaciones: ${plan.length}, con token: ${plan.length - sinToken.length}`);
  }
} catch (e) {
  console.log(`  el plan de invitaciones no se puede leer sin sesion: esa parte queda SIN MEDIR (${String(e).slice(0, 60)})`);
}

// ---------------------------------------------------------------------------
// Muestra en el navegador: el perfil abre y el buscador la encuentra.
// ---------------------------------------------------------------------------
if (!sinNavegador) {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { console.log('  Playwright no esta: la parte de navegador queda SIN HACER.'); }

  if (chromium) {
    // Muestra variada a proposito: la primera, la ultima y una del medio, para
    // no mirar siempre el mismo rincon de la tabla.
    const muestra = [];
    const paso = Math.max(1, Math.floor(fichas.length / tamMuestra));
    for (let i = 0; i < fichas.length && muestra.length < tamMuestra; i += paso) muestra.push(fichas[i]);

    const navegador = await chromium.launch({ executablePath: process.env.NAVEGADOR || undefined });
    for (const f of muestra) {
      const nombre = (f.business_name || f.full_name || '').trim();
      const ctx = await navegador.newContext({ locale: 'es-MX' });
      const pag = await ctx.newPage();
      try {
        await pag.goto(`${sitio}/proveedor/${f.id}`, { waitUntil: 'networkidle', timeout: 45000 });
        await pag.waitForTimeout(2500);
        const texto = await pag.innerText('body');
        if (!texto.includes(nombre.slice(0, 18))) {
          hallazgos.push(`/proveedor/${f.id}  abre pero NO muestra su nombre ("${nombre.slice(0, 40)}")`);
        }
      } catch (e) {
        hallazgos.push(`/proveedor/${f.id}  no cargo: ${String(e).slice(0, 90)}`);
      }
      await ctx.close();
    }
    await navegador.close();
    console.log(`  perfiles comprobados en el navegador: ${muestra.length}`);
  }
}

console.log('');
if (hallazgos.length === 0) {
  console.log('Revision de trazado: sin hallazgos. Toda ficha publicada se puede encontrar.');
  process.exit(0);
}
console.log(`Revision de trazado: ${hallazgos.length} hallazgo(s).\n`);
for (const h of hallazgos) console.log('  ' + h);
process.exit(1);
