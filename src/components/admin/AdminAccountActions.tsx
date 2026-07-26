/**
 * AdminAccountActions — estadística de bajas y suspensiones (solo lectura).
 *
 * Muestra conteos, el desglose de cancelaciones por motivo, la lista destacada de
 * cancelaciones por COSTO (a quienes hay que proponerles un plan) y la bitácora
 * reciente con ID/correo. No hay aprobación: el admin solo observa.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, PauseCircle, Trash2, RotateCcw, RefreshCw } from 'lucide-react';
import { Button, SkeletonCard } from '@/components/ui';
import { useAdminAccountActions, type AccountAction } from '@/hooks/useAdminAccountActions';
import { formatDate } from '@/lib/utils';

const ACTION_META: Record<AccountAction['action'], { key: string; cls: string }> = {
  suspend: { key: 'admin.accounts.act.suspend', cls: 'bg-amber-50 text-amber-700' },
  cancel: { key: 'admin.accounts.act.cancel', cls: 'bg-red-50 text-red-700' },
  reactivate: { key: 'admin.accounts.act.reactivate', cls: 'bg-sage-50 text-sage-700' },
  winback_costo: { key: 'admin.accounts.act.winback', cls: 'bg-brand-50 text-brand-700' },
};

const REASON_KEY: Record<string, string> = {
  costo: 'account.reasons.costo',
  dificultad: 'account.reasons.dificultad',
  defectos: 'account.reasons.defectos',
  no_util: 'account.reasons.no_util',
  tiempo: 'account.reasons.tiempo',
  privacidad: 'account.reasons.privacidad',
  otro: 'account.reasons.otro',
};

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-brand-600">{icon}</div>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function idLabel(a: AccountAction): string {
  return a.member_no != null ? `NM-${String(a.member_no).padStart(6, '0')}` : (a.user_id ?? '—').slice(0, 8);
}

export function AdminAccountActions() {
  const { t } = useTranslation();
  const { items, loading, reload } = useAdminAccountActions();

  const stats = useMemo(() => {
    const suspends = items.filter((a) => a.action === 'suspend').length;
    const cancels = items.filter((a) => a.action === 'cancel').length;
    const reactivations = items.filter((a) => a.action === 'reactivate').length;
    const costo = items.filter((a) => a.action === 'winback_costo');
    const byReason = new Map<string, number>();
    items
      .filter((a) => a.action === 'cancel' || a.action === 'winback_costo')
      .forEach((a) => {
        const r = a.reason ?? 'otro';
        byReason.set(r, (byReason.get(r) ?? 0) + 1);
      });
    return { suspends, cancels, reactivations, costo, byReason };
  }, [items]);

  if (loading) return <div className="space-y-3"><SkeletonCard rows={0} /><SkeletonCard rows={0} /></div>;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => void reload()} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('common.refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<PauseCircle className="h-5 w-5" />} value={stats.suspends} label={t('admin.accounts.suspends')} />
        <Stat icon={<Trash2 className="h-5 w-5" />} value={stats.cancels} label={t('admin.accounts.cancels')} />
        <Stat icon={<RotateCcw className="h-5 w-5" />} value={stats.reactivations} label={t('admin.accounts.reactivations')} />
        <Stat icon={<AlertTriangle className="h-5 w-5" />} value={stats.costo.length} label={t('admin.accounts.costoPending')} />
      </div>

      {/* Cancelaciones por costo: proponer plan en 24 h */}
      {stats.costo.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" /> {t('admin.accounts.costoTitle')}
          </h3>
          <p className="mt-0.5 text-sm text-amber-800">{t('admin.accounts.costoHelp')}</p>
          <ul className="mt-3 space-y-2">
            {stats.costo.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm">
                <span className="font-semibold text-slate-900">{idLabel(a)}</span>
                <span className="text-slate-700">{a.email ?? t('admin.accounts.noEmail')}</span>
                <span className="text-xs text-muted">{formatDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Desglose por motivo */}
      {stats.byReason.size > 0 && (
        <section className="rounded-2xl border border-slate-100 bg-white p-4">
          <h3 className="font-bold text-slate-900">{t('admin.accounts.byReason')}</h3>
          <ul className="mt-2 space-y-1">
            {[...stats.byReason.entries()].sort((a, b) => b[1] - a[1]).map(([reason, n]) => (
              <li key={reason} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{t(REASON_KEY[reason] ?? 'account.reasons.otro')}</span>
                <span className="font-semibold text-slate-900">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bitácora reciente */}
      <section>
        <h3 className="mb-2 font-bold text-slate-900">{t('admin.accounts.recent')}</h3>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
            {t('admin.accounts.empty')}
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((a) => {
              const meta = ACTION_META[a.action];
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>{t(meta.key)}</span>
                    <span className="text-sm font-semibold text-slate-900">{idLabel(a)}</span>
                  </div>
                  <span className="text-sm text-slate-700">{a.email ?? t('admin.accounts.noEmail')}</span>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {a.reason && <span>{t(REASON_KEY[a.reason] ?? 'account.reasons.otro')}</span>}
                    <span>{formatDate(a.created_at)}</span>
                  </div>
                  {a.reason === 'otro' && a.reason_detail && (
                    <p className="w-full text-xs text-muted">“{a.reason_detail}”</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
