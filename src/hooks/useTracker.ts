/**
 * useTracker — rastreador de hitos LOCAL-FIRST. Los datos viven solo en este
 * dispositivo (IndexedDB); nunca se suben a la nube. Se pueden exportar/imprimir.
 */
import { useCallback, useEffect, useState } from 'react';
import { idbGet, idbSet } from '@/lib/idb';

export interface Milestone {
  id: string;
  date: string; // YYYY-MM-DD
  area: string; // p. ej. lenguaje, motor, social
  text: string;
}

const KEY = 'tracker-milestones';

export function useTracker() {
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await idbGet<Milestone[]>(KEY);
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (next: Milestone[]) => {
    setItems(next);
    await idbSet(KEY, next);
  }, []);

  const add = useCallback(async (m: Omit<Milestone, 'id'>) => {
    const next = [{ ...m, id: crypto.randomUUID() }, ...items].sort((a, b) => b.date.localeCompare(a.date));
    await persist(next);
  }, [items, persist]);

  const remove = useCallback(async (id: string) => {
    await persist(items.filter((m) => m.id !== id));
  }, [items, persist]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hitos-neuromundi.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  return { items, loading, add, remove, exportJson };
}
