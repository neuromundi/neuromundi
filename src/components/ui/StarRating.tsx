/**
 * StarRating — calificación 1–5 con estrellas.
 *
 * Dos modos:
 *  - Interactivo: role="radiogroup" con navegación por flechas y labels
 *    descriptivos ("1 = Muy malo" … "5 = Excelente"), área táctil 44×44px.
 *  - Solo lectura: muestra el promedio con aria-label, sin foco.
 *
 * Pensado para la encuesta del padre: cálido, sin inputs numéricos fríos.
 */
import { useId } from 'react';
import { Star } from 'lucide-react';
import { cn, scoreLabel } from '@/lib/utils';

export interface StarRatingProps {
  value: number;
  /** Si se omite, el componente es de solo lectura. */
  onChange?: (value: number) => void;
  /** Texto accesible que describe qué se está calificando. */
  label: string;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  /** Muestra la etiqueta textual debajo (Muy malo…Excelente). */
  showLabel?: boolean;
  className?: string;
}

const starSize = { sm: 'h-5 w-5', md: 'h-7 w-7', lg: 'h-9 w-9' } as const;

export function StarRating({
  value,
  onChange,
  label,
  max = 5,
  size = 'md',
  showLabel = true,
  className,
}: StarRatingProps) {
  const groupId = useId();
  const interactive = typeof onChange === 'function';
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  if (!interactive) {
    return (
      <span
        className={cn('inline-flex items-center gap-0.5', className)}
        role="img"
        aria-label={`${label}: ${value.toFixed(1)} de ${max}`}
      >
        {stars.map((n) => (
          <Star
            key={n}
            className={cn(
              starSize[size],
              n <= Math.round(value) ? 'fill-warm-500 text-warm-500' : 'text-slate-300',
            )}
            aria-hidden="true"
          />
        ))}
      </span>
    );
  }

  const handleKey = (e: React.KeyboardEvent, current: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange?.(Math.min(max, current + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange?.(Math.max(1, current - 1));
    }
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-center gap-1"
      >
        {stars.map((n) => {
          const checked = n === value;
          const filled = n <= value;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'} — ${scoreLabel(n)}`}
              id={`${groupId}-${n}`}
              tabIndex={checked || (value === 0 && n === 1) ? 0 : -1}
              onClick={() => onChange?.(n)}
              onKeyDown={(e) => handleKey(e, value || 1)}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-lg',
                'transition-transform motion-safe:duration-150 motion-safe:hover:scale-110',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              )}
            >
              <Star
                className={cn(
                  starSize[size],
                  filled ? 'fill-warm-500 text-warm-500' : 'text-slate-300',
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
      {showLabel && (
        <p className="text-sm text-muted" aria-live="polite">
          {value > 0 ? scoreLabel(value) : 'Toca una estrella para calificar'}
        </p>
      )}
    </div>
  );
}
