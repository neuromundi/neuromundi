/**
 * useFoundersWall — muro público de Miembros Fundadores CURADO por el admin.
 * useFoundersWallCountries — países que ya tienen fundadores publicados (selector).
 *
 * Ambos son lectura pública (funcionan con o sin sesión): la RPC founders_wall
 * es SECURITY DEFINER y solo devuelve a quien el admin publicó, uniendo a
 * profiles para el nombre visible y el folio.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type FounderKindWall = 'families' | 'professionals' | 'providers';

export interface FounderEntry {
  display_name: string;
  member_no: number | null;
  kind: FounderKindWall;
  country: string | null;
  featured: boolean;
  is_company: boolean;
}

export interface FounderCountry {
  country: string;
  n: number;
}

/** Fundadores publicados. `country` (nombre canónico ES) filtra por país; null = todos. */
export function useFoundersWall(country?: string | null) {
  const [entries, setEntries] = useState<FounderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc('founders_wall', { p_country: country ?? null });
      if (alive) {
        setEntries(error ? [] : ((data as FounderEntry[] | null) ?? []));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [country]);

  return { entries, loading };
}

/** Países con al menos un fundador publicado, para alimentar el selector. */
export function useFoundersWallCountries() {
  const [countries, setCountries] = useState<FounderCountry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc('founders_wall_countries');
      if (alive) {
        setCountries(error ? [] : ((data as FounderCountry[] | null) ?? []));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { countries, loading };
}
