/**
 * DistintivoBadge — muestra el distintivo oficial del proveedor.
 *
 * Usa las imágenes oficiales (public/badges). Si el proveedor está en revisión
 * (Filtro Cero no aprobado) puede mostrar un aviso discreto (showReview). Si no
 * tiene distintivo aún, no renderiza nada.
 */
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BADGE_META, type BadgeResult } from '@/lib/badge';

const SIZES = { sm: 'h-9 w-9', md: 'h-16 w-16', lg: 'h-24 w-24' } as const;

export interface DistintivoBadgeProps {
  badge: BadgeResult | null | undefined;
  size?: keyof typeof SIZES;
  /** Muestra el nombre del nivel junto al escudo. */
  showLabel?: boolean;
  /** Muestra el aviso "En revisión" si aplica (para el panel del propio proveedor). */
  showReview?: boolean;
  className?: string;
}

export function DistintivoBadge({ badge, size = 'md', showLabel = false, showReview = false, className }: DistintivoBadgeProps) {
  const { t } = useTranslation();
  if (!badge) return null;

  if (badge.level) {
    const meta = BADGE_META[badge.level];
    const label = t(meta.labelKey);
    return (
      <span className={cn('inline-flex items-center gap-2', className)} title={label}>
        <img
          src={meta.image}
          alt={label}
          loading="lazy"
          decoding="async"
          className={cn('shrink-0 object-contain', SIZES[size])}
        />
        {showLabel && <span className="text-sm font-semibold text-slate-800">{label}</span>}
      </span>
    );
  }

  if (showReview && badge.status === 'en_revision') {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700', className)}>
        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {t('badge.enRevision')}
      </span>
    );
  }

  return null;
}
