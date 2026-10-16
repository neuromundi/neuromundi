/**
 * useAdminAccountActions — bitácora de bajas/suspensiones para el admin.
 * Solo lectura (RPC admin_account_actions, gated por is_admin). El admin NO
 * aprueba nada: únicamente ve la estadística y el ID/correo de quien cancela o
 * suspende. Las cancelaciones por 'costo' se resaltan para hacer una propuesta.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface AccountAction {
  id: string;
  user_id: string | null;
  email: string | null;
  member_no: number | null;
  role: string | null;
  action: 'cancel' | 'suspend' | 'reactivate' | 'winback_costo';
  reason: string | null;
  reason_detail: string | null;
  is_paid: boolean;
  created_at: string;
}

export function useAdminAccountActions() {
  const [items, setItems] = useState<AccountAction[]>([]);
  // TRES ESTADOS, NO DOS: cargando, vacio y FALLO. Antes el error se miraba y
  // se descartaba en la misma expresion, asi que un fallo de la consulta se
  // pintaba como «no hay nada». (Auditoria 15 oct 2026, hallazgo A-12.)
  const [fallo, setFallo] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_account_actions');
    setItems(error ? [] : ((data as AccountAction[] | null) ?? []));
        setFallo(!!error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, fallo, reload: load };
}
