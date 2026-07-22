/**
 * useAdminPricing — control de cuotas desde el panel.
 *  - useCountryPrices(country): cuotas de un país para cada tipo de afiliado,
 *    con sus dos clases (fundador y ordinaria) y sus tres importes (mensual,
 *    anual cobrado y anual de referencia). Marca si el precio es explícito o
 *    calculado con base USD × tipo de cambio.
 *  - useReferralConfig(): parámetros del programa de recomendación (el % de
 *    comisión SOLO se edita aquí; el usuario nunca puede tocarlo).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type { Result } from '@/types/app';


export interface ReferralConfig {
  discount_pct: number;
  validity_days: number;
  referrer_step_pct: number;
  referrer_max_pct: number;
}

function rpcOk(data: unknown, error: unknown): Result<true> {
  if (error) return { ok: false, error: toMessage(error) };
  const r = data as { ok?: boolean; error?: string };
  if (!r?.ok) return { ok: false, error: r?.error || 'error' };
  return { ok: true, data: true };
}

export type MemberClass = 'founder' | 'ordinary';

export interface CountryPriceRow {
  affiliate_type: string;
  member_class: MemberClass;
  currency: string;
  monthly_amount: number | null;
  annual_amount: number | null;
  annual_list_amount: number | null;
  zero_decimal: boolean;
  is_override: boolean;
}

/**
 * Cuotas de UN país: cada tipo de afiliado con sus dos clases (fundador y
 * ordinaria) y sus tres importes (mensual, anual cobrado y anual de referencia).
 */
export function useCountryPrices(country: string) {
  const [rows, setRows] = useState<CountryPriceRow[]>([]);
  const [configured, setConfigured] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const reloadConfigured = useCallback(async () => {
    const { data } = await supabase.rpc('admin_configured_countries');
    const map: Record<string, number> = {};
    for (const r of (data as { country_label: string; types: number }[]) ?? []) {
      map[r.country_label] = r.types;
    }
    setConfigured(map);
  }, []);

  const reload = useCallback(async () => {
    if (!country) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.rpc('admin_country_prices', { p_country: country });
    setRows((data as CountryPriceRow[]) ?? []);
    setLoading(false);
  }, [country]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { void reloadConfigured(); }, [reloadConfigured]);

  const setPrice = useCallback(
    async (
      type: string,
      memberClass: MemberClass,
      currency: string,
      monthly: number,
      annual: number,
      annualList: number,
      zeroDecimal: boolean,
    ): Promise<Result<true>> => {
      const { data, error } = await supabase.rpc('admin_set_membership_price', {
        p_type: type,
        p_country: country,
        p_class: memberClass,
        p_currency: currency,
        p_monthly: monthly,
        p_annual: annual,
        p_annual_list: annualList,
        p_zero_decimal: zeroDecimal,
      });
      const r = rpcOk(data, error);
      if (r.ok) { await reload(); await reloadConfigured(); }
      return r;
    },
    [country, reload, reloadConfigured],
  );

  const clearPrice = useCallback(
    async (type: string, memberClass: MemberClass): Promise<Result<true>> => {
      const { data, error } = await supabase.rpc('admin_clear_membership_price', {
        p_type: type,
        p_country: country,
        p_class: memberClass,
      });
      const r = rpcOk(data, error);
      if (r.ok) { await reload(); await reloadConfigured(); }
      return r;
    },
    [country, reload, reloadConfigured],
  );

  return { rows, configured, loading, reload, setPrice, clearPrice };
}

export function useReferralConfig() {
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_referral_config');
    const row = Array.isArray(data) ? data[0] : data;
    setConfig((row as ReferralConfig) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const save = useCallback(
    async (c: ReferralConfig): Promise<Result<true>> => {
      const { data, error } = await supabase.rpc('admin_set_referral_config', {
        p_discount_pct: c.discount_pct,
        p_validity_days: c.validity_days,
        p_referrer_step_pct: c.referrer_step_pct,
        p_referrer_max_pct: c.referrer_max_pct,
      });
      const r = rpcOk(data, error);
      if (r.ok) await reload();
      return r;
    },
    [reload],
  );

  return { config, loading, reload, save };
}
