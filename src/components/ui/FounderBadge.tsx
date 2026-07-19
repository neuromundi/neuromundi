/**
 * FounderBadge — distintivo "Soy Fundador Neuromundi". Se muestra en los perfiles
 * de usuarios que la plataforma detectó como Miembros Fundadores (primeros N por
 * país). Usa la medalla oficial (public/badges) con reserva por si la imagen no
 * carga. No renderiza nada si el usuario no es fundador.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = { xs: 'h-7 w-7', sm: 'h-9 w-9', md: 'h-16 w-16', lg: 'h-24 w-24' } as const;

export interface FounderBadgeProps {
  /** Si es false/undefined no renderiza nada. */
  isFounder?: boolean | null;
  size?: keyof typeof SIZES;
  /** Muestra el texto "Miembro Fundador" junto a la medalla. */
  showLabel?: boolean;
  className?: string;
}

export function FounderBadge({ isFounder, size = 'sm', showLabel = false, className }: FounderBadgeProps) {
  const { t } = useTranslation();
  const [imgOk, setImgOk] = useState(true);
  if (!isFounder) return null;

  const label = t('founderBadge.label');
  return (
    <span className={cn('inline-flex items-center gap-2', className)} title={label}>
      {imgOk ? (
        <img
          src="/badges/soy-fundador-neuromundi.jpg"
          alt={label}
          loading="lazy"
          decoding="async"
          onError={() => setImgOk(false)}
          className={cn('shrink-0 rounded-full object-cover ring-1 ring-slate-200', SIZES[size])}
        />
      ) : (
        <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500', SIZES[size])}>
          <Award className="h-1/2 w-1/2" aria-hidden="true" />
        </span>
      )}
      {showLabel && <span className="text-sm font-semibold text-slate-700">{label}</span>}
    </span>
  );
}
