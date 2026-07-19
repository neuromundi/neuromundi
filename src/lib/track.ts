/**
 * track — evento de analítica ligero y sin dependencias.
 *
 *  - Empuja a window.dataLayer (compatible con Google Tag Manager / GA4).
 *  - Best-effort: intenta registrar el evento en Supabase (tabla analytics_events)
 *    y silencia cualquier error (si la tabla/políticas no existen aún, no rompe).
 *
 * Se usa, por ejemplo, para medir la conversión del popup de Miembro Fundador
 * (clics en el CTA vs. cierres).
 */
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function track(event: string, props: Record<string, unknown> = {}): void {
  try {
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event, ...props });
    }
  } catch {
    /* noop */
  }

  // Registro server-side opcional (no bloquea ni lanza si falla).
  try {
    void (supabase as unknown as {
      from: (t: string) => { insert: (v: unknown) => Promise<unknown> };
    })
      .from('analytics_events')
      .insert({ event, props })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    /* noop */
  }
}
