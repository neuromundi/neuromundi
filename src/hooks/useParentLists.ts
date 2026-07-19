/**
 * useParentLists — listas de proveedores del padre (compartibles).
 *
 * Administra listas y sus ítems, y la publicación por enlace (token). Expone
 * `listsContaining(providerId)` para que el botón "Guardar" sepa el estado.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type {
  ParentList,
  ParentListItemResolved,
  ParentListWithCount,
  ProviderSummary,
  Result,
} from '@/types/app';

export interface UseParentListsValue {
  lists: ParentListWithCount[];
  itemsByList: Record<string, ParentListItemResolved[]>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createList: (title: string) => Promise<Result<ParentList>>;
  renameList: (id: string, title: string) => Promise<Result<true>>;
  deleteList: (id: string) => Promise<Result<true>>;
  toggleShare: (id: string, value: boolean) => Promise<Result<true>>;
  addItem: (listId: string, providerId: string) => Promise<Result<true>>;
  removeItem: (itemId: string) => Promise<Result<true>>;
  listsContaining: (providerId: string) => string[];
}

export function useParentLists(): UseParentListsValue {
  const { userId } = useAuth();
  const [lists, setLists] = useState<ParentListWithCount[]>([]);
  const [itemsByList, setItemsByList] = useState<Record<string, ParentListItemResolved[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: ls, error: lErr } = await supabase
        .from('parent_lists')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true });
      if (lErr) throw lErr;
      const listRows = (ls ?? []) as ParentList[];

      const listIds = listRows.map((l) => l.id);
      let items: ParentListItemResolved[] = [];
      if (listIds.length) {
        const { data: its } = await supabase
          .from('parent_list_items')
          .select('id, list_id, provider_id, note, created_at')
          .in('list_id', listIds)
          .order('created_at', { ascending: true });
        const providerIds = Array.from(new Set((its ?? []).map((i) => i.provider_id)));
        const summaries: Record<string, ProviderSummary> = {};
        if (providerIds.length) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, business_name, city, avatar_url, provider_type')
            .in('id', providerIds);
          for (const p of profs ?? []) {
            summaries[p.id] = {
              id: p.id,
              name: p.business_name ?? p.full_name,
              city: p.city,
              avatar_url: p.avatar_url,
              provider_type: p.provider_type,
            };
          }
        }
        items = (its ?? []).map((i) => ({
          itemId: i.id,
          listId: i.list_id,
          note: i.note,
          id: i.provider_id,
          name: summaries[i.provider_id]?.name ?? '—',
          city: summaries[i.provider_id]?.city ?? null,
          avatar_url: summaries[i.provider_id]?.avatar_url ?? null,
          provider_type: summaries[i.provider_id]?.provider_type ?? null,
        }));
      }

      const grouped: Record<string, ParentListItemResolved[]> = {};
      for (const it of items) (grouped[it.listId] ??= []).push(it);
      setItemsByList(grouped);
      setLists(listRows.map((l) => ({ ...l, itemCount: grouped[l.id]?.length ?? 0 })));
    } catch (e) {
      setError(toMessage(e, 'No se pudieron cargar tus listas.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createList = useCallback<UseParentListsValue['createList']>(
    async (title) => {
      if (!userId) return { ok: false, error: 'Sesión no disponible.' };
      const { data, error: err } = await supabase
        .from('parent_lists')
        .insert({ owner_id: userId, title: title.trim() || 'Mi lista' })
        .select('*')
        .single();
      if (err) return { ok: false, error: toMessage(err, 'No se pudo crear la lista.') };
      await refetch();
      return { ok: true, data: data as ParentList };
    },
    [userId, refetch],
  );

  const renameList = useCallback<UseParentListsValue['renameList']>(
    async (id, title) => {
      const { error: err } = await supabase.from('parent_lists').update({ title: title.trim() }).eq('id', id);
      if (err) return { ok: false, error: toMessage(err, 'No se pudo renombrar.') };
      await refetch();
      return { ok: true, data: true };
    },
    [refetch],
  );

  const deleteList = useCallback<UseParentListsValue['deleteList']>(
    async (id) => {
      const { error: err } = await supabase.from('parent_lists').delete().eq('id', id);
      if (err) return { ok: false, error: toMessage(err, 'No se pudo eliminar la lista.') };
      await refetch();
      return { ok: true, data: true };
    },
    [refetch],
  );

  const toggleShare = useCallback<UseParentListsValue['toggleShare']>(
    async (id, value) => {
      const { error: err } = await supabase.from('parent_lists').update({ is_public: value }).eq('id', id);
      if (err) return { ok: false, error: toMessage(err, 'No se pudo actualizar el compartir.') };
      await refetch();
      return { ok: true, data: true };
    },
    [refetch],
  );

  const addItem = useCallback<UseParentListsValue['addItem']>(
    async (listId, providerId) => {
      const { error: err } = await supabase
        .from('parent_list_items')
        .insert({ list_id: listId, provider_id: providerId });
      if (err) return { ok: false, error: toMessage(err, 'No se pudo agregar.') };
      await refetch();
      return { ok: true, data: true };
    },
    [refetch],
  );

  const removeItem = useCallback<UseParentListsValue['removeItem']>(
    async (itemId) => {
      const { error: err } = await supabase.from('parent_list_items').delete().eq('id', itemId);
      if (err) return { ok: false, error: toMessage(err, 'No se pudo quitar.') };
      await refetch();
      return { ok: true, data: true };
    },
    [refetch],
  );

  const listsContaining = useCallback<UseParentListsValue['listsContaining']>(
    (providerId) =>
      Object.entries(itemsByList)
        .filter(([, items]) => items.some((i) => i.id === providerId))
        .map(([listId]) => listId),
    [itemsByList],
  );

  return {
    lists,
    itemsByList,
    loading,
    error,
    refetch,
    createList,
    renameList,
    deleteList,
    toggleShare,
    addItem,
    removeItem,
    listsContaining,
  };
}
