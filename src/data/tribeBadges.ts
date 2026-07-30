/**
 * tribeBadges — catálogo de Insignias de Gratitud de la Tribu (F2). Cada insignia
 * responde a un valor real de la comunidad neurodivergente y otorga puntos SOLO
 * positivos. El mensaje va preseteado (formato cerrado, sin texto libre). Nombres
 * y mensajes se localizan por i18n (`tribe.badge.<key>.name` / `.msg`).
 */
export interface TribeBadge {
  key: string;
  points: number;
  /** Nombre de icono lucide. */
  icon: string;
}

export const TRIBE_BADGES: TribeBadge[] = [
  { key: 'claridad_literal', points: 5, icon: 'Gem' },
  { key: 'infodump_oro', points: 10, icon: 'BookOpen' },
  { key: 'espacio_seguro', points: 10, icon: 'ShieldCheck' },
  { key: 'faro_sensorial', points: 10, icon: 'Lightbulb' },
  { key: 'anticipacion_impecable', points: 15, icon: 'Map' },
  { key: 'puente_empatia', points: 15, icon: 'Heart' },
  { key: 'bienvenida_calida', points: 20, icon: 'Sparkles' },
];
