/**
 * useEventosPropios — los eventos que propone un prestador.
 *
 * Por qué existe (decisión de Enyoria, 16 oct 2026): la tabla de eventos sólo
 * la escribía el administrador, así que un prestador con un taller el sábado
 * tenía que pedirle a mano que lo publicara. Ahora lo propone él y usted lo
 * revisa: nace pendiente y sin publicar, y sólo la aprobación lo pone en la
 * página pública.
 *
 * El alta va por RPC —el prestador nunca escribe la tabla directo— porque
 * `created_by`, `revision` e `is_published` no pueden quedar a su elección. La
 * corrección y el retiro sí van por la tabla, con las políticas de la
 * migración 0249, que sólo lo permiten mientras sigue pendiente.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export type RevisionEvento = 'pendiente' | 'aprobado' | 'rechazado';

export interface EventoPropio {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_online: boolean;
  online_url: string | null;
  info_url: string | null;
  country: string | null;
  city: string | null;
  venue: string | null;
  starts_at: string;
  ends_at: string | null;
  cover_url: string | null;
  is_published: boolean;
  revision: RevisionEvento;
  nota_admin: string | null;
  created_at: string;
}

export interface PropuestaEvento {
  title: string;
  starts_at: string;
  description?: string | null;
  category?: string | null;
  is_online: boolean;
  online_url?: string | null;
  info_url?: string | null;
  country?: string | null;
  city?: string | null;
  venue?: string | null;
  ends_at?: string | null;
  cover_url?: string | null;
}

type Resultado = { ok: boolean; error?: string };

/** Traduce el motivo que devuelve la base a una clave de texto. */
export function claveDeMotivoEvento(motivo?: string): string {
  switch (motivo) {
    case 'sin_sesion': return 'events.err.sinSesion';
    case 'solo_prestadores': return 'events.err.soloPrestadores';
    case 'titulo_corto': return 'events.err.tituloCorto';
    case 'demasiado_largo': return 'events.err.largo';
    case 'sin_fecha': return 'events.err.sinFecha';
    case 'fecha_pasada': return 'events.err.fechaPasada';
    case 'fecha_muy_lejana': return 'events.err.fechaLejana';
    case 'fin_antes_del_inicio': return 'events.err.finAntes';
    case 'falta_enlace': return 'events.err.faltaEnlace';
    case 'enlace_no_valido': return 'events.err.enlaceNoValido';
    case 'falta_lugar': return 'events.err.faltaLugar';
    case 'portada_no_valida': return 'events.err.portadaNoValida';
    case 'ya_tiene_pendientes': return 'events.err.yaPendientes';
    case 'tope_mensual': return 'events.err.topeMensual';
    default: return 'common.errorGeneric';
  }
}

export function useEventosPropios() {
  const { userId } = useAuth();
  const [items, setItems] = useState<EventoPropio[]>([]);
  const [loading, setLoading] = useState(true);
  // Un fallo de la consulta NO es una lista vacía. (Hallazgo A-12.)
  const [fallo, setFallo] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, category, is_online, online_url, info_url, country, city, venue, starts_at, ends_at, cover_url, is_published, revision, nota_admin, created_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    setFallo(!!error);
    setItems(error ? [] : ((data ?? []) as unknown as EventoPropio[]));
    setLoading(false);
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);

  const proponer = useCallback(async (p: PropuestaEvento, traducir: (clave: string) => string): Promise<Resultado> => {
    const { data, error } = await supabase.rpc('proponer_evento', {
      p_title: p.title,
      p_starts_at: p.starts_at,
      p_description: p.description ?? null,
      p_category: p.category ?? null,
      p_is_online: p.is_online,
      p_online_url: p.online_url ?? null,
      p_country: p.country ?? null,
      p_city: p.city ?? null,
      p_venue: p.venue ?? null,
      p_ends_at: p.ends_at ?? null,
      p_cover_url: p.cover_url ?? null,
    });
    if (error) return { ok: false, error: error.message };
    const r = (data ?? null) as { ok?: boolean; motivo?: string; id?: string } | null;
    if (r?.ok !== true) return { ok: false, error: traducir(claveDeMotivoEvento(r?.motivo)) };
    // El enlace a la convocatoria se guarda aparte: la función proponer_evento
    // conserva su firma (cambiarla crearía una segunda función con el mismo
    // nombre y dejaría la llamada ambigua). Mientras la propuesta sigue
    // pendiente, la política 0249 permite al prestador actualizar su fila.
    const enlace = (p.info_url ?? '').trim();
    if (r.id && enlace) {
      await supabase.from('events').update({ info_url: enlace }).eq('id', r.id);
    }
    await reload();
    return { ok: true };
  }, [reload]);

  /** Corrige una propuesta. Sólo funciona mientras sigue pendiente (política 0249). */
  const corregir = useCallback(async (id: string, patch: Partial<PropuestaEvento>): Promise<Resultado> => {
    const { error } = await supabase.from('events').update(patch).eq('id', id);
    if (error) return { ok: false, error: error.message };
    await reload();
    return { ok: true };
  }, [reload]);

  const retirar = useCallback(async (id: string): Promise<Resultado> => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    await reload();
    return { ok: true };
  }, [reload]);

  const pendientes = items.filter((e) => e.revision === 'pendiente').length;

  return { items, loading, fallo, reload, proponer, corregir, retirar, pendientes };
}
