/**
 * tribeModLevels — niveles de moderador de la Tribu (F3), por puntos acumulados
 * (suma de los promedios de las reseñas recibidas). Nombres por i18n
 * (`tribe.modLevel.<key>`).
 */
export interface ModLevel { key: string; min: number }

export const MOD_LEVELS: ModLevel[] = [
  { key: 'nuevo', min: 0 },
  { key: 'experimentado', min: 25 },
  { key: 'experto', min: 75 },
  { key: 'lider', min: 150 },
  { key: 'destacado', min: 300 },
];

export function modLevelForPoints(points: number): ModLevel {
  let lvl = MOD_LEVELS[0];
  for (const l of MOD_LEVELS) if (points >= l.min) lvl = l;
  return lvl;
}
