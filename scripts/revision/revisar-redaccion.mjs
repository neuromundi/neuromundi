#!/usr/bin/env node
/**
 * revisar-redaccion.mjs — AUDITOR 6: la ortografia y la redaccion de lo que lee
 * la persona.
 *
 * POR QUE EXISTE
 * El 19 de octubre de 2026 el panel de administracion llevaba semanas diciendo
 * "Ubicacion", "Accion", "Telefono", "Se retirarian", "membresia", "recomendo"
 * y "Como se le pago". Diecinueve textos sin acentos. Y en el panel familiar se
 * leia "Foros de la Neurocamps", con el articulo que quedo de cuando la seccion
 * se llamaba "la Tribu": 88 textos en seis idiomas. Nada de eso lo encontro
 * ningun auditor. Lo encontre LEYENDO, que es justo lo que no escala.
 *
 * Los otros auditores comprueban que el texto EXISTA y que este en todos los
 * idiomas. Ninguno comprueba que este bien escrito.
 *
 * COMO LO DETECTA SIN DICCIONARIO
 * No hay corrector de espanol instalado, y pedir uno habria dejado el revisor
 * sin correr en la maquina de alguien. La senal mas fuerte no necesita
 * diccionario: si "Teléfono" aparece acentuado cuarenta veces y "Telefono"
 * aparece una, esa una es un error, y lo sabemos sin saber espanol. El propio
 * archivo es el diccionario. Se excluyen a mano los pares que SI son dos
 * palabras distintas (esta/esta, pago/pago, como/como, mas/mas...), porque ahi
 * las dos formas son correctas.
 *
 * QUE COMPRUEBA
 *   1. Una palabra escrita con y sin acento en el mismo idioma.
 *   2. Terminaciones que en espanol siempre llevan acento: -cion, -sion.
 *   3. Un articulo pegado al nombre de una marca ("la Neurocamps").
 *   4. Mezcla de tuteo y usted dentro del mismo grupo de textos.
 *   5. Erratas mecanicas: espacios dobles, espacio antes de un signo,
 *      interrogaciones y exclamaciones sin abrir, parentesis sin cerrar.
 *
 * Uso:  node scripts/revision/revisar-redaccion.mjs
 *       node scripts/revision/revisar-redaccion.mjs --idioma es
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = 'src/i18n/locales';
const args = process.argv.slice(2);
const iIdioma = args.indexOf('--idioma');
const soloIdioma = iIdioma > -1 ? args[iIdioma + 1] : null;

const hallazgos = [];
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Aplana el diccionario a pares clave -> texto. */
function plano(obj, pre = '', fuera = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const clave = pre ? `${pre}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) plano(v, clave, fuera);
    else if (typeof v === 'string') fuera.set(clave, v);
  }
  return fuera;
}

/** Quita lo que no es prosa: huecos {{x}}, etiquetas, enlaces, correos. */
const soloProsa = (s) => s
  .replace(/\{\{[^}]*\}\}/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, ' ');

// Pares en los que las DOS formas son palabras correctas del espanol. Aqui el
// revisor no puede decidir, asi que no opina.
const PARES_LEGITIMOS = new Set([
  'esta', 'este', 'ese', 'esa', 'aquel', 'mas', 'si', 'solo', 'aun', 'como',
  'cuando', 'cuanto', 'cuanta', 'donde', 'que', 'cual', 'quien', 'porque',
  'el', 'tu', 'mi', 'te', 'se', 'de', 'da', 'dio', 'pago', 'pagoo', 'entro',
  'llego', 'tomo', 'uso', 'cambio', 'publico', 'termino', 'continuo', 'numero',
  'practico', 'critico', 'intimo', 'legitimo', 'valido', 'especifico',
  'medico', 'domestico', 'magnifico', 'proximo', 'maximo', 'minimo',
  'estimulo', 'calculo', 'titulo', 'articulo', 'capitulo', 'deposito',
  'transito', 'limite', 'animo', 'participo', 'indico', 'explico', 'aplico',
  'comunico', 'notifico', 'verifico', 'modifico', 'significa',
]);

// Terminaciones que en espanol llevan acento sin excepcion practica.
const SUFIJOS = [
  { re: /\b[a-zñ]{3,}cion\b/gi, bien: '-ción' },
  { re: /\b[a-zñ]{3,}sion\b/gi, bien: '-sión' },
  // NO se ponen reglas para el condicional ni el futuro. Lo intente y estaba
  // mal: en espanol esas terminaciones son AMBIGUAS. "-arias" vale para el
  // condicional "retirarias" y para el adjetivo "hereditarias"; "-eran" vale
  // para el futuro "esperaran" y para el presente "esperan". Las dos reglas
  // dieron cinco avisos y los cinco eran falsos, asi que se quitaron en vez de
  // dejarlas haciendo ruido. Las palabras concretas que si son inequivocas
  // estan en SIEMPRE_CON_ACENTO.
];

// Palabras que NO existen en espanol sin su acento. Lista corta a proposito:
// cada entrada es una que no admite discusion, para que el revisor no opine
// donde no puede.
const SIEMPRE_CON_ACENTO = new Set([
  'telefono', 'telefonos', 'dias', 'pais', 'paises', 'despues', 'tambien',
  'asi', 'aqui', 'alli', 'alla', 'ademas', 'atras', 'detras', 'jamas',
  'quizas', 'segun', 'todavia', 'ningun', 'algun', 'estan', 'sera', 'seran',
  'podra', 'podran', 'tendra', 'tendran', 'hara', 'haran', 'dara', 'daran',
  'ira', 'iran', 'vendra', 'vendran', 'habra', 'habran', 'queria', 'querian',
  'tenia', 'tenian', 'habia', 'habian', 'decia', 'decian', 'venia', 'venian',
  'salia', 'salian', 'podia', 'podian', 'deberia', 'deberian', 'tendria',
  'tendrian', 'haria', 'harian', 'membresia', 'membresias', 'garantia',
  'garantias', 'categoria', 'categorias', 'compania', 'companias', 'economia',
  'bateria', 'baterias', 'cirugia', 'psicologia', 'pedagogia', 'tecnologia',
  'energia', 'autonomia', 'anatomia', 'economica', 'economico', 'medico',
  'medicos', 'medica', 'medicas', 'clinico', 'clinica', 'clinicas',
  'numero', 'numeros', 'codigo', 'codigos', 'credito', 'creditos',
  'ultimo', 'ultima', 'ultimos', 'ultimas', 'proximo', 'proxima',
  'minimo', 'maximo', 'unico', 'unica', 'unicos', 'unicas',
  'sabado', 'sabados', 'miercoles', 'raiz', 'maiz', 'oir', 'caida',
  'tambien', 'razon', 'razones', 'corazon', 'buzon', 'rincon',
]);

// Marcas y donde el articulo delante SI es un defecto.
//
// Esto no se puede decidir solo con gramatica, porque depende de la casa:
//  · Neurocamps: Enyoria decidio el 19 de octubre de 2026 que la marca va sola
//    en los seis idiomas. Se corrigieron 88 textos.
//  · Neuromundi: en portugues el articulo es NORMAL y correcto ("a Neuromundi
//    nasce"), y asi ha estado siempre sin que nadie objetara. En portugues no
//    se denuncia. Cambiar eso seria una decision editorial, no una errata, y no
//    la toma un revisor.
const MARCAS = [
  { nombre: 'Neurocamps', idiomas: null },                       // null = en todos
  { nombre: 'Neuromundi', idiomas: ['es', 'fr', 'it', 'de', 'en'] },
];
const ARTICULOS = {
  es: ['la', 'el', 'las', 'los', 'una', 'un', 'del', 'al'],
  pt: ['a', 'o', 'as', 'os', 'uma', 'um', 'da', 'do', 'na', 'no'],
  fr: ['la', 'le', 'les', 'une', 'un', 'du'],
  it: ['la', 'il', 'le', 'una', 'un', 'della', 'alla', 'nella'],
  de: ['die', 'der', 'das', 'den', 'dem', 'eine', 'ein'],
  en: ['the'],
};

// Marcas de trato. Si un grupo mezcla las dos, alguien lo escribio en dos ratos.
const USTED = /\b(usted|ustedes)\b|\b(su|sus)\s+(cuota|membres\wa|perfil|ficha|cuenta)\b|\b(Pulse|Elija|Anote|Revise|Escriba|Envie|Envíe|Guarde|Suba|Cuentenos|Cuéntenos|Pidale|Pídale|Vuelva|Haga|Pague|Gane)\b/;
const TUTEO = /\b(tu|tus|tú|ti)\b|\b(Pulsa|Elige|Anota|Revisa|Escribe|Envia|Envía|Guarda|Sube|Cuentanos|Cuéntanos|Pidele|Pídele|Vuelve|Haz|Paga|Gana|Crea|Agrega|Comparte|Descarga|Activa|Marca|Unete|Únete|Contacta)\b/;

// Claves cuyo texto es un FRAGMENTO que se pega detras de otro: el espacio del
// principio es deliberado. Se decide mirando el ESPANOL, y vale para todos los
// idiomas: en arabe, hebreo o coreano no se puede reconocer por la letra que
// sigue, y el primer intento los denunciaba a los cuatro.
const esp = JSON.parse(readFileSync(join(LOCALES, 'es.json'), 'utf8'));
const FRAGMENTOS = new Set(
  [...plano(esp)].filter(([, v]) => /^\s/.test(v)).map(([k]) => k),
);

// Textos donde "su" o "le" NO se refieren a quien lee, sino a una tercera
// persona ("el vendedor LE paga al promotor"), asi que no son un desliz de
// trato. Se anotan a mano porque ningun patron puede distinguirlo, y se anotan
// AQUI para que la excepcion quede a la vista y no en la cabeza de alguien.
const TERCERA_PERSONA = new Set([
  'comm.help',               // el vendedor le paga al promotor
  'adm.don.useRegistered',   // la direccion registrada en la cuenta del donante
  'network.empty',           // el perfil publico del OTRO proveedor
]);

const idiomas = readdirSync(LOCALES)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''))
  .filter((l) => !soloIdioma || l === soloIdioma);

for (const lang of idiomas) {
  const dic = plano(JSON.parse(readFileSync(join(LOCALES, `${lang}.json`), 'utf8')));
  const esLatino = ['es', 'pt', 'fr', 'it', 'de', 'en'].includes(lang);

  // ---- 1. Palabras que en espanol NUNCA son correctas sin acento -------
  // La primera version de este revisor comparaba cada palabra consigo misma:
  // si "Teléfono" salia 40 veces y "Telefono" una, denunciaba la una. Sonaba
  // ingenioso y era RUIDO: en espanol hay decenas de pares donde las dos
  // formas son correctas y distintas ("se prorroga" el verbo contra "la
  // prórroga" el nombre, "la campana" que suena contra "la campaña" que se
  // lanza, "me quedo" contra "quedó"). De los cuatro avisos que dio en su
  // primera pasada, los CUATRO eran falsos. Precision antes que cobertura:
  // ahora solo denuncia palabras que no existen sin su acento.
  if (lang === 'es') {
    for (const [clave, texto] of dic) {
      const prosa = soloProsa(texto);
      for (const w of prosa.match(/[A-Za-zÀ-ÿñÑ]{3,}/g) || []) {
        const b = w.toLowerCase();
        if (SIEMPRE_CON_ACENTO.has(b)) {
          hallazgos.push(`es.json  ${clave}: "${w}" nunca es correcta sin acento`);
        }
      }
    }
  }

  // ---- 2. Terminaciones que siempre llevan acento ----------------------
  if (lang === 'es') {
    for (const [clave, texto] of dic) {
      for (const { re, bien } of SUFIJOS) {
        for (const m of soloProsa(texto).match(re) || []) {
          // Mayusculas sostenidas (un titulo en caja alta) no llevan acento.
          if (m === m.toUpperCase()) continue;
          hallazgos.push(`es.json  ${clave}: "${m}" deberia terminar en ${bien}`);
        }
      }
    }
  }

  // ---- 3. Articulo pegado a una marca ---------------------------------
  const arts = ARTICULOS[lang];
  if (arts) {
    for (const { nombre: marca, idiomas } of MARCAS) {
      if (idiomas && !idiomas.includes(lang)) continue;
      for (const [clave, texto] of dic) {
        // Un nombre compuesto SI lleva articulo: "ein Neurocamps-Forum".
        const t = texto.replace(new RegExp(`${marca}-\\w+`, 'g'), ' ');
        // Si detras de la marca viene OTRA palabra, el articulo casi siempre
        // es de esa palabra y no de la marca: "la Neuromundi ID", "the
        // Neuromundi community", "the Neuromundi code". De los avisos de las
        // primeras pasadas, trece eran de este caso y los trece eran
        // correctos. Asi que solo se denuncia el caso INEQUIVOCO: la marca
        // cierra la frase, como en "Foros de la Neurocamps" o "Ir a la
        // Neurocamps". Se pierde cobertura ("la Neurocamps esta abierta" no se
        // ve) y se gana no mentir.
        const re = new RegExp(`\\b(${arts.join('|')})\\s+${marca}(?=\\s*[.,;:!?)"»”]|\\s*$)`, 'gi');
        for (const m of t.match(re) || []) {
          hallazgos.push(`${lang}.json  ${clave}: "${m.trim()}" lleva articulo delante de la marca al cerrar la frase`);
        }
      }
    }
  }

  // ---- 4. Tuteo y usted mezclados dentro del mismo grupo ---------------
  if (lang === 'es') {
    const grupos = new Map();
    for (const [clave, texto] of dic) {
      const g = clave.split('.')[0];
      if (!grupos.has(g)) grupos.set(g, { usted: [], tuteo: [] });
      if (TERCERA_PERSONA.has(clave)) continue;
      const t = soloProsa(texto);
      if (USTED.test(t)) grupos.get(g).usted.push(clave);
      else if (TUTEO.test(t)) grupos.get(g).tuteo.push(clave);
    }
    for (const [g, { usted, tuteo }] of grupos) {
      if (!usted.length || !tuteo.length) continue;
      const menor = usted.length <= tuteo.length ? 'usted' : 'tuteo';
      const lista = (menor === 'usted' ? usted : tuteo).slice(0, 4).join(', ');
      hallazgos.push(
        `es.json  el grupo "${g}" mezcla trato: ${usted.length} de usted y ${tuteo.length} de tu. Minoria (${menor}): ${lista}`,
      );
    }
  }

  // ---- 5. Erratas mecanicas -------------------------------------------
  for (const [clave, texto] of dic) {
    const t = texto;
    if (/\S {2,}\S/.test(t)) hallazgos.push(`${lang}.json  ${clave}: espacios dobles`);
    if (/\s+[,;:!?](\s|$)/.test(t) && lang !== 'fr') {
      hallazgos.push(`${lang}.json  ${clave}: espacio antes de un signo de puntuacion`);
    }
    // Un texto que empieza con espacio y sigue en minuscula o con un
    // separador es un FRAGMENTO que se pega detras de otro (" de la Comunidad
    // Neuromundi.", " · hora de {{zona}}"), y el espacio es deliberado. Los
    // tres avisos de la primera pasada eran de estos.
    // El espacio al principio o al final solo se mira en ESPANOL, que es el
    // idioma en el que se escribe. En los demas es una traduccion y el espacio
    // obedece a su propia gramatica: el coreano necesita " 및 " con espacio a
    // los dos lados, y pone la etiqueta del manifiesto al final, asi que el
    // espacio es correcto. El primer intento denunciaba cuatro de esos.
    const esFragmento = FRAGMENTOS.has(clave) || /^\s+[a-záéíóúñ·,.;:(]/.test(t);
    if (lang === 'es' && /^\s|\s$/.test(t) && !esFragmento) {
      hallazgos.push(`es.json  ${clave}: empieza o acaba con espacio`);
    }
    const abre = (t.match(/\(/g) || []).length;
    const cierra = (t.match(/\)/g) || []).length;
    if (abre !== cierra) hallazgos.push(`${lang}.json  ${clave}: parentesis sin cerrar (${abre} abren, ${cierra} cierran)`);
    if (lang === 'es') {
      if (/\?/.test(t) && !/¿/.test(t)) hallazgos.push(`es.json  ${clave}: pregunta sin "¿" de apertura`);
      if (/!/.test(t) && !/¡/.test(t) && !/<|&/.test(t)) hallazgos.push(`es.json  ${clave}: exclamacion sin "¡" de apertura`);
    }
    if (esLatino && / /.test(t)) hallazgos.push(`${lang}.json  ${clave}: espacio duro invisible`);
  }
}

if (hallazgos.length === 0) {
  console.log('Revision de redaccion: sin hallazgos.');
  process.exit(0);
}
console.log(`Revision de redaccion: ${hallazgos.length} hallazgo(s).\n`);
for (const h of hallazgos) console.log('  ' + h);
process.exit(1);
