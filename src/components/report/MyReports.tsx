/**
 * MyReports — historial de denuncias del miembro (seguimiento del estado).
 * Se muestra en Ajustes. Reutiliza las etiquetas de categoría (report.cat.*) y
 * de estado (reportAdmin.status.*).
 */
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { useMyReports } from '@/hooks/useMyReports';
import { SkeletonCard } from '@/components/ui';
import { formatDate } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-warm-100 text-warm-800',
  in_review: 'bg-brand-100 text-brand-800',
  resolved: 'bg-sage-50 text-sage-700',
  dismissed: 'bg-slate-100 text-slate-600',
};

export function MyReports() {
  const { t } = useTranslation();
  const { reports, loading } = useMyReports();

  if (loading) return <SkeletonCard rows={1} />;
  if (reports.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-100 p-4">
      <h2 className="flex items-center gap-2 font-bold text-slate-900">
        <ShieldAlert className="h-5 w-5 text-red-600" aria-hidden="true" /> {t('myReports.title')}
      </h2>
      <p className="text-sm text-muted">{t('myReports.hint')}</p>
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.id} className="rounded-xl border border-slate-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">
                {r.category === 'other' && r.category_other
                  ? r.category_other
                  : t(`report.cat.${r.category}`)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {t(`reportAdmin.status.${r.status}`)}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-slate-700">{r.description}</p>
            <p className="mt-1 text-xs text-muted">
              {formatDate(r.created_at)}
              {r.reported_member_no != null
                ? ` · NM-${String(r.reported_member_no).padStart(6, '0')}`
                : ''}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
