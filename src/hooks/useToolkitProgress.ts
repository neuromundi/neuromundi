/**
 * useToolkitProgress — guarda y lee qué módulos del Kit ha leído la persona.
 *
 *  - Autenticada  → Supabase (tabla `user_progress`), para que el avance viaje
 *    entre dispositivos. Si algo falla, degrada con elegancia a localStorage.
 *  - Anónima      → localStorage.
 *
 * Al iniciar sesión, el avance guardado como visitante se fusiona con el de la
 * cuenta (no se pierde lo leído antes de registrarse).
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toolkitDb, type UserProgressRow } from '@/lib/toolkitDb';

const LS_KEY = 'neuromundi.toolkitProgress';

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: Iterable<string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* almacenamiento no disponible */
  }
}

export interface ToolkitProgress {
  readModules: Set<string>;
  isRead: (id: string) => boolean;
  markRead: (id: string) => void;
  /** true cuando ya se cargó el estado inicial (evita parpadeos). */
  ready: boolean;
}

export function useToolkitProgress(): ToolkitProgress {
  const { isAuthenticated, userId } = useAuth();
  const [readModules, setReadModules] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);

    (async () => {
      const local = readLocal();

      if (isAuthenticated && userId) {
        try {
          const { data, error } = await toolkitDb
            .from('user_progress')
            .select('module_id')
            .eq('user_id', userId)
            .returns<Pick<UserProgressRow, 'module_id'>[]>();
          if (error) throw error;

          const remote = (data ?? []).map((r) => r.module_id);
          const merged = new Set<string>([...remote, ...local]);
          if (active) setReadModules(merged);

          // Sube al servidor lo que solo existía en local (migración suave).
          const missing = local.filter((id) => !remote.includes(id));
          if (missing.length) {
            const now = new Date().toISOString();
            await toolkitDb
              .from('user_progress')
              .upsert(
                missing.map((module_id) => ({ user_id: userId, module_id, read_at: now })),
                { onConflict: 'user_id,module_id' },
              );
          }
        } catch {
          // Sin tabla o sin red: usamos el progreso local.
          if (active) setReadModules(new Set(local));
        }
      } else if (active) {
        setReadModules(new Set(local));
      }

      if (active) setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated, userId]);

  const markRead = useCallback(
    (id: string) => {
      setReadModules((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        // Persistimos en local siempre (respaldo) y en Supabase si hay sesión.
        writeLocal(next);
        if (isAuthenticated && userId) {
          void toolkitDb
            .from('user_progress')
            .upsert(
              { user_id: userId, module_id: id, read_at: new Date().toISOString() },
              { onConflict: 'user_id,module_id' },
            )
            .then(({ error }) => {
              if (error) writeLocal(next); // ya está, pero deja rastro local
            });
        }
        return next;
      });
    },
    [isAuthenticated, userId],
  );

  const isRead = useCallback((id: string) => readModules.has(id), [readModules]);

  return { readModules, isRead, markRead, ready };
}
