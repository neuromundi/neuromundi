/**
 * MembershipModal — se muestra tras concluir el registro (y desde el banner).
 * Explica la cuota anual, los 7 días de gracia y ofrece: pagar ahora (Stripe),
 * canjear un código promocional, o pagar después.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Ticket, CheckCircle2 } from 'lucide-react';
import { Modal, Button, useToast } from '@/components/ui';
import { useMembership } from '@/hooks/useMembership';

const PROMO_ERRORS: Record<string, string> = {
  invalid: 'membership.promoInvalid',
  expired: 'membership.promoExpired',
  exhausted: 'membership.promoExhausted',
  scope: 'membership.promoScope',
};

export function MembershipModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { status, daysLeft, quote, loading, startCheckout, redeemPromo } = useMembership();
  const [promo, setPromo] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [busy, setBusy] = useState(false);

  const exempt = status === 'exempt';
  const active = status === 'active';

  const onPay = async () => {
    setBusy(true);
    const res = await startCheckout();
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
      toast.success(t('membership.promoOk'));
      onClose();
    } else {
      toast.error(t(PROMO_ERRORS[res.error ?? 'invalid'] ?? 'membership.promoInvalid'));
    }
  };

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

          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              {t('membership.annual')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {loading ? t('membership.calculating') : amountText}
              {!loading && quote != null && (
                <span className="text-base font-medium text-muted"> {t('membership.perYear')}</span>
              )}
            </p>
          </div>

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
