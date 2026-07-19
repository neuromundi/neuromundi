/**
 * ProgressBar — barra de progreso accesible.
 *
 * Usada para dimensiones del EVS y para "X de Y canjes". Expone los atributos
 * ARIA de progressbar y anima el llenado solo cuando entra en viewport
 * (IntersectionObserver) y si el usuario no pidió reducir movimiento.
 */
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  /** Color de la barra. Por defecto, ámbar de marca. */
  color?: string;
  /** Muestra el valor numérico a la derecha. */
  showValue?: boolean;
  /** Texto del valor (si difiere del número, p. ej. "4.8"). */
  valueText?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const trackHeight = { sm: 'h-2', md: 'h-3' } as const;

export function ProgressBar({
  value,
  max = 5,
  label,
  color = '#f59e0b',
  showValue = true,
  valueText,
  size = 'md',
  className,
}: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm text-slate-700">{label}</span>
        {showValue && (
          <span className="text-sm font-semibold tabular-nums text-slate-900">
            {valueText ?? value.toFixed(1)}
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Number(value.toFixed(2))}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn('w-full overflow-hidden rounded-full bg-slate-200', trackHeight[size])}
      >
        <div
          className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
          style={{ width: `${visible ? pct : 0}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
