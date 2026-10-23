/**
 * homeTrack — telemetría de clics en las opciones de la portada.
 *
 * Mejor esfuerzo: nunca bloquea la navegación ni propaga errores (si la red o
 * Supabase fallan, el clic se pierde en silencio, jamás rompe la UX). Añade el
 * país vigente del selector (countryStore) para el desglose por país.
 *
 * Deduplica el mismo `option` dentro de una ventana corta para no contar dos
 * veces un rebote de evento o un doble clic accidental.
 */
import { supabase } from '@/lib/supabase';
import { useCountry } from '@/stores/countryStore';

const DEDUPE_MS = 800;
let ultimo: { option: string; t: number } = { option: '', t: 0 };

export function trackHomeClick(option: string): void {
  const ahora = Date.now();
  if (option === ultimo.option && ahora - ultimo.t < DEDUPE_MS) return;
  ultimo = { option, t: ahora };

  const country = useCountry.getState().country ?? null;
  void (async () => {
    try {
      await supabase.rpc('track_home_event', { p_option: option, p_country: country });
    } catch {
      /* la telemetría nunca interrumpe al usuario */
    }
  })();
}
