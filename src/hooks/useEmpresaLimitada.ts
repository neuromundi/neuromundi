/**
 * useEmpresaLimitada — ¿esta cuenta de empresa tiene funciones limitadas?
 *
 * Una empresa cuya membresía es gratuita y que lleva 45 días sin publicar
 * ninguna oferta de empleo, voluntariado o servicio social pierde mensajería
 * y Academy hasta que publique (migración 0223). No se le cobra nada y todo
 * se reactiva solo al publicar.
 *
 * Devuelve `false` mientras carga, a propósito: ante la duda se deja pasar.
 * Bloquear a alguien por una consulta que todavía no respondió sería peor
 * falla que dejar entrar un minuto de más a quien está limitado.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function useEmpresaLimitada(): { limitada: boolean; cargando: boolean } {
  const { userId } = useAuth();
  const [limitada, setLimitada] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!userId) { setLimitada(false); setCargando(false); return; }
    let vivo = true;
    (async () => {
      const { data } = await supabase.rpc('empresa_estado', { p_id: userId });
      if (!vivo) return;
      const e = data as { aplica?: boolean; etapa?: string } | null;
      setLimitada(e?.aplica === true && e.etapa === 'limitada');
      setCargando(false);
    })();
    return () => { vivo = false; };
  }, [userId]);

  return { limitada, cargando };
}
