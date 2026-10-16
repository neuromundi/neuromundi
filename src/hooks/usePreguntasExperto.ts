/**
 * usePreguntasExperto — bandeja de "Pregunta al experto" para el administrador.
 *
 * Por qué existe (auditoría 15 oct 2026, hallazgo M-15): el formulario ocupaba
 * uno de los tres botones fijos de la navegación móvil y sólo mandaba un
 * correo. No había tabla, ni bandeja, ni seguimiento, ni nadie asignado como
 * "el experto". Sugerencias y denuncias sí tenían libro y bandeja.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type EstadoPregunta = 'pendiente' | 'respondida' | 'descartada';

export interface PreguntaExperto {
  id: string;
  nombre: string | null;
  correo: string | null;
  pais: string | null;
  categoria: string | null;
  pregunta: string;
  estado: EstadoPregunta;
  nota_admin: string | null;
  created_at: string;
  resuelta_en: string | null;
  es_miembro: boolean;
}

export function usePreguntasExperto(estado: EstadoPregunta | 'todas' = 'pendiente') {
  const [items, setItems] = useState<PreguntaExperto[]>([]);
  const [loading, setLoading] = useState(true);
  // Un fallo de la consulta NO es una bandeja vacía: sobre una bandeja vacía
  // se decide no hacer nada. (Hallazgo A-12.)
  const [fallo, setFallo] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_preguntas_experto', { p_estado: estado });
    setFallo(!!error);
    setItems(error ? [] : ((data ?? []) as PreguntaExperto[]));
    setLoading(false);
  }, [estado]);

  useEffect(() => { void reload(); }, [reload]);

  const resolver = useCallback(
    async (id: string, nuevo: EstadoPregunta, nota?: string): Promise<{ ok: boolean; error?: string }> => {
      const { data, error } = await supabase.rpc('admin_resolver_pregunta_experto', {
        p_id: id, p_estado: nuevo, p_nota: nota ?? null,
      });
      if (error) return { ok: false, error: error.message };
      const ok = (data as { ok?: boolean } | null)?.ok === true;
      if (ok) await reload();
      return ok ? { ok: true } : { ok: false };
    },
    [reload],
  );

  return { items, loading, fallo, reload, resolver };
}
