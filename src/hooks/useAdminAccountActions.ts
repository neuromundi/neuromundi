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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_account_actions');
    setItems(error ? [] : ((data as AccountAction[] | null) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, reload: load };
}
