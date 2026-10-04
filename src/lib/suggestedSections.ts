/**
 * suggestedSections — sugerencia SUAVE de secciones de la plataforma a partir de
 * la profesión que declara un prestador. Es solo una preselección editable: NO
 * decide la pertenencia (la fuente de verdad sigue siendo `profiles.sections`,
 * elegido por el prestador). Sirve para reducir errores de captura marcando de
 * antemano las casillas más probables; el usuario puede añadir o quitar las que
 * quiera.
 *
 * Criterio: casi todas las profesiones atienden neurodesarrollo y
 * neurodivergencias (el mismo valor por defecto del backfill histórico 0086).
 * Las profesiones ligadas a la neurología clínica sugieren, además, "afecciones".
 */
import { SECTIONS } from '@/data/sections';

/** Base común: la inmensa mayoría de los prestadores atiende estas dos. */
const BASE: string[] = ['neurodesarrollo', 'neurodivergencias'];

/**
 * Profesiones vinculadas a afecciones neurológicas (CIE-11 Cap.08). Incluye tanto
 * las puramente clínicas de adulto como las que cruzan desarrollo y afección
 * (neuropediatría, genética, rehabilitación, neuropsicología, psiquiatría…).
 */
const AFECCIONES_PROFESSIONS: ReadonlySet<string> = new Set([
  'neurologia',
  'neurocirugia',
  'epileptologia',
  'neurogeriatria',
  'neurorrehabilitacion',
  'fisioterapia_neurologica',
  'enfermeria_neurologica',
  'neuropatologia',
  'neuropediatria',
  'genetica_medica',
  'medicina_rehabilitacion',
  'neuropsicologia',
  'psiquiatria',
  'paidopsiquiatria',
  'pediatria',
]);

const VALID = new Set<string>(SECTIONS.map((s) => s.value));

/**
 * Devuelve las secciones sugeridas (1..3) para una profesión. Si la profesión es
 * nula, desconocida u "otro", sugiere solo la base (neurodesarrollo +
 * neurodivergencias). El resultado siempre contiene valores válidos de SECTIONS.
 */
export function suggestedSections(profession?: string | null): string[] {
  const out = [...BASE];
  if (profession && AFECCIONES_PROFESSIONS.has(profession)) out.push('afecciones');
  return out.filter((v) => VALID.has(v));
}
