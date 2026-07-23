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

export function useAllies() {
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

  return { allies, loading };
}
