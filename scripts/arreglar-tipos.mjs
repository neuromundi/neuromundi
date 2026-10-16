/**
 * arreglar-tipos — repara lo que `supabase gen types` deja mal para este
 * proyecto. Se ejecuta SIEMPRE después de regenerar los tipos.
 *
 * Tres arreglos, los tres medidos el 16 de octubre de 2026:
 *
 * 1. CODIFICACIÓN. En PowerShell, `> archivo` escribe UTF-16, no UTF-8. El
 *    archivo compila pero rompe grep, los diffs y casi toda la herramienta.
 *    (La forma correcta de generar es con `| Out-File -Encoding utf8`, pero
 *    este script lo repara igual por si se vuelve a hacer con `>`.)
 *
 * 2. ARGUMENTOS OPCIONALES. El generador escribe `p_nota?: string` para un
 *    parámetro que en SQL es `default null`. Pasarle null es correcto y es lo
 *    que hace el código, pero el tipo generado lo rechaza: 108 errores de
 *    compilación que NO son errores reales. Se añade `| null`.
 *
 * 3. ALIAS QUE EL GENERADOR NO EMITE. El archivo escrito a mano exportaba seis
 *    uniones y el ayudante `Views<>`, y medio proyecto los importa.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const RUTA = 'src/types/database.ts';

let crudo = readFileSync(RUTA);
if (crudo[0] === 0xff && crudo[1] === 0xfe) {
  crudo = Buffer.from(crudo.toString('utf16le'), 'utf8');
  console.log('· codificación: UTF-16 → UTF-8');
}
let texto = crudo.toString('utf8').replace(/\r\n/g, '\n');

// ── 2. TODO argumento de una función SQL acepta null ───────────────────────
// En Postgres cualquier parámetro admite NULL; el generador no lo refleja en
// ninguno. El código pasa null a propósito —`p_buscar: q.trim() || null`
// significa "sin filtro"— y el tipo generado lo rechazaba.
//
// Se trabaja LÍNEA A LÍNEA, no con expresiones regulares sobre todo el bloque:
// el generador escribe los Args de dos formas (una sola línea con `;`, o varias
// líneas) y un barrido con llaves se descuadra en cuanto un tipo lleva llaves.
let tocados = 0;

/** Añade `| null` a un `nombre: tipo` suelto. Devuelve el texto tal cual si no lo es. */
function anotar(parte) {
  const m = parte.match(/^(\s*)([a-z_][a-z0-9_]*)(\??):\s*(.+?)(\s*)$/i);
  if (!m) return parte;
  const [, sangria, nombre, opcional, tipo, cola] = m;
  if (/\|\s*null/.test(tipo) || tipo === 'never') return parte;
  tocados += 1;
  return `${sangria}${nombre}${opcional}: ${tipo} | null${cola}`;
}

const lineas = texto.split('\n');
let dentro = false;      // dentro de un bloque Args de varias líneas
let sangriaBloque = '';
for (let i = 0; i < lineas.length; i++) {
  const linea = lineas[i];

  if (dentro) {
    if (/^\s*\}/.test(linea)) { dentro = false; continue; }
    lineas[i] = anotar(linea);
    continue;
  }

  // Args en una sola línea: Args: { a: string; b?: number }
  const unaLinea = linea.match(/^(\s*)Args:\s*\{(.*)\}\s*$/);
  if (unaLinea) {
    const [, sangria, cuerpo] = unaLinea;
    lineas[i] = `${sangria}Args: {${cuerpo.split(';').map(anotar).join(';')}}`;
    continue;
  }

  // Args que abre bloque: Args: {
  const abre = linea.match(/^(\s*)Args:\s*\{\s*$/);
  if (abre) { dentro = true; sangriaBloque = abre[1]; continue; }
}
texto = lineas.join('\n');
console.log(`· argumentos que ahora aceptan null: ${tocados}`);

// ── 3. Alias que el generador no emite ─────────────────────────────────────
const ALIAS = `
// ── Añadido por scripts/arreglar-tipos.mjs ─────────────────────────────────
// El generador no emite estas uniones ni el ayudante Views<>, y el proyecto
// las importa desde aquí desde antes de que los tipos se generaran.
export type UserRole = 'patient' | 'parent' | 'provider' | 'admin';
export type ProviderType =
  | 'service_provider' | 'merchant' | 'school' | 'clinic' | 'wellness'
  | 'tourism' | 'legal' | 'ngo' | 'caregiver' | 'company';
export type TransactionStatus = 'pending' | 'completed' | 'expired' | 'disputed';
export type OfferStatus = 'active' | 'paused' | 'expired' | 'draft';
export type DiscountType = 'percentage' | 'fixed' | 'freebie';
export type PrescriptionStatus = 'draft' | 'sent' | 'viewed' | 'ordered' | 'archived';

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];
`;
if (!texto.includes('arreglar-tipos.mjs')) {
  texto = texto.trimEnd() + '\n' + ALIAS;
  console.log('· alias añadidos');
}

writeFileSync(RUTA, texto, 'utf8');
console.log('tipos reparados');
