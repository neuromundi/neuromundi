#!/usr/bin/env node
/**
 * revisar-textos.mjs — AUDITOR 3 (parte estatica): los textos de la pantalla.
 *
 * El 19 de octubre apareciron nueve claves SIN traducir mostrandose crudas en
 * el panel ("metrics.new7d" en vez de "Altas ultimos 7 dias"). Nadie lo vio
 * hasta que alguien abrio esa pestana. Esto lo detecta sin abrir nada:
 *
 *   1. Toda clave que el codigo usa con t('x') existe en espanol.
 *   2. Todo idioma tiene las mismas claves que el espanol (ninguna de menos).
 *   3. Ninguna traduccion quedo con el texto en espanol copiado tal cual
 *      en idiomas que no comparten alfabeto (senal de copia sin traducir).
 *
 * Uso:  node scripts/revision/revisar-textos.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const LOCALES = 'src/i18n/locales';
const RAIZ = 'src';

const plano = (obj, pre = '', fuera = new Map()) => {
  for (const [k, v] of Object.entries(obj)) {
    const clave = pre ? `${pre}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) plano(v, clave, fuera);
    else fuera.set(clave, v);
  }
  return fuera;
};

const idiomas = readdirSync(LOCALES).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
const diccionarios = new Map(
  idiomas.map((l) => [l, plano(JSON.parse(readFileSync(join(LOCALES, `${l}.json`), 'utf8')))]),
);
const es = diccionarios.get('es');

/** Borra comentarios conservando los saltos de linea (los numeros no se mueven). */
function sinComentarios(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

function archivos(dir) {
  const salida = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) salida.push(...archivos(p));
    else if (/\.(ts|tsx)$/.test(e) && !/\.test\./.test(e)) salida.push(p);
  }
  return salida;
}

const hallazgos = [];
const lineaDe = (src, i) => src.slice(0, i).split('\n').length;

// 1. Claves usadas por el codigo que no existen en espanol.
for (const archivo of archivos(RAIZ)) {
  const src = readFileSync(archivo, 'utf8');
  const rel = relative('.', archivo);
  for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
    const clave = m[1];
    // Las claves con parte variable (`notif.tipo.${x}.title`) no se pueden comprobar.
    if (clave.includes('${')) continue;
    if (!es.has(clave)) {
      // Puede ser el prefijo de un grupo (p. ej. t('reg.miss') + sufijo): se acepta
      // si hay alguna clave que empiece asi.
      // i18next resuelve los plurales con sufijo (_one, _other...), asi que la
      // clave base no existe como tal y no es un fallo.
      const esPlural = ['_one', '_other', '_zero', '_two', '_few', '_many'].some((suf) => es.has(clave + suf));
      const esPrefijo = esPlural || [...es.keys()].some((k) => k.startsWith(clave + '.'));
      if (!esPrefijo) hallazgos.push(`${rel}:${lineaDe(src, m.index)}  usa el texto '${clave}', que no existe en espanol`);
    }
  }
}

// 1b. Grupos de textos que el codigo arma con una parte variable
//     (`t(`tipoMiembro.${clave}`)`). No se puede saber que valores tomara la
//     variable, pero SI se puede exigir que el grupo exista en espanol: si
//     esta vacio, la pantalla imprimira la clave interna cruda. Asi se colo
//     `adm.badges.type.` hasta el 19 de octubre de 2026, que hacia aparecer
//     "service_provider" y "ngo" en el panel de administracion.
for (const archivo of archivos(RAIZ)) {
  const src = readFileSync(archivo, 'utf8');
  const rel = relative('.', archivo);
  for (const m of src.matchAll(/\bt\(\s*`([a-zA-Z0-9_.]+)\.\$\{/g)) {
    const grupo = m[1];
    const cuantas = [...es.keys()].filter((k) => k.startsWith(grupo + '.')).length;
    if (cuantas === 0) {
      hallazgos.push(`${rel}:${lineaDe(src, m.index)}  arma textos con '${grupo}.<variable>', pero ese grupo no tiene ni un texto en espanol`);
    }
  }
}

// 1d. Listas pedidas con `returnObjects: true` que no se blindan con
//     Array.isArray. i18next devuelve la CLAVE (una cadena) cuando falta la
//     traduccion, y entonces el `.map` de la pantalla revienta: pantalla en
//     blanco, sin mensaje, en el idioma al que le falte el texto. Tres sitios
//     ya lo blindaban y dos no (Academy y Benefits, 19 de octubre de 2026).
//     Esto no se puede comprobar comparando diccionarios: hay que exigir el
//     blindaje en el codigo, porque el dia que falte una clave ya es tarde.
for (const archivo of archivos(RAIZ)) {
  const src = sinComentarios(readFileSync(archivo, 'utf8'));
  const rel = relative('.', archivo);
  for (const m of src.matchAll(/returnObjects:\s*true/g)) {
    // Ventana: desde el inicio de la sentencia hasta 220 caracteres despues.
    const ini = Math.max(0, src.lastIndexOf('\n', m.index - 1));
    const ventana = src.slice(ini, m.index + 220);
    const blindado = /Array\.isArray/.test(ventana) || /defaultValue:\s*\[\s*\]/.test(ventana);
    if (!blindado) {
      hallazgos.push(
        `${rel}:${lineaDe(src, m.index)}  pide una lista con returnObjects sin blindarla: si falta la traduccion, t() devuelve la clave (una cadena) y el .map revienta la pantalla. Usar Array.isArray o defaultValue: []`,
      );
    }
  }
}

// 1e. Archivos con la codificacion rota (mojibake) o con BOM.
//     src/pages/Settings.tsx estaba guardado con los bytes UTF-8 leidos como
//     si fueran Windows-1252 y vueltos a guardar: 36 palabras con la tilde
//     rota, y una de ellas era VISIBLE, el texto de ejemplo del campo de
//     Facebook, que decia "facebook.com/pAgina". Nada fallaba y el compilador
//     no se queja: es la misma familia callada. El BOM se reclama porque es lo
//     que delata que un editor reescribio el archivo con otra codificacion.
//     Para documentar el mojibake a proposito (src/lib/csv.ts lo hace, y con
//     razon) se pone "mojibake-a-proposito" en un comentario de esa linea o la
//     anterior.
for (const archivo of archivos(RAIZ)) {
  const bytes = readFileSync(archivo);
  const rel = relative('.', archivo);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    hallazgos.push(`${rel}:1  empieza con BOM: senal de que se reescribio con otra codificacion`);
  }
  const lineas = bytes.toString('utf8').split('\n');
  lineas.forEach((linea, i) => {
    if (!/[\u00c2\u00c3\u00e2][\u0080-\u00bf\u2013\u2014\u20ac]/.test(linea)) return;
    const permitido = /mojibake-a-proposito/.test(linea) || /mojibake-a-proposito/.test(lineas[i + 1] ?? '');
    if (!permitido) {
      hallazgos.push(`${rel}:${i + 1}  codificacion rota (mojibake): las tildes estan guardadas como "Ã©", "Ã±"...`);
    }
  });
}

// 1f. La PORTADA pintando claves crudas mientras llega el diccionario.
//     El primer pintado usa solo el chunk critico (unas 400 claves de 4,949).
//     Su contenido se decide con una lista a mano en gen_i18n_critical.mjs, y
//     esa lista se habia quedado corta: el 20 de octubre de 2026 faltaban
//     `counters.*` (los contadores grandes), `ally.*` (la banda del aliado),
//     `info.title`, `events.online`, `lms.tab`, `shop.title` y los avisos de
//     cuota. Con la red lenta, esas zonas enseñaban su clave interna —
//     "counters.countries"— hasta que llegaba el diccionario completo. No
//     fallaba nada: se veia texto, solo que el equivocado. La familia de
//     siempre.
//
//     Aqui se comprueba al reves: se leen las claves que de verdad usan los
//     archivos de la portada y su cascara, y se exige que TODAS esten en el
//     chunk critico. Si alguien añade una seccion a la portada, esto lo dice.
const ARCHIVOS_DE_LA_PORTADA = [
  'src/pages/Home.tsx',
  'src/components/layout/AppLayout.tsx',
  ...(existsSync('src/components/home') ? archivos('src/components/home') : []),
];
{
  const critEs = JSON.parse(readFileSync('src/i18n/critical/es.crit.json', 'utf8'));
  const planas = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (
    v && typeof v === 'object' && !Array.isArray(v) ? planas(v, pre + k + '.') : [pre + k]
  ));
  const enCritico = new Set(planas(critEs));
  for (const archivo of ARCHIVOS_DE_LA_PORTADA) {
    let src;
    try { src = sinComentarios(readFileSync(archivo, 'utf8')); } catch { continue; }
    const rel = relative('.', archivo);
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
      const clave = m[1];
      if (!es.has(clave)) continue; // ya lo reclama la comprobacion 1
      if (enCritico.has(clave)) continue;
      const esPrefijo = [...enCritico].some((k) => k.startsWith(clave + '.'));
      if (esPrefijo) continue;
      hallazgos.push(
        `${rel}:${lineaDe(src, m.index)}  la portada pinta '${clave}' pero no esta en el chunk critico: se vera la clave cruda hasta que llegue el diccionario completo. Añadirla en scripts/gen_i18n_critical.mjs`,
      );
    }
  }
}

// 1c. Los archivos "criticos" (src/i18n/critical/*.crit.json) se GENERAN desde
//     los diccionarios y estan versionados, porque son los textos del primer
//     pintado. Si alguien cambia un texto y no vuelve a generarlos, la pantalla
//     ensena el texto VIEJO el primer instante y nada falla. Deriva callada,
//     igual que las demas: aqui se comprueba que lo generado coincida con su
//     fuente. Se arregla con `npm run gen:i18n-critical`.
for (const lang of idiomas) {
  const rutaCrit = join('src/i18n/critical', `${lang}.crit.json`);
  let crit;
  try { crit = plano(JSON.parse(readFileSync(rutaCrit, 'utf8'))); }
  catch { continue; }   // si no existe, no es asunto de este control
  const dic = diccionarios.get(lang);
  // Las listas (home.slides) llegan como arreglo, y dos arreglos nunca son
  // iguales con !==. Se comparan por su contenido, o el control denunciaba los
  // once idiomas siempre.
  const iguales = (a, b) =>
    Array.isArray(a) || Array.isArray(b) ? JSON.stringify(a) === JSON.stringify(b) : a === b;
  const distintos = [...crit.entries()].filter(([k, v]) => dic.has(k) && !iguales(dic.get(k), v));
  if (distintos.length) {
    hallazgos.push(
      `${lang}.crit.json  ${distintos.length} texto(s) del primer pintado no coinciden con ${lang}.json`
      + ` (ejecute: npm run gen:i18n-critical): ${distintos.slice(0, 4).map(([k]) => k).join(', ')}`,
    );
  }
}

// 2. Claves que faltan en algun idioma.
for (const [lang, dic] of diccionarios) {
  if (lang === 'es') continue;
  const faltan = [...es.keys()].filter((k) => !dic.has(k));
  if (faltan.length) {
    hallazgos.push(`${lang}.json  le faltan ${faltan.length} texto(s) que si estan en espanol: ${faltan.slice(0, 6).join(', ')}${faltan.length > 6 ? ', ...' : ''}`);
  }
}

// 3. Texto sin traducir en idiomas de otro alfabeto.
const OTRO_ALFABETO = ['ar', 'he', 'ja', 'ko', 'zh'];
for (const lang of OTRO_ALFABETO) {
  const dic = diccionarios.get(lang);
  if (!dic) continue;
  // Un texto identico al espanol solo es sospechoso si de verdad es PROSA:
  // las marcas ("Neuromundi Academy"), los nombres propios y las cadenas que
  // solo llevan huecos de sustitucion ("{{a}} · {{b}}") son identicas a
  // proposito en todos los idiomas.
  const PALABRAS_ES = /\b(de|la|el|los|las|un|una|no|se|para|con|que|al|del|su|tu|y|en|por|es|esta|hay)\b/i;
  const esProsa = (v) => {
    const limpio = String(v).replace(/\{\{[^}]*\}\}/g, ' ').replace(/[^\p{L}\s]/gu, ' ').trim();
    const palabras = limpio.split(/\s+/).filter(Boolean);
    return palabras.length >= 3 && PALABRAS_ES.test(limpio);
  };
  // Nombres propios de instituciones: son identicos en todos los idiomas a
  // proposito (el nombre del Observatorio no se traduce).
  const NOMBRES_PROPIOS = new Set(['ally.logoAlt']);
  const copiados = [...es.entries()].filter(([k, v]) =>
    typeof v === 'string' && !NOMBRES_PROPIOS.has(k) && esProsa(v) && dic.get(k) === v,
  );
  if (copiados.length) {
    hallazgos.push(`${lang}.json  tiene ${copiados.length} texto(s) identicos al espanol (sin traducir): ${copiados.slice(0, 4).map(([k]) => k).join(', ')}${copiados.length > 4 ? ', ...' : ''}`);
  }
}

if (hallazgos.length === 0) {
  console.log('Revision de textos: sin hallazgos.');
  process.exit(0);
}
console.log(`Revision de textos: ${hallazgos.length} hallazgo(s).\n`);
for (const h of hallazgos) console.log('  ' + h);
process.exit(1);
