/**
 * useAppointmentRequests — solicitudes de cita entre especialista y paciente/tutor.
 *
 * El especialista envía una solicitud (por folio NM del destinatario, o eligiéndolo
 * del buscador). El destinatario la acepta (se crea la entrada en su calendario) o
 * la rechaza con motivo. Toda la escritura pasa por RPCs SECURITY DEFINER que
 * además notifican a la otra parte vía la plataforma.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Result } from '@/types/app';

export interface AppointmentRequest {
  id: string;
  specialist_id: string;
  recipient_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  online_url: string | null;
  note: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  rejection_reason: string | null;
  mode: string;
  charge_total: number | null;
  charge_percent: number;
  charge_currency: string | null;
  payment_status: string;
  created_at: string;
  otherName: string;
}

export interface RequestPayload {
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  online_url?: string | null;
  note?: string | null;
  mode?: 'in_person' | 'online';
  charge_total?: number | null;
  charge_percent?: number;
  charge_currency?: string | null;
}

export interface PatientHit {
  member_no: number;
  full_name: string;
  avatar_url: string | null;
  relation: string;
}

export function useAppointmentRequests() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('appointment_requests' as never)
      .select('*')
      .or(`specialist_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    const list = (data ?? []) as unknown as AppointmentRequest[];
    // Nombre de la otra parte (especialista o destinatario) para mostrar.
    const otherIds = [...new Set(list.map((r) => (r.specialist_id === userId ? r.recipient_id : r.specialist_id)))];
    const names: Record<string, string> = {};
    if (otherIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, business_name, full_name')
        .in('id', otherIds);
      for (const p of profs ?? []) names[p.id] = p.business_name || p.full_name || '';
    }
    setRows(
      list.map((r) => ({
        ...r,
        otherName: names[r.specialist_id === userId ? r.recipient_id : r.specialist_id] || '',
      })),
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const sent = useMemo(() => rows.filter((r) => r.specialist_id === userId), [rows, userId]);
  const received = useMemo(() => rows.filter((r) => r.recipient_id === userId), [rows, userId]);
  const pendingReceived = useMemo(() => received.filter((r) => r.status === 'pending'), [received]);
  const payableReceived = useMemo(
    () => received.filter((r) => r.status === 'accepted' && (r.charge_total ?? 0) > 0 && r.payment_status !== 'paid'),
    [received],
  );

  const payAppointment = useCallback(async (r: AppointmentRequest): Promise<Result<true>> => {
    const payable = (r.charge_total ?? 0) * ((r.charge_percent ?? 100) / 100);
    if (payable <= 0) return { ok: false, error: 'no_charge' };
    const { data, error } = await supabase.functions.invoke('create-consultation-checkout', {
      body: { providerId: r.specialist_id, appointmentId: r.id, amount: payable, currency: r.charge_currency ?? 'MXN' },
    });
    if (error) return { ok: false, error: toMessage(error) };
    const url = (data as { url?: string })?.url;
    if (!url) return { ok: false, error: 'no_url' };
    window.location.href = url;
    return { ok: true, data: true };
  }, []);

  const sendRequest = useCallback(
    async (memberNo: number, payload: RequestPayload): Promise<Result<true>> => {
      setBusy(true);
      const { data, error } = await supabase.rpc('request_appointment' as never, {
        p_recipient_member_no: memberNo,
        p_title: payload.title,
        p_starts: payload.starts_at,
        p_ends: payload.ends_at ?? null,
        p_location: payload.location ?? null,
        p_online_url: payload.online_url ?? null,
        p_note: payload.note ?? null,
        p_mode: payload.mode ?? 'in_person',
        p_charge_total: payload.charge_total ?? null,
        p_charge_percent: payload.charge_percent ?? 100,
        p_charge_currency: payload.charge_currency ?? null,
      } as never);
      setBusy(false);
      if (error) return { ok: false, error: toMessage(error) };
      const res = data as { ok: boolean; error?: string };
      if (!res?.ok) return { ok: false, error: res?.error ?? 'error' };
      await load();
      return { ok: true, data: true };
    },
    [load],
  );

  const respond = useCallback(
    async (requestId: string, accept: boolean, reason?: string): Promise<Result<true>> => {
      setBusy(true);
      const { data, error } = await supabase.rpc('respond_appointment' as never, {
        p_request: requestId,
        p_accept: accept,
        p_reason: reason ?? null,
      } as never);
      setBusy(false);
      if (error) return { ok: false, error: toMessage(error) };
      const res = data as { ok: boolean; error?: string };
      if (!res?.ok) return { ok: false, error: res?.error ?? 'error' };
      await load();
      return { ok: true, data: true };
    },
    [load],
  );

  const searchPatients = useCallback(async (query: string): Promise<PatientHit[]> => {
    const { data, error } = await supabase.rpc('search_patients' as never, { p_query: query } as never);
    if (error) return [];
    return (data ?? []) as unknown as PatientHit[];
  }, []);

  return { sent, received, pendingReceived, payableReceived, loading, busy, sendRequest, respond, payAppointment, searchPatients, reload: load };
}

/** Dispara los recordatorios de 24 h del usuario actual (fallback del cliente). */
export function useAppointmentReminders() {
  const { userId } = useAuth();
  useEffect(() => {
    if (!userId) return;
    void supabase.rpc('emit_due_appointment_reminders' as never);
  }, [userId]);
}
