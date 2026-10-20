/**
 * useMyReports — historial de denuncias del miembro con sesión.
 *
 * Lee SUS denuncias (RLS reports_select_own). Permite dar seguimiento al estado
 * (abierta / en revisión / resuelta / desestimada). No expone datos de terceros.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface MyReport {
  id: string;
  category: string;
  category_other: string | null;
  reported_member_no: number | null;
  description: string;
  status: string;
  created_at: string;
}

export function useMyReports() {
  const { userId } = useAuth();
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallo, setFallo] = useState(false);

  const load = useCallback(async () => {
    if (!userId) { setReports([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('id, category, category_other, reported_member_no, description, status, created_at')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false });
    // «No has reportado nada» cuando no se pudo leer, en la pantalla donde
    // alguien comprueba si su reporte sigue en pie. (Repaso adversario.)
    if (error) { setFallo(true); setLoading(false); return; }
    setFallo(false);
    setReports((data ?? []) as unknown as MyReport[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  return { fallo, reports, loading, reload: load };
}
