/**
 * useDonationTiers — importes de donación por moneda, leídos de la base.
 *
 * Devuelve un mapa con la misma forma que CURRENCIES de src/lib/donation.ts, de
 * modo que la página de donación pueda usarlo directamente. Arranca con los
 * valores por defecto del código y los sustituye por los de la base en cuanto
 * llegan: así nunca hay un parpadeo con la moneda vacía ni depende de la red
 * para mostrar algo.
 *
 * useAdminDonationTiers — versión para el panel: incluye inactivas y permite
 * guardar. Solo la usa el admin.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CURRENCIES, type CurrenciesMap, type CurrencyConfig } from '@/lib/donation';

export interface DonationTierRow {
  currency: string;
  symbol: string;
  zero_decimal: boolean;
  seed_amount: number;
  ally_amount: number;
  driver_amount: number;
  ambassador_amount: number;
  is_active: boolean;
}

/** Convierte una fila de la base a la forma que consume la lógica pura. */
function rowToConfig(r: DonationTierRow): CurrencyConfig {
  const thresholds = {
    seed: Number(r.seed_amount),
    ally: Number(r.ally_amount),
    driver: Number(r.driver_amount),
    ambassador: Number(r.ambassador_amount),
  };
  return {
    code: r.currency.toUpperCase(),
    symbol: r.symbol,
    zeroDecimal: r.zero_decimal,
    presets: [thresholds.seed, thresholds.ally, thresholds.driver, thresholds.ambassador],
    thresholds,
  };
}

export function useDonationTiers() {
  const [currencies, setCurrencies] = useState<CurrenciesMap>(CURRENCIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('donation_tiers')
        .select('*')
        .eq('is_active', true);
      if (alive) {
        if (!error && data && data.length > 0) {
          const map: CurrenciesMap = {};
          for (const r of data as DonationTierRow[]) map[r.currency.toUpperCase()] = rowToConfig(r);
          setCurrencies(map);
        }
        // Si falla o viene vacío, nos quedamos con los valores por defecto.
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { currencies, loading };
}

export function useAdminDonationTiers() {
  const [rows, setRows] = useState<DonationTierRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('donation_tiers').select('*').order('currency');
    setRows((data as DonationTierRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Guarda (upsert) una moneda. El orden lo valida el CHECK de la base. */
  const save = useCallback(
    async (r: DonationTierRow): Promise<{ ok: boolean; error?: string }> => {
      const { error } = await supabase.from('donation_tiers').upsert({
        currency: r.currency.toUpperCase(),
        symbol: r.symbol,
        zero_decimal: r.zero_decimal,
        seed_amount: r.seed_amount,
        ally_amount: r.ally_amount,
        driver_amount: r.driver_amount,
        ambassador_amount: r.ambassador_amount,
        is_active: r.is_active,
        updated_at: new Date().toISOString(),
      });
      if (!error) await load();
      return { ok: !error, error: error?.message };
    },
    [load],
  );

  return { rows, loading, reload: load, save };
}
