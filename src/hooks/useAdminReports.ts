/**
 * useAdminReports — lista y gestión de denuncias para el admin.
 * Usa admin_reports (protegido por is_admin) y genera URLs firmadas para ver
 * los adjuntos del bucket privado.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase, REPORTS_BUCKET } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type { Tables } from '@/types/database';
import type { Result } from '@/types/app';

export type Report = Tables<'reports'>;

export function useAdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_reports');
    setReports((data as Report[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setStatus = useCallback(async (id: string, status: string): Promise<Result<true>> => {
    const { error } = await supabase.from('reports').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    return { ok: true, data: true };
  }, []);

  const signedUrl = useCallback(async (path: string): Promise<string | null> => {
    const { data } = await supabase.storage.from(REPORTS_BUCKET).createSignedUrl(path, 300);
    return data?.signedUrl ?? null;
  }, []);

  return { reports, loading, reload: load, setStatus, signedUrl };
}
