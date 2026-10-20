/**
 * useAdminBadges — mapa providerId → distintivo calculado, para la moderación.
 * Usa el RPC admin_badge_inputs (todos los proveedores, incl. no publicados).
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils';

import { computeBadge, type BadgeResult } from '@/lib/badge';
import { inputsFromRow } from '@/hooks/useProviderBadge';
import type { Views } from '@/types/database';

export function useAdminBadges(): Map<string, BadgeResult> {
  const [map, setMap] = useState<Map<string, BadgeResult>>(new Map());

  useEffect(() => {
    let active = true;
    (async () => {
      // Si esta lectura falla, el mapa queda vacio y las fichas se pintan sin
      // distintivo. No se escribe en ninguna parte «este perfil no tiene
      // distintivo», asi que no hay texto que mienta; lo que si habia era un
      // error que nadie veia. Queda registrado. (Repaso adversario, 20 oct.)
      const { data, error } = await supabase.rpc('admin_badge_inputs');
      if (error) { logger.error('No se pudieron leer los distintivos:', error.message); return; }
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
