/**
 * useCampaign — lee la configuración de la campaña de pre-registro (RPC pública
 * `campaign_status`) y expone el estado del bloqueo del directorio por país y la
 * activación de popups por continente. La config la edita el admin sin recompilar.
 *
 * `useDirectoryLock` combina lo anterior con la sesión: admin y asesor quedan
 * EXENTOS; el resto ve el bloqueo hasta la fecha de apertura de SU país.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useCountry } from '@/stores/countryStore';
import { COUNTRIES } from '@/data/countries';
import { CONTINENT_BY_CODE, type Continent } from '@/data/continents';

export interface FounderStage { days: number; pct: number }
export interface CampaignConfig {
  active: boolean;
  start_at: string | null;
  default_block_days: number;
  block_days_by_country: Record<string, number>;
  popup_active: boolean;
  popup_continents: Record<string, boolean>;
  founder_discount: FounderStage[];
  community_url: string | null;
}

/** Descuento de fundador vigente HOY según las etapas y la fecha de inicio.
 *  Devuelve el % actual y la fecha en que ESE % deja de aplicar (para el aviso
 *  de urgencia en el modal de pago). Sirve tanto en el hook como fuera. */
export function founderDiscountNow(config: CampaignConfig | null): { pct: number; endsAt: Date | null } {
  if (!config?.active || !config.start_at || !Array.isArray(config.founder_discount)) return { pct: 0, endsAt: null };
  const start = new Date(config.start_at).getTime();
  const days = (Date.now() - start) / 86400000;
  if (days < 0) return { pct: 0, endsAt: null };
  const stages = [...config.founder_discount].sort((a, b) => a.days - b.days);
  for (const s of stages) {
    if (days <= s.days) return { pct: Number(s.pct) || 0, endsAt: new Date(start + s.days * 86400000) };
  }
  return { pct: 0, endsAt: null };
}

const NAME_TO_CODE: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.name, c.code]));

export function continentForCountry(name: string | null): Continent | null {
  if (!name) return null;
  const code = NAME_TO_CODE[name];
  return code ? CONTINENT_BY_CODE[code] ?? null : null;
}

// Cache a nivel de módulo: la config se lee una vez por carga de la app.
let cache: CampaignConfig | null = null;

export function useCampaign() {
  const [config, setConfig] = useState<CampaignConfig | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    void (async () => {
      const { data } = await supabase.rpc('campaign_status');
      if (!alive) return;
      cache = (data as CampaignConfig | null) ?? null;
      setConfig(cache);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const unlockAtFor = (country: string | null): Date | null => {
    if (!config?.start_at) return null;
    const override = country ? config.block_days_by_country?.[country] : undefined;
    const days = typeof override === 'number' ? override : config.default_block_days;
    return new Date(new Date(config.start_at).getTime() + days * 86400000);
  };

  const directoryLockedFor = (country: string | null): { locked: boolean; unlockAt: Date | null } => {
    if (!config?.active || !config.start_at) return { locked: false, unlockAt: null };
    const unlock = unlockAtFor(country);
    const now = Date.now();
    const locked = now >= new Date(config.start_at).getTime() && unlock != null && now < unlock.getTime();
    return { locked, unlockAt: unlock };
  };

  const popupActiveFor = (country: string | null): boolean => {
    if (!config?.active || !config.popup_active) return false;
    const cont = continentForCountry(country);
    return cont ? config.popup_continents?.[cont] === true : false;
  };

  return { config, loading, unlockAtFor, directoryLockedFor, popupActiveFor, founderDiscount: founderDiscountNow(config) };
}

/** Bloqueo del directorio para el usuario actual (admin y asesor exentos). */
export function useDirectoryLock(): { locked: boolean; unlockAt: Date | null; loading: boolean } {
  const { isAdmin, isAdvisor } = useAuth();
  const profileCountry = useAuthStore((s) => s.profile?.country ?? null);
  const { country: selected } = useCountry();
  const { directoryLockedFor, loading } = useCampaign();

  if (isAdmin || isAdvisor) return { locked: false, unlockAt: null, loading };
  const country = profileCountry ?? selected ?? null;
  const { locked, unlockAt } = directoryLockedFor(country);
  return { locked, unlockAt, loading };
}
