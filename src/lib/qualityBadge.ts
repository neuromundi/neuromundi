/**
 * qualityBadge — distintivo de Alta Calidad otorgado AUTOMÁTICAMENTE por reseñas.
 *
 * Criterio (aprobado): calificación global ≥ 4.5 con al menos 5 reseñas.
 *   · Comercios (merchant)            → "Productos de Alta Calidad"
 *   · Clínicas y prestadores de servicios → "Servicios de Alta Calidad"
 *
 * Función PURA: no toca la base; se calcula de los datos de reseñas que el
 * directorio y el perfil ya cargan (public_provider_ratings).
 */
export type QualityBadge = 'servicios-alta-calidad' | 'productos-alta-calidad' | null;

/** Mínimos para el distintivo de Alta Calidad. */
export const QUALITY_MIN_RATING = 4.5;
export const QUALITY_MIN_REVIEWS = 5;

/** Tipos de prestador que ofrecen SERVICIOS (reciben el distintivo de servicios). */
const SERVICE_TYPES: ReadonlySet<string> = new Set([
  'service_provider', 'clinic', 'wellness', 'legal', 'caregiver', 'tourism',
]);

/**
 * Devuelve la clave de arte del distintivo de Alta Calidad, o null si no califica.
 * @param providerType  profiles.provider_type
 * @param rating        calificación global (EVS 1–5) o null
 * @param totalReviews  número de reseñas
 */
export function qualityBadge(
  providerType: string | null | undefined,
  rating: number | null | undefined,
  totalReviews: number | null | undefined,
): QualityBadge {
  if (rating == null || rating < QUALITY_MIN_RATING) return null;
  if ((totalReviews ?? 0) < QUALITY_MIN_REVIEWS) return null;
  if (providerType === 'merchant') return 'productos-alta-calidad';
  if (providerType && SERVICE_TYPES.has(providerType)) return 'servicios-alta-calidad';
  return null;
}
