/**
 * useContenidoEnRevision — bandeja del administrador para los artículos que
 * proponen los miembros.
 *
 * Misma forma que useEventosEnRevision: la lista llega por RPC con el nombre de
 * quien la manda, que es lo primero que hace falta para decidir. Aprobar es
 * publicar; rechazar o devolver a pendiente lo saca del blog.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type RevisionContenido = 'pendiente' | 'aprobado' | 'rechazado';

export interface ContenidoEnRevision {
  id: string;
  title: string;
  type: string | null;
  excerpt: string | null;
  body: string | null;
  external_url: string | null;
  cover_url: string | null;
  topic: string | null;
  keywords: string[] | null;
  sections: string[];
  revision: RevisionContenido;
  nota_admin: string | null;
  is_published: boolean;
  created_at: string;
  revisada_en: string | null;
  autor: string | null;
  member_no: number | null;
  autor_id: string | null;
}

export function useContenidoEnRevision(estado: RevisionContenido | 'todas' = 'pendiente') {
  const [items, setItems] = useState<ContenidoEnRevision[]>([]);
  const [loading, setLoading] = useState(true);
  // Un fallo de la consulta NO es una bandeja vacía. (Hallazgo A-12.)
  const [fallo, setFallo] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_contenido_en_revision', { p_estado: estado });
    setFallo(!!error);
    setItems(error ? [] : ((data ?? []) as unknown as ContenidoEnRevision[]));
    setLoading(false);
  }, [estado]);

  useEffect(() => { void reload(); }, [reload]);

  const revisar = useCallback(
    async (id: string, decision: RevisionContenido, nota?: string): Promise<{ ok: boolean; error?: string }> => {
      const { data, error } = await supabase.rpc('admin_revisar_contenido', {
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
