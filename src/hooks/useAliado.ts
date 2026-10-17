/**
 * useAliado — la propuesta de una organización para el muro de Aliados.
 *
 * Por qué existe (migración 0255, decisión de Enyoria del 17 oct 2026): la
 * sección de Aliados era una lista que sólo cargaba el administrador y no se
 * tocaba con el directorio. La tanda de correo a las organizaciones les
 * promete que al reclamar su ficha pueden aparecer ahí, así que ese camino
 * tenía que existir de verdad.
 *
 * La puerta está en la base, no aquí: proponer_aliado exige haber reclamado
 * una ficha. Esta pantalla sólo muestra el resultado.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type EstadoAliado = 'propuesto' | 'aprobado' | 'rechazado';

export interface PropuestaAliado {
  id: string;
  name: string;
  website: string | null;
  logo_url: string | null;
  countries: string[] | null;
  estado: EstadoAliado;
  nota_admin: string | null;
  propuesta_en: string | null;
  is_active: boolean;
}

type Resultado = { ok: boolean; error?: string };

/** Traduce el motivo que devuelve la base a una clave de texto. */
export function claveDeMotivoAliado(motivo?: string): string {
  switch (motivo) {
    case 'sin_sesion': return 'aliados.err.sinSesion';
    case 'sin_ficha_reclamada': return 'aliados.err.sinFicha';
    case 'nombre_corto': return 'aliados.err.nombreCorto';
    case 'demasiado_largo': return 'aliados.err.largo';
    case 'sitio_no_valido': return 'aliados.err.sitioNoValido';
    case 'logo_no_valido': return 'aliados.err.logoNoValido';
    case 'demasiados_paises': return 'aliados.err.muchosPaises';
    case 'ya_tiene_propuesta': return 'aliados.err.yaTiene';
    default: return 'common.errorGeneric';
  }
}

export function useAliado() {
  const [items, setItems] = useState<PropuestaAliado[]>([]);
  const [loading, setLoading] = useState(true);
  // Un fallo de la consulta NO es "no ha propuesto nada". (Hallazgo A-12.)
  const [fallo, setFallo] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('mi_propuesta_de_aliado');
    setFallo(!!error);
    setItems(error ? [] : ((data ?? []) as PropuestaAliado[]));
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const proponer = useCallback(async (
    p: { name: string; website?: string | null; logo_url?: string | null; countries?: string[] | null },
    traducir: (clave: string) => string,
  ): Promise<Resultado> => {
    const { data, error } = await supabase.rpc('proponer_aliado', {
      p_name: p.name,
      p_website: p.website ?? null,
      p_logo_url: p.logo_url ?? null,
      p_countries: p.countries ?? null,
    });
    if (error) return { ok: false, error: error.message };
    const r = (data ?? null) as { ok?: boolean; motivo?: string } | null;
    if (r?.ok !== true) return { ok: false, error: traducir(claveDeMotivoAliado(r?.motivo)) };
    await reload();
    return { ok: true };
  }, [reload]);

  const viva = items.find((x) => x.estado === 'propuesto') ?? null;
  const publicada = items.find((x) => x.estado === 'aprobado' && x.is_active) ?? null;

  return { items, viva, publicada, loading, fallo, reload, proponer };
}
