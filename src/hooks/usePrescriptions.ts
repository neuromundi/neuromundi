/**
 * usePrescriptions — ciclo de vida del carrito recetado.
 *
 * Terapeuta: resuelve al padre por su QR (RPC segura), y envía la receta
 * (crea borrador → inserta ítems → marca 'sent'). Padre: lista las recibidas,
 * abre el detalle y marca 'viewed' / 'ordered' mediante RPC (no puede editar el
 * contenido). Ambos roles listan; el filtro de columna decide la perspectiva.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type {
  CartDraftItem,
  ParentQrPayload,
  Prescription,
  PrescriptionDetail,
  PrescriptionLineItem,
  Product,
  Result,
} from '@/types/app';

export interface ResolvedParent {
  id: string;
  fullName: string;
}

export interface SendCartInput {
  parentId: string;
  title: string;
  note: string;
  items: CartDraftItem[];
}

export interface UsePrescriptionsValue {
  prescriptions: Prescription[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  resolveParentByQr: (qr: ParentQrPayload) => Promise<Result<ResolvedParent>>;
  sendCart: (input: SendCartInput) => Promise<Result<Prescription>>;
  getDetail: (id: string) => Promise<Result<PrescriptionDetail>>;
  markViewed: (id: string) => Promise<void>;
  markOrdered: (id: string) => Promise<Result<true>>;
}

export function usePrescriptions(
  ownerId: string | null,
  as: 'therapist' | 'parent',
): UsePrescriptionsValue {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const column = as === 'therapist' ? 'therapist_id' : 'parent_id';

  const refetch = useCallback(async () => {
    if (!ownerId) {
      setPrescriptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('prescriptions')
        .select('*')
        .eq(column, ownerId)
        .neq('status', as === 'parent' ? 'draft' : 'archived')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setPrescriptions(data ?? []);
    } catch (e) {
      setError(toMessage(e, 'No se pudieron cargar las recetas.'));
    } finally {
      setLoading(false);
    }
  }, [ownerId, column, as]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const resolveParentByQr = useCallback<UsePrescriptionsValue['resolveParentByQr']>(
    async (qr) => {
      if (!qr?.parentId || !qr?.qrToken) {
        return { ok: false, error: 'El código no tiene un formato válido.' };
      }
      try {
        const { data, error: err } = await supabase.rpc('resolve_parent_by_qr', {
          p_id: qr.parentId,
          p_token: qr.qrToken,
        });
        if (err) throw err;
        const row = data?.[0];
        if (!row) return { ok: false, error: 'Este código no es válido o cambió.' };
        return { ok: true, data: { id: row.id, fullName: row.full_name } };
      } catch (e) {
        return { ok: false, error: toMessage(e, 'No se pudo validar el código.') };
      }
    },
    [],
  );

  const sendCart = useCallback<UsePrescriptionsValue['sendCart']>(
    async ({ parentId, title, note, items }) => {
      if (!ownerId) return { ok: false, error: 'Sesión no disponible.' };
      if (items.length === 0) return { ok: false, error: 'Agrega al menos un producto.' };
      try {
        // 1) Crear el borrador.
        const { data: presc, error: pErr } = await supabase
          .from('prescriptions')
          .insert({
            therapist_id: ownerId,
            parent_id: parentId,
            title: title.trim() || 'Recomendación',
            note: note.trim() || null,
            status: 'draft',
          })
          .select('*')
          .single();
        if (pErr) throw pErr;

        // 2) Insertar los ítems (el trigger congela el precio).
        const rows = items.map((it) => ({
          prescription_id: presc.id,
          product_id: it.product.id,
          quantity: it.quantity,
          note: it.note.trim() || null,
        }));
        const { error: iErr } = await supabase.from('prescription_items').insert(rows);
        if (iErr) throw iErr;

        // 3) Enviar.
        const { data: sent, error: sErr } = await supabase
          .from('prescriptions')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', presc.id)
          .select('*')
          .single();
        if (sErr) throw sErr;

        setPrescriptions((prev) => [sent, ...prev]);
        return { ok: true, data: sent };
      } catch (e) {
        return { ok: false, error: toMessage(e, 'No se pudo enviar la receta.') };
      }
    },
    [ownerId],
  );

  const getDetail = useCallback<UsePrescriptionsValue['getDetail']>(async (id) => {
    try {
      const [{ data: presc, error: pErr }, { data: items, error: iErr }] = await Promise.all([
        supabase.from('prescriptions').select('*').eq('id', id).single(),
        supabase.from('prescription_items').select('*').eq('prescription_id', id),
      ]);
      if (pErr) throw pErr;
      if (iErr) throw iErr;

      const productIds = [...new Set((items ?? []).map((it) => it.product_id))];
      const { data: products } = productIds.length
        ? await supabase.from('products').select('*').in('id', productIds)
        : { data: [] as Product[] };
      const prodMap = new Map((products ?? []).map((p) => [p.id, p]));

      const { data: therapist } = await supabase
        .from('profiles')
        .select('business_name, full_name')
        .eq('id', presc.therapist_id)
        .maybeSingle();

      const lineItems: PrescriptionLineItem[] = (items ?? []).map((it) => ({
        ...it,
        product: prodMap.get(it.product_id) ?? null,
      }));

      return {
        ok: true,
        data: {
          ...presc,
          items: lineItems,
          therapistName: therapist?.business_name ?? therapist?.full_name ?? null,
        },
      };
    } catch (e) {
      return { ok: false, error: toMessage(e, 'No se pudo abrir la receta.') };
    }
  }, []);

  const markViewed = useCallback<UsePrescriptionsValue['markViewed']>(async (id) => {
    await supabase.rpc('prescription_mark_viewed', { p_id: id });
    setPrescriptions((prev) =>
      prev.map((p) =>
        p.id === id && p.status === 'sent' ? { ...p, status: 'viewed' } : p,
      ),
    );
  }, []);

  const markOrdered = useCallback<UsePrescriptionsValue['markOrdered']>(async (id) => {
    const { error: err } = await supabase.rpc('prescription_mark_ordered', { p_id: id });
    if (err) return { ok: false, error: toMessage(err, 'No se pudo marcar como pedida.') };
    setPrescriptions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'ordered' } : p)),
    );
    return { ok: true, data: true };
  }, []);

  return {
    prescriptions,
    loading,
    error,
    refetch,
    resolveParentByQr,
    sendCart,
    getDetail,
    markViewed,
    markOrdered,
  };
}
