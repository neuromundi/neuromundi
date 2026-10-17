/**
 * useAliadosPropuestos — bandeja del administrador para las organizaciones que
 * piden aparecer en el muro de Aliados (migración 0255).
 *
 * Aprobar es publicar. La base se niega a aprobar sin logotipo, así que el
 * motivo 'falta_logotipo' se traduce aquí para que la pantalla lo diga.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { EstadoAliado } from '@/hooks/useAliado';

export interface AliadoPropuesto {
  id: string;
  name: string;
  website: string | null;
  logo_url: string | null;
  countries: string[] | null;
  estado: EstadoAliado;
  nota_admin: string | null;
  propuesta_en: string | null;
  is_active: boolean;
  ficha: string | null;
  proponente: string | null;
  proponente_id: string | null;
}

export function useAliadosPropuestos(estado: EstadoAliado | 'todas' = 'propuesto') {
  const [items, setItems] = useState<AliadoPropuesto[]>([]);
  const [loading, setLoading] = useState(true);
  // Un fallo de la consulta NO es una bandeja vacía. (Hallazgo A-12.)
  const [fallo, setFallo] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_aliados_propuestos', { p_estado: estado });
    setFallo(!!error);
    setItems(error ? [] : ((data ?? []) as AliadoPropuesto[]));
    setLoading(false);
  }, [estado]);

  useEffect(() => { void reload(); }, [reload]);

  /** Cambia el logotipo antes de aprobar; la base exige uno para publicar. */
  const ponerLogo = useCallback(async (id: string, url: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.from('allies').update({ logo_url: url }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    await reload();
    return { ok: true };
  }, [reload]);

  const resolver = useCallback(
    async (id: string, decision: EstadoAliado, nota: string | undefined, traducir: (c: string) => string) => {
      const { data, error } = await supabase.rpc('admin_resolver_aliado', {
        p_id: id, p_decision: decision, p_nota: nota ?? null,
      });
      if (error) return { ok: false, error: error.message };
      const r = (data ?? null) as { ok?: boolean; motivo?: string } | null;
      if (r?.ok !== true) {
        return { ok: false, error: traducir(r?.motivo === 'falta_logotipo' ? 'aliados.admin.faltaLogo' : 'common.errorGeneric') };
      }
      await reload();
      return { ok: true };
    },
    [reload],
  );

  return { items, loading, fallo, reload, resolver, ponerLogo };
}
