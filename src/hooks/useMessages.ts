/**
 * useMessages — mensajería directa (Funcionalidad 4).
 *  - threads: resumen de conversaciones (RPC message_threads).
 *  - fetchThread(otherId): mensajes del hilo (RLS: solo participantes).
 *  - markThreadRead(otherId): marca como leídos los recibidos de esa persona.
 *  - send(memberNo, body): envía por RPC send_message (valida permiso + notifica).
 * Los especialistas (provider/admin) pueden iniciar por folio; cualquiera puede
 * responder dentro de un hilo existente. El cuerpo admite enlaces de video de
 * cualquier plataforma (se muestran como enlaces).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Tables } from '@/types/database';
import type { Result } from '@/types/app';

export type Message = Tables<'messages'>;

export interface Thread {
  other_id: string;
  other_name: string | null;
  other_member_no: number | null;
  other_avatar: string | null;
  last_body: string | null;
  last_at: string;
  unread: number;
}

export function useMessages() {
  const { userId } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadThreads = useCallback(async () => {
    if (!userId) { setThreads([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.rpc('message_threads');
    setThreads((data as Thread[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void reloadThreads(); }, [reloadThreads]);

  const fetchThread = useCallback(async (otherId: string): Promise<Message[]> => {
    if (!userId) return [];
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`,
      )
      .order('created_at', { ascending: true })
      .limit(300);
    return (data as Message[]) ?? [];
  }, [userId]);

  const markThreadRead = useCallback(async (otherId: string) => {
    if (!userId) return;
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .eq('sender_id', otherId)
      .is('read_at', null);
    setThreads((p) => p.map((t) => (t.other_id === otherId ? { ...t, unread: 0 } : t)));
  }, [userId]);

  const send = useCallback(async (memberNo: number, body: string): Promise<Result<string>> => {
    const { data, error } = await supabase.rpc('send_message', {
      p_recipient_member_no: memberNo,
      p_body: body,
    });
    if (error) return { ok: false, error: toMessage(error) };
    const r = data as { ok: boolean; error?: string; message_id?: string };
    if (!r?.ok) return { ok: false, error: r?.error || 'error' };
    return { ok: true, data: r.message_id ?? '' };
  }, []);

  return { userId, threads, loading, reloadThreads, fetchThread, markThreadRead, send };
}
