/**
 * useImprovements — "Ayúdanos a mejorar".
 *  · submit(): envía una sugerencia (funciona con o sin sesión) vía RPC.
 *  · useAdminImprovements(): lista para el admin (solo lectura, is_admin).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Suggestion {
  id: string;
  user_id: string | null;
  email: string | null;
  message: string;
  page: string | null;
  created_at: string;
}

export function useSubmitImprovement() {
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (message: string, email?: string | null, page?: string | null): Promise<{ ok: boolean; error?: string }> => {
      setBusy(true);
      try {
        const { error } = await supabase.rpc('submit_improvement', {
          p_message: message,
          p_email: email ?? null,
          p_page: page ?? null,
        });
        return error ? { ok: false, error: error.message } : { ok: true };
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { busy, submit };
}

export function useAdminImprovements() {
  const [items, setItems] = useState<Suggestion[]>([]);
  // TRES ESTADOS, NO DOS: cargando, vacio y FALLO. Antes el error se miraba y
  // se descartaba en la misma expresion, asi que un fallo de la consulta se
  // pintaba como «no hay nada». (Auditoria 15 oct 2026, hallazgo A-12.)
  const [fallo, setFallo] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_improvement_suggestions');
    setItems(error ? [] : ((data as Suggestion[] | null) ?? []));
        setFallo(!!error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, fallo, reload: load };
}
