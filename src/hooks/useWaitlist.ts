/**
 * useWaitlist / useCampaigns — Funcionalidad 6.
 *  - useWaitlist: lista de espera del especialista (alta por folio, cambio de
 *    estado, aviso manual de hueco). El aviso automático al liberarse una cita
 *    lo hace un trigger en la base.
 *  - useCampaigns: campañas del especialista a su lista de espera o pacientes,
 *    por push/in-app, email y SMS (las envía la Edge Function send-campaign).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Tables } from '@/types/database';
import type { Result } from '@/types/app';

export interface WaitlistRow {
  id: string;
  patient_id: string;
  patient_name: string | null;
  patient_member_no: number | null;
  note: string | null;
  status: string;
  created_at: string;
}

export type Campaign = Tables<'campaigns'>;
export type CampaignChannel = 'push' | 'email' | 'sms';
export type CampaignAudience = 'waitlist' | 'patients';

function rpcResult(data: unknown, error: unknown): Result<true> {
  if (error) return { ok: false, error: toMessage(error) };
  const r = data as { ok?: boolean; error?: string };
  if (!r?.ok) return { ok: false, error: r?.error || 'error' };
  return { ok: true, data: true };
}

export function useWaitlist() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.rpc('my_waitlist');
    setRows((data as WaitlistRow[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);

  const addByFolio = useCallback(async (memberNo: number, note: string): Promise<Result<true>> => {
    const { data, error } = await supabase.rpc('waitlist_add', {
      p_patient_member_no: memberNo,
      p_note: note || undefined,
    });
    const r = rpcResult(data, error);
    if (r.ok) await reload();
    return r;
  }, [reload]);

  const setStatus = useCallback(async (id: string, status: string): Promise<Result<true>> => {
    const { data, error } = await supabase.rpc('waitlist_set_status', { p_id: id, p_status: status });
    const r = rpcResult(data, error);
    if (r.ok) await reload();
    return r;
  }, [reload]);

  const notifySlot = useCallback(async (message: string): Promise<Result<number>> => {
    const { data, error } = await supabase.rpc('waitlist_notify_slot', { p_message: message || undefined });
    if (error) return { ok: false, error: toMessage(error) };
    const r = data as { ok?: boolean; error?: string; notified?: number };
    if (!r?.ok) return { ok: false, error: r?.error || 'error' };
    return { ok: true, data: r.notified ?? 0 };
  }, []);

  const waiting = rows.filter((r) => r.status === 'waiting');

  return { rows, waiting, loading, reload, addByFolio, setStatus, notifySlot };
}

export function useCampaigns() {
  const { userId } = useAuth();
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    setItems((data as Campaign[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);

  const createAndSend = useCallback(
    async (
      title: string,
      body: string,
      channels: CampaignChannel[],
      audience: CampaignAudience,
    ): Promise<Result<number>> => {
      if (!userId) return { ok: false, error: 'auth' };
      if (channels.length === 0) return { ok: false, error: 'no_channels' };
      const { data: created, error: insErr } = await supabase
        .from('campaigns')
        .insert({ owner_id: userId, title, body, channels, audience })
        .select('id')
        .single();
      if (insErr || !created) return { ok: false, error: toMessage(insErr, 'No se pudo crear la campaña.') };
      const { data, error } = await supabase.functions.invoke('send-campaign', {
        body: { campaignId: created.id },
      });
      await reload();
      if (error) return { ok: false, error: toMessage(error) };
      const r = data as { ok?: boolean; sent?: number; error?: string };
      if (!r?.ok) return { ok: false, error: r?.error || 'error' };
      return { ok: true, data: r.sent ?? 0 };
    },
    [userId, reload],
  );

  return { items, loading, reload, createAndSend };
}
