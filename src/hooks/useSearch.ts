/**
 * useSearch — buscador global (Fase 4). Consulta la RPC search_all, que busca en
 * publicaciones (blogs/enlaces), prestadores/proveedores y productos.
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SearchResult {
  kind: 'post' | 'provider' | 'product';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setSearched(true);
      return;
    }
    setLoading(true);
    const { data } = await supabase.rpc('search_all', { q: term });
    setResults((data as SearchResult[]) ?? []);
    setLoading(false);
    setSearched(true);
  }, []);

  return { results, loading, searched, search };
}
