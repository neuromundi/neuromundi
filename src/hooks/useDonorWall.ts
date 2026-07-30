/**
 * useDonorWall — muro público de donantes (solo lo publicado y consentido).
 * useAllies — aliados activos para el carrusel del home.
 * Ambos son lectura pública: funcionan con o sin sesión.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface WallEntry {
  display_name: string;
  level: string;
  is_company: boolean;
  featured: boolean;
  note: string | null;
  logo_url: string | null;
  since: string | null;
}

export interface Ally {
  id: string;
  name: string;
  logo_url: string;
  website: string | null;
  sort_order: number;
  is_active: boolean;
  /** Países (nombre canónico ES) donde se muestra. NULL/vacío = todos. */
  countries: string[] | null;
}

export function useDonorWall() {
  const [entries, setEntries] = useState<WallEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc('donor_wall');
      if (alive) {
        setEntries(error ? [] : ((data as WallEntry[] | null) ?? []));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { entries, loading };
}

/**
 * Aliados activos del carrusel. Si se pasa `country` (nombre canónico ES), se
 * muestran solo los aliados globales (sin países fijados) y los que incluyan ese
 * país. Sin país (vista "todos los países") se muestran todos.
 */
export function useAllies(country?: string | null) {
  const [allies, setAllies] = useState<Ally[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('allies')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (alive) {
        setAllies(error ? [] : ((data as Ally[] | null) ?? []));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = country
    ? allies.filter((a) => !a.countries || a.countries.length === 0 || a.countries.includes(country))
    : allies;

  return { allies: filtered, loading };
}
