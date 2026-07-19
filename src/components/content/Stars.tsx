/**
 * Stars — fila de estrellas. En modo lectura muestra el promedio; en modo
 * edición permite calificar. La calificación solo se muestra a partir de 3.
 */
import { Star } from 'lucide-react';

export function Stars({
  value,
  onRate,
  size = 18,
}: {
  value: number;
  onRate?: (stars: number) => void;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const star = (
          <Star
            className={filled ? 'fill-warm-400 text-warm-400' : 'text-slate-300'}
            style={{ width: size, height: size }}
            aria-hidden="true"
          />
        );
        return onRate ? (
          <button key={n} type="button" onClick={() => onRate(n)} aria-label={`${n}`} className="transition-transform hover:scale-110">
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </span>
  );
}
