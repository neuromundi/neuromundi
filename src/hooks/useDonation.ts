/**
 * useDonation — arranca el checkout de donación en Stripe.
 *
 * Sirve tanto a miembros como a invitados: si hay sesión, supabase-js manda el
 * token del usuario y la Edge Function asocia la donación al perfil; si no, va
 * como invitado. El importe y el nivel los revalida el servidor.
 */
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface DonationPayload {
  amount: number;
  currency: string;
  isCompany: boolean;
  contactName: string;
  orgName?: string;
  email: string;
  publishConsent: boolean;
  publishAs?: string;
  waivePhysical: boolean;
  shipUseRegistered?: boolean;
  shipRecipient?: string;
  shipAddress?: string;
  shipCity?: string;
  shipPostal?: string;
  shipCountry?: string;
}

export function useDonation() {
  const [submitting, setSubmitting] = useState(false);

  /** Crea la sesión y redirige a Stripe. Devuelve error si algo falla. */
  const donate = async (payload: DonationPayload): Promise<{ ok: boolean; error?: string }> => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-donation-checkout', {
        body: payload,
      });
      if (error) return { ok: false, error: error.message };
      const urlDest = (data as { url?: string })?.url;
      if (!urlDest) return { ok: false, error: 'no_url' };
      window.location.href = urlDest;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'error' };
    } finally {
      setSubmitting(false);
    }
  };

  return { donate, submitting };
}
