/**
 * useProviderMetrics — resumen de vistas de perfil y clics a contacto del
 * prestador que lo consulta. Solo devuelve datos del propio usuario (la RPC
 * filtra por auth.uid()).
 *
 * trackProfileEvent — registra un evento de perfil (vista o contacto). Se puede
 * llamar sin sesión; la base ignora la autovisita del propio prestador.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ProviderMetrics {
  views_total: number;
  views_30d: number;
  contacts_total: number;
  contacts_30d: number;
}

const ZERO: ProviderMetrics = { views_total: 0, views_30d: 0, contacts_total: 0, contacts_30d: 0 };

/** Registro best-effort: nunca lanza ni bloquea la vista del perfil. */
export async function trackProfileEvent(providerId: string, kind: 'view' | 'contact'): Promise<void> {
  try {
    await supabase.rpc('track_profile_event', { p_provider_id: providerId, p_kind: kind });
  } catch {
    /* no pasa nada si el registro falla */
  }
}

export function useProviderMetrics() {
  const [metrics, setMetrics] = useState<ProviderMetrics>(ZERO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.rpc('provider_metrics');
      if (alive) {
        const row = (data as ProviderMetrics[] | null)?.[0];
        setMetrics(row ?? ZERO);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { metrics, loading };
}
