/**
 * useAgenda — lógica de la agenda (Fase 2).
 *  - useProviderAgenda: disponibilidad, próximas citas, lista de espera y acciones
 *    del prestador (cancelar, editar enlace, asignar hueco a la lista de espera con
 *    su aprobación previa antes de avisar al paciente).
 *  - useConsumerAgenda: horarios disponibles (generados en el cliente), reservar,
 *    mis citas, cancelar y unirse a la lista de espera.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Tables, TablesInsert } from '@/types/database';
import type { Result } from '@/types/app';

export type Availability = Tables<'provider_availability'>;
export type Appointment = Tables<'appointments'>;
export type WaitlistEntry = Tables<'waitlist'>;
export type TimeOff = Tables<'provider_time_off'>;

export interface Slot {
  startsAt: string; // ISO
  endsAt: string; // ISO
}

const DAY_MS = 86400000;

/** Genera huecos para los próximos `days` días a partir de la disponibilidad
 *  semanal, excluyendo los que chocan con citas ya reservadas, con bloqueos de
 *  vacaciones/horas (time_off) o que ya pasaron. Soporta VARIOS rangos por día
 *  (varias reglas para el mismo weekday). */
export function generateSlots(
  avail: Availability[],
  booked: Appointment[],
  timeOff: TimeOff[] = [],
  days = 14,
): Slot[] {
  const slots: Slot[] = [];
  const now = Date.now();
  const taken = booked
    .filter((a) => a.status === 'booked')
    .map((a) => [new Date(a.starts_at).getTime(), new Date(a.ends_at).getTime()] as const);
  const blocks = timeOff.map(
    (b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()] as const,
  );

  for (let d = 0; d < days; d++) {
    const day = new Date(now + d * DAY_MS);
    const weekday = day.getDay();
    for (const rule of avail) {
      if (!rule.is_active || rule.weekday !== weekday) continue;
      const [sh, sm] = rule.start_time.split(':').map(Number);
      const [eh, em] = rule.end_time.split(':').map(Number);
      const dayStart = new Date(day);
      dayStart.setHours(sh, sm, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(eh, em, 0, 0);
      for (let t = dayStart.getTime(); t + rule.slot_minutes * 60000 <= dayEnd.getTime() + 1; t += rule.slot_minutes * 60000) {
        const start = t;
        const end = t + rule.slot_minutes * 60000;
        if (start <= now) continue;
        if (taken.some(([bs, be]) => start < be && end > bs)) continue;
        if (blocks.some(([bs, be]) => start < be && end > bs)) continue;
        slots.push({ startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() });
      }
    }
  }
  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// ── Prestador ────────────────────────────────────────────────────────────────
export function useProviderAgenda() {
  const { userId } = useAuth();
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [a, c, w, o] = await Promise.all([
      supabase.from('provider_availability').select('*').eq('provider_id', userId).order('weekday'),
      supabase.from('appointments').select('*').eq('provider_id', userId).gte('starts_at', new Date(Date.now() - DAY_MS).toISOString()).order('starts_at'),
      supabase.from('waitlist').select('*').eq('provider_id', userId).eq('status', 'waiting').order('created_at'),
      supabase.from('provider_time_off').select('*').eq('provider_id', userId).gte('ends_at', new Date().toISOString()).order('starts_at'),
    ]);
    setAvailability(a.data ?? []);
    setAppointments(c.data ?? []);
    setWaitlist(w.data ?? []);
    setTimeOff(o.data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const saveAvailability = useCallback(async (rows: TablesInsert<'provider_availability'>[]): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'Sin sesión' };
    // Reemplaza la disponibilidad por completo.
    await supabase.from('provider_availability').delete().eq('provider_id', userId);
    if (rows.length > 0) {
      const { error } = await supabase.from('provider_availability').insert(rows.map((r) => ({ ...r, provider_id: userId })));
      if (error) return { ok: false, error: toMessage(error) };
    }
    await load();
    return { ok: true, data: true };
  }, [userId, load]);

  /** Añade un bloqueo (vacaciones = todo el día; o franja de horas). */
  const addTimeOff = useCallback(
    async (startsAt: string, endsAt: string, allDay: boolean, reason?: string): Promise<Result<true>> => {
      if (!userId) return { ok: false, error: 'Sin sesión' };
      const { error } = await supabase.from('provider_time_off').insert({
        provider_id: userId, starts_at: startsAt, ends_at: endsAt, all_day: allDay, reason: reason || null,
      });
      if (error) return { ok: false, error: toMessage(error) };
      await load();
      return { ok: true, data: true };
    },
    [userId, load],
  );

  const removeTimeOff = useCallback(async (id: string): Promise<Result<true>> => {
    const { error } = await supabase.from('provider_time_off').delete().eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const cancelAppointment = useCallback(async (id: string): Promise<Result<true>> => {
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const setVideoLink = useCallback(async (id: string, link: string): Promise<Result<true>> => {
    const { error } = await supabase.from('appointments').update({ video_link: link }).eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  // Aprobación del médico ANTES de avisar al paciente: el prestador asigna el
  // hueco liberado a un paciente de la lista de espera. Aquí se crea la cita
  // (lo que dispara el recordatorio/aviso); nunca se notifica antes de esto.
  const assignFromWaitlist = useCallback(
    async (entry: WaitlistEntry, slot: Slot, videoLink?: string): Promise<Result<true>> => {
      if (!userId) return { ok: false, error: 'Sin sesión' };
      const { error } = await supabase.from('appointments').insert({
        provider_id: userId,
        patient_id: entry.patient_id,
        starts_at: slot.startsAt,
        ends_at: slot.endsAt,
        status: 'booked',
        source: 'waitlist',
        video_link: videoLink || null,
      });
      if (error) return { ok: false, error: toMessage(error) };
      await supabase.from('waitlist').update({ status: 'assigned' }).eq('id', entry.id);
      await load();
      return { ok: true, data: true };
    },
    [userId, load],
  );

  return { availability, appointments, waitlist, timeOff, loading, reload: load, saveAvailability, addTimeOff, removeTimeOff, cancelAppointment, setVideoLink, assignFromWaitlist };
}

// ── Consumidor ───────────────────────────────────────────────────────────────
export function useConsumerAgenda(providerId: string) {
  const { userId } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    const [a, c, o] = await Promise.all([
      supabase.from('provider_availability').select('*').eq('provider_id', providerId).eq('is_active', true),
      supabase.from('appointments').select('*').eq('provider_id', providerId).eq('status', 'booked').gte('starts_at', new Date().toISOString()),
      supabase.from('provider_time_off').select('*').eq('provider_id', providerId).gte('ends_at', new Date().toISOString()),
    ]);
    setSlots(generateSlots(a.data ?? [], c.data ?? [], o.data ?? []));
    setLoading(false);
  }, [providerId]);

  useEffect(() => { void load(); }, [load]);

  const book = useCallback(
    async (slot: Slot, note?: string): Promise<Result<true>> => {
      if (!userId) return { ok: false, error: 'Sin sesión' };
      const { error } = await supabase.from('appointments').insert({
        provider_id: providerId,
        patient_id: userId,
        starts_at: slot.startsAt,
        ends_at: slot.endsAt,
        status: 'booked',
        source: 'booking',
        note: note || null,
      });
      if (error) return { ok: false, error: toMessage(error) };
      await load();
      return { ok: true, data: true };
    },
    [userId, providerId, load],
  );

  const joinWaitlist = useCallback(
    async (note?: string): Promise<Result<true>> => {
      if (!userId) return { ok: false, error: 'Sin sesión' };
      const { error } = await supabase.from('waitlist').insert({ provider_id: providerId, patient_id: userId, note: note || null });
      if (error) return { ok: false, error: toMessage(error) };
      return { ok: true, data: true };
    },
    [userId, providerId],
  );

  return { slots, loading, reload: load, book, joinWaitlist };
}

// ── Mis citas (consumidor) ─────────────────────────────────────────────────────
export function useMyAppointments() {
  const { userId } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', userId)
      .gte('starts_at', new Date(Date.now() - DAY_MS).toISOString())
      .order('starts_at');
    setAppointments(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const cancel = useCallback(async (id: string): Promise<Result<true>> => {
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  return { appointments, loading, reload: load, cancel };
}
