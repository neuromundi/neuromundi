/**
 * useSpecialistMatches — sugiere hasta 3 especialistas del directorio para el
 * módulo actual, consultando Supabase por `module_type`.
 *
 * Solo se activa para personas autenticadas (`enabled`). Los visitantes ven una
 * invitación a crear cuenta en su lugar (ver <SpecialistMatcher />).
 */
import { useEffect, useState } from 'react';
import { toolkitDb, type SpecialistRow } from '@/lib/toolkitDb';

export interface SpecialistMatches {
  specialists: SpecialistRow[];
  loading: boolean;
  error: boolean;
}

export function useSpecialistMatches(moduleType: string, enabled: boolean): SpecialistMatches {
  const [specialists, setSpecialists] = useState<SpecialistRow[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSpecialists([]);
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const { data, error: qErr } = await toolkitDb
          .from('specialists')
          .select('*')
          .eq('module_type', moduleType)
          .limit(3)
          .returns<SpecialistRow[]>();
        if (qErr) throw qErr;
        if (active) setSpecialists(data ?? []);
      } catch {
        if (active) {
          setSpecialists([]);
          setError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [moduleType, enabled]);

  return { specialists, loading, error };
}
