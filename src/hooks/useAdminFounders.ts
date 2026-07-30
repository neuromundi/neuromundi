/**
 * useAdminFounders — curación del muro de fundadores para el admin.
 * Lista TODOS los fundadores autodetectados (publicados o no) con su nombre,
 * folio, tipo y país, y permite publicarlos/quitarlos, destacarlos y ordenarlos.
 * Todo pasa por RPC SECURITY DEFINER acotadas por is_admin().
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface AdminFounder {
  user_id: string;
  display_name: string;
  member_no: number | null;
  kind: 'families' | 'professionals' | 'providers';
  country: string | null;
  wall_published: boolean;
  wall_featured: boolean;
  wall_order: number;
}

export interface FounderWallPatch {
  published?: boolean;
  featured?: boolean;
  order?: number;
}

export function useAdminFounders() {
  const [rows, setRows] = useState<AdminFounder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_founders', { p_country: null });
    setRows(error ? [] : ((data as AdminFounder[] | null) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Actualiza a un fundador. Optimista, con reversión si la RPC falla. */
  const setWall = useCallback(async (userId: string, patch: FounderWallPatch): Promise<boolean> => {
    let prev: AdminFounder[] = [];
    setRows((r) => {
      prev = r;
      return r.map((x) =>
        x.user_id === userId
          ? {
              ...x,
              ...(patch.published !== undefined ? { wall_published: patch.published } : {}),
              ...(patch.featured !== undefined ? { wall_featured: patch.featured } : {}),
              ...(patch.order !== undefined ? { wall_order: patch.order } : {}),
            }
          : x,
      );
    });
    const { error } = await supabase.rpc('admin_set_founder_wall', {
      p_user: userId,
      p_published: patch.published ?? null,
      p_featured: patch.featured ?? null,
      p_order: patch.order ?? null,
    });
    if (error) { setRows(prev); return false; }
    return true;
  }, []);

  return { rows, loading, reload: load, setWall };
}
