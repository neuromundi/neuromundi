/**
 * AdminReferrals — reporte del programa de recomendación.
 * Muestra cada uso de enlace: quién recomendó, quién se suscribió, si su
 * membresía es de pago, si ya pagó y si hay recompensa pendiente de otorgar.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, Search, CheckCircle2, Clock, Percent, Save, HandCoins } from 'lucide-react';
import { Button, useToast, SkeletonCard, EmptyState } from '@/components/ui';
import { useAdminReferrals, type AdminReferral } from '@/hooks/useReferralProgram';
import { useReferralConfig } from '@/hooks/useAdminPricing';
import { formatDate, cn } from '@/lib/utils';

const folio = (n: number | null) => (n != null ? `NM-${String(n).padStart(6, '0')}` : '—');

/** Parámetros del programa. El % de comisión SOLO se edita aquí. */
function ConfigPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const { config, loading, save } = useReferralConfig();
  const [form, setForm] = useState({ discount_pct: 5, validity_days: 7, referrer_step_pct: 5, referrer_max_pct: 50 });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  if (config && !ready) { setForm(config); setReady(true); }
  if (loading) return <SkeletonCard rows={1} />;

  const num = (v: string) => (v === '' ? 0 : Number(v));
  const field = (key: keyof typeof form, label: string, suffix: string, min = 0, max = 100) => (
    <div>
      <label className="mb-0.5 block text-[11px] font-semibold text-slate-700">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: num(e.target.value) }))}
          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        <span className="text-xs text-muted">{suffix}</span>
      </div>
    </div>
  );

  const onSave = async () => {
    setBusy(true);
    const r = await save(form);
    setBusy(false);
    toast[r.ok ? 'success' : 'error'](r.ok ? t('ref.cfgSaved') : t('ref.cfgError'));
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-100 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <Percent className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('ref.cfgTitle')}
      </h3>
      <div className="flex flex-wrap gap-3">
        {field('discount_pct', t('ref.cfgDiscount'), '%')}
        {field('referrer_step_pct', t('ref.cfgStep'), '%')}
        {field('referrer_max_pct', t('ref.cfgMax'), '%')}
        {field('validity_days', t('ref.cfgDays'), t('ref.days'), 1, 365)}
      </div>
      <Button size="sm" loading={busy} onClick={onSave} leadingIcon={<Save className="h-4 w-4" />}>
        {t('ref.cfgSave')}
      </Button>
      <p className="text-xs text-muted">{t('ref.cfgHint')}</p>
    </section>
  );
}

export function AdminReferrals() {
  const { t } = useTranslation();
  const { items, loading } = useAdminReferrals();
  const [q, setQ] = useState('');
  const [onlyReward, setOnlyReward] = useState(false);

  const term = q.trim().toLowerCase();
  const rows = useMemo(
    () =>
      items.filter((r: AdminReferral) => {
        if (onlyReward && !r.reward_due) return false;
        if (!term) return true;
        return `${r.referrer_name ?? ''} ${r.referred_name ?? ''} ${folio(r.referrer_member_no)} ${folio(r.referred_member_no)}`
          .toLowerCase()
          .includes(term);
      }),
    [items, term, onlyReward],
  );

  const totals = useMemo(
    () => ({
      uses: items.length,
      paying: items.filter((r) => r.is_paying_type).length,
      rewards: items.filter((r) => r.reward_due).length,
    }),
    [items],
  );

  if (loading) return <SkeletonCard rows={3} />;

  return (
    <div className="space-y-4">
      <ConfigPanel />

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-slate-100 p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{totals.uses}</p>
          <p className="text-xs text-muted">{t('ref.totalUses')}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{totals.paying}</p>
          <p className="text-xs text-muted">{t('ref.payingUses')}</p>
        </div>
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-3 text-center">
          <p className="text-2xl font-bold text-brand-800">{totals.rewards}</p>
          <p className="text-xs text-brand-700">{t('ref.rewardsDue')}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('ref.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setOnlyReward((v) => !v)}
          aria-pressed={onlyReward}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm font-medium',
            onlyReward ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50',
          )}
        >
          {t('ref.onlyRewards')}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Gift className="h-6 w-6" />} title={t('ref.emptyTitle')} description={t('ref.empty')} />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-100 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">{r.referrer_name ?? '—'}</span>
                    <span className="font-mono text-xs text-muted"> {folio(r.referrer_member_no)}</span>
                    <span className="mx-1.5 text-muted">→</span>
                    <span className="font-semibold">{r.referred_name ?? '—'}</span>
                    <span className="font-mono text-xs text-muted"> {folio(r.referred_member_no)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(r.used_at)} · {t('ref.referrerIs')} {r.referrer_role === 'provider' ? t('ref.roleProvider') : t('ref.roleFamily')} ·{' '}
                    {r.is_paying_type ? t('ref.typePaying') : t('ref.typeFree')}
                    {r.referred_paid_until ? ` · ${t('ref.paidUntil')} ${formatDate(r.referred_paid_until)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {r.reward_manual ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warm-100 px-2 py-0.5 text-xs font-semibold text-warm-800">
                      <HandCoins className="h-3.5 w-3.5" aria-hidden="true" /> {t('ref.rewardManual')}
                    </span>
                  ) : r.reward_due ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2 py-0.5 text-xs font-semibold text-sage-700">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {t('ref.rewardDue')}
                    </span>
                  ) : r.is_paying_type ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warm-100 px-2 py-0.5 text-xs font-semibold text-warm-700">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {t('ref.awaitingPayment')}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {t('ref.noReward')}
                    </span>
                  )}
                  {r.link_still_valid && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {t('ref.linkValid')}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
        {t('ref.adminHint')}
      </p>
    </div>
  );
}
