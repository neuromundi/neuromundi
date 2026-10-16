/**
 * useCatalogSuggestions — cola de curaduría comunitaria para el admin.
 * Lee las sugerencias de categoría/producto y permite cambiar su estado.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface CatalogSuggestion {
  id: string;
  user_id: string | null;
  email: string | null;
  kind: 'directory_category' | 'store_product' | 'store_category';
  section: string | null;
  name: string;
  note: string | null;
  country: string | null;
  page: string | null;
  status: 'new' | 'reviewed' | 'accepted' | 'dismissed';
  created_at: string;
}

export function useAdminCatalogSuggestions() {
  const [items, setItems] = useState<CatalogSuggestion[]>([]);
  // TRES ESTADOS, NO DOS: cargando, vacio y FALLO. Antes el error se miraba y
  // se descartaba en la misma expresion, asi que un fallo de la consulta se
  // pintaba como «no hay nada». (Auditoria 15 oct 2026, hallazgo A-12.)
  const [fallo, setFallo] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_catalog_suggestions');
    setItems(error ? [] : ((data as CatalogSuggestion[] | null) ?? []));
        setFallo(!!error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = useCallback(
    async (id: string, status: CatalogSuggestion['status']) => {
      // Optimista: refleja el cambio de inmediato y confirma en la base.
      setItems((cur) => cur.map((s) => (s.id === id ? { ...s, status } : s)));
      const { error } = await supabase.rpc('admin_set_catalog_suggestion_status', {
        p_id: id,
        p_status: status,
      });
      if (error) void load();
    },
    [load],
  );

  return { items, loading, fallo, reload: load, setStatus };
}
