/**
 * ProviderCard — tarjeta de proveedor para el directorio público.
 *
 * Muestra el EVS con color dinámico, un desglose de dimensiones colapsable (barras
 * que se animan al entrar en viewport), conteo de reseñas, y badges de verificado
 * y "Nuevo". Emite eventos para ver el perfil o centrar el mapa.
 */
import { useMemo, useState } from 'react';
import { MapPin, Tag, MessageCircle, ShieldCheck, ChevronDown, Map as MapIcon, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, EVSBadge, ProgressBar , Avatar, DistintivoBadge } from '@/components/ui';
import { cn, evsColor } from '@/lib/utils';
import {
  DIMENSION_LABEL_KEY,
  RATING_AVG_COLUMN,
  dimensionsForProviderType,
  type ProviderWithRating,
  type SurveyDimension,
} from '@/types/app';

export interface ProviderCardProps {
  provider: ProviderWithRating;
  onViewProfile?: (id: string) => void;
  onShowOnMap?: (id: string) => void;
  /** Resalta la tarjeta cuando está seleccionada en el mapa. */
  highlighted?: boolean;
  /** Cuántas dimensiones mostrar antes de "ver más". */
  collapsedCount?: number;
}

const NEW_THRESHOLD = 5;

export function ProviderCard({
  provider,
  onViewProfile,
  onShowOnMap,
  highlighted = false,
  collapsedCount = 3,
}: ProviderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const { rating } = provider;
  const totalReviews = rating?.total_reviews ?? 0;
  const isNew = totalReviews < NEW_THRESHOLD;

  const dims = useMemo(() => {
    if (!rating) return [];
    return dimensionsForProviderType(provider.provider_type)
      .map((key: SurveyDimension) => ({
        label: t(DIMENSION_LABEL_KEY[key]),
        value: Number(rating[RATING_AVG_COLUMN[key]] ?? 0),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [rating, provider.provider_type, t]);

  const visible = expanded ? dims : dims.slice(0, collapsedCount);
  const name = provider.business_name ?? provider.full_name;
  const primaryCategory = provider.categories[0]?.name;

  return (
    <article
      role="article"
      aria-label={`Proveedor ${name}`}
      className={cn(
        'rounded-2xl border bg-white p-5 shadow-sm transition-shadow motion-safe:duration-200 hover:shadow-md',
        highlighted ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-100',
      )}
    >
      <header className="flex items-start gap-3">
        <Avatar name={name} src={provider.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-bold text-slate-900">{name}</h3>
            {provider.is_verified && (
              <span title={t('card.verifiedTip')}>
                <ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" aria-label={t('card.verified')} />
              </span>
            )}
            {provider.neuroaffirming && (
              <span title={t('neuro.sealHint')}>
                <Sparkles className="h-4 w-4 shrink-0 text-violet-500" aria-label={t('neuro.seal')} />
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-sm text-muted">
            {provider.city && (
              <>
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{provider.city}</span>
              </>
            )}
            {primaryCategory && (
              <>
                <span aria-hidden="true">·</span>
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{primaryCategory}</span>
              </>
            )}
          </p>
        </div>
        {provider.badge?.level && <DistintivoBadge badge={provider.badge} size="sm" className="shrink-0" />}
      </header>

      <div className="my-4 h-px bg-slate-100" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700" style={{ color: evsColor(rating?.evs_score) }}>
          {t('card.evs')}
        </span>
        <EVSBadge score={rating?.evs_score ?? null} totalReviews={totalReviews} />
      </div>

      {isNew && (
        <p className="mt-2 rounded-lg bg-warm-50 px-2 py-1 text-xs text-warm-700">
          {t('card.newFew')}
        </p>
      )}

      {dims.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {visible.map((d) => (
            <ProgressBar key={d.label} label={d.label} value={d.value} color={evsColor(d.value)} size="sm" />
          ))}
          {dims.length > collapsedCount && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex items-center gap-1 text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {expanded ? t('card.less') : t('card.more')}
              <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-sm text-muted">
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {t('card.reviews', { count: totalReviews })}
      </p>

      <div className="mt-4 flex gap-3">
        <Button size="sm" fullWidth onClick={() => onViewProfile?.(provider.id)}>
          {t('card.viewProfile')}
        </Button>
        {provider.latitude != null && provider.longitude != null && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onShowOnMap?.(provider.id)}
            leadingIcon={<MapIcon className="h-4 w-4" />}
          >
            {t('card.map')}
          </Button>
        )}
      </div>
    </article>
  );
}
