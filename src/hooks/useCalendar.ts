/**
 * useCalendar — calendario personal del usuario.
 *
 * Reúne en una sola línea de tiempo:
 *   - sus entradas propias (calendar_entries): eventos guardados, terapias,
 *     citas manuales y notas personales;
 *   - sus citas agendadas (appointments donde es paciente), en solo lectura.
 * Permite agregar/quitar entradas propias y guardar un evento en el calendario.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Result } from '@/types/app';
import type { EventItem } from '@/hooks/useEvents';

export type EntryKind = 'event' | 'appointment' | 'therapy' | 'personal';

export interface CalEntry {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  online_url: string | null;
  kind: string;
  source_event_id: string | null;
}

export interface CalendarItem {
  /** Clave única compuesta (fuente + id). */
  key: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  online_url: string | null;
  kind: EntryKind;
  /** Solo las entradas propias se pueden eliminar. */
  editable: boolean;
  entryId: string | null;
}

export interface NewEntry {
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  online_url?: string | null;
  kind?: EntryKind;
}

export function useCalendar() {
  const { userId } = useAuth();
  const [entries, setEntries] = useState<CalEntry[]>([]);
  const [appts, setAppts] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) { setEntries([]); setAppts([]); setLoading(false); return; }
    setLoading(true);
    const since = new Date(Date.now() - 86400000).toISOString();

    // Entradas propias.
    const { data: ce } = await supabase
      .from('calendar_entries' as never)
      .select('*')
      .eq('user_id', userId)
      .order('starts_at', { ascending: true });
    setEntries((ce ?? []) as unknown as CalEntry[]);

    // Citas del usuario (como paciente), en solo lectura.
    const { data: ap } = await supabase
      .from('appointments')
      .select('id, provider_id, starts_at, ends_at, status, video_link')
      .eq('patient_id', userId)
      .neq('status', 'cancelled')
      .gte('starts_at', since)
      .order('starts_at', { ascending: true });
    const apptRows = ap ?? [];
    // Nombres de los prestadores para mostrar en la cita.
    const provIds = [...new Set(apptRows.map((a) => a.provider_id))];
    const names: Record<string, string> = {};
    if (provIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, business_name, full_name')
        .in('id', provIds);
      for (const p of profs ?? []) names[p.id] = p.business_name || p.full_name || '';
    }
    setAppts(
      apptRows.map((a) => ({
        key: `a:${a.id}`,
        title: names[a.provider_id] || '',
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        location: null,
        online_url: a.video_link ?? null,
        kind: 'appointment' as EntryKind,
        editable: false,
        entryId: null,
      })),
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const items = useMemo<CalendarItem[]>(() => {
    const own: CalendarItem[] = entries.map((e) => ({
      key: `c:${e.id}`,
      title: e.title,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      location: e.location,
      online_url: e.online_url,
      kind: (['event', 'appointment', 'therapy', 'personal'].includes(e.kind) ? e.kind : 'personal') as EntryKind,
      editable: true,
      entryId: e.id,
    }));
    return [...own, ...appts].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [entries, appts]);

  const savedEventIds = useMemo(
    () => new Set(entries.map((e) => e.source_event_id).filter(Boolean) as string[]),
    [entries],
  );

  const addEntry = useCallback(async (input: NewEntry): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'auth.required' };
    setSaving(true);
    const { error } = await supabase.from('calendar_entries' as never).insert({
      user_id: userId,
      title: input.title.trim(),
      description: input.description ?? null,
      starts_at: input.starts_at,
      ends_at: input.ends_at ?? null,
      location: input.location ?? null,
      online_url: input.online_url ?? null,
      kind: input.kind ?? 'personal',
    } as never);
    setSaving(false);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [userId, load]);

  const removeEntry = useCallback(async (entryId: string): Promise<Result<true>> => {
    setSaving(true);
    const { error } = await supabase.from('calendar_entries' as never).delete().eq('id', entryId);
    setSaving(false);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const saveEventToCalendar = useCallback(async (ev: EventItem): Promise<Result<true>> => {
    if (!userId) return { ok: false, error: 'auth.required' };
    if (savedEventIds.has(ev.id)) return { ok: true, data: true };
    const location = ev.is_online
      ? null
      : [ev.venue, ev.city, ev.country].filter(Boolean).join(', ') || null;
    setSaving(true);
    const { error } = await supabase.from('calendar_entries' as never).insert({
      user_id: userId,
      title: ev.title,
      description: ev.description ?? null,
      starts_at: ev.starts_at,
      ends_at: ev.ends_at ?? null,
      location,
      online_url: ev.is_online ? ev.online_url ?? null : null,
      kind: 'event',
      source_event_id: ev.id,
    } as never);
    setSaving(false);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [userId, savedEventIds, load]);

  return { items, loading, saving, savedEventIds, addEntry, removeEntry, saveEventToCalendar, reload: load };
}
