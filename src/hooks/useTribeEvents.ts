/**
 * useTribeEvents — eventos de la Tribu (F5) con guía de anticipación obligatoria.
 * Crear (+20 al creador), asistir (RSVP), reporte de accesibilidad sensorial
 * (+15 la primera vez) y listado con estado propio. Lecturas por RPC.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface TribeEvent {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  location: string | null;
  is_online: boolean;
  city: string | null;
  country: string | null;
  noise: string;
  quiet_room: boolean;
  sensory_tips: string | null;
  creator_name: string;
  going: number;
  i_going: boolean;
  i_reported: boolean;
  is_past: boolean;
}

export interface EventInput {
  title: string; description: string; starts_at: string; location: string;
  is_online: boolean; city: string; country: string; noise: string;
  quiet_room: boolean; sensory_tips: string;
}

export function useTribeEvents(country: string) {
  const [events, setEvents] = useState<TribeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('tribe_events_list', { p_country: country || null });
    setEvents((data as TribeEvent[] | null) ?? []);
    setLoading(false);
  }, [country]);
  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (input: EventInput): Promise<string | null> => {
    const { error } = await supabase.rpc('tribe_create_event', {
      p_title: input.title, p_description: input.description, p_starts_at: input.starts_at,
      p_location: input.location || null, p_is_online: input.is_online, p_city: input.city || null,
      p_country: input.country || null, p_noise: input.noise, p_quiet_room: input.quiet_room,
      p_sensory_tips: input.sensory_tips || null,
    });
    if (error) return error.message;
    await load();
    return null;
  }, [load]);

  const rsvp = useCallback(async (eventId: string, going: boolean): Promise<boolean> => {
    const { error } = await supabase.rpc('tribe_event_rsvp', { p_event: eventId, p_going: going });
    if (!error) await load();
    return !error;
  }, [load]);

  const cancel = useCallback(async (eventId: string): Promise<boolean> => {
    const { error } = await supabase.rpc('tribe_cancel_event', { p_event: eventId });
    if (!error) await load();
    return !error;
  }, [load]);

  const report = useCallback(async (eventId: string, r: { noise: number; quietUsed: boolean; comfort: number; notes: string }): Promise<string | null> => {
    const { error } = await supabase.rpc('tribe_event_sensory_report', {
      p_event: eventId, p_noise: r.noise, p_quiet_used: r.quietUsed, p_comfort: r.comfort, p_notes: r.notes || null,
    });
    if (error) return error.message;
    await load();
    return null;
  }, [load]);

  return { events, loading, reload: load, create, rsvp, cancel, report };
}
