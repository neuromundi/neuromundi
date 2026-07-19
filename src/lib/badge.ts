/**
 * badge — distintivo oficial de Neuromundi para especialistas, proveedores y
 * prestadores de servicios.
 *
 * Modelo estricto de 100 puntos + Filtro Cero (validación documental) + niveles.
 * Función PURA y determinista (fácil de testear). El cálculo vive en un solo
 * lugar; la UI y la BD solo aportan los insumos.
 *
 * ── Mapeo con las métricas existentes (EVS / reseñas 1–5) ────────────────────
 *  1) Calidad y Trato Humano (50):
 *       - Eficacia y dominio técnico (15)  ← avg_quality
 *       - Empatía, calidez y trato   (20)  ← avg_human_treatment
 *       - Claridad en la comunicación(15)  ← avg_professionalism (o avg_quality)
 *  2) Aporte económico / Descuento (30): mejor oferta % del proveedor (tabla offers)
 *  3) Compromiso y confiabilidad (20):
 *       - Tasa de respuesta rápida   (10)  ← responseRatePct (pendiente de dato)
 *       - Retención / fidelidad      (5)   ← retentionPct    (pendiente de dato)
 *       - Aporte de contenido        (5)   ← nº de content_posts publicados
 *
 * Filtro Cero: si la validación documental no está aprobada → "En Revisión".
 */

export type BadgeLevel = 'miembro' | 'aliado' | 'embajador';
export type BadgeStatus = 'en_revision' | 'sin_distintivo' | 'badged';

/** Umbral de reseñas por debajo del cual el proveedor es "de nuevo ingreso". */
export const NEW_PROVIDER_THRESHOLD = 5;

export interface BadgeInputs {
  /** Filtro Cero: validación documental aprobada (profiles.is_verified). */
  documentalVerified: boolean;
  /** Promedios de reseñas (1–5) o null si no hay. */
  avgQuality: number | null;
  avgHumanTreatment: number | null;
  avgProfessionalism: number | null;
  /** Calificación global (EVS 1–5); si falta, se estima con los promedios. */
  evsScore: number | null;
  totalReviews: number;
  /** Mejor descuento porcentual vigente del proveedor (0–100). */
  discountPct: number;
  /** Nº de publicaciones de contenido del proveedor. */
  contentCount: number;
  /** Tasa de respuesta rápida (0–100). Aún sin fuente de datos → 0. */
  responseRatePct: number;
  /** Retención / fidelidad (0–100). Aún sin fuente de datos → 0. */
  retentionPct: number;
}

export interface BadgeBreakdown {
  technical: number;     // /15
  empathy: number;       // /20
  communication: number; // /15
  discount: number;      // /30
  responseRate: number;  // /10
  retention: number;     // /5
  content: number;       // /5
}

export interface BadgeResult {
  status: BadgeStatus;
  level: BadgeLevel | null;
  /** Puntaje total 0–100 (informativo; el nivel se asigna por reglas estrictas). */
  score: number;
  breakdown: BadgebreakdownWithGroups;
  /** Calificación global usada (1–5) o null. */
  rating: number | null;
  isNew: boolean;
}

export interface BadgebreakdownWithGroups extends BadgeBreakdown {
  qualityHuman: number;   // suma bloque 1 (/50)
  economic: number;       // bloque 2 (/30)
  commitment: number;     // suma bloque 3 (/20)
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Puntos de descuento según los tramos (con los huecos normalizados). */
export function discountPoints(pct: number): number {
  if (pct >= 15) return 30; // alto (15–20%+)
  if (pct >= 10) return 20; // moderado (10–15%)
  if (pct > 0) return 10;   // base (0–5%; incluye 6–9%)
  return 0;                 // sin descuento
}

/** Puntos por aporte de contenido: 1 punto por publicación, tope 5. */
export function contentPoints(count: number): number {
  return clamp(Math.round(count), 0, 5);
}

/** Calificación global (1–5): usa EVS; si falta, promedia las dims disponibles. */
export function overallRating(i: BadgeInputs): number | null {
  if (i.evsScore != null) return i.evsScore;
  const vals = [i.avgQuality, i.avgHumanTreatment, i.avgProfessionalism].filter(
    (v): v is number => v != null,
  );
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Calcula el distintivo oficial a partir de los insumos. */
export function computeBadge(i: BadgeInputs): BadgeResult {
  const rating = overallRating(i);
  const isNew = i.totalReviews < NEW_PROVIDER_THRESHOLD;

  // ── Puntaje (informativo) ────────────────────────────────────────────────
  const to5 = (v: number | null) => (v == null ? 0 : clamp(v, 0, 5)) / 5;
  const technical = round1(to5(i.avgQuality) * 15);
  const empathy = round1(to5(i.avgHumanTreatment) * 20);
  const communication = round1(to5(i.avgProfessionalism ?? i.avgQuality) * 15);
  const discount = discountPoints(i.discountPct);
  const responseRate = round1(clamp(i.responseRatePct, 0, 100) / 100 * 10);
  const retention = round1(clamp(i.retentionPct, 0, 100) / 100 * 5);
  const content = contentPoints(i.contentCount);

  const qualityHuman = round1(technical + empathy + communication);
  const commitment = round1(responseRate + retention + content);
  const score = round1(clamp(qualityHuman + discount + commitment, 0, 100));

  const breakdown: BadgebreakdownWithGroups = {
    technical, empathy, communication, discount, responseRate, retention, content,
    qualityHuman, economic: discount, commitment,
  };

  // ── Filtro Cero (obligatorio) ────────────────────────────────────────────
  if (!i.documentalVerified) {
    return { status: 'en_revision', level: null, score, breakdown, rating, isNew };
  }

  // ── Asignación de nivel (reglas estrictas, de mayor a menor) ──────────────
  let level: BadgeLevel | null = null;
  if (i.discountPct >= 15 && rating != null && rating >= 4.8 && empathy >= 18) {
    level = 'embajador';
  } else if (i.discountPct >= 10 && rating != null && rating >= 4.5) {
    level = 'aliado';
  } else if (isNew || (rating != null && rating >= 4.0)) {
    level = 'miembro';
  }

  return {
    status: level ? 'badged' : 'sin_distintivo',
    level,
    score,
    breakdown,
    rating,
    isNew,
  };
}

/** Metadatos de presentación por nivel (imagen del distintivo + clave i18n). */
export const BADGE_META: Record<BadgeLevel, { image: string; labelKey: string; ring: string }> = {
  miembro: { image: '/badges/miembro-verificado.jpg', labelKey: 'badge.miembro', ring: 'ring-cyan-300' },
  aliado: { image: '/badges/aliado-destacado.jpg', labelKey: 'badge.aliado', ring: 'ring-amber-300' },
  embajador: { image: '/badges/embajador-neuromundi.jpg', labelKey: 'badge.embajador', ring: 'ring-violet-300' },
};

// ── ¿Qué falta para el siguiente nivel? ──────────────────────────────────────

export type RequirementKind = 'documental' | 'rating' | 'discount' | 'empathy';

export interface BadgeRequirement {
  kind: RequirementKind;
  current: number;
  target: number;
}

export interface NextLevelInfo {
  /** Nivel objetivo siguiente (o null si ya es el máximo). */
  nextLevel: BadgeLevel | null;
  maxed: boolean;
  /** Requisitos aún NO cumplidos para alcanzar `nextLevel`. */
  requirements: BadgeRequirement[];
}

/** Calcula el nivel objetivo siguiente y los requisitos que faltan. */
export function nextLevel(result: BadgeResult, i: BadgeInputs): NextLevelInfo {
  if (result.level === 'embajador') {
    return { nextLevel: null, maxed: true, requirements: [] };
  }

  const rating = result.rating ?? 0;
  const empathy = result.breakdown.empathy;
  const reqs: BadgeRequirement[] = [];

  // Filtro Cero primero.
  if (!i.documentalVerified) {
    reqs.push({ kind: 'documental', current: 0, target: 1 });
  }

  let target: BadgeLevel;
  if (!i.documentalVerified || result.level === null) target = 'miembro';
  else if (result.level === 'miembro') target = 'aliado';
  else target = 'embajador';

  if (target === 'miembro') {
    if (i.documentalVerified && !result.isNew && rating < 4.0) {
      reqs.push({ kind: 'rating', current: rating, target: 4.0 });
    }
  } else if (target === 'aliado') {
    if (i.discountPct < 10) reqs.push({ kind: 'discount', current: i.discountPct, target: 10 });
    if (rating < 4.5) reqs.push({ kind: 'rating', current: rating, target: 4.5 });
  } else {
    // embajador
    if (i.discountPct < 15) reqs.push({ kind: 'discount', current: i.discountPct, target: 15 });
    if (rating < 4.8) reqs.push({ kind: 'rating', current: rating, target: 4.8 });
    if (empathy < 18) reqs.push({ kind: 'empathy', current: empathy, target: 18 });
  }

  return { nextLevel: target, maxed: false, requirements: reqs };
}
