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
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
