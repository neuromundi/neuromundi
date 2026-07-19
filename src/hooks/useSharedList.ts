/**
 * useSharedList — vista pública de una lista compartida por token.
 *
 * Llama al RPC `get_shared_list` (SECURITY DEFINER), que solo devuelve la lista
 * si está marcada como pública. No requiere sesión.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type { SharedListView } from '@/types/app';

export interface UseSharedListValue {
  list: SharedListView | null;
  loading: boolean;
  error: string | null;
}

export function useSharedList(token: string | null): UseSharedListValue {
  const [list, setList] = useState<SharedListView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase.rpc('get_shared_list', { p_token: token });
        if (err) throw err;
        if (cancelled) return;
        // El RPC devuelve null si la lista no existe o no es pública.
        setList((data as unknown as SharedListView) ?? null);
      } catch (e) {
        if (!cancelled) setError(toMessage(e, 'No se pudo cargar la lista.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return { list, loading, error };
}
