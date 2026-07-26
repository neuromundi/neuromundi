/**
 * AdminImprovements — sugerencias del público ("Ayúdanos a mejorar"), solo lectura.
 */
import { useTranslation } from 'react-i18next';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { Button, SkeletonCard } from '@/components/ui';
import { useAdminImprovements } from '@/hooks/useImprovements';
import { formatDate } from '@/lib/utils';

export function AdminImprovements() {
  const { t } = useTranslation();
  const { items, loading, reload } = useAdminImprovements();

  if (loading) return <div className="space-y-3"><SkeletonCard rows={0} /><SkeletonCard rows={0} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{t('improve.adminCount', { n: items.length })}</p>
        <Button size="sm" variant="secondary" onClick={() => void reload()} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('common.refresh')}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('improve.adminEmpty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{s.message}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{s.email ?? t('improve.anon')}</span>
                    {s.page && <span>· {s.page}</span>}
                    <span>· {formatDate(s.created_at)}</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
