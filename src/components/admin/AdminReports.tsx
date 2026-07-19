/**
 * AdminReports — gestión de denuncias de la comunidad. Lista las denuncias, con
 * su categoría, denunciado (folio), descripción y adjuntos (URL firmada), y
 * permite cambiar el estado (en revisión / resuelta / desestimada).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, ShieldAlert } from 'lucide-react';
import { SkeletonCard, Button, useToast } from '@/components/ui';
import { useAdminReports, type Report } from '@/hooks/useAdminReports';
import { formatDate } from '@/lib/utils';

const STATUS_CLS: Record<string, string> = {
  open: 'bg-warm-50 text-warm-700',
  in_review: 'bg-brand-50 text-brand-700',
  resolved: 'bg-sage-50 text-sage-700',
  dismissed: 'bg-slate-100 text-slate-500',
};

function ReportCard({ r, onStatus, sign }: { r: Report; onStatus: (id: string, s: string) => void; sign: (p: string) => Promise<string | null> }) {
  const { t } = useTranslation();
  const open = async (path: string) => {
    const url = await sign(path);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };
  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{t(`report.cat.${r.category}`)}</p>
          <p className="text-xs text-muted">
            {r.reported_member_no != null ? `NM-${String(r.reported_member_no).padStart(6, '0')}` : t('reportAdmin.noReported')}
            {' · '}{formatDate(r.created_at)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLS[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
          {t(`reportAdmin.status.${r.status}`, { defaultValue: r.status })}
        </span>
      </div>
      {r.category === 'other' && r.category_other && <p className="mt-1 text-sm text-slate-700">{r.category_other}</p>}
      {!r.is_member && (
        <p className="mt-1 text-xs text-muted">
          {t('reportAdmin.external')}: {r.reporter_name || t('report.optional')}{r.reporter_email ? ` · ${r.reporter_email}` : ''}
        </p>
      )}
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{r.description}</p>
      {r.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {r.attachments.map((p, i) => (
            <button key={i} type="button" onClick={() => open(p)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-brand-700 hover:bg-slate-200">
              <Paperclip className="h-3.5 w-3.5" /> {t('reportAdmin.attachment', { n: i + 1 })}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => onStatus(r.id, 'in_review')}>{t('reportAdmin.markReview')}</Button>
        <Button size="sm" variant="secondary" onClick={() => onStatus(r.id, 'resolved')}>{t('reportAdmin.markResolved')}</Button>
        <Button size="sm" variant="ghost" onClick={() => onStatus(r.id, 'dismissed')}>{t('reportAdmin.markDismissed')}</Button>
      </div>
    </li>
  );
}

export function AdminReports() {
  const { t } = useTranslation();
  const toast = useToast();
  const { reports, loading, setStatus, signedUrl } = useAdminReports();
  const [busy, setBusy] = useState(false);

  const onStatus = async (id: string, s: string) => {
    setBusy(true);
    const r = await setStatus(id, s);
    setBusy(false);
    if (!r.ok) toast.error(r.error);
  };

  if (loading) return <SkeletonCard rows={4} />;
  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
        <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-slate-300" aria-hidden="true" />
        {t('reportAdmin.empty')}
      </div>
    );
  }

  return (
    <ul className="space-y-3" aria-busy={busy}>
      {reports.map((r) => <ReportCard key={r.id} r={r} onStatus={onStatus} sign={signedUrl} />)}
    </ul>
  );
}
