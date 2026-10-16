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
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Ticket, CheckCircle2, Crown, AlertTriangle } from 'lucide-react';
import { Modal, Button, useToast } from '@/components/ui';
import { useMembership, type BillingPeriod } from '@/hooks/useMembership';
import { cn } from '@/lib/utils';
import { annualSaving, combinedDiscountPct, priceAfterPct } from '@/lib/pricing';
import { useAuthStore } from '@/stores/authStore';
import { useCampaign } from '@/hooks/useCampaign';
import { supabase } from '@/lib/supabase';
import { Clock } from 'lucide-react';

const PROMO_ERRORS: Record<string, string> = {
  invalid: 'membership.promoInvalid',
  expired: 'membership.promoExpired',
  exhausted: 'membership.promoExhausted',
  scope: 'membership.promoScope',
  email: 'membership.promoEmail',
};

export function MembershipModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { status, daysLeft, quote, options, loading, referralPct, countryPct, promo: activePromo, monthlyOrdinary, startCheckout, redeemPromo } = useMembership();
  const { founderDiscount: campaignDisc, isMarketComingSoon } = useCampaign();
  const profileCountry = useAuthStore((s) => s.profile?.country ?? null);
  const [promo, setPromo] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<BillingPeriod>('annual');
  // Aviso preventivo antes de pasar a mensual: el descuento vitalicio de
  // Miembro Fundador SOLO rige en la suscripción anual. Quien elige mensual
  // renuncia a él, y debe enterarse ANTES de llegar a la pantalla de Stripe,
  // no al ver el cargo.
  const [confirmMonthly, setConfirmMonthly] = useState(false);
  // Solicitud de cuota de fundador fuera de cupo o de plazo (migración 0218).
  // Sólo se ofrece a quien NO es elegible: a quien sí lo es no hay nada que
  // pedirle, y enseñarle el botón sembraría la duda de que su precio peligra.
  const [solFund, setSolFund] = useState<string>('cargando');
  const [pidiendo, setPidiendo] = useState(false);
  // Promo canjeada EN ESTA sesión (el % o monto lo devuelve redeem_promo_code),
  // para incluirla en la vista previa del primer pago.
  const [appliedPromo, setAppliedPromo] = useState<{ benefit: string; pct: number; amount: number; currency: string } | null>(null);

  const exempt = status === 'exempt';
  const active = status === 'active';
  // País en fase "próximamente 2027": se ocultan las tarifas y el pago.
  const comingSoon = isMarketComingSoon(profileCountry);

  // Estado de la solicitud propia. Se consulta al abrir, no antes: es una
  // pantalla que la mayoría no verá nunca.
  useEffect(() => {
    if (!open) return;
    let vivo = true;
    (async () => {
      const { data } = await supabase.rpc('mi_solicitud_fundador');
      if (vivo) setSolFund(((data as { status?: string } | null)?.status) ?? 'ninguna');
    })();
    return () => { vivo = false; };
  }, [open]);

  const pedirFundador = async () => {
    setPidiendo(true);
    const { data, error } = await supabase.rpc('solicitar_cuota_fundador', {});
    setPidiendo(false);
    const r = data as { ok?: boolean; motivo?: string } | null;
    if (error || !r?.ok) { toast.error(t('solFund.pedirError')); return; }
    setSolFund('pendiente');
    toast.success(t('solFund.pedirOk'));
  };

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
        setAppliedPromo({ benefit: 'percent', pct: res.percentOff ?? 0, amount: 0, currency: '' });
        toast.success(t('membership.promoDiscountOk', { pct: res.percentOff ?? 0 }));
        setShowPromo(false);
        setPromo('');
      } else if (res.benefit === 'amount') {
        setAppliedPromo({ benefit: 'amount', pct: 0, amount: res.amountOff ?? 0, currency: res.amountCurrency ?? '' });
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

  // Pierde el beneficio de fundador quien pasa a mensual: solo entonces hay
  // algo que advertir.
  const pierdeFundador = (options?.is_founder ?? false) || campaignDisc.pct > 0;
  // El importe mensual que se enseña es el ORDINARIO, que es el que cobra
  // Stripe. options.monthly_amount viene en clase fundador y NO se cobra nunca,
  // así que no sirve ni como respaldo: si la cuota ordinaria no está
  // configurada se pinta un guión. Mejor no dar precio que dar uno falso.
  const monthlyShown = monthlyOrdinary?.amount ?? null;

  const elegirPeriodo = (p: BillingPeriod) => {
    if (p === 'monthly' && pierdeFundador) { setConfirmMonthly(true); return; }
    setPeriod(p);
  };

  const amountText =
    quote != null
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: quote.currency }).format(quote.amount)
      : t('membership.calculating');

  // Vista previa del PRIMER pago con todos los descuentos combinados, igual que
  // el servidor (recomendación ∘ promo ∘ fundador[solo anual] ∘ país, tope 90%;
  // un monto fijo de promo en la moneda de cobro prevalece sobre los %).
  // Promo efectiva: la canjeada en esta sesión tiene prioridad (feedback
  // inmediato); si no, la que ya tuviera el usuario (my_membership_promo).
  const effectivePromo = appliedPromo ?? activePromo;
  // El mensual parte de monthlyShown (cuota ORDINARIA, la que cobra Stripe) y
  // NO de options.monthly_amount, que viene en clase fundador. Usar aquel era
  // el mismo defecto ya corregido en la tarjeta de precio: el modal llegaba a
  // enseñar dos cifras distintas y ninguna era la del cargo.
  const previewBase = options ? (period === 'annual' ? options.annual_amount : monthlyShown) : null;
  let previewFinal: number | null = null;
  let previewOffPct = 0;
  if (options && previewBase != null) {
    const curr = options.currency.toLowerCase();
    const promoIsAmount =
      effectivePromo?.benefit === 'amount' && effectivePromo.amount > 0 && effectivePromo.currency.toLowerCase() === curr;
    if (promoIsAmount) {
      previewFinal = Math.max(0, Math.round((previewBase - effectivePromo!.amount) * 100) / 100);
    } else {
      const promoPct = effectivePromo?.benefit === 'percent' ? effectivePromo.pct : 0;
      const founderPct = period === 'annual' ? campaignDisc.pct : 0;
      previewOffPct = combinedDiscountPct([referralPct, promoPct, founderPct, countryPct]);
      if (previewOffPct > 0) previewFinal = priceAfterPct(previewBase, previewOffPct);
    }
  }
  const showPreview = previewFinal != null;

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
      ) : comingSoon ? (
        <div className="space-y-3 text-center">
          <Clock className="mx-auto h-12 w-12 text-amber-500" aria-hidden="true" />
          <p className="font-semibold text-slate-900">{t('launch.soonTitle')} · {t('launch.year')}</p>
          <p className="text-sm text-muted">{t('launch.modalBody')}</p>
          <Button onClick={onClose} fullWidth>{t('common.close')}</Button>
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
                date: campaignDisc.endsAt ? campaignDisc.endsAt.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }) : '',
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
                const amount = isAnnual ? options.annual_amount : monthlyShown;
                const selected = period === p;
                const saving = isAnnual ? annualSaving(options.annual_amount, options.annual_list_amount) : 0;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => elegirPeriodo(p)}
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

          {/* Total del primer pago con los descuentos ya combinados. */}
          {showPreview && (
            <div className="rounded-2xl border border-sage-200 bg-sage-50/70 p-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">
                {t('membership.firstPaymentTitle')}
              </p>
              <p className="mt-0.5 text-2xl font-bold text-slate-900">
                {fmt(previewFinal!, options!.currency)}
                {previewOffPct > 0 && (
                  <span className="ml-2 inline-block rounded-full bg-sage-100 px-2 py-0.5 align-middle text-xs font-bold text-sage-700">
                    −{previewOffPct}%
                  </span>
                )}
              </p>
              <p className="mt-1 text-[11px] text-muted">{t('membership.firstPaymentNote')}</p>
            </div>
          )}

          {/* Aviso preventivo: pasar a mensual cuesta la cuota de fundador. */}
          {confirmMonthly && (
            <div role="alertdialog" aria-labelledby="aviso-mensual" className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
              <p id="aviso-mensual" className="flex items-start gap-2 text-sm font-bold text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                {t('membership.monthlyWarnTitle')}
              </p>
              <p className="mt-2 text-sm text-amber-900">
                {t('membership.monthlyWarnBody', {
                  annual: options?.annual_amount != null ? fmt(options.annual_amount, options.currency) : '—',
                  monthly: monthlyShown != null && options ? fmt(monthlyShown, options.currency) : '—',
                })}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button onClick={() => { setPeriod('annual'); setConfirmMonthly(false); }} fullWidth>
                  {t('membership.monthlyWarnKeep')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { setPeriod('monthly'); setConfirmMonthly(false); }}
                  fullWidth
                >
                  {t('membership.monthlyWarnGo')}
                </Button>
              </div>
            </div>
          )}

          <Button onClick={onPay} loading={busy} leadingIcon={<CreditCard className="h-5 w-5" />} fullWidth>
            {t('membership.payNow')}
          </Button>

          {/* Se quedó fuera del cupo de fundador: puede pedirlo. */}
          {!options?.is_founder && solFund !== 'cargando' && solFund !== 'aprobada' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
              {solFund === 'pendiente' ? (
                <p className="text-sm text-amber-900">{t('solFund.pendienteAviso')}</p>
              ) : (
                <>
                  <p className="text-sm text-amber-900">{t('solFund.ofrecer')}</p>
                  <Button
                    variant="secondary"
                    onClick={() => void pedirFundador()}
                    loading={pidiendo}
                    leadingIcon={<Crown className="h-4 w-4" />}
                    fullWidth
                  >
                    {t('solFund.pedirCta')}
                  </Button>
                </>
              )}
            </div>
          )}

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
