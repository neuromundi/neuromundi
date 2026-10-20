#!/usr/bin/env node
/**
 * revisar-pantallas.mjs — AUDITOR 3 (parte viva): recorre la plataforma en un
 * navegador real y anota lo que falla de verdad al cargar cada pantalla.
 *
 * Qué marca, y sólo eso:
 *   - errores de JavaScript en la consola (una pantalla que se cae)
 *   - peticiones con respuesta 4xx o 5xx
 *   - pantallas practicamente vacias (menos de 400 caracteres de texto)
 *   - claves de texto crudas visibles ("metrics.new7d" en vez de su texto)
 *
 * Uso:
 *   node scripts/revision/revisar-pantallas.mjs
 *   node scripts/revision/revisar-pantallas.mjs --url http://localhost:4173
 *
 * Necesita Playwright instalado (npm i -D playwright && npx playwright install chromium).
 * Recorre solo pantallas PUBLICAS: las privadas necesitan sesion y se revisan
 * aparte, con una cuenta de prueba de cada tipo.
 */
const args = process.argv.slice(2);
const base = (args[args.indexOf('--url') + 1] || '').startsWith('http')
  ? args[args.indexOf('--url') + 1]
  : 'https://www.neuromundi.com';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch {
  console.log('Falta Playwright. Instalalo con: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const RUTAS = [
  '/', '/directorio', '/buscar', '/tienda', '/eventos', '/blog', '/academy',
  '/kit', '/inclusion-escolar', '/inclusion-laboral', '/red', '/tribu',
  '/aliados', '/fundadores', '/donantes', '/donar', '/beneficios',
  '/conocer-mas', '/manifiesto', '/reglamento', '/encuesta', '/verificados',
  '/proteccion-datos', '/privacidad', '/terminos', '/soporte',
  '/pregunta-al-experto', '/crear-cuenta', '/entrar', '/correo-confirmado',
];

// Pantallas que exigen sesion. Solo se recorren con --privadas y una sesion
// puesta en NM_SESION (el contenido del dato de sesion que guarda el navegador).
// Claude NUNCA escribe contrasenas en produccion: la sesion la aporta quien
// ejecuta el revisor, no se adivina ni se teclea aqui.
const RUTAS_PRIVADAS = [
  '/panel', '/ajustes', '/calendario', '/mensajes', '/mi-id', '/curso-bienvenida',
];

// Una clave cruda se reconoce porque es palabra.palabra sin espacios ni acentos.
const CLAVE_CRUDA = /\b[a-z][a-zA-Z0-9]{2,}\.[a-z][a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]+)*\b/g;
const PERMITIDO = /(www\.|\.com|\.org|\.mx|\.net|\.co|@|\.png|\.jpg|\.svg|\.js|\.css)/;

// Claves internas con guion bajo que se quedan a la vista cuando la pantalla
// pide una traduccion que no existe y cae al respaldo (asi se descubrio que
// `service_provider`, `ngo` y `wellness` se imprimian crudos en el panel de
// administracion el 19 de octubre de 2026). El patron de puntos de arriba no
// las veia porque no llevan punto.
const CLAVE_GUION = /\b[a-z]{3,}(_[a-z]{2,}){1,3}\b/g;

// Correos y direcciones web producen falsos positivos (`karen.garcia`,
// `cuidare.ae`): se borran del texto ANTES de buscar claves.
function sinCorreosNiEnlaces(texto) {
  return texto
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, ' ')
    .replace(/\bhttps?:\/\/\S+/gi, ' ')
    .replace(/\b[\w-]+(\.[\w-]+)+\.(com|org|net|mx|es|pt|br|ar|cl|pe|co|ca|us|edu|gov|info|biz|io|app|ae|cat|eu|uk|de|fr|it)\b/gi, ' ');
}

// En entornos donde Chromium vive fuera del sitio habitual, se indica con la
// variable NAVEGADOR (ruta al ejecutable).
const privadas = args.includes('--privadas');
const sesion = process.env.NM_SESION ?? '';
if (privadas && !sesion) {
  console.log('Para --privadas hace falta una sesion en la variable NM_SESION.');
  console.log('Se saca del navegador, con la sesion ya abierta, en la consola:');
  console.log("  copy(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('auth-token'))))");
  process.exit(2);
}
const TODAS = privadas ? [...RUTAS, ...RUTAS_PRIVADAS] : RUTAS;

const navegador = await chromium.launch(
  process.env.NAVEGADOR ? { executablePath: process.env.NAVEGADOR } : {},
);
const hallazgos = [];

for (const ruta of TODAS) {
  const ctx = await navegador.newContext({ locale: 'es-MX' });
  const pag = await ctx.newPage();
  if (sesion) {
    // La sesion se pone ANTES de que cargue la aplicacion, igual que la
    // encontraria si la persona ya hubiera entrado.
    await pag.addInitScript((valor) => {
      try { localStorage.setItem('sb-sboagswcehuxwfjdbhdn-auth-token', valor); } catch { /* ignorar */ }
    }, sesion);
  }
  const errores = [];
  const fallos = [];
  pag.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 160)); });
  pag.on('response', (r) => {
    const s = r.status();
    if (s >= 400 && !r.url().includes('/rest/v1/rpc/')) fallos.push(`${s} ${r.url().slice(0, 110)}`);
  });

  try {
    await pag.goto(base + ruta, { waitUntil: 'networkidle', timeout: 30000 });
    await pag.waitForTimeout(1200);
    const texto = await pag.innerText('body');

    if (texto.trim().length < 400) hallazgos.push(`${ruta}  pantalla casi vacia (${texto.trim().length} caracteres)`);

    const limpio = sinCorreosNiEnlaces(texto);
    const crudas = [...new Set((limpio.match(CLAVE_CRUDA) || []).filter((c) => !PERMITIDO.test(c)))];
    if (crudas.length) hallazgos.push(`${ruta}  textos sin traducir a la vista: ${crudas.slice(0, 5).join(', ')}`);

    const conGuion = [...new Set(limpio.match(CLAVE_GUION) || [])];
    if (conGuion.length) hallazgos.push(`${ruta}  claves internas a la vista: ${conGuion.slice(0, 5).join(', ')}`);

    for (const e of [...new Set(errores)]) hallazgos.push(`${ruta}  error de consola: ${e}`);
    for (const f of [...new Set(fallos)]) hallazgos.push(`${ruta}  peticion fallida: ${f}`);
  } catch (e) {
    hallazgos.push(`${ruta}  no cargo: ${String(e).slice(0, 120)}`);
  }
  await ctx.close();
}

await navegador.close();

if (hallazgos.length === 0) {
  console.log(`Revision de pantallas (${TODAS.length} rutas en ${base}): sin hallazgos.`);
  process.exit(0);
}
console.log(`Revision de pantallas (${TODAS.length} rutas en ${base}): ${hallazgos.length} hallazgo(s).\n`);
for (const h of hallazgos) console.log('  ' + h);
process.exit(1);
