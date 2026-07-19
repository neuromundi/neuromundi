/**
 * useCatLabel — traduce una clave de catálogo a la etiqueta del idioma activo.
 * Busca `cat.<value>`; si no hay traducción, usa el respaldo en español que
 * viene en los datos. Permite localizar los catálogos sin duplicar los datos.
 */
import { useTranslation } from 'react-i18next';

export function useCatLabel() {
  const { t } = useTranslation();
  return (value: string, fallback: string) => t(`cat.${value}`, { defaultValue: fallback });
}
