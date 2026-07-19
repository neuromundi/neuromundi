/**
 * useMyBadge — distintivo del PROPIO proveedor (auth.uid()), con sus insumos,
 * para mostrar el desglose de puntaje y qué le falta para subir de nivel.
 * Funciona aunque el proveedor aún no esté publicado (RPC my_badge_inputs).
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { computeBadge, type BadgeResult, type BadgeInputs } from '@/lib/badge';
import { inputsFromRow } from '@/hooks/useProviderBadge';
import type { Views } from '@/types/database';

export function useMyBadge() {
  const [badge, setBadge] = useState<BadgeResult | null>(null);
  const [inputs, setInputs] = useState<BadgeInputs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.rpc('my_badge_inputs');
      if (!active) return;
      const row = (data as Views<'provider_badge_inputs'>[] | null)?.[0] ?? null;
      if (row) {
        const inp = inputsFromRow(row);
        setInputs(inp);
        setBadge(computeBadge(inp));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { badge, inputs, loading };
}
