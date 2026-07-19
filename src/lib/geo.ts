/**
 * geo — detección ligera de país del usuario SIN pedir permisos ni red.
 * Se basa en la zona horaria del navegador (señal fuerte de ubicación) y, como
 * apoyo, en el locale regional. Útil, por ejemplo, para mostrar la bandera de
 * México en el selector de idioma cuando el idioma es español.
 */

const MX_TIMEZONES = new Set([
  'America/Mexico_City',
  'America/Cancun',
  'America/Merida',
  'America/Monterrey',
  'America/Matamoros',
  'America/Mazatlan',
  'America/Chihuahua',
  'America/Ciudad_Juarez',
  'America/Ojinaga',
  'America/Hermosillo',
  'America/Tijuana',
  'America/Bahia_Banderas',
]);

/** Heurística: ¿el usuario parece estar en México? */
export function isLikelyMexico(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (MX_TIMEZONES.has(tz)) return true;
    const langs: string[] = (navigator.languages as string[]) ?? [navigator.language];
    if (langs.some((l) => /-MX$/i.test(l))) return true;
  } catch {
    /* entornos sin Intl/navigator: ignorar */
  }
  return false;
}
