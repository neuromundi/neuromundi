/**
 * useEvents — eventos de la comunidad (curados por el admin).
 *
 * Lista los eventos publicados y próximos (lectura pública). Para administradores
 * expone crear/editar/eliminar. El filtrado por país/en línea/texto se hace en la
 * página. Degrada con gracia si la migración 0019 aún no se aplicó.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Result } from '@/types/app';

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_online: boolean;
  online_url: string | null;
  info_url?: string | null;
  timezone?: string | null;
  hora_confirmada?: boolean;
  paises?: string[];
  sections?: string[];
  country: string | null;
  city: string | null;
  venue: string | null;
  starts_at: string;
  ends_at: string | null;
  cover_url: string | null;
  is_published: boolean;
  revision?: string | null;
  nota_admin?: string | null;
}

export interface EventInput {
  title: string;
  description?: string | null;
  category?: string | null;
  is_online: boolean;
  online_url?: string | null;
  info_url?: string | null;
  timezone?: string | null;
  hora_confirmada?: boolean;
  paises?: string[];
  sections?: string[];
  country?: string | null;
  city?: string | null;
  venue?: string | null;
  starts_at: string;
  ends_at?: string | null;
  cover_url?: string | null;
  is_published?: boolean;
}

export const EVENT_CATEGORIES = [
  'congress',
  'workshop',
  'talk',
  'group_therapy',
  'fair',
  'webinar',
  'support_group',
  'other',
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export function useEvents() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallo, setFallo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFallo(false);
    // Desde ayer para no ocultar los que empiezan hoy; próximos primero.
    const since = new Date(Date.now() - 86400000).toISOString();
    let q = supabase
      .from('events')
      .select('*')
      .gte('starts_at', since)
      .order('starts_at', { ascending: true })
      .limit(300);
    // El admin ve también los no publicados y los pendientes (RLS lo permite).
    // Para todos los demás la página sólo muestra lo aprobado y publicado: desde
    // la migración 0249 un prestador puede leer sus propias propuestas, y sin
    // este filtro vería su evento pendiente en la página pública como si ya
    // estuviera anunciado.
    if (!isAdmin) q = q.eq('is_published', true).eq('revision', 'aprobado');
    // El error se tiraba: una carga que FALLA quedaba igual que "no hay",
    // y la pantalla lo decia. (Repaso adversario, 19 oct 2026.)
    const { data, error } = await q;
    if (error) { setFallo(true); setLoading(false); return; }
    setEvents((data ?? []) as unknown as EventItem[]);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  const createEvent = useCallback(async (input: EventInput): Promise<Result<true>> => {
    const { error } = await supabase.from('events').insert(input);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const updateEvent = useCallback(async (id: string, patch: Partial<EventInput>): Promise<Result<true>> => {
    const { error } = await supabase.from('events').update(patch).eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  const deleteEvent = useCallback(async (id: string): Promise<Result<true>> => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [load]);

  return { events, loading, fallo, reload: load, createEvent, updateEvent, deleteEvent };
}
