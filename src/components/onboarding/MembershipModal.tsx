/**
 * MembershipModal — se muestra tras concluir el registro (y desde el banner).
 *
 * El usuario ELIGE la periodicidad: mensual o anual. El anual equivale a 10
 * meses (contrata 12, paga 10), así que se muestra el precio de 12 meses
 * tachado y el ahorro, para que la decisión sea evidente.
 *
 * Los importes ya vienen resueltos por la base según el tipo de afiliado
 * (médico / no médico), la clase (fundador u ordinaria) y el país.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Ticket, CheckCircle2, Crown } from 'lucide-react';
import { Modal, Button, useToast } from '@/components/ui';
import { useMembership, type BillingPeriod } from '@/hooks/useMembership';
import { cn } from '@/lib/utils';
import { annualSaving } from '@/lib/pricing';
import { useCampaign } from '@/hooks/useCampaign';

const PROMO_ERRORS: Record<string, string> = {
  invalid: 'membership.promoInvalid',
  expired: 'membership.promoExpired',
  exhausted: 'membership.promoExhausted',
  scope: 'membership.promoScope',
  email: 'membership.promoEmail',
};

export function MembershipModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { status, daysLeft, quote, options, loading, startCheckout, redeemPromo } = useMembership();
  const { founderDiscount: campaignDisc } = useCampaign();
  const [promo, setPromo] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<BillingPeriod>('annual');

  const exempt = status === 'exempt';
  const active = status === 'active';

  const onPay = async () => {
    setBusy(true);
    const res = await startCheckout(period);
    if (!res.ok) {
      toast.error(t('membership.payError'));
      setBusy(false);
    }
    // Si ok, el navegador redirige a Stripe.
  };

  const onRedeem = async () => {
    if (promo.trim() === '') return;
    setBusy(true);
    const res = await redeemPromo(promo.trim());
    setBusy(false);
    if (res.ok) {
      if (res.benefit === 'percent') {
        // Descuento porcentual: no exenta; se aplica al pagar. Deja el modal
        // abierto para continuar con el checkout ya rebajado.
        toast.success(t('membership.promoDiscountOk', { pct: res.percentOff ?? 0 }));
        setShowPromo(false);
        setPromo('');
      } else if (res.benefit === 'amount') {
        toast.success(t('membership.promoAmountOk', { amount: res.amountOff ?? 0, currency: res.amountCurrency ?? '' }));
        setShowPromo(false);
        setPromo('');
      } else {
        toast.success(t('membership.promoOk'));
        onClose();
      }
    } else {
      toast.error(t(PROMO_ERRORS[res.error ?? 'invalid'] ?? 'membership.promoInvalid'));
    }
  };

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);

  const amountText =
    quote != null
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: quote.currency }).format(quote.amount)
      : t('membership.calculating');

  return (
    <Modal open={open} onClose={onClose} title={t('membership.title')}>
      {exempt || active ? (
        <div className="space-y-3 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-evs-5" aria-hidden="true" />
          <p className="font-semibold text-slate-900">
            {exempt ? t('membership.exemptTitle') : t('membership.activeTitle')}
          </p>
          {exempt && <p className="text-sm text-muted">{t('membership.exemptBody')}</p>}
          <Button onClick={onClose} fullWidth>
            {t('common.close')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            {t('membership.explainPending', { days: daysLeft ?? 7 })}
          </p>

          {options?.is_founder && (
            <p className="flex items-center justify-center gap-1.5 rounded-xl bg-warm-50 px-3 py-2 text-sm font-semibold text-warm-800">
              <Crown className="h-4 w-4" aria-hidden="true" /> {t('membership.founderPrice')}
            </p>
          )}

          {/* Descuento de campaña de fundador vigente (solo aplica al anual). */}
          {campaignDisc.pct > 0 && (
            <p className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-800">
              <Crown className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('membership.founderCampaign', {
                pct: campaignDisc.pct,
                date: campaignDisc.endsAt ? campaignDisc.endsAt.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '',
              })}
            </p>
          )}

          {loading ? (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{t('membership.calculating')}</p>
            </div>
          ) : options ? (
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={t('membership.choosePeriod')}>
              {(['annual', 'monthly'] as const).map((p) => {
                const isAnnual = p === 'annual';
                const amount = isAnnual ? options.annual_amount : options.monthly_amount;
                const selected = period === p;
                const saving = isAnnual ? annualSaving(options.annual_amount, options.annual_list_amount) : 0;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    aria-pressed={selected}
                    className={cn(
                      'rounded-2xl border-2 p-3 text-left transition-colors',
                      selected ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-brand-300',
                    )}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {isAnnual ? t('membership.annual') : t('membership.monthly')}
                    </span>
                    <span className="mt-0.5 block text-xl font-bold text-slate-900">
                      {amount != null ? fmt(amount, options.currency) : '—'}
                      <span className="text-sm font-medium text-muted">
                        {' '}
                        {isAnnual ? t('membership.perYear') : t('membership.perMonth')}
                      </span>
                    </span>
                    {isAnnual && saving > 0 && (
                      <>
                        <span className="block text-xs text-muted line-through">
                          {fmt(options.annual_list_amount!, options.currency)}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-sage-700">
                          {t('membership.savingBadge')}
                        </span>
                        <span className="mt-1 inline-block rounded-full bg-sage-50 px-2 py-0.5 text-[11px] font-bold text-sage-700">
                          {t('membership.twoMonthsFree')}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                {t('membership.annual')}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {amountText}
                {quote != null && (
                  <span className="text-base font-medium text-muted"> {t('membership.perYear')}</span>
                )}
              </p>
            </div>
          )}

          <Button onClick={onPay} loading={busy} leadingIcon={<CreditCard className="h-5 w-5" />} fullWidth>
            {t('membership.payNow')}
          </Button>

          {showPromo ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder={t('membership.promoPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
                <Button variant="secondary" onClick={onRedeem} loading={busy}>
                  {t('membership.apply')}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPromo(true)}
              className="inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
            >
              <Ticket className="h-4 w-4" aria-hidden="true" />
              {t('membership.havePromo')}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-1 text-sm text-muted hover:text-slate-700"
          >
            {t('membership.payLater')}
          </button>
        </div>
      )}
    </Modal>
  );
}
