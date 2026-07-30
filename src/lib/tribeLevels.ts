/**
 * tribeLevels — niveles de la Tribu (F2). Metáfora del crecimiento de un bosque,
 * sin jerarquías de poder. El nivel se calcula por Puntos de Tribu acumulados.
 * Los nombres se localizan por i18n (`tribe.level.<key>`).
 */
export interface TribeLevel {
  key: string;
  min: number;
}

export const TRIBE_LEVELS: TribeLevel[] = [
  { key: 'semilla', min: 0 },
  { key: 'brote', min: 50 },
  { key: 'faro', min: 250 },
  { key: 'pilar', min: 700 },
  { key: 'raiz', min: 1500 },
];

export interface LevelProgress {
  level: TribeLevel;
  next: TribeLevel | null;
  /** 0..1 de avance hacia el siguiente nivel (1 si es el máximo). */
  progress: number;
  toNext: number;
}

export function levelForPoints(points: number): LevelProgress {
  let idx = 0;
  for (let i = 0; i < TRIBE_LEVELS.length; i++) {
    if (points >= TRIBE_LEVELS[i].min) idx = i;
  }
  const level = TRIBE_LEVELS[idx];
  const next = idx < TRIBE_LEVELS.length - 1 ? TRIBE_LEVELS[idx + 1] : null;
  if (!next) return { level, next: null, progress: 1, toNext: 0 };
  const span = next.min - level.min;
  const progress = span > 0 ? Math.min(1, (points - level.min) / span) : 1;
  return { level, next, progress, toNext: Math.max(0, next.min - points) };
}
