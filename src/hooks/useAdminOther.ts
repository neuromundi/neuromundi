/**
 * useAdminOther — para el panel de administración: lista los valores
 * "Otro (especifica)" (guardados en provider_details) más usados, opcionalmente
 * por país, y permite promover uno a categoría real con un clic.
 *
 * Usa los RPC SECURITY DEFINER admin_other_values / admin_promote_other_to_category
 * (exigen is_admin() en la base de datos).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type { Result } from '@/types/app';

export interface OtherValueRow {
  country: string | null;
  kind: string;
  label: string;
  uses: number;
  provider_ids: string[];
  category_id: number | null;
}

export function useAdminOther(country: string | null) {
  const [rows, setRows] = useState<OtherValueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('admin_other_values', { p_country: country });
    if (err) setError(toMessage(err));
    setRows((data as OtherValueRow[] | null) ?? []);
    setLoading(false);
  }, [country]);

  useEffect(() => {
    void load();
  }, [load]);

  const promote = useCallback(
    async (label: string, kind: string): Promise<Result<number>> => {
      const { data, error: err } = await supabase.rpc('admin_promote_other_to_category', {
        p_label: label,
        p_country: country,
        p_kind: kind,
        p_link: true,
      });
      if (err) return { ok: false, error: toMessage(err) };
      await load();
      return { ok: true, data: data as number };
    },
    [country, load],
  );

  return { rows, loading, error, reload: load, promote };
}
