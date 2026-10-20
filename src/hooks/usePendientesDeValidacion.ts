/**
 * usePendientesDeValidacion — cuantos perfiles esperan una decision del
 * administrador.
 *
 * Antes no habia ninguna cifra: para saber si alguien llevaba dias esperando
 * el Filtro Cero habia que entrar a Moderacion y contar a ojo, y los
 * documentos de organizacion vivian en otra seccion distinta. Una sola llamada
 * (`admin_pendientes_de_validacion`) trae los tres numeros y la fecha del
 * documento mas antiguo sin revisar.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';

export interface Pendientes {
  /** Proveedores sin el Filtro Cero (profiles.is_verified = false). */
  sinFiltroCero: number;
  /** Proveedores que todavia no estan publicados. */
  sinPublicar: number;
  /** Documentos de organizacion enviados y sin resolver. */
  documentosPorRevisar: number;
  /** Fecha del documento sin resolver mas antiguo, si hay alguno. */
  documentoMasAntiguo: string | null;
}

export interface UsePendientesValue {
  pendientes: Pendientes | null;
  /** Cierto mientras no se sabe nada todavia. */
  cargando: boolean;
  /** Mensaje de fallo; con fallo NO se muestran ceros, que mentirian. */
  fallo: string | null;
  recargar: () => Promise<void>;
}

type Fila = {
  sin_filtro_cero: number | string | null;
  sin_publicar: number | string | null;
  documentos_por_revisar: number | string | null;
  documento_mas_antiguo: string | null;
};

// El servidor devuelve bigint, que llega como texto en JSON.
const aNumero = (v: number | string | null): number => {
  const n = typeof v === 'string' ? Number.parseInt(v, 10) : v;
  return Number.isFinite(n as number) ? (n as number) : 0;
};

/**
 * @param activo cuando es falso no se pregunta nada al servidor (un ASESOR no
 *   ve estas secciones y no tiene por que pedir la cifra).
 */
export function usePendientesDeValidacion(activo = true): UsePendientesValue {
  const [pendientes, setPendientes] = useState<Pendientes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!activo) {
      setPendientes(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    setFallo(null);
    const { data, error } = await supabase.rpc('admin_pendientes_de_validacion');
    if (error) {
      setFallo(toMessage(error, 'No se pudo saber cuantos perfiles esperan validacion.'));
      setPendientes(null);
      setCargando(false);
      return;
    }
    const fila = (Array.isArray(data) ? data[0] : data) as Fila | undefined;
    setPendientes(
      fila
        ? {
            sinFiltroCero: aNumero(fila.sin_filtro_cero),
            sinPublicar: aNumero(fila.sin_publicar),
            documentosPorRevisar: aNumero(fila.documentos_por_revisar),
            documentoMasAntiguo: fila.documento_mas_antiguo ?? null,
          }
        : { sinFiltroCero: 0, sinPublicar: 0, documentosPorRevisar: 0, documentoMasAntiguo: null },
    );
    setCargando(false);
  }, [activo]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { pendientes, cargando, fallo, recargar };
}
