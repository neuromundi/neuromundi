/**
 * useCommissions — libro de comisiones de afiliados.
 *
 * Dos caras del mismo registro, según desde dónde se mire:
 *  · 'earned' → lo que a MÍ me deben por promover productos ajenos.
 *  · 'owed'   → lo que YO debo a quienes promueven los míos.
 *
 * La plataforma no mueve el dinero: el vendedor le paga al promotor por fuera y
 * después lo marca aquí. Marcar como pagado avisa al promotor por la campana.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CommissionRow } from '@/lib/commissions';

export type CommissionSide = 'earned' | 'owed';

const RPC: Record<CommissionSide, 'my_commissions_earned' | 'my_commissions_owed'> = {
  earned: 'my_commissions_earned',
  owed: 'my_commissions_owed',
};

export function useCommissions(side: CommissionSide) {
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc(RPC[side]);
    setRows(error ? [] : ((data as CommissionRow[] | null) ?? []));
    setLoading(false);
  }, [side]);

  useEffect(() => { void load(); }, [load]);

  /**
   * Marca como pagadas las comisiones indicadas. La autorización la hace la
   * base: `mark_commissions_paid` solo toca las filas cuyo vendedor eres tú, así
   * que nadie puede dar por saldada una deuda ajena aunque adivine los ids.
   */
  const markPaid = useCallback(
    async (ids: string[], note?: string): Promise<{ ok: boolean; updated: number }> => {
      if (ids.length === 0) return { ok: false, updated: 0 };
      const { data, error } = await supabase.rpc('mark_commissions_paid', {
        p_ids: ids,
        p_note: note ?? null,
      });
      if (error) return { ok: false, updated: 0 };
      const r = data as { ok?: boolean; updated?: number } | null;
      if (r?.ok) await load();
      return { ok: r?.ok === true, updated: r?.updated ?? 0 };
    },
    [load],
  );

  return { rows, loading, reload: load, markPaid };
}
