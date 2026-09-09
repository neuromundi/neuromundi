#!/usr/bin/env node
/**
 * Clasificador · residencias, asilos y hospitales del DENUE
 *
 * Aplica el criterio de admisión que acordamos: una residencia de adultos
 * mayores entra a Neuromundi si atiende DETERIORO COGNITIVO, no por ser
 * residencia. Un asilo general no le sirve a nadie que busque en esta
 * plataforma, y mete cientos de resultados que ensucian el buscador.
 *
 * El problema es que el DENUE no dice qué atiende cada establecimiento: da
 * nombre, clase, domicilio y contacto, y nada más. Así que la admisión no se
 * puede resolver en esta etapa. Lo que hace este script es separar en tres:
 *
 *   admitidas.csv     el nombre ya prueba el ámbito (dice Alzheimer, memoria,
 *                     demencia, neuro…). Entran sin más trámite.
 *   por_verificar.csv no se sabe, pero tienen sitio o correo con el cual
 *                     averiguarlo. Estas pasan a la verificación en web.
 *   descartadas.csv   quedan fuera por lo que son (orfanatos, casas hogar
 *                     infantiles, anexos de adicciones) o porque no hay
 *                     manera de contactarlas ni de verificarlas.
 *
 * El sector NO se adivina: sale del propio código SCIAN. El INEGI distingue
 * público de privado en el último dígito (par = público), así que ahí no hay
 * margen de error.
 *
 * Uso:  node clasificar-residencias.mjs denue_fichas.json
 */
import fs from 'node:fs/promises';

// ---------- sector y tipo, deducidos del código -------------------------------

/** Último dígito par = sector público. Regla del propio SCIAN. */
const sectorDeClase = clase =>
  /^\d{6}$/.test(clase) ? (Number(clase[5]) % 2 === 0 ? 'publico' : 'privado') : '';

/** El tipo se deduce de la rama de cuatro dígitos, no de una lista de códigos
 *  escritos a mano: así funciona con las clases que descubra la sonda. */
function tipoDeClase(clase) {
  const rama = String(clase).slice(0, 4);
  if (['6221', '6222', '6223'].includes(rama)) return 'clinic';      // hospitales
  if (['6231', '6232', '6233'].includes(rama)) return 'caregiver';   // residencias y asilos
  return null;                                                        // 6239 y demás: fuera
}

// ---------- señales en el nombre ----------------------------------------------

const N = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/** Prueba el ámbito por sí sola: entra directo. */
const COGNITIVO = [
  ['alzheimer',  /ALZHEIMER|\bALZ\b/],
  ['demencia',   /DEMENCIA|DEMENCIAS/],
  ['memoria',    /\bMEMORIA\b|MEMORY|UNIDAD DE MEMORIA/],
  ['cognitivo',  /COGNITIV|DETERIORO MENTAL/],
  ['neuro',      /NEUROLOG|NEUROREHAB|NEURO\b/],
  ['parkinson',  /PARKINSON/],
  ['otras',      /ESCLEROSIS|EPILEPS|PARALISIS CEREBRAL|DAÑO CEREBRAL|EVENTO VASCULAR|\bEVC\b/],
];

/** Fuera por lo que son, aunque la clase encaje. */
const FUERA = [
  ['infantil',    /ORFANAT|CASA HOGAR|CASA CUNA|ALBERGUE INFANTIL|NIÑOS|NIÑAS|MENORES|INFANTIL/],
  ['adicciones',  /ADICC|ADICTOS|ALCOHOL|DROGA|ALCOHOLICOS ANONIMOS|SOBRIEDAD|\bANEXO\b|NARCOTICOS|TOXICOMAN|DESINTOXICA|DOCE PASOS|12 PASOS|\bGRANJA\b/],
  ['religioso',   /CRISTO|IGLESIA|CRISTIAN|EVANGEL|MINISTERIO|PENTECOST|CASA DE ORACION|\bASILO DE LA\b.*\bCARIDAD\b/],
  ['maternidad',  /MATERNIDAD|MADRES SOLTERAS|EMBARAZAD/],
  ['migrante',    /MIGRANT|REFUGIAD/],
];

// ---------- CSV ----------------------------------------------------------------

const esc = v => `"${String(v ?? '').replace(/"/g, "'")}"`;
const CAB = ['sector', 'provider_type', 'motivo', 'clee', 'nombre', 'clase_id', 'clase',
             'entidad', 'municipio', 'direccion', 'telefono', 'email', 'sitio_web', 'lat', 'lng'];

async function escribir(archivo, filas) {
  await fs.writeFile(archivo,
    [CAB.join(','), ...filas.map(f => CAB.map(c => esc(f[c])).join(','))].join('\n'), 'utf8');
}

// ---------- proceso ------------------------------------------------------------

const ruta = process.argv[2] || 'denue_fichas.json';
const fichas = JSON.parse(await fs.readFile(ruta, 'utf8'));
console.log(`${fichas.length.toLocaleString('es-MX')} fichas leídas de ${ruta}\n`);

const admitidas = [], porVerificar = [], descartadas = [];
const cuenta = { sin_tipo: 0 };

for (const d of fichas) {
  const tipo = tipoDeClase(d.clase_id);
  const sector = sectorDeClase(d.clase_id);
  const base = { ...d, provider_type: tipo || '', sector };

  if (!tipo) { cuenta.sin_tipo++; descartadas.push({ ...base, motivo: `clase fuera de alcance (${d.clase_id})` }); continue; }

  const nom = N(d.nombre);

  const fuera = FUERA.find(([, re]) => re.test(nom));
  if (fuera) { descartadas.push({ ...base, motivo: `fuera: ${fuera[0]}` }); continue; }

  const senal = COGNITIVO.find(([, re]) => re.test(nom));
  if (senal) { admitidas.push({ ...base, motivo: `el nombre prueba el ámbito: ${senal[0]}` }); continue; }

  // Los hospitales de especialidades entran a verificación aunque el nombre
  // no diga nada: es donde vive la neurología que nos falta.
  const contactable = (d.sitio_web && d.sitio_web.trim()) || (d.email && d.email.trim());
  if (!contactable) {
    descartadas.push({ ...base, motivo: 'sin sitio ni correo: no hay cómo verificar ni cómo invitar' });
    continue;
  }
  porVerificar.push({ ...base, motivo: 'hay que revisar si atiende deterioro cognitivo' });
}

await escribir('residencias_admitidas.csv', admitidas);
await escribir('residencias_por_verificar.csv', porVerificar);
await escribir('residencias_descartadas.csv', descartadas);

const porSector = (rs, s) => rs.filter(r => r.sector === s).length;
console.log(`ADMITIDAS      ${String(admitidas.length).padStart(5)}   (privado ${porSector(admitidas,'privado')} · publico ${porSector(admitidas,'publico')})`);
console.log(`POR VERIFICAR  ${String(porVerificar.length).padStart(5)}   (privado ${porSector(porVerificar,'privado')} · publico ${porSector(porVerificar,'publico')})`);
console.log(`DESCARTADAS    ${String(descartadas.length).padStart(5)}`);

const motivos = {};
for (const d of descartadas) motivos[d.motivo] = (motivos[d.motivo] || 0) + 1;
console.log('\nPor qué se descartaron:');
for (const [m, n] of Object.entries(motivos).sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(n).padStart(5)}  ${m}`);

console.log('\n→ residencias_admitidas.csv · residencias_por_verificar.csv · residencias_descartadas.csv');
console.log('\nLo que sigue: las de "por verificar" se revisan en su sitio buscando');
console.log('Alzheimer, demencia, deterioro cognitivo, unidad de memoria o neurorehabilitación.');
console.log('Solo las que lo prueben entran al directorio.');
