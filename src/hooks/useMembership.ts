/**
 * useMembership — estado de la cuota de afiliación del usuario y acciones:
 *  - lee el estado (pending/active/past_due/exempt) y días de gracia restantes.
 *  - obtiene la cotización local (moneda + importe) vía RPC get_membership_quote.
 *  - startCheckout(): abre Stripe Checkout (suscripción anual).
 *  - redeemPromo(code): canjea un código promocional (exenta el pago).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Result } from '@/types/app';

export type MembershipStatus = 'pending' | 'active' | 'past_due' | 'exempt';
export type BillingPeriod = 'monthly' | 'annual';

/** Las dos opciones que puede contratar el usuario, ya resueltas por la base. */
export interface MembershipOptions {
  affiliate_type: string;
  member_class: 'founder' | 'ordinary';
  currency: string;
  monthly_amount: number | null;
  annual_amount: number | null;
  annual_list_amount: number | null;
  zero_decimal: boolean;
  is_founder: boolean;
}

export interface MembershipState {
  status: MembershipStatus | null;
  dueAt: string | null;
  paidUntil: string | null;
  daysLeft: number | null;
  quote: { currency: string; amount: number } | null;
  options: MembershipOptions | null;
  /** % de descuento por recomendación (total_pct de my_membership_discount). */
  referralPct: number;
  /** % de descuento por política de país (country_discount_pct). */
  countryPct: number;
  /** Código promocional activo del usuario (my_membership_promo), si lo hay. */
  promo: { benefit: string; pct: number; amount: number; currency: string } | null;
  loading: boolean;
}

export function useMembership() {
  const { userId, role, providerType } = useAuth();
  const [state, setState] = useState<MembershipState>({
    status: null,
    dueAt: null,
    paidUntil: null,
    daysLeft: null,
    quote: null,
    options: null,
    referralPct: 0,
    countryPct: 0,
    promo: null,
    loading: true,
  });

  const load = useCallback(async () => {
    if (!userId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const { data: p } = await supabase
      .from('profiles')
      .select('membership_status, membership_due_at, membership_paid_until, country')
      .eq('id', userId)
      .single();

    let quote: { currency: string; amount: number } | null = null;
    if (p && p.membership_status !== 'exempt' && p.membership_status !== 'active') {
      const affiliateType = role === 'provider' ? (providerType ?? 'service_provider') : (role ?? 'parent');
      const { data: q } = await supabase.rpc('get_membership_quote', {
        p_type: affiliateType,
        p_country: p.country ?? '',
      });
      const row = Array.isArray(q) ? q[0] : q;
      if (row) quote = { currency: row.currency, amount: Number(row.amount) };
    }

    // Opciones reales de cobro: tipo (médico/no médico), clase (fundador) y
    // ambas periodicidades. Es lo que decide cuánto paga esta persona.
    let options: MembershipOptions | null = null;
    if (p && p.membership_status !== 'exempt') {
      const { data: opt } = await supabase.rpc('my_membership_options');
      const row = Array.isArray(opt) ? opt[0] : opt;
      if (row) options = row as MembershipOptions;
    }

    // Descuentos que se componen en el checkout, para poder previsualizar el
    // precio del primer pago sin diferir de Stripe. Fallan a 0 sin bloquear.
    let referralPct = 0;
    let countryPct = 0;
    let promo: MembershipState['promo'] = null;
    if (p && p.membership_status !== 'exempt' && p.membership_status !== 'active') {
      try {
        const { data: d } = await supabase.rpc('my_membership_discount');
        const row = Array.isArray(d) ? d[0] : d;
        referralPct = Number(row?.total_pct ?? 0);
      } catch { referralPct = 0; }
      try {
        const { data: cd } = await supabase.rpc('country_discount_pct', { p_country: p.country ?? '' });
        countryPct = Number(cd ?? 0);
      } catch { countryPct = 0; }
      try {
        const { data: pr } = await supabase.rpc('my_membership_promo');
        const row = Array.isArray(pr) ? pr[0] : pr;
        if (row?.benefit) {
          promo = {
            benefit: String(row.benefit),
            pct: Number(row.percent_off ?? 0),
            amount: Number(row.amount_off ?? 0),
            currency: String(row.amount_currency ?? ''),
          };
        }
      } catch { promo = null; }
    }

    const dueAt = p?.membership_due_at ?? null;
    const daysLeft =
      dueAt != null
        ? Math.max(0, Math.ceil((new Date(dueAt).getTime() - Date.now()) / 86400000))
        : null;

    setState({
      status: (p?.membership_status as MembershipStatus) ?? null,
      dueAt,
      paidUntil: p?.membership_paid_until ?? null,
      daysLeft,
      quote,
      options,
      referralPct,
      countryPct,
      promo,
      loading: false,
    });
  }, [userId, role, providerType]);

  useEffect(() => {
    void load();
  }, [load]);

  const startCheckout = useCallback(async (period: BillingPeriod = 'annual'): Promise<Result<string>> => {
    try {
      const { data, error } = await supabase.functions.invoke('create-membership-checkout', {
        body: { period },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error('Sin URL de pago');
      window.location.href = url;
      return { ok: true, data: url };
    } catch (e) {
      return { ok: false, error: toMessage(e, 'No se pudo iniciar el pago.') };
    }
  }, []);

  const redeemPromo = useCallback(
    async (code: string): Promise<Result<true> & { reason?: string; benefit?: string; percentOff?: number | null; amountOff?: number | null; amountCurrency?: string | null }> => {
      try {
        const { data, error } = await supabase.rpc('redeem_promo_code', { p_code: code });
        if (error) throw error;
        const res = data as { ok: boolean; error?: string; benefit?: string; percent_off?: number | null; amount_off?: number | null; amount_currency?: string | null };
        if (!res?.ok) return { ok: false, error: res?.error ?? 'invalid', reason: res?.error };
        await load();
        return { ok: true, data: true, benefit: res.benefit, percentOff: res.percent_off ?? null, amountOff: res.amount_off ?? null, amountCurrency: res.amount_currency ?? null };
      } catch (e) {
        return { ok: false, error: toMessage(e, 'invalid') };
      }
    },
    [load],
  );

  return { ...state, reload: load, startCheckout, redeemPromo };
}
