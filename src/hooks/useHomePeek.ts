/**
 * useHomePeek — las tres publicaciones más recientes del blog y los tres
 * próximos eventos, para la portada.
 *
 * Por qué existe (19 oct 2026): el blog y los eventos estaban sólo en el menú,
 * así que un visitante nuevo no se enteraba de que existen. Esto los asoma en
 * la portada con ejemplos reales.
 *
 * Consulta aparte y MUY corta (tres filas de cada uno) en vez de reutilizar
 * useBlogFeed y useEvents, que traen 300 filas cada uno para poder filtrar: en
 * la portada eso sería traer 600 registros para pintar seis.
 *
 * Funciona sin sesión. Los eventos se piden con las mismas condiciones que la
 * página pública —publicado y aprobado—, para que una propuesta pendiente no
 * se asome en la portada como si ya estuviera anunciada.
 *
 * Un fallo de la consulta NO es una lista vacía: `fallo` lo distingue, y la
 * portada simplemente no pinta el bloque en vez de mentir con «no hay nada».
 * (Hallazgo A-12.)
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface PeekPost {
  id: string;
  title: string;
  cover_url: string | null;
  topic: string | null;
  type: string | null;
  external_url: string | null;
}

export interface PeekEvent {
  id: string;
  title: string;
  cover_url: string | null;
  starts_at: string;
  timezone: string | null;
  hora_confirmada: boolean;
  city: string | null;
  country: string | null;
  is_online: boolean;
}

export function useHomePeek() {
  const [posts, setPosts] = useState<PeekPost[]>([]);
  const [events, setEvents] = useState<PeekEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      // Desde ayer, para no esconder un evento que empieza hoy.
      const desde = new Date(Date.now() - 86400000).toISOString();
      const [b, e] = await Promise.all([
        supabase
          .from('blog_feed')
          .select('id, title, cover_url, topic, type, external_url')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('events')
          .select('id, title, cover_url, starts_at, timezone, hora_confirmada, city, country, is_online')
          .eq('is_published', true)
          .eq('revision', 'aprobado')
          .gte('starts_at', desde)
          .order('starts_at', { ascending: true })
          .limit(3),
      ]);
      if (!vivo) return;
      setFallo(!!b.error || !!e.error);
      setPosts((b.data ?? []) as unknown as PeekPost[]);
      setEvents((e.data ?? []) as unknown as PeekEvent[]);
      setLoading(false);
    })();
    return () => { vivo = false; };
  }, []);

  return { posts, events, loading, fallo };
}
