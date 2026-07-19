/**
 * EVSBadge — insignia del Experience Value Score.
 *
 * El color de fondo se deriva del score (rojo→verde, tokens evs.*). Incluye
 * aria-label completo para lectores de pantalla y un estado "Nuevo" cuando hay
 * pocas reseñas, para no penalizar a proveedores recién incorporados.
 */
import { Star } from 'lucide-react';
import { cn, evsColor } from '@/lib/utils';

export interface EVSBadgeProps {
  score: number | null;
  totalReviews?: number | null;
  /** Umbral por debajo del cual se considera "pocas reseñas". */
  newThreshold?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'text-sm px-2 py-0.5 gap-1',
  md: 'text-base px-2.5 py-1 gap-1.5',
  lg: 'text-lg px-3 py-1.5 gap-2',
} as const;

const iconSizes = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' } as const;

export function EVSBadge({
  score,
  totalReviews,
  newThreshold = 5,
  size = 'md',
  className,
}: EVSBadgeProps) {
  const isNew = (totalReviews ?? 0) < newThreshold;

  if (score == null || isNew) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-slate-100 font-semibold text-muted',
          sizes[size],
          className,
        )}
        aria-label={
          score == null
            ? 'Sin calificaciones todavía'
            : `Proveedor nuevo, ${totalReviews} reseñas`
        }
      >
        {score == null ? 'Nuevo' : `Nuevo · ${score.toFixed(1)}`}
      </span>
    );
  }

  const color = evsColor(score);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold text-white',
        sizes[size],
        className,
      )}
      style={{ backgroundColor: color }}
      aria-label={`Puntuación de experiencia EVS: ${score.toFixed(1)} de 5${
        totalReviews != null ? `, basada en ${totalReviews} reseñas` : ''
      }`}
    >
      <Star className={cn(iconSizes[size], 'fill-current')} aria-hidden="true" />
      {score.toFixed(1)}
    </span>
  );
}
