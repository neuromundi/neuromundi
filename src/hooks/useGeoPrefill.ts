/**
 * useGeoPrefill — PREFILL opcional del país por IP. Si la persona aún no ha
 * elegido país (ni lo tiene guardado), hace UNA consulta ligera de geolocalización
 * por IP y preselecciona el país en `countryStore`. Es solo una conveniencia: el
 * usuario puede cambiarlo en el selector y su elección manda siempre. No pide
 * permisos del navegador (no usa GPS) y es a prueba de fallos (si la API no
 * responde, no pasa nada).
 */
import { useEffect } from 'react';
import { useCountry } from '@/stores/countryStore';
import { COUNTRIES } from '@/data/countries';

const SS_TRIED = 'neuro.geoPrefillTried';
// ISO-3166 alfa-2 (mayúsculas) → nombre canónico en español (igual que profiles.country).
const CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code.toUpperCase(), c.name]),
);

export function useGeoPrefill(): void {
  const { country, setCountry } = useCountry();

  useEffect(() => {
    // Ya hay país elegido/guardado: no se toca.
    if (country) return;
    // Una sola vez por sesión, aunque el usuario navegue entre páginas.
    try {
      if (sessionStorage.getItem(SS_TRIED)) return;
      sessionStorage.setItem(SS_TRIED, '1');
    } catch { /* almacenamiento no disponible */ }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    (async () => {
      try {
        const r = await fetch('https://ipwho.is/?fields=country_code', { signal: ctrl.signal });
        if (!r.ok) return;
        const data = (await r.json()) as { country_code?: string };
        const code = (data.country_code ?? '').toUpperCase();
        const name = CODE_TO_NAME[code];
        // Solo si seguimos sin país (el usuario pudo elegir mientras tanto).
        if (name && !useCountry.getState().country) setCountry(name);
      } catch { /* sin red / bloqueado / timeout: se ignora */ }
      finally { clearTimeout(timer); }
    })();

    return () => { clearTimeout(timer); ctrl.abort(); };
    // Solo en el primer montaje; no debe re-disparar al cambiar el país.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
