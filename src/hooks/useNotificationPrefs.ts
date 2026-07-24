/**
 * useNotificationPrefs — lee y guarda las preferencias de notificación del
 * usuario (interruptor maestro de push + categorías silenciadas).
 *
 * Si el usuario nunca las tocó, no hay fila: el valor por defecto es "todo
 * activo", igual que asume el trigger de la base.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { NotifCategory } from '@/lib/notificationPrefs';

export interface NotifPrefs {
  push_enabled: boolean;
  muted_categories: NotifCategory[];
}

const DEFAULTS: NotifPrefs = { push_enabled: true, muted_categories: [] };

export function useNotificationPrefs() {
  const { userId } = useAuth();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!userId) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('notification_prefs')
        .select('push_enabled, muted_categories')
        .eq('user_id', userId)
        .maybeSingle();
      if (alive) {
        if (data) {
          setPrefs({
            push_enabled: data.push_enabled,
            muted_categories: (data.muted_categories as NotifCategory[]) ?? [],
          });
        }
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  /** Guarda (upsert) el estado completo de preferencias. */
  const save = useCallback(
    async (next: NotifPrefs): Promise<boolean> => {
      if (!userId) return false;
      setSaving(true);
      setPrefs(next); // optimista
      const { error } = await supabase.from('notification_prefs').upsert({
        user_id: userId,
        push_enabled: next.push_enabled,
        muted_categories: next.muted_categories,
        updated_at: new Date().toISOString(),
      });
      setSaving(false);
      return !error;
    },
    [userId],
  );

  const setPushEnabled = useCallback(
    (on: boolean) => save({ ...prefs, push_enabled: on }),
    [prefs, save],
  );

  /** Silencia o reactiva el push de una categoría. */
  const toggleCategory = useCallback(
    (cat: NotifCategory, muted: boolean) => {
      const set = new Set(prefs.muted_categories);
      if (muted) set.add(cat); else set.delete(cat);
      return save({ ...prefs, muted_categories: [...set] });
    },
    [prefs, save],
  );

  return { prefs, loading, saving, setPushEnabled, toggleCategory };
}
