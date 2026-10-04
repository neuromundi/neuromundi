/**
 * badgeArt — resuelve el ARTE del distintivo según el idioma del usuario.
 *
 * Cada distintivo tiene su arte en español (base) y, cuando existe, versiones por
 * idioma. La regla de selección es: idioma exacto → inglés → español. Así, el
 * inglés opera como respaldo para todos los idiomas que aún no tengan su arte
 * propio, y el español es el último recurso. "Neuromundi" es marca y no se traduce.
 *
 * Para añadir el arte de un idioma: sube el archivo a public/badges con sufijo de
 * idioma (p. ej. `miembro-destacado-ja.png`) y agrégalo al mapa de abajo.
 */
export const BADGE_ART: Record<string, Record<string, string>> = {
  'miembro-verificado': { es: '/badges/miembro-verificado.jpg' },
  'miembro-destacado': { es: '/badges/miembro-destacado.jpg', en: '/badges/miembro-destacado-en.png' },
  'embajador-neuromundi': { es: '/badges/embajador-neuromundi.jpg' },
  'soy-fundador-neuromundi': { es: '/badges/soy-fundador-neuromundi.jpg' },
  'neuromundi-global-member': { es: '/badge/neuromundi-global-member-512.png' },
  'aliados-neuromundi': { es: '/badges/aliados-neuromundi.jpg', en: '/badges/aliados-neuromundi-en.png' },
  'escuela-inclusiva': { es: '/badges/escuela-inclusiva.jpg', en: '/badges/escuela-inclusiva-en.png' },
  'empresa-inclusiva': { es: '/badges/empresa-inclusiva.jpg', en: '/badges/empresa-inclusiva-en.png' },
};

/** Devuelve la ruta del arte del distintivo para el idioma dado (idioma → en → es). */
export function badgeArt(name: string, lang: string | null | undefined): string {
  const m = BADGE_ART[name] ?? {};
  const l = (lang || 'es').slice(0, 2);
  return m[l] ?? m.en ?? m.es ?? '';
}
