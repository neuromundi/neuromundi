/**
 * useConnections — red de contactos del proveedor (relación mutua).
 *
 * Categoriza las conexiones del usuario en: red (aceptadas), entrantes y
 * salientes (pendientes). Expone acciones para solicitar, aceptar y eliminar, y
 * un `stateWith(id)` que el botón "Conectar" usa para saber qué mostrar.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type {
  ConnectionState,
  ConnectionWithProfile,
  ProviderConnection,
  ProviderSummary,
  Result,
} from '@/types/app';

export interface UseConnectionsValue {
  network: ConnectionWithProfile[];
  incoming: ConnectionWithProfile[];
  outgoing: ConnectionWithProfile[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  stateWith: (providerId: string) => ConnectionState;
  sendRequest: (addresseeId: string) => Promise<Result<true>>;
  accept: (id: string) => Promise<Result<true>>;
  remove: (id: string) => Promise<Result<true>>;
}

function summaryOf(row: {
  id: string;
  full_name: string;
  business_name: string | null;
  city: string | null;
  avatar_url: string | null;
  provider_type: ProviderSummary['provider_type'];
}): ProviderSummary {
  return {
    id: row.id,
    name: row.business_name ?? row.full_name,
    city: row.city,
    avatar_url: row.avatar_url,
    provider_type: row.provider_type,
  };
}

export function useConnections(): UseConnectionsValue {
  const { userId } = useAuth();
  const [rows, setRows] = useState<ProviderConnection[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProviderSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('provider_connections')
        .select('*')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (err) throw err;
      const conns = (data ?? []) as ProviderConnection[];
      setRows(conns);

      const otherIds = Array.from(
        new Set(conns.map((c) => (c.requester_id === userId ? c.addressee_id : c.requester_id))),
      );
      if (otherIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, business_name, city, avatar_url, provider_type')
          .in('id', otherIds);
        const map: Record<string, ProviderSummary> = {};
        for (const p of profs ?? []) map[p.id] = summaryOf(p);
        setProfiles(map);
      } else {
        setProfiles({});
      }
    } catch (e) {
      setError(toMessage(e, 'No se pudo cargar tu red.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const toView = useCallback(
    (c: ProviderConnection): ConnectionWithProfile => {
      const otherId = c.requester_id === userId ? c.addressee_id : c.requester_id;
      return {
        connection: c,
        other: profiles[otherId] ?? { id: otherId, name: '—', city: null, avatar_url: null, provider_type: null },
        direction: c.requester_id === userId ? 'outgoing' : 'incoming',
      };
    },
    [profiles, userId],
  );

  const network = useMemo(() => rows.filter((c) => c.status === 'accepted').map(toView), [rows, toView]);
  const incoming = useMemo(
    () => rows.filter((c) => c.status === 'pending' && c.addressee_id === userId).map(toView),
    [rows, toView, userId],
  );
  const outgoing = useMemo(
    () => rows.filter((c) => c.status === 'pending' && c.requester_id === userId).map(toView),
    [rows, toView, userId],
  );

  const stateWith = useCallback<UseConnectionsValue['stateWith']>(
    (providerId) => {
      const c = rows.find(
        (r) => r.requester_id === providerId || r.addressee_id === providerId,
      );
      if (!c) return { kind: 'none' };
      if (c.status === 'accepted') return { kind: 'connected', id: c.id };
      return {
        kind: 'pending',
        id: c.id,
        direction: c.requester_id === userId ? 'outgoing' : 'incoming',
      };
    },
    [rows, userId],
  );

  const sendRequest = useCallback<UseConnectionsValue['sendRequest']>(
    async (addresseeId) => {
      if (!userId) return { ok: false, error: 'Sesión no disponible.' };
      const { error: err } = await supabase
        .from('provider_connections')
        .insert({ requester_id: userId, addressee_id: addresseeId });
      if (err) return { ok: false, error: toMessage(err, 'No se pudo enviar la solicitud.') };
      await refetch();
      return { ok: true, data: true };
    },
    [userId, refetch],
  );

  const accept = useCallback<UseConnectionsValue['accept']>(
    async (id) => {
      const { error: err } = await supabase
        .from('provider_connections')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', id);
      if (err) return { ok: false, error: toMessage(err, 'No se pudo aceptar.') };
      await refetch();
      return { ok: true, data: true };
    },
    [refetch],
  );

  const remove = useCallback<UseConnectionsValue['remove']>(
    async (id) => {
      const { error: err } = await supabase.from('provider_connections').delete().eq('id', id);
      if (err) return { ok: false, error: toMessage(err, 'No se pudo eliminar.') };
      await refetch();
      return { ok: true, data: true };
    },
    [refetch],
  );

  return { network, incoming, outgoing, loading, error, refetch, stateWith, sendRequest, accept, remove };
}
