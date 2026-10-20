/**
 * useAdminRenewals — lista de renovaciones de membresía para el admin.
 * Llama al RPC admin_membership_renewals (protegido por is_admin).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type RenewalRow = {
  id: string;
  member_no: number | null;
  name: string;
  provider_type: string | null;
  country: string | null;
  membership_status: string;
  paid_until: string | null;
  due_at: string | null;
  is_founder: boolean;
  days_until: number | null;
};

export function useAdminRenewals() {
  const [rows, setRows] = useState<RenewalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallo, setFallo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // El error se tiraba: un fallo quedaba igual que "no hay" y la pantalla
    // lo decia. (Repaso adversario, 19 oct 2026.)
    const { data, error } = await supabase.rpc('admin_membership_renewals');
    if (error) { setFallo(true); setRows([]); setLoading(false); return; }
    setRows((data as RenewalRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { rows, loading, fallo, reload: load };
}
