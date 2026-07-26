/**
 * useAccountLifecycle — suspender, reactivar o cancelar la propia cuenta.
 *
 * Envuelve las RPC SECURITY DEFINER de la migración 0056. La ELIMINACIÓN dura
 * (borrado de auth.users) sigue viviendo en la Edge Function delete-account
 * (`useProfile().deleteAccount`); aquí solo se REGISTRA el motivo y se decide, en
 * el servidor, si procede borrar o retener (caso 'costo').
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface CancelOutcome {
  /** true → el cliente debe llamar a delete-account para el borrado duro. */
  deleted: boolean;
  /** true → motivo 'costo': la cuenta quedó en retención, NO se borra. */
  winback: boolean;
}

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

export function useAccountLifecycle() {
  const [busy, setBusy] = useState(false);

  const suspend = useCallback(async (): Promise<Ok<{ until: string | null }> | Err> => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('suspend_my_account');
      if (error) return { ok: false, error: error.message };
      return { ok: true, until: (data as string | null) ?? null };
    } finally {
      setBusy(false);
    }
  }, []);

  const reactivate = useCallback(async (): Promise<{ ok: true } | Err> => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('reactivate_my_account');
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } finally {
      setBusy(false);
    }
  }, []);

  const cancel = useCallback(
    async (reason: string, detail?: string | null): Promise<Ok<{ outcome: CancelOutcome }> | Err> => {
      setBusy(true);
      try {
        const { data, error } = await supabase.rpc('cancel_my_account', {
          p_reason: reason,
          p_detail: detail ?? null,
        });
        if (error) return { ok: false, error: error.message };
        const o = (data ?? {}) as { deleted?: boolean; winback?: boolean };
        return { ok: true, outcome: { deleted: !!o.deleted, winback: !!o.winback } };
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { busy, suspend, reactivate, cancel };
}

/** Motivos de cancelación (claves canónicas). 'costo' solo se ofrece a perfiles de pago. */
export interface CancelReason {
  value: string;
  labelKey: string;
  paidOnly?: boolean;
}

export const CANCEL_REASONS: CancelReason[] = [
  { value: 'costo', labelKey: 'account.reasons.costo', paidOnly: true },
  { value: 'dificultad', labelKey: 'account.reasons.dificultad' },
  { value: 'defectos', labelKey: 'account.reasons.defectos' },
  { value: 'no_util', labelKey: 'account.reasons.no_util' },
  { value: 'tiempo', labelKey: 'account.reasons.tiempo' },
  { value: 'privacidad', labelKey: 'account.reasons.privacidad' },
  { value: 'otro', labelKey: 'account.reasons.otro' },
];
