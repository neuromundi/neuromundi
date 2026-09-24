/**
 * useAdminInvitations — listado de invitaciones del directorio para el admin.
 *
 * Usa la RPC SECURITY DEFINER admin_directorio_invitaciones() (exige is_admin()).
 * Incluye el rastreo de apertura del enlace: abierta_en (1ª), abierta_ultima_en
 * y aperturas (contador), además del estado del ciclo (enviada/reclamada/baja/
 * cancelada/rebotada).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';

export interface InvitationRow {
  id: string;
  nombre: string | null;
  correo: string | null;
  provider_type: string | null;
  estado_geo: string | null;
  ciudad: string | null;
  creada_en: string | null;
  enviada_en: string | null;
  abierta_en: string | null;
  abierta_ultima_en: string | null;
  aperturas: number;
  usada_en: string | null;
  baja_en: string | null;
  cancelada_en: string | null;
  rebotado: boolean;
  expira_en: string | null;
}

export function useAdminInvitations() {
  const [rows, setRows] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('admin_directorio_invitaciones');
    if (err) setError(toMessage(err));
    setRows((data as InvitationRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, error, reload: load };
}
