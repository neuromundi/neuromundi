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

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_membership_renewals');
    setRows((data as RenewalRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { rows, loading, reload: load };
}
