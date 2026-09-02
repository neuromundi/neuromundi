/**
 * feesCsv — lectura y escritura del CSV de cuotas por país (lógica pura).
 *
 * FORMATO (una fila por país + tipo de afiliado + clase de miembro):
 *
 *   pais;tipo;clase;moneda;mensual;anual;anual_referencia;sin_centavos
 *   México;medical_specialist;founder;MXN;1000;10000;12000;no
 *   México;medical_specialist;ordinary;MXN;1500;15000;18000;no
 *
 * Decisiones pensadas para el mundo real:
 *  · El separador se DETECTA solo: Excel en español guarda con ";" y casi todo
 *    lo demás con ",". Si viene ";" también se acepta la coma decimal (1000,50).
 *  · El país se escribe como se lea mejor ("México"); la base lo normaliza sin
 *    acentos, así que "Mexico" y "México" son el mismo país.
 *  · Se acepta español o inglés en tipo y clase (fundador/founder).
 *  · Cada fila se valida por separado y los errores se reportan con su número
 *    de línea: un archivo con un renglón malo no debe tumbar todo el resto.
 */

export const FEE_CSV_HEADERS = [
  'pais',
  'tipo',
  'clase',
  'moneda',
  'mensual',
  'anual',
  'anual_referencia',
  'sin_centavos',
] as const;

/** Tipos de afiliado válidos (deben existir en membership_fees). */
export const FEE_TYPES = [
  'patient',
  'parent',
  'medical_specialist',
  'nonmedical_specialist',
  'service_provider',
  'merchant',
  'school',
  'clinic',
  'ngo',
] as const;

export type FeeType = (typeof FEE_TYPES)[number];
export type FeeClass = 'founder' | 'ordinary';

export interface FeeCsvRow {
  pais: string;
  tipo: FeeType;
  clase: FeeClass;
  moneda: string;
  mensual: number;
  anual: number;
  anual_referencia: number;
  sin_centavos: boolean;
}

export interface FeeCsvError {
  linea: number;
  motivo: string;
}

export interface FeeCsvParseResult {
  rows: FeeCsvRow[];
  errors: FeeCsvError[];
}

/** Sinónimos aceptados para la clase de miembro. */
const CLASS_ALIASES: Record<string, FeeClass> = {
  founder: 'founder',
  fundador: 'founder',
  fundadora: 'founder',
  ordinary: 'ordinary',
  ordinaria: 'ordinary',
  ordinario: 'ordinary',
  estandar: 'ordinary',
  standard: 'ordinary',
};

/** Sinónimos en español para el tipo de afiliado. */
const TYPE_ALIASES: Record<string, FeeType> = {
  paciente: 'patient',
  padre: 'parent',
  tutor: 'parent',
  especialista_medico: 'medical_specialist',
  medico: 'medical_specialist',
  especialista_no_medico: 'nonmedical_specialist',
  no_medico: 'nonmedical_specialist',
  prestador: 'service_provider',
  comercio: 'merchant',
  proveedor: 'merchant',
  escuela: 'school',
  clinica: 'clinic',
  ong: 'ngo',
  organizacion_no_gubernamental: 'ngo',
};

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normKey(s: string): string {
  return stripAccents(s.trim().toLowerCase()).replace(/\s+/g, '_');
}

/** Detecta el separador mirando la línea de encabezados. */
export function detectDelimiter(headerLine: string): ';' | ',' | '\t' {
  const counts: Array<[';' | ',' | '\t', number]> = [
    [';', (headerLine.match(/;/g) ?? []).length],
    [',', (headerLine.match(/,/g) ?? []).length],
    ['\t', (headerLine.match(/\t/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ';';
}

/** Divide una línea respetando comillas dobles ("a;b" queda entero). */
export function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

/**
 * Convierte texto a número aceptando coma decimal y separadores de miles.
 * "1.234,56" y "1,234.56" y "1234.56" dan todos 1234.56.
 */
export function parseAmount(raw: string, commaIsDecimal: boolean): number | null {
  let s = raw.trim().replace(/\s| /g, '');
  if (s === '') return null;
  s = s.replace(/[^0-9.,-]/g, ''); // fuera símbolos de moneda
  if (s === '') return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    // El separador decimal es el que aparece más a la derecha.
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    // Solo comas: decimal si el archivo usa coma decimal o si deja 1-2 dígitos.
    const decimals = s.length - lastComma - 1;
    if (commaIsDecimal || decimals === 1 || decimals === 2) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseBool(raw: string): boolean {
  const v = normKey(raw);
  return v === 'si' || v === 'sí' || v === 'yes' || v === 'true' || v === '1' || v === 'x';
}

/** Escapa un campo para CSV. */
function esc(v: string | number | boolean, delim: string): string {
  const s = String(v);
  return s.includes(delim) || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/**
 * Genera el CSV. Lleva BOM para que Excel respete los acentos y usa ";" que es
 * lo que espera Excel en español al abrir con doble clic.
 */
export function toCsv(rows: FeeCsvRow[], delim: ';' | ',' = ';'): string {
  const head = FEE_CSV_HEADERS.join(delim);
  const body = rows.map((r) =>
    [
      esc(r.pais, delim),
      esc(r.tipo, delim),
      esc(r.clase, delim),
      esc(r.moneda, delim),
      esc(r.mensual, delim),
      esc(r.anual, delim),
      esc(r.anual_referencia, delim),
      esc(r.sin_centavos ? 'si' : 'no', delim),
    ].join(delim),
  );
  return '﻿' + [head, ...body].join('\r\n') + '\r\n';
}

/** CSV de ejemplo para quien empieza de cero. */
export function templateCsv(): string {
  return toCsv([
    { pais: 'México', tipo: 'medical_specialist', clase: 'founder', moneda: 'MXN', mensual: 1000, anual: 10000, anual_referencia: 12000, sin_centavos: false },
    { pais: 'México', tipo: 'medical_specialist', clase: 'ordinary', moneda: 'MXN', mensual: 1500, anual: 15000, anual_referencia: 18000, sin_centavos: false },
  ]);
}

/** Lee un CSV y devuelve las filas válidas y los errores por línea. */
export function parseCsv(text: string): FeeCsvParseResult {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
  const rows: FeeCsvRow[] = [];
  const errors: FeeCsvError[] = [];

  if (lines.length === 0) {
    return { rows, errors: [{ linea: 0, motivo: 'El archivo está vacío.' }] };
  }

  const delim = detectDelimiter(lines[0]);
  const commaIsDecimal = delim === ';';
  const header = splitCsvLine(lines[0], delim).map(normKey);

  const idx: Record<string, number> = {};
  for (const h of FEE_CSV_HEADERS) idx[h] = header.indexOf(h);

  const faltan = FEE_CSV_HEADERS.filter((h) => h !== 'sin_centavos' && idx[h] < 0);
  if (faltan.length > 0) {
    return {
      rows,
      errors: [{ linea: 1, motivo: `Faltan columnas: ${faltan.join(', ')}.` }],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const linea = i + 1;
    const c = splitCsvLine(lines[i], delim);
    const get = (k: (typeof FEE_CSV_HEADERS)[number]) => (idx[k] >= 0 ? (c[idx[k]] ?? '') : '');

    const pais = get('pais').trim();
    if (!pais) { errors.push({ linea, motivo: 'Falta el país.' }); continue; }

    const tipoRaw = normKey(get('tipo'));
    const tipo = (FEE_TYPES as readonly string[]).includes(tipoRaw)
      ? (tipoRaw as FeeType)
      : TYPE_ALIASES[tipoRaw];
    if (!tipo) { errors.push({ linea, motivo: `Tipo no reconocido: "${get('tipo')}".` }); continue; }

    const clase = CLASS_ALIASES[normKey(get('clase'))];
    if (!clase) { errors.push({ linea, motivo: `Clase no reconocida: "${get('clase')}". Usa founder u ordinary.` }); continue; }

    const moneda = get('moneda').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(moneda)) { errors.push({ linea, motivo: `Moneda inválida: "${get('moneda')}". Usa 3 letras (MXN, USD…).` }); continue; }

    const mensual = parseAmount(get('mensual'), commaIsDecimal);
    if (mensual == null || mensual < 0) { errors.push({ linea, motivo: 'Importe mensual inválido.' }); continue; }

    let anual = parseAmount(get('anual'), commaIsDecimal);
    if (anual == null) anual = Math.round(mensual * 10 * 100) / 100;
    if (anual < 0) { errors.push({ linea, motivo: 'Importe anual inválido.' }); continue; }

    let ref = parseAmount(get('anual_referencia'), commaIsDecimal);
    if (ref == null) ref = Math.round(mensual * 12 * 100) / 100;
    if (ref < 0) { errors.push({ linea, motivo: 'Importe de referencia inválido.' }); continue; }

    rows.push({
      pais,
      tipo,
      clase,
      moneda,
      mensual,
      anual,
      anual_referencia: ref,
      sin_centavos: parseBool(get('sin_centavos')),
    });
  }

  return { rows, errors };
}
