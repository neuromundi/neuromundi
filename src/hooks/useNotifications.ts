/**
 * useNotifications — notificaciones in-app (Fase 4). Lista, contador de no leídas
 * y marcado como leídas. La felicitación por alcanzar 3 estrellas la crea un
 * trigger en la base; aquí solo se consume.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/types/database';

export type Notification = Tables<'notifications'>;

export function useNotifications() {
  const { userId } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    setItems(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setItems((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setItems((p) => p.map((n) => ({ ...n, is_read: true })));
  }, [userId]);

  return { items, unreadCount, loading, reload: load, markRead, markAllRead };
}
