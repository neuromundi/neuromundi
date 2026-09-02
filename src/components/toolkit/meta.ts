/**
 * meta — mapea cada módulo del Kit a su icono y a su acento de color.
 *
 * Cada módulo tiene un color pastel distintivo (calmado y de alto contraste en
 * el texto, AA sobre blanco). Se usa en el punto indicador, la pestaña, los
 * bordes suaves y los encabezados. Sin colores saturados que sobreestimulen.
 */
import { Stethoscope, GraduationCap, Waves, HeartHandshake, Scale, Sprout, Blocks, Activity, HeartPulse } from 'lucide-react';
import type { ModuleId } from '@/data/toolkit';

export const MODULE_ICONS = {
  stethoscope: Stethoscope,
  graduation: GraduationCap,
  waves: Waves,
  hearthands: HeartHandshake,
  scale: Scale,
  sprout: Sprout,
  blocks: Blocks,
  activity: Activity,
  pulse: HeartPulse,
} as const;

export interface Accent {
  dot: string;
  text: string;
  border: string;
  soft: string;
  tabBg: string;
}

// Paleta pastel distinta por módulo: A azul, B verde, C lavanda, D rosa, E ámbar.
export const MODULE_ACCENTS: Record<ModuleId, Accent> = {
  A: { dot: 'bg-sky-300', text: 'text-sky-800', border: 'border-sky-300', soft: 'bg-sky-50', tabBg: 'bg-sky-100' },
  B: { dot: 'bg-emerald-300', text: 'text-emerald-800', border: 'border-emerald-300', soft: 'bg-emerald-50', tabBg: 'bg-emerald-100' },
  C: { dot: 'bg-violet-300', text: 'text-violet-800', border: 'border-violet-300', soft: 'bg-violet-50', tabBg: 'bg-violet-100' },
  D: { dot: 'bg-rose-300', text: 'text-rose-800', border: 'border-rose-300', soft: 'bg-rose-50', tabBg: 'bg-rose-100' },
  E: { dot: 'bg-amber-300', text: 'text-amber-800', border: 'border-amber-400', soft: 'bg-amber-50', tabBg: 'bg-amber-100' },
};
