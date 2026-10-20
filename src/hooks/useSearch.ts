/**
 * useSearch — buscador global. Consulta la RPC search_all_con_areas, que busca
 * en publicaciones (blogs/enlaces), prestadores/proveedores y productos, y
 * devuelve el área de Neuromundi de cada resultado para poder depurar por ella.
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SearchResult {
  kind: 'post' | 'provider' | 'product';
  id: string;
  title: string;
  subtitle: string;
  url: string;
  // Las áreas del resultado. Vacío = sin clasificar, y el filtro lo muestra
  // siempre.
  sections: string[];
}

/** El servidor devuelve como maximo estos resultados. Si llegan justo estos,
 *  puede haber mas y hay que decirlo: una lista cortada en silencio hace creer
 *  que no hay nada mas. (Repaso adversario, 19 oct 2026.) */
export const TOPE_DE_RESULTADOS = 50;

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  // Antes el error se tiraba: una busqueda que FALLABA quedaba igual que una
  // busqueda SIN RESULTADOS, y la pantalla decia "no encontramos nada". Es la
  // misma mentira que el codigo ya evita a proposito en inclusion escolar.
  const [fallo, setFallo] = useState(false);

  const search = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setFallo(false);
      setSearched(true);
      return;
    }
    setLoading(true);
    setFallo(false);
    const { data, error } = await supabase.rpc('search_all_con_areas', { q: term });
    if (error) {
      setFallo(true);
      setResults([]);
    } else {
      setResults((data as SearchResult[]) ?? []);
    }
    setLoading(false);
    setSearched(true);
  }, []);

  return { results, loading, searched, fallo, search };
}
