/**
 * useProviderLocations — sucursales/ubicaciones de un proveedor.
 *
 * - useProviderLocations(providerId): lista + alta/edición/baja (el dueño las
 *   administra; RLS permite escribir solo las propias).
 * - usePublicLocations(providerIds): lee las sucursales (publicadas) de un
 *   conjunto de proveedores, para pintarlas en el mapa del directorio.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logger, toMessage } from '@/lib/utils';
import type { ProviderLocation, ProviderLocationInsert, Result } from '@/types/app';

export type LocationDraft = Omit<ProviderLocationInsert, 'provider_id' | 'id' | 'created_at'>;

export function useProviderLocations(providerId: string | undefined) {
  const [locations, setLocations] = useState<ProviderLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('provider_locations')
      .select('*')
      .eq('provider_id', providerId)
      .order('sort_order', { ascending: true });
    if (error) logger.error('No se pudieron cargar las sucursales', error);
    setLocations(data ?? []);
    setLoading(false);
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(
    async (draft: LocationDraft): Promise<Result<ProviderLocation>> => {
      if (!providerId) return { ok: false, error: 'Sin sesión' };
      const row: ProviderLocationInsert = {
        ...draft,
        provider_id: providerId,
        sort_order: locations.length,
      };
      const { data, error } = await supabase
        .from('provider_locations')
        .insert(row)
        .select('*')
        .single();
      if (error) return { ok: false, error: toMessage(error) };
      setLocations((prev) => [...prev, data]);
      return { ok: true, data };
    },
    [providerId, locations.length],
  );

  const update = useCallback(
    async (id: string, patch: Partial<LocationDraft>): Promise<Result<ProviderLocation>> => {
      const { data, error } = await supabase
        .from('provider_locations')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) return { ok: false, error: toMessage(error) };
      setLocations((prev) => prev.map((l) => (l.id === id ? data : l)));
      return { ok: true, data };
    },
    [],
  );

  const remove = useCallback(async (id: string): Promise<Result<true>> => {
    const { error } = await supabase.from('provider_locations').delete().eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    setLocations((prev) => prev.filter((l) => l.id !== id));
    return { ok: true, data: true };
  }, []);

  return { locations, loading, add, update, remove, reload: load };
}

/** Lee las sucursales de varios proveedores (para el mapa). */
export function usePublicLocations(providerIds: string[]) {
  const [locations, setLocations] = useState<ProviderLocation[]>([]);
  // Clave estable para no recargar en cada render.
  const key = providerIds.slice().sort().join(',');

  useEffect(() => {
    let active = true;
    if (providerIds.length === 0) {
      setLocations([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('provider_locations')
        .select('*')
        .in('provider_id', providerIds);
      if (error) {
        logger.error('No se pudieron cargar ubicaciones del mapa', error);
        return;
      }
      if (active) setLocations(data ?? []);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return locations;
}
