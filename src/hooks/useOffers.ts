/**
 * useOffers — CRUD de ofertas del proveedor.
 *
 * Lista las ofertas del proveedor (o de uno público), y expone crear, editar,
 * activar/pausar y borrar. El toggle de estado usa update optimista por ser una
 * acción frecuente; si falla, revierte.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type { Offer, OfferInsert, OfferStatus, Result } from '@/types/app';
import type { TablesUpdate } from '@/types/database';

export type OfferUpdate = TablesUpdate<'offers'>;

export interface UseOffersValue {
  offers: Offer[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createOffer: (input: Omit<OfferInsert, 'provider_id'>) => Promise<Result<Offer>>;
  updateOffer: (id: string, patch: OfferUpdate) => Promise<Result<Offer>>;
  toggleStatus: (id: string, next: OfferStatus) => Promise<Result<Offer>>;
  deleteOffer: (id: string) => Promise<Result<true>>;
}

/**
 * @param providerId Proveedor cuyas ofertas se listan. Para el dashboard propio,
 *   pasar el id del usuario autenticado.
 */
export function useOffers(providerId: string | null): UseOffersValue {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!providerId) {
      setOffers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('offers')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setOffers(data ?? []);
    } catch (e) {
      setError(toMessage(e, 'No se pudieron cargar las ofertas.'));
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createOffer = useCallback<UseOffersValue['createOffer']>(
    async (input) => {
      if (!providerId) return { ok: false, error: 'Sesión no disponible.' };
      try {
        const { data, error: err } = await supabase
          .from('offers')
          .insert({ ...input, provider_id: providerId })
          .select('*')
          .single();
        if (err) throw err;
        setOffers((prev) => [data, ...prev]);
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: toMessage(e, 'No se pudo crear la oferta.') };
      }
    },
    [providerId],
  );

  const updateOffer = useCallback<UseOffersValue['updateOffer']>(async (id, patch) => {
    try {
      const { data, error: err } = await supabase
        .from('offers')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (err) throw err;
      setOffers((prev) => prev.map((o) => (o.id === id ? data : o)));
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: toMessage(e, 'No se pudo actualizar la oferta.') };
    }
  }, []);

  const toggleStatus = useCallback<UseOffersValue['toggleStatus']>(
    async (id, next) => {
      // Update optimista: refleja el cambio antes de la confirmación del servidor.
      const previous = offers;
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, status: next } : o)));
      try {
        const { data, error: err } = await supabase
          .from('offers')
          .update({ status: next })
          .eq('id', id)
          .select('*')
          .single();
        if (err) throw err;
        setOffers((prev) => prev.map((o) => (o.id === id ? data : o)));
        return { ok: true, data };
      } catch (e) {
        setOffers(previous); // revertir
        return { ok: false, error: toMessage(e, 'No se pudo cambiar el estado.') };
      }
    },
    [offers],
  );

  const deleteOffer = useCallback<UseOffersValue['deleteOffer']>(
    async (id) => {
      const previous = offers;
      setOffers((prev) => prev.filter((o) => o.id !== id)); // optimista
      try {
        const { error: err } = await supabase.from('offers').delete().eq('id', id);
        if (err) throw err;
        return { ok: true, data: true };
      } catch (e) {
        setOffers(previous); // revertir
        return { ok: false, error: toMessage(e, 'No se pudo eliminar la oferta.') };
      }
    },
    [offers],
  );

  return {
    offers,
    loading,
    error,
    refetch,
    createOffer,
    updateOffer,
    toggleStatus,
    deleteOffer,
  };
}
