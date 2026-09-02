/**
 * useAdminBilling — CRUD de configuración de cuota para el admin:
 *  - membership_fees (cuota base por tipo, en USD)
 *  - country_pricing (moneda + tipo de cambio por país)
 *  - country_discount_policies (% de descuento por país, aplica sobre cualquier tipo)
 *  - promo_codes (códigos promocionales)
 * Requiere rol admin (las políticas RLS solo permiten escribir al admin).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logger, toMessage } from '@/lib/utils';
import type { Tables, TablesInsert } from '@/types/database';
import type { Result } from '@/types/app';

export type MembershipFee = Tables<'membership_fees'>;
export type CountryPricing = Tables<'country_pricing'>;
export type CountryDiscount = Tables<'country_discount_policies'>;
export type PromoCode = Tables<'promo_codes'>;

export function useAdminBilling() {
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [pricing, setPricing] = useState<CountryPricing[]>([]);
  const [discounts, setDiscounts] = useState<CountryDiscount[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, p, d, c] = await Promise.all([
      supabase.from('membership_fees').select('*').order('affiliate_type'),
      supabase.from('country_pricing').select('*').order('country_label'),
      supabase.from('country_discount_policies').select('*').order('country_label'),
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
    ]);
    if (f.error) logger.error('fees', f.error);
    if (p.error) logger.error('pricing', p.error);
    if (d.error) logger.error('discounts', d.error);
    if (c.error) logger.error('promos', c.error);
    setFees(f.data ?? []);
    setPricing(p.data ?? []);
    setDiscounts(d.data ?? []);
    setPromos(c.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveFee = useCallback(async (row: MembershipFee): Promise<Result<true>> => {
    const { error } = await supabase
      .from('membership_fees')
      .update({ base_usd: row.base_usd, is_active: row.is_active, updated_at: new Date().toISOString() })
      .eq('affiliate_type', row.affiliate_type);
    if (error) return { ok: false, error: toMessage(error) };
    setFees((prev) => prev.map((x) => (x.affiliate_type === row.affiliate_type ? row : x)));
    return { ok: true, data: true };
  }, []);

  const savePricing = useCallback(async (row: TablesInsert<'country_pricing'>): Promise<Result<true>> => {
    const { error } = await supabase
      .from('country_pricing')
      .upsert({ ...row, country_label: row.country_label.trim().toLowerCase(), updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const deletePricing = useCallback(async (label: string): Promise<Result<true>> => {
    const { error } = await supabase.from('country_pricing').delete().eq('country_label', label);
    if (error) return { ok: false, error: toMessage(error) };
    setPricing((prev) => prev.filter((x) => x.country_label !== label));
    return { ok: true, data: true };
  }, []);

  const saveDiscount = useCallback(async (row: TablesInsert<'country_discount_policies'>): Promise<Result<true>> => {
    const { error } = await supabase
      .from('country_discount_policies')
      .upsert({ ...row, country_label: row.country_label.trim().toLowerCase(), updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const deleteDiscount = useCallback(async (label: string): Promise<Result<true>> => {
    const { error } = await supabase.from('country_discount_policies').delete().eq('country_label', label);
    if (error) return { ok: false, error: toMessage(error) };
    setDiscounts((prev) => prev.filter((x) => x.country_label !== label));
    return { ok: true, data: true };
  }, []);

  const createPromo = useCallback(async (row: TablesInsert<'promo_codes'>): Promise<Result<true>> => {
    const { error } = await supabase.from('promo_codes').insert({ ...row, code: row.code.trim() });
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const togglePromo = useCallback(async (code: string, is_active: boolean): Promise<Result<true>> => {
    const { error } = await supabase.from('promo_codes').update({ is_active }).eq('code', code);
    if (error) return { ok: false, error: toMessage(error) };
    setPromos((prev) => prev.map((x) => (x.code === code ? { ...x, is_active } : x)));
    return { ok: true, data: true };
  }, []);

  const deletePromo = useCallback(async (code: string): Promise<Result<true>> => {
    const { error } = await supabase.from('promo_codes').delete().eq('code', code);
    if (error) return { ok: false, error: toMessage(error) };
    setPromos((prev) => prev.filter((x) => x.code !== code));
    return { ok: true, data: true };
  }, []);

  return {
    fees,
    pricing,
    discounts,
    promos,
    loading,
    reload: load,
    saveFee,
    savePricing,
    deletePricing,
    saveDiscount,
    deleteDiscount,
    createPromo,
    togglePromo,
    deletePromo,
  };
}
