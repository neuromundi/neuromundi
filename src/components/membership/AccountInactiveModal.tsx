/**
 * AccountInactiveModal — aviso cordial de cuenta inactiva por falta de pago.
 * El tono es de bienvenida y no de castigo: se explica qué recupera al pagar,
 * se ofrece el pago en un clic y se deja salir sin fricción.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, CreditCard, Ticket } from 'lucide-react';
import { Button, Modal, useToast } from '@/components/ui';
import { useMembership } from '@/hooks/useMembership';

export function AccountInactiveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { quote, status, startCheckout, redeemPromo } = useMembership();
  const [busy, setBusy] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [promo, setPromo] = useState('');

  const isRenewal = status === 'past_due';

  const onPay = async () => {
    setBusy(true);
    const r = await startCheckout();
    setBusy(false);
    if (!r.ok) toast.error(r.error);
  };

  const onRedeem = async () => {
    if (!promo.trim()) return;
    setBusy(true);
    const r = await redeemPromo(promo.trim());
    setBusy(false);
    if (r.ok) {
      toast.success(t('gate.promoOk'));
      onClose();
    } else {
      toast.error(t('gate.promoBad'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('gate.title')}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <p className="text-sm text-brand-900">
            {isRenewal ? t('gate.bodyRenewal') : t('gate.bodyFirst')}
          </p>
        </div>

        <p className="text-sm text-slate-700">{t('gate.whatYouGet')}</p>
        <ul className="space-y-1 text-sm text-slate-700">
          <li>· {t('gate.benefit1')}</li>
          <li>· {t('gate.benefit2')}</li>
          <li>· {t('gate.benefit3')}</li>
        </ul>

        {quote && (
          <div className="rounded-2xl bg-slate-50 p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              {t('gate.yourFee')}
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {quote.currency} {Number(quote.amount).toLocaleString()}
            </p>
          </div>
        )}

        <Button fullWidth loading={busy} onClick={onPay} leadingIcon={<CreditCard className="h-5 w-5" />}>
          {t('gate.payNow')}
        </Button>

        {showPromo ? (
          <div className="flex gap-2">
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder={t('gate.promoPlaceholder')}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <Button variant="secondary" loading={busy} onClick={onRedeem}>
              {t('gate.promoApply')}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPromo(true)}
            className="mx-auto flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
          >
            <Ticket className="h-4 w-4" aria-hidden="true" /> {t('gate.havePromo')}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mx-auto block text-sm text-muted hover:underline"
        >
          {t('gate.later')}
        </button>

        <p className="text-center text-xs text-muted">{t('gate.footer')}</p>
      </div>
    </Modal>
  );
}
