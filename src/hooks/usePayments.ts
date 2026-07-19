/**
 * usePayments — Fase 3 (pagos con Stripe Connect).
 *  - useProviderPayments: estado de Connect, iniciar onboarding, guardar ajustes
 *    de pago y obtener el reporte diario de facturación (con RFC).
 *  - useConsumerPayments: pagar una consulta o suscribirse a una terapia.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { toMessage } from '@/lib/utils';
import type { Result } from '@/types/app';

export interface BillingRow {
  payer_name: string;
  payer_rfc: string;
  amount: number;
  currency: string;
  kind: string;
  paid_at: string;
}

export interface PaymentSettings {
  accepts_payments: boolean;
  consultation_amount: number | null;
  consultation_currency: string | null;
  stripe_connect_id: string | null;
  stripe_charges_enabled: boolean;
}

export function useProviderPayments() {
  const { userId } = useAuth();
  const setProfile = useAuthStore((s) => s.setProfile);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [report, setReport] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('accepts_payments, consultation_amount, consultation_currency, stripe_connect_id, stripe_charges_enabled')
      .eq('id', userId)
      .single();
    if (data) setSettings(data);
    const today = new Date().toISOString().slice(0, 10);
    const { data: rep } = await supabase.rpc('daily_billing_report', { p_date: today });
    setReport((rep as BillingRow[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const startConnect = useCallback(async (): Promise<Result<string>> => {
    try {
      const { data, error } = await supabase.functions.invoke('connect-onboarding');
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error('Sin URL de onboarding');
      window.location.href = url;
      return { ok: true, data: url };
    } catch (e) {
      return { ok: false, error: toMessage(e, 'No se pudo iniciar el alta de pagos.') };
    }
  }, []);

  const saveSettings = useCallback(
    async (s: { accepts_payments: boolean; consultation_amount: number | null; consultation_currency: string | null }): Promise<Result<true>> => {
      if (!userId) return { ok: false, error: 'Sin sesión' };
      const { data, error } = await supabase
        .from('profiles')
        .update(s)
        .eq('id', userId)
        .select('*')
        .single();
      if (error) return { ok: false, error: toMessage(error) };
      if (data) setProfile(data);
      await load();
      return { ok: true, data: true };
    },
    [userId, setProfile, load],
  );

  return { settings, report, loading, reload: load, startConnect, saveSettings };
}

export function useConsumerPayments() {
  const pay = useCallback(
    async (providerId: string, opts?: { appointmentId?: string; kind?: 'consultation' | 'therapy'; payerRfc?: string }): Promise<Result<string>> => {
      try {
        const { data, error } = await supabase.functions.invoke('create-consultation-checkout', {
          body: { providerId, appointmentId: opts?.appointmentId, kind: opts?.kind ?? 'consultation', payerRfc: opts?.payerRfc },
        });
        if (error) throw error;
        const url = (data as { url?: string })?.url;
        if (!url) throw new Error('Sin URL de pago');
        window.location.href = url;
        return { ok: true, data: url };
      } catch (e) {
        return { ok: false, error: toMessage(e, 'No se pudo iniciar el pago.') };
      }
    },
    [],
  );

  return { pay };
}
