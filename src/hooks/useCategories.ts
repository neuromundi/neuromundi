/**
 * useCategories — catálogo de categorías para filtros y chips.
 *
 * La tabla `categories` es de lectura abierta; se ordena por `sort_order`.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type { Category } from '@/types/app';

export interface UseCategoriesValue {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

export function useCategories(): UseCategoriesValue {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data, error: err } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true });
        if (err) throw err;
        if (!cancelled) setCategories(data ?? []);
      } catch (e) {
        if (!cancelled) setError(toMessage(e, 'No se pudieron cargar las categorías.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading, error };
}
