/**
 * useEventosEnRevision — bandeja del administrador para los eventos que
 * proponen los prestadores (migración 0249).
 *
 * Misma forma que usePreguntasExperto: la lista llega por RPC con el nombre de
 * quien propone, que es lo primero que hace falta para decidir. Aprobar es
 * publicar; rechazar o devolver a pendiente lo saca de la página.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RevisionEvento } from '@/hooks/useEventosPropios';

export interface EventoEnRevision {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_online: boolean;
  online_url: string | null;
  country: string | null;
  city: string | null;
  venue: string | null;
  starts_at: string;
  ends_at: string | null;
  cover_url: string | null;
  revision: RevisionEvento;
  nota_admin: string | null;
  is_published: boolean;
  created_at: string;
  revisada_en: string | null;
  prestador: string | null;
  member_no: number | null;
  prestador_id: string | null;
  info_url: string | null;
  timezone: string | null;
  hora_confirmada: boolean;
  // Cómo clasificó el prestador su evento. El administrador lo ve antes de
  // aprobar: si está mal, el evento saldría en el filtro que no le toca.
  sections: string[];
}

export function useEventosEnRevision(estado: RevisionEvento | 'todas' = 'pendiente') {
  const [items, setItems] = useState<EventoEnRevision[]>([]);
  const [loading, setLoading] = useState(true);
  // Un fallo de la consulta NO es una bandeja vacía. (Hallazgo A-12.)
  const [fallo, setFallo] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_eventos_en_revision_con_areas', { p_estado: estado });
    setFallo(!!error);
    setItems(error ? [] : ((data ?? []) as EventoEnRevision[]));
    setLoading(false);
  }, [estado]);

  useEffect(() => { void reload(); }, [reload]);

  const revisar = useCallback(
    async (id: string, decision: RevisionEvento, nota?: string): Promise<{ ok: boolean; error?: string }> => {
      const { data, error } = await supabase.rpc('admin_revisar_evento', {
        p_id: id, p_decision: decision, p_nota: nota ?? null,
      });
      if (error) return { ok: false, error: error.message };
      const ok = (data as { ok?: boolean } | null)?.ok === true;
      if (ok) await reload();
      return ok ? { ok: true } : { ok: false };
    },
    [reload],
  );

  return { items, loading, fallo, reload, revisar };
}
