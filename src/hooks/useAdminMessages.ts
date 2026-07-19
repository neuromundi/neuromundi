/**
 * useAdminMessages — mensajería interna del administrador.
 * Envía mensajes directos (por folio) o a un grupo (audiencia) vía la RPC
 * admin_send_message, que entrega una notificación por destinatario. Lista el
 * historial de lo enviado (solo admin, por RLS).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import type { Result } from '@/types/app';

export type MessageAudience = 'all' | 'consumers' | 'providers' | 'founders' | 'direct';

export interface AdminMessage {
  id: string;
  title: string | null;
  body: string;
  audience: string;
  recipient_id: string | null;
  recipient_count: number;
  created_at: string;
}

export interface SendMessageInput {
  title?: string;
  body: string;
  audience: MessageAudience;
  memberNo?: number | null;
}

export function useAdminMessages() {
  const [sent, setSent] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admin_messages' as never)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setSent((data ?? []) as unknown as AdminMessage[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const send = useCallback(
    async (input: SendMessageInput): Promise<Result<number>> => {
      setBusy(true);
      const { data, error } = await supabase.rpc('admin_send_message' as never, {
        p_title: input.title ?? null,
        p_body: input.body,
        p_audience: input.audience,
        p_recipient_member_no: input.audience === 'direct' ? (input.memberNo ?? null) : null,
      } as never);
      setBusy(false);
      if (error) return { ok: false, error: toMessage(error) };
      const res = data as { ok: boolean; error?: string; count?: number };
      if (!res?.ok) return { ok: false, error: res?.error ?? 'error' };
      await load();
      return { ok: true, data: res.count ?? 0 };
    },
    [load],
  );

  return { sent, loading, busy, send, reload: load };
}
