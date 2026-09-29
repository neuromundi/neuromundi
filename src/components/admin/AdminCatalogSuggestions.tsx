/**
 * AdminCatalogSuggestions — cola de curaduría comunitaria. El admin revisa las
 * sugerencias de categoría (directorio) y de producto/categoría (tienda) que
 * envía el público, y las marca revisada / aceptada / descartada. Aceptar es la
 * señal para promoverla a la taxonomía real (el alta se hace en su catálogo).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, RefreshCw, Check, Eye, X } from 'lucide-react';
import { Button, SkeletonCard } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';
import { useAdminCatalogSuggestions, type CatalogSuggestion } from '@/hooks/useCatalogSuggestions';

type StatusFilter = 'all' | CatalogSuggestion['status'];

const KIND_STYLE: Record<CatalogSuggestion['kind'], string> = {
  directory_category: 'bg-brand-50 text-brand-700',
  store_product: 'bg-amber-50 text-amber-700',
  store_category: 'bg-violet-50 text-violet-700',
};

const STATUS_STYLE: Record<CatalogSuggestion['status'], string> = {
  new: 'bg-emerald-50 text-emerald-700',
  reviewed: 'bg-slate-100 text-slate-600',
  accepted: 'bg-brand-100 text-brand-800',
  dismissed: 'bg-slate-100 text-slate-400 line-through',
};

export function AdminCatalogSuggestions() {
  const { t } = useTranslation();
  const { items, loading, reload, setStatus } = useAdminCatalogSuggestions();
  const [filter, setFilter] = useState<StatusFilter>('new');

  if (loading) return <div className="space-y-3"><SkeletonCard rows={0} /><SkeletonCard rows={0} /></div>;

  const shown = filter === 'all' ? items : items.filter((s) => s.status === filter);
  const kindLabel = (k: CatalogSuggestion['kind']) => t(`suggest.kind.${k}`);
  const statusLabel = (s: CatalogSuggestion['status']) => t(`suggest.status.${s}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
          {(['new', 'reviewed', 'accepted', 'dismissed', 'all'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-semibold',
                filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-muted',
              )}
            >
              {f === 'all' ? t('suggest.filterAll') : statusLabel(f)}
            </button>
          ))}
        </div>
        <Button size="sm" variant="secondary" onClick={() => void reload()} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('common.refresh')}
        </Button>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('suggest.adminEmpty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((s) => (
            <li key={s.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', KIND_STYLE[s.kind])}>
                      {kindLabel(s.kind)}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_STYLE[s.status])}>
                      {statusLabel(s.status)}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-slate-900">{s.name}</p>
                  {s.note && <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{s.note}</p>}
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {s.section && <span>{t(`sections.${s.section}.name`, { defaultValue: s.section })}</span>}
                    {s.country && <span>· {s.country}</span>}
                    <span>· {s.email ?? t('suggest.anon')}</span>
                    <span>· {formatDate(s.created_at)}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" leadingIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => void setStatus(s.id, 'reviewed')}>
                      {t('suggest.status.reviewed')}
                    </Button>
                    <Button size="sm" variant="primary" leadingIcon={<Check className="h-3.5 w-3.5" />} onClick={() => void setStatus(s.id, 'accepted')}>
                      {t('suggest.status.accepted')}
                    </Button>
                    <Button size="sm" variant="ghost" leadingIcon={<X className="h-3.5 w-3.5" />} onClick={() => void setStatus(s.id, 'dismissed')}>
                      {t('suggest.status.dismissed')}
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
