/**
 * milestonesGuide — metadatos de las franjas de edad de la guía de hitos.
 *
 * Es material ORIENTATIVO (no diagnóstico). El TEXTO de los hitos vive en i18n
 * (`milestones.<bandId>.<area>` como arreglo de cadenas), así se traduce a los 8
 * idiomas y entra en la paridad de claves. Aquí solo quedan el id de la franja y
 * su rango en meses (para formatear la etiqueta traducida).
 */

export type MilestoneArea = 'motor' | 'lenguaje' | 'social' | 'cognitivo';

export interface MilestoneBand {
  /** Identificador estable de la franja (también es la clave en i18n). */
  id: string;
  /** Rango en MESES [desde, hasta] para formatear la etiqueta traducida. */
  from: number;
  to: number;
}

export const MILESTONE_AREAS: MilestoneArea[] = ['motor', 'lenguaje', 'social', 'cognitivo'];

export const MILESTONE_BANDS: MilestoneBand[] = [
  { id: '0-6m', from: 0, to: 6 },
  { id: '6-12m', from: 6, to: 12 },
  { id: '12-24m', from: 12, to: 24 },
  { id: '2-3a', from: 24, to: 36 },
  { id: '3-4a', from: 36, to: 48 },
  { id: '4-6a', from: 48, to: 72 },
];
