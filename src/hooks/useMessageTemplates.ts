/**
 * useMessageTemplates — plantillas de respuesta rápida del usuario (privadas).
 * CRUD sencillo sobre `message_templates`; RLS limita todo a su dueño.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface MessageTemplate {
  id: string;
  title: string;
  body: string;
  sort_order: number;
}

export function useMessageTemplates(enabled: boolean) {
  const { userId } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!enabled || !userId) { setTemplates([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('message_templates')
      .select('id, title, body, sort_order')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setTemplates((data as MessageTemplate[] | null) ?? []);
    setLoading(false);
  }, [enabled, userId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(
    async (title: string, body: string): Promise<boolean> => {
      if (!userId) return false;
      const { error } = await supabase.from('message_templates').insert({
        owner_id: userId,
        title: title.trim() || body.trim().slice(0, 40),
        body: body.trim(),
        sort_order: templates.length,
      });
      if (!error) await load();
      return !error;
    },
    [userId, templates.length, load],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from('message_templates').delete().eq('id', id);
      if (!error) await load();
      return !error;
    },
    [load],
  );

  return { templates, loading, reload: load, create, remove };
}
