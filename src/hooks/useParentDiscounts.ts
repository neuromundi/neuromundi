/**
 * useParentDiscounts — historial enriquecido del padre.
 *
 * Trae las transacciones del padre y las completa con el título de la oferta y el
 * nombre/avatar del proveedor mediante consultas por lote (sin embeds), para un
 * tipado predecible y un manejo claro de RLS.
 *
 * Nota RLS: para que el título de ofertas pausadas/expiradas sea visible aquí,
 * la base necesita una política que permita al padre leer las ofertas de sus
 * propias transacciones (ver README de esta fase). Si falta, el título cae a null.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDiscount, toMessage } from '@/lib/utils';
import type { Transaction } from '@/types/app';

export interface ParentDiscount {
  transaction: Transaction;
  offerTitle: string | null;
  discountText: string | null;
  providerName: string | null;
  providerAvatar: string | null;
}

export interface UseParentDiscountsValue {
  discounts: ParentDiscount[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useParentDiscounts(parentId: string | null): UseParentDiscountsValue {
  const [discounts, setDiscounts] = useState<ParentDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!parentId) {
      setDiscounts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: txs, error: txErr } = await supabase
        .from('discount_transactions')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: false });
      if (txErr) throw txErr;

      const transactions = txs ?? [];
      const offerIds = [...new Set(transactions.map((t) => t.offer_id))];
      const providerIds = [...new Set(transactions.map((t) => t.provider_id))];

      const [offersRes, providersRes] = await Promise.all([
        offerIds.length
          ? supabase
              .from('offers')
              .select('id, title, discount_type, discount_value')
              .in('id', offerIds)
          : Promise.resolve({ data: [], error: null }),
        providerIds.length
          ? supabase
              .from('profiles')
              .select('id, business_name, full_name, avatar_url')
              .in('id', providerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const offerMap = new Map((offersRes.data ?? []).map((o) => [o.id, o]));
      const providerMap = new Map((providersRes.data ?? []).map((p) => [p.id, p]));

      setDiscounts(
        transactions.map((transaction) => {
          const offer = offerMap.get(transaction.offer_id);
          const provider = providerMap.get(transaction.provider_id);
          return {
            transaction,
            offerTitle: offer?.title ?? null,
            discountText: offer
              ? formatDiscount(offer.discount_type, offer.discount_value)
              : null,
            providerName: provider?.business_name ?? provider?.full_name ?? null,
            providerAvatar: provider?.avatar_url ?? null,
          };
        }),
      );
    } catch (e) {
      setError(toMessage(e, 'No se pudo cargar tu historial.'));
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { discounts, loading, error, refetch };
}
