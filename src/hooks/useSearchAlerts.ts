/**
 * useSearchAlerts — búsquedas guardadas del usuario para avisos del directorio.
 * Cuando se publica un especialista que coincide, la base notifica (trigger de
 * la migración 0054). Aquí solo se crean, listan y borran.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface SearchAlert {
  id: string;
  country: string | null;
  category_id: number | null;
  city: string | null;
}

export function useSearchAlerts() {
  const { userId } = useAuth();
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setAlerts([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('search_alerts')
      .select('id, country, category_id, city')
      .order('created_at', { ascending: false });
    setAlerts((data as SearchAlert[] | null) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  /** Crea una alerta; evita duplicar una idéntica. */
  const create = useCallback(
    async (a: { country?: string | null; categoryId?: number | null; city?: string | null }): Promise<'ok' | 'dup' | 'err'> => {
      if (!userId) return 'err';
      const country = a.country || null;
      const category_id = a.categoryId ?? null;
      const city = a.city || null;
      // Sin ningún criterio, avisaría de TODO: no tiene sentido.
      if (!country && !category_id && !city) return 'err';
      const exists = alerts.some(
        (x) => (x.country ?? null) === country && (x.category_id ?? null) === category_id && (x.city ?? null) === city,
      );
      if (exists) return 'dup';
      const { error } = await supabase.from('search_alerts').insert({ user_id: userId, country, category_id, city });
      if (error) return 'err';
      await load();
      return 'ok';
    },
    [userId, alerts, load],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from('search_alerts').delete().eq('id', id);
      if (!error) await load();
      return !error;
    },
    [load],
  );

  return { alerts, loading, reload: load, create, remove };
}
