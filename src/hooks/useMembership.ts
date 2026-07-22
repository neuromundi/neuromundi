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
    async (code: string): Promise<Result<true> & { reason?: string }> => {
      try {
        const { data, error } = await supabase.rpc('redeem_promo_code', { p_code: code });
        if (error) throw error;
        const res = data as { ok: boolean; error?: string };
        if (!res?.ok) return { ok: false, error: res?.error ?? 'invalid', reason: res?.error };
        await load();
        return { ok: true, data: true };
      } catch (e) {
        return { ok: false, error: toMessage(e, 'invalid') };
      }
    },
    [load],
  );

  return { ...state, reload: load, startCheckout, redeemPromo };
}
