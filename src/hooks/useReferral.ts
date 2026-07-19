/**
 * useReferral — programa "Recomienda Neuromundi".
 *  - useReferralCapture(): captura ?ref= de la URL y, para el usuario autenticado
 *    que aún no tiene referente, lo atribuye una sola vez con el RPC set_referrer.
 *  - useReferralStats(): cuántas personas ha recomendado el usuario actual.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { captureRefFromUrl, getStoredReferrer, clearStoredReferrer } from '@/lib/referral';

/** Global: captura el ?ref= y atribuye el referido una vez con sesión. */
export function useReferralCapture() {
  const { userId } = useAuth();

  // Captura el parámetro ?ref= al cargar (aunque el usuario aún no tenga sesión).
  useEffect(() => {
    captureRefFromUrl();
  }, []);

  // Con sesión: intenta atribuir el referente una sola vez por dispositivo.
  useEffect(() => {
    if (!userId) return;
    const ref = getStoredReferrer();
    if (ref == null) return;
    let cancelled = false;
    (async () => {
      await supabase.rpc('set_referrer', { p_member_no: ref });
      if (cancelled) return;
      // Sea cual sea el resultado (atribuido, ya tenía, auto-referido), no reintentar.
      clearStoredReferrer();
    })();
    return () => { cancelled = true; };
  }, [userId]);
}

/** Cuántas personas ha recomendado el usuario actual. */
export function useReferralStats() {
  const { userId } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.rpc('my_referral_count');
    setCount(typeof data === 'number' ? data : 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  return { count, loading, reload: load };
}
