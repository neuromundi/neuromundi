/**
 * useAdmin — moderación de proveedores.
 *
 * Lista proveedores (el admin los ve todos por RLS) y cambia `is_verified` e
 * `is_published` mediante RPCs acotadas (`admin_set_*`), con updates optimistas.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type { Profile, Result } from '@/types/app';

export type AdminFilter = 'pending' | 'verified' | 'all';

export interface UseAdminValue {
  providers: Profile[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setVerified: (id: string, value: boolean) => Promise<Result<true>>;
  setPublished: (id: string, value: boolean) => Promise<Result<true>>;
}

export function useAdmin(filter: AdminFilter): UseAdminValue {
  const [all, setAll] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'provider')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setAll(data ?? []);
    } catch (e) {
      setError(toMessage(e, 'No se pudieron cargar los proveedores.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const patchLocal = (id: string, patch: Partial<Profile>) =>
    setAll((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const setVerified = useCallback<UseAdminValue['setVerified']>(async (id, value) => {
    const previous = all;
    patchLocal(id, { is_verified: value });
    const { error: err } = await supabase.rpc('admin_set_verified', { p_id: id, p_value: value });
    if (err) {
      setAll(previous);
      return { ok: false, error: toMessage(err, 'No se pudo actualizar.') };
    }
    return { ok: true, data: true };
  }, [all]);

  const setPublished = useCallback<UseAdminValue['setPublished']>(async (id, value) => {
    const previous = all;
    patchLocal(id, { is_published: value });
    const { error: err } = await supabase.rpc('admin_set_published', { p_id: id, p_value: value });
    if (err) {
      setAll(previous);
      return { ok: false, error: toMessage(err, 'No se pudo actualizar.') };
    }
    return { ok: true, data: true };
  }, [all]);

  const providers = useMemo(() => {
    switch (filter) {
      case 'pending':
        return all.filter((p) => !p.is_verified || !p.is_published);
      case 'verified':
        return all.filter((p) => p.is_verified);
      default:
        return all;
    }
  }, [all, filter]);

  return { providers, loading, error, refetch, setVerified, setPublished };
}
