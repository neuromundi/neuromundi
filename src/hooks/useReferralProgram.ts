/**
 * useReferralProgram — programa de recomendación (enlace único + 5%).
 *  - useReferralSummary(): cuántos usaron mi enlace, cuántos ya pagaron y qué
 *    porcentaje acumulé para mi próximo pago (con su tope).
 *  - useMyDiscount(): descuento que se me aplicará al pagar la membresía.
 *  - useAdminReferrals(): reporte completo para el panel de administración.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface ReferralSummary {
  total_uses: number;
  paying_uses: number;
  rewarded_uses: number;
  accrued_pct: number;
  max_pct: number;
  step_pct: number;
  validity_days: number;
}

export interface MyDiscount {
  referral_pct: number;
  referrer_pct: number;
  total_pct: number;
}

export interface AdminReferral {
  id: string;
  used_at: string;
  referrer_id: string;
  referrer_name: string | null;
  referrer_member_no: number | null;
  referred_id: string;
  referred_name: string | null;
  referred_member_no: number | null;
  referred_role: string | null;
  is_paying_type: boolean;
  referred_has_paid: boolean;
  referred_paid_until: string | null;
  link_still_valid: boolean;
  reward_due: boolean;
  reward_manual: boolean;
  reward_counted: boolean;
  referrer_role: string | null;
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return (data as T) ?? null;
}

export function useReferralSummary() {
  const { userId } = useAuth();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) { setSummary(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.rpc('my_referral_summary');
    setSummary(firstRow<ReferralSummary>(data));
    setLoading(false);
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);
  return { summary, loading, reload };
}

export function useMyDiscount() {
  const { userId } = useAuth();
  const [discount, setDiscount] = useState<MyDiscount | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) { setDiscount(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.rpc('my_membership_discount');
    setDiscount(firstRow<MyDiscount>(data));
    setLoading(false);
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);
  return { discount, loading, reload };
}

export function useAdminReferrals() {
  const [items, setItems] = useState<AdminReferral[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_referrals');
    setItems((data as AdminReferral[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  return { items, loading, reload };
}
