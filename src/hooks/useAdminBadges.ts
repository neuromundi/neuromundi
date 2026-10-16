/**
 * useAdminBadges — mapa providerId → distintivo calculado, para la moderación.
 * Usa el RPC admin_badge_inputs (todos los proveedores, incl. no publicados).
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { computeBadge, type BadgeResult } from '@/lib/badge';
import { inputsFromRow } from '@/hooks/useProviderBadge';
import type { Views } from '@/types/database';

export function useAdminBadges(): Map<string, BadgeResult> {
  const [map, setMap] = useState<Map<string, BadgeResult>>(new Map());

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.rpc('admin_badge_inputs');
      if (!active || !data) return;
      const rows = data as Views<'provider_badge_inputs'>[];
      // provider_id puede venir nulo en la vista: esas filas no son de nadie.
      setMap(new Map(rows.filter((r) => r.provider_id).map((r) => [r.provider_id as string, computeBadge(inputsFromRow(r))])));
    })();
    return () => {
      active = false;
    };
  }, []);

  return map;
}
