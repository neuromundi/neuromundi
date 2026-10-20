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
import { badgeArt } from '@/data/badgeArt';

const SIZES = { sm: 'h-9 w-9', md: 'h-16 w-16', lg: 'h-24 w-24' } as const;

export interface DistintivoBadgeProps {
  badge: BadgeResult | null | undefined;
  size?: keyof typeof SIZES;
  /** Muestra el nombre del nivel junto al escudo. */
  showLabel?: boolean;
  /** Muestra el aviso "En revisión" si aplica (para el panel del propio proveedor). */
  showReview?: boolean;
  /**
   * Añade bajo el aviso la aclaración de que lo que está en revisión es el
   * DISTINTIVO, no el perfil: el perfil ya se ve en el directorio. Se activa
   * donde hay sitio para la frase (el perfil propio y el panel), no en la lista
   * de administración, que es una tabla.
   */
  conNota?: boolean;
  className?: string;
}

export function DistintivoBadge({ badge, size = 'md', showLabel = false, showReview = false, conNota = false, className }: DistintivoBadgeProps) {
  const { t, i18n } = useTranslation();
  if (!badge) return null;

  if (badge.level) {
    const meta = BADGE_META[badge.level];
    const label = t(meta.labelKey);
    return (
      <span className={cn('inline-flex items-center gap-2', className)} title={label}>
        <img
          src={badgeArt(meta.art, i18n.language)}
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
    // El aviso decía sólo "En revisión" y no aclaraba QUÉ está en revisión:
    // más de uno entendería que su perfil no se ve todavía. El perfil se ve
    // desde que se publica; lo que falta validar es el distintivo.
    // (Enyoria, 20 de octubre de 2026.)
    const chip = (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {t('badge.enRevision')}
      </span>
    );
    if (!conNota) return <span className={className}>{chip}</span>;
    return (
      <span className={cn('inline-flex flex-col items-start gap-1', className)}>
        {chip}
        <span className="text-xs text-muted">{t('badge.enRevisionNota')}</span>
      </span>
    );
  }

  return null;
}
