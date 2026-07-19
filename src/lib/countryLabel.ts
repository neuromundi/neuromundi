/**
 * useCountryLabel — devuelve una función que localiza el nombre de un país a
 * partir de su código ISO (Intl.DisplayNames) según el idioma activo. El valor
 * almacenado sigue siendo el nombre canónico en español (para el filtrado por
 * país en el servidor); solo se traduce lo que se muestra al usuario.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export function useCountryLabel() {
  const { i18n } = useTranslation();
  const dn = useMemo(() => {
    try {
      return new Intl.DisplayNames([i18n.language], { type: 'region' });
    } catch {
      return null;
    }
  }, [i18n.language]);
  return (code: string, fallback: string) => dn?.of(code) ?? fallback;
}
