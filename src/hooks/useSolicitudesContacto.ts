/**
 * useSolicitudesContacto — solicitudes de contacto entre una familia y un
 * prestador del directorio.
 *
 * Por qué existe (decisión de Enyoria, 16 oct 2026): hasta ahora una familia
 * que encontraba a una terapeuta en el directorio no tenía forma de
 * preguntarle nada; sólo podían escribirse quienes ya tenían una relación
 * previa. Se eligió la vía de SOLICITUD y no la de mensaje abierto: la familia
 * manda una presentación corta, el prestador acepta o no, y sólo entonces se
 * abre el hilo. Protege el buzón de quien paga la membresía.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type EstadoSolicitud = 'pendiente' | 'aceptada' | 'rechazada';

export interface SolicitudContacto {
  id: string;
  /** De qué lado estoy yo en esta solicitud. */
  soy: 'prestador' | 'consumidor';
  otro_nombre: string | null;
  otro_member_no: number | null;
  mensaje: string;
  estado: EstadoSolicitud;
  nota_respuesta: string | null;
  created_at: string;
  resuelta_en: string | null;
}

type Resultado = { ok: boolean; motivo?: string };

/** Traduce el motivo que devuelve la base a una clave de texto. */
export function claveDeMotivo(motivo?: string): string {
  switch (motivo) {
    case 'mensaje_corto': return 'contacto.err.corto';
    case 'mensaje_largo': return 'contacto.err.largo';
    case 'no_aplica': return 'contacto.err.noAplica';
    case 'prestador_no_encontrado': return 'contacto.err.noEncontrado';
    case 'demasiadas_hoy': return 'contacto.err.demasiadasHoy';
    case 'demasiadas_vivas': return 'contacto.err.demasiadasVivas';
    case 'ya_hay_una_pendiente': return 'contacto.err.yaPendiente';
    case 'ya_resuelta': return 'contacto.err.yaResuelta';
    default: return 'common.errorGeneric';
  }
}

export function useSolicitudesContacto(estado: EstadoSolicitud | 'todas' = 'todas') {
  const [items, setItems] = useState<SolicitudContacto[]>([]);
  const [loading, setLoading] = useState(true);
  // Un fallo de la consulta NO es una bandeja vacía. (Hallazgo A-12.)
  const [fallo, setFallo] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('mis_solicitudes_de_contacto', { p_estado: estado });
    setFallo(!!error);
    setItems(error ? [] : ((data ?? []) as SolicitudContacto[]));
    setLoading(false);
  }, [estado]);

  useEffect(() => { void reload(); }, [reload]);

  const responder = useCallback(
    async (id: string, aceptar: boolean, nota?: string): Promise<{ ok: boolean; error?: string }> => {
      const { data, error } = await supabase.rpc('responder_solicitud_contacto', {
        p_id: id, p_aceptar: aceptar, p_nota: nota ?? null,
      });
      if (error) return { ok: false, error: error.message };
      const r = data as Resultado | null;
      if (r?.ok) { await reload(); return { ok: true }; }
      return { ok: false, error: r?.motivo };
    },
    [reload],
  );

  return { items, loading, fallo, reload, responder };
}

/** Manda la solicitud. Devuelve el motivo tal cual para que la pantalla lo traduzca. */
export async function solicitarContacto(
  providerMemberNo: number, mensaje: string,
): Promise<Resultado> {
  const { data, error } = await supabase.rpc('solicitar_contacto', {
    p_provider_member_no: providerMemberNo, p_mensaje: mensaje,
  });
  if (error) return { ok: false, motivo: error.message };
  return (data as Resultado | null) ?? { ok: false };
}
