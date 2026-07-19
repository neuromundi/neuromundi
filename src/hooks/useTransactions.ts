/**
 * useTransactions — ciclo de vida del canje de descuentos.
 *
 * Cubre los dos lados: el proveedor valida el QR del padre y crea la transacción
 * al escanear; ambos roles listan su historial con filtros. La creación bloquea
 * el auto-escaneo (provider_id === parent_id), reforzando la restricción crítica
 * que también vive en RLS y en el CHECK de la tabla.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type {
  ParentQrPayload,
  Result,
  Transaction,
  TransactionStatus,
} from '@/types/app';

export interface TransactionFilters {
  status?: TransactionStatus;
  offerId?: string;
  from?: string; // ISO
  to?: string; // ISO
}

export interface CreateTransactionInput {
  qr: ParentQrPayload;
  offerId: string;
  providerId: string;
}

export interface UseTransactionsValue {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Confirma que el qr_token corresponde al parentId (vía RPC segura). */
  validateQr: (qr: ParentQrPayload) => Promise<Result<{ id: string; full_name: string }>>;
  /** Inserta la transacción en estado 'pending' tras un escaneo válido. */
  createFromScan: (input: CreateTransactionInput) => Promise<Result<Transaction>>;
}

/**
 * @param ownerId  id del usuario cuyo historial se lista.
 * @param as       perspectiva: 'parent' filtra por parent_id, 'provider' por provider_id.
 * @param filters  filtros opcionales de historial.
 */
export function useTransactions(
  ownerId: string | null,
  as: 'parent' | 'provider',
  filters: TransactionFilters = {},
): UseTransactionsValue {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { status, offerId, from, to } = filters;

  const refetch = useCallback(async () => {
    if (!ownerId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('discount_transactions')
        .select('*')
        .eq(as === 'parent' ? 'parent_id' : 'provider_id', ownerId)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (offerId) query = query.eq('offer_id', offerId);
      if (from) query = query.gte('created_at', from);
      if (to) query = query.lte('created_at', to);

      const { data, error: err } = await query;
      if (err) throw err;
      setTransactions(data ?? []);
    } catch (e) {
      setError(toMessage(e, 'No se pudo cargar el historial.'));
    } finally {
      setLoading(false);
    }
  }, [ownerId, as, status, offerId, from, to]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const validateQr = useCallback<UseTransactionsValue['validateQr']>(async (qr) => {
    if (!qr?.parentId || !qr?.qrToken) {
      return { ok: false, error: 'El código no tiene un formato válido.' };
    }
    try {
      // RPC SECURITY DEFINER: valida el token sin exponer el perfil del padre.
      const { data, error: err } = await supabase.rpc('resolve_parent_by_qr', {
        p_id: qr.parentId,
        p_token: qr.qrToken,
      });
      if (err) throw err;
      const row = data?.[0];
      if (!row) {
        return { ok: false, error: 'Este código no es válido o ya fue actualizado.' };
      }
      return { ok: true, data: { id: row.id, full_name: row.full_name } };
    } catch (e) {
      return { ok: false, error: toMessage(e, 'No se pudo validar el código.') };
    }
  }, []);

  const createFromScan = useCallback<UseTransactionsValue['createFromScan']>(
    async ({ qr, offerId: oid, providerId }) => {
      // Bloqueo de auto-escaneo en cliente (defensa en profundidad).
      if (qr.parentId === providerId) {
        return { ok: false, error: 'No puedes escanear tu propio código.' };
      }

      const valid = await validateQr(qr);
      if (!valid.ok) return valid;

      try {
        const { data, error: err } = await supabase
          .from('discount_transactions')
          .insert({
            offer_id: oid,
            provider_id: providerId,
            parent_id: qr.parentId,
            scanned_by: providerId,
            scanned_at: new Date().toISOString(),
            status: 'pending',
          })
          .select('*')
          .single();
        if (err) throw err;
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: toMessage(e, 'No se pudo aplicar el descuento.') };
      }
    },
    [validateQr],
  );

  return { transactions, loading, error, refetch, validateQr, createFromScan };
}
