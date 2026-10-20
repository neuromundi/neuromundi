#!/usr/bin/env node
/**
 * revisar-conteos.mjs — AUDITOR 5: ¿lo que se ve es todo lo que hay?
 *
 * POR QUE EXISTE
 * El 19 de octubre de 2026 el directorio mostraba 1,000 fichas de las 1,818
 * publicadas: 818 invisibles, el 45 %. No fallaba nada. El servidor devuelve
 * como maximo 1,000 filas por peticion y lo hace EN SILENCIO, asi que la
 * pantalla pintaba mil y se quedaba tan tranquila. Los otros cuatro auditores
 * no podian verlo: comprueban que la base cumpla sus reglas, que los textos
 * existan, que los formularios validen y que la pantalla cargue sin errores.
 * Ninguno preguntaba lo unico que importaba: CUANTAS filas hay en la base y
 * CUANTAS llegan a los ojos de la persona.
 *
 * Ese es el hueco de familia, no un despiste suelto: casi todos los defectos
 * de esa jornada eran RECORTES CALLADOS. El envio de invitaciones cortaba a 50
 * sin decirlo. La cola saltaba 746 fichas sin token sin decirlo. La consulta de
 * categorias podia cortar a 1,000 sin decirlo. Un recorte callado no se detecta
 * mirando una sola fuente: hace falta comparar DOS fuentes independientes y
 * exigir que cuadren.
 *
 * QUE HACE
 *   1. CONTEO DE PUNTA A PUNTA: para cada pantalla de lista, pregunta al
 *      servidor cuantas filas existen con los MISMOS filtros que usa la
 *      pantalla, abre la pantalla en un navegador de verdad, cuenta lo que
 *      pinta, y exige que coincidan.
 *   2. TOPES SIN PAGINAR (estatico): busca consultas que pueden traer mas de
 *      mil filas sin pedir paginas, y lotes con limite por omision. Es el
 *      patron que produjo los tres recortes de esa jornada.
 *
 * Uso:
 *   node scripts/revision/revisar-conteos.mjs
 *   node scripts/revision/revisar-conteos.mjs --url http://localhost:4173
 *   node scripts/revision/revisar-conteos.mjs --solo-estatico   (sin navegador)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const iUrl = args.indexOf('--url');
const base = iUrl > -1 && (args[iUrl + 1] || '').startsWith('http')
  ? args[iUrl + 1]
  : 'https://www.neuromundi.com';
const soloEstatico = args.includes('--solo-estatico');

const hallazgos = [];

// ---------------------------------------------------------------------------
// 1. Topes sin paginar (estatico): no necesita red ni navegador.
// ---------------------------------------------------------------------------
const TOPE_SERVIDOR = 1000;

function archivos(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...archivos(p));
    else if (/\.(ts|tsx)$/.test(e) && !/\.test\./.test(e)) out.push(p);
  }
  return out;
}

// Tablas y vistas que hoy pueden pasar de mil filas, o que pueden pasar manana
// sin que nadie lo note. Si una consulta las lee sin paginar, el servidor la
// recorta en silencio.
const GRANDES = [
  'directorio', 'directorio_publico', 'directorio_publico_seguro',
  'directorio_invitaciones', 'directorio_plan_invitacion', 'provider_categories',
  'profile_events', 'directorio_eventos', 'notifications', 'campaign_emails',
];

// Los comentarios se BORRAN antes de buscar, pero conservando los saltos de
// linea para no desplazar los numeros. Sin esto, un punto y coma dentro de un
// comentario ("1,750 KB por visitante;") corta la cadena de la consulta y el
// revisor denuncia una consulta que si estaba paginada. Me paso en la primera
// pasada, el 19 de octubre de 2026.
function sinComentarios(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

for (const archivo of archivos('src')) {
  const bruto = readFileSync(archivo, 'utf8');
  const src = sinComentarios(bruto);
  const rel = relative('.', archivo);
  const linea = (i) => src.slice(0, i).split('\n').length;

  for (const tabla of GRANDES) {
    // Se mira la CADENA completa de la consulta: desde .from('tabla') hasta el
    // punto y coma o el await que la cierra.
    const re = new RegExp(`\\.from\\(\\s*['"\`]${tabla}['"\`]\\s*\\)([\\s\\S]{0,600}?)(;|\\n\\s*const |\\n\\s*return )`, 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      const cadena = m[1];
      // Una escritura no tiene tope de filas: no aplica.
      if (/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/.test(cadena)) continue;
      const pagina = /\.range\s*\(|\.limit\s*\(|count:\s*['"]exact['"]/.test(cadena);
      // Acotada de por si: una sola fila, o todas las de UNA entidad.
      const acotada = /\.single\s*\(|\.maybeSingle\s*\(/.test(cadena)
        || /\.eq\(\s*['"`](id|provider_id|user_id|directorio_id|ficha_id|profile_id)['"`]/.test(cadena);
      // Por lotes: el techo no es el numero de identificadores, es cuantas
      // filas puede devolver CADA identificador multiplicado por el lote. Esto
      // es lo que corto la consulta de categorias (200 x 7 = 1,400).
      const porLotes = /\.in\(\s*['"`]/.test(cadena);
      if (pagina || acotada) continue;
      // Un techo que ya se calculo y se dejo escrito se acepta: basta un
      // comentario `techo-comprobado:` junto a la consulta, con la cuenta. Asi
      // el revisor no grita siempre por lo mismo y la aceptacion queda a la
      // vista de quien lea el codigo, en vez de en la cabeza de alguien.
      const lineasBrutas = bruto.split('\n');
      const nLinea = linea(m.index);
      const vecindad = lineasBrutas.slice(Math.max(0, nLinea - 7), nLinea + 5).join('\n');
      if (/techo-comprobado:/.test(vecindad)) continue;
      if (porLotes) {
        hallazgos.push(
          `${rel}:${linea(m.index)}  lee '${tabla}' por lotes: comprueba el techo (identificadores por lote x filas por identificador) contra el tope de ${TOPE_SERVIDOR}`,
        );
      } else {
        hallazgos.push(
          `${rel}:${linea(m.index)}  lee '${tabla}' sin paginar ni limitar: el servidor corta en ${TOPE_SERVIDOR} filas sin avisar`,
        );
      }
    }
  }

  // Lotes con limite por omision: `slice(0, limit)` donde el limite tiene un
  // valor por omision mas chico que el lote. Fue el defecto del enviador.
  for (const m of src.matchAll(/Number\(\s*\w+\.limit\s*\?\?\s*(\d+)\s*\)/g)) {
    hallazgos.push(
      `${rel}:${linea(m.index)}  limite por omision ${m[1]}: comprueba que cubra el lote entero o que avise cuando corta`,
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Conteo de punta a punta: base contra pantalla.
// ---------------------------------------------------------------------------
// Cada entrada dice: que pantalla, que recurso del servidor la alimenta con
// que filtros, y como se cuenta lo que pinta. `cuenta` se ejecuta DENTRO del
// navegador, asi que solo puede usar el DOM.
const PANTALLAS = [
  {
    ruta: '/directorio',
    recurso: 'directorio_publico_seguro?role=eq.provider&is_published=is.true',
    cuenta: () => (document.querySelector('main')?.innerText.match(/Ver perfil/g) || []).length,
    nota: 'fichas del directorio',
  },
  {
    ruta: '/verificados',
    recurso: 'directorio_publico_seguro?role=eq.provider&is_published=is.true&is_verified=is.true',
    cuenta: () => document.querySelectorAll('main table tbody tr, main li').length,
    nota: 'registro de verificados',
  },
];

if (!soloEstatico) {
  const url = process.env.VITE_SUPABASE_URL || leerEnv('VITE_SUPABASE_URL');
  const key = process.env.VITE_SUPABASE_ANON_KEY || leerEnv('VITE_SUPABASE_ANON_KEY');

  if (!url || !key) {
    hallazgos.push('no pude leer VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: el conteo contra la base queda SIN HACER');
  } else {
    let chromium;
    try { ({ chromium } = await import('playwright')); }
    catch {
      hallazgos.push('falta Playwright: el conteo en pantalla queda SIN HACER (npm i -D playwright && npx playwright install chromium)');
    }

    if (chromium) {
      const navegador = await chromium.launch({ executablePath: process.env.NAVEGADOR || undefined });
      for (const p of PANTALLAS) {
        // Cuantas filas dice el servidor que hay.
        let enLaBase = null;
        try {
          const r = await fetch(`${url}/rest/v1/${p.recurso}&select=id`, {
            method: 'HEAD',
            headers: { apikey: key, Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' },
          });
          const cr = r.headers.get('content-range') || '';
          enLaBase = Number(cr.split('/')[1]);
          if (!Number.isFinite(enLaBase)) enLaBase = null;
        } catch { enLaBase = null; }

        if (enLaBase === null) {
          hallazgos.push(`${p.ruta}  no pude contar en la base (${p.nota}): queda SIN MEDIR, no se da por bueno`);
          continue;
        }

        const ctx = await navegador.newContext({ locale: 'es-MX' });
        const pag = await ctx.newPage();
        let enPantalla = null;
        try {
          await pag.goto(base + p.ruta, { waitUntil: 'networkidle', timeout: 45000 });
          await pag.waitForTimeout(2500);
          enPantalla = await pag.evaluate(p.cuenta);
        } catch (e) {
          hallazgos.push(`${p.ruta}  no cargo: ${String(e).slice(0, 110)}`);
        }
        await ctx.close();

        if (enPantalla === null) continue;
        if (enPantalla < enLaBase) {
          hallazgos.push(
            `${p.ruta}  la pantalla muestra ${enPantalla} de ${enLaBase} ${p.nota}: FALTAN ${enLaBase - enPantalla}`
            + (enPantalla === TOPE_SERVIDOR ? ' — y son exactamente 1,000, el tope del servidor: falta paginar' : ''),
          );
        } else if (enPantalla > enLaBase) {
          hallazgos.push(`${p.ruta}  la pantalla muestra ${enPantalla} y en la base hay ${enLaBase} ${p.nota}: sobran ${enPantalla - enLaBase}`);
        }
      }
      await navegador.close();
    }
  }
}

function leerEnv(nombre) {
  try {
    const txt = readFileSync('.env', 'utf8');
    const m = txt.match(new RegExp(`^${nombre}=(.*)$`, 'm'));
    return m ? m[1].trim() : '';
  } catch { return ''; }
}

if (hallazgos.length === 0) {
  console.log('Revision de conteos: sin hallazgos. Lo que se ve es todo lo que hay.');
  process.exit(0);
}
console.log(`Revision de conteos: ${hallazgos.length} hallazgo(s).\n`);
for (const h of hallazgos) console.log('  ' + h);
process.exit(1);
