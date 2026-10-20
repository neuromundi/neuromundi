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
  // Aqui se cuentan recomendaciones y comisiones. Un resumen que no se pudo
  // leer se veia igual que «no has recomendado a nadie». (Repaso adversario.)
  const [fallo, setFallo] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) { setSummary(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc('my_referral_summary');
    if (error) { setFallo(true); setLoading(false); return; }
    setFallo(false);
    setSummary(firstRow<ReferralSummary>(data));
    setLoading(false);
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);
  return { summary, loading, fallo, reload };
}

export function useMyDiscount() {
  const { userId } = useAuth();
  const [discount, setDiscount] = useState<MyDiscount | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallo, setFallo] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) { setDiscount(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc('my_membership_discount');
    // Si no se pudo leer NO se deja el descuento en nada: se queda en «no se
    // sabe», para no cobrar la cuota completa a quien tiene descuento.
    if (error) { setFallo(true); setLoading(false); return; }
    setFallo(false);
    setDiscount(firstRow<MyDiscount>(data));
    setLoading(false);
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);
  return { discount, loading, fallo, reload };
}

export function useAdminReferrals() {
  const [items, setItems] = useState<AdminReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallo, setFallo] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_referrals');
    if (error) { setFallo(true); setLoading(false); return; }
    setFallo(false);
    setItems((data as AdminReferral[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  return { items, loading, fallo, reload };
}
