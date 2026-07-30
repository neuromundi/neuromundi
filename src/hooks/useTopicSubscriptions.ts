/**
 * useTopicSubscriptions — el usuario elige TEMAS (empleo, voluntariado, servicio
 * social, esparcimiento) y un ámbito opcional (país/ciudad) para recibir avisos
 * in-app cuando se publique algo nuevo de ese tema. RLS: cada quien gestiona lo
 * suyo (upsert directo, sin RPC).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const TOPIC_VALUES = ['employment', 'volunteering', 'social_service', 'esparcimiento'] as const;
export type TopicValue = (typeof TOPIC_VALUES)[number];

export interface TopicSub {
  topics: TopicValue[];
  scope_country: string | null;
  scope_city: string | null;
}

export function useTopicSubscriptions() {
  const { userId } = useAuth();
  const [sub, setSub] = useState<TopicSub>({ topics: [], scope_country: null, scope_city: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!userId) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('topic_subscriptions')
        .select('topics, scope_country, scope_city')
        .eq('user_id', userId)
        .maybeSingle();
      if (alive) {
        if (data) setSub({ topics: (data.topics as TopicValue[]) ?? [], scope_country: data.scope_country, scope_city: data.scope_city });
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const save = useCallback(async (next: TopicSub): Promise<boolean> => {
    if (!userId) return false;
    setSaving(true);
    const { error } = await supabase.from('topic_subscriptions').upsert({
      user_id: userId,
      topics: next.topics,
      scope_country: next.scope_country || null,
      scope_city: next.scope_city || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (!error) setSub(next);
    return !error;
  }, [userId]);

  return { sub, setSub, loading, saving, save };
}
