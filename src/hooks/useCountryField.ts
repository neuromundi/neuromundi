/**
 * useCountryField — campo de país de los formularios de registro, enlazado al
 * store global (`useCountry`).
 *
 * POR QUÉ EXISTE
 *   Había dos países distintos y nadie los reconciliaba: el del store (elegido
 *   en el Home o en el directorio, guardado en localStorage) y el del
 *   formulario de registro, que arrancaba vacío y termina en `profiles.country`.
 *
 *   Eso producía el peor caso de todos: la persona veía los precios de su país
 *   —que salen del store— y guardaba el perfil sin país. Y el cobro lee
 *   `profiles.country`, así que `founder_eligible()` la rechazaba y el checkout
 *   le cobraba la tarifa ORDINARIA, el doble de la que había visto.
 *
 *   Este hook es un reemplazo directo de `useState('')`: arranca con lo que ya
 *   eligió la persona y escribe de vuelta en el store cuando lo cambia, de modo
 *   que el precio que ve y el que se le cobra salen del mismo dato.
 */
import { useCallback, useState } from 'react';
import { useCountry } from '@/stores/countryStore';

export function useCountryField(): [string, (value: string) => void] {
  const { country, setCountry } = useCountry();
  const [value, setValue] = useState<string>(country ?? '');

  const set = useCallback((next: string) => {
    setValue(next);
    setCountry(next || null);
  }, [setCountry]);

  return [value, set];
}
