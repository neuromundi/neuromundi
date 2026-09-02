/**
 * sections — las TRES secciones que integran Neuromundi. Fuente única de verdad
 * para el selector del directorio, los badges de sección, los formularios de
 * registro y los Neurocamps.
 *
 * El `value` es la clave canónica que se guarda en `profiles.sections` (y en la
 * columna `section` de los Neurocamps). El nombre visible se localiza por i18n
 * con la clave `sections.<value>.name` (respaldo en español en `label`).
 * `color`/`chip`/`ring` son clases Tailwind del núcleo (no dinámicas).
 */
export type SectionValue = 'neurodesarrollo' | 'neurodivergencias' | 'afecciones';

export interface SectionDef {
  value: SectionValue;
  /** Respaldo en español; la UI usa t(`sections.${value}.name`). */
  label: string;
  /** Icono lucide (nombre) para mapear en el componente. */
  icon: 'Sprout' | 'Sparkles' | 'Stethoscope';
  /** Degradado de la tarjeta/badge. */
  gradient: string;
  /** Chip suave (fondo + texto). */
  chip: string;
  /** Color de acento (texto/borde). */
  accent: string;
}

export const SECTIONS: SectionDef[] = [
  {
    value: 'neurodesarrollo',
    label: 'Neurodesarrollo',
    icon: 'Sprout',
    gradient: 'from-emerald-500 to-teal-600',
    chip: 'bg-emerald-50 text-emerald-700',
    accent: 'text-emerald-700',
  },
  {
    value: 'neurodivergencias',
    label: 'Neurodivergencias',
    icon: 'Sparkles',
    gradient: 'from-violet-500 to-indigo-600',
    chip: 'bg-violet-50 text-violet-700',
    accent: 'text-violet-700',
  },
  {
    value: 'afecciones',
    label: 'Afecciones neurológicas',
    icon: 'Stethoscope',
    gradient: 'from-sky-500 to-blue-700',
    chip: 'bg-sky-50 text-sky-700',
    accent: 'text-sky-700',
  },
];

export const SECTION_VALUES: SectionValue[] = SECTIONS.map((s) => s.value);
export const SECTION_BY_VALUE: Record<string, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.value, s]),
);
