/**
 * latamAudience — decide si mostrar contenido pensado SOLO para México y
 * Latinoamérica (p. ej. la tabla comparativa de la portada, que nombra
 * plataformas y precios de la región). Todo del lado del cliente, sin backend:
 *
 *  1) Si la persona ELIGIÓ país en el selector, manda esa intención explícita:
 *     se muestra solo si ese país es de LatAm (y se OCULTA si eligió otro, p.
 *     ej. España o EE. UU.).
 *  2) Si no eligió país, se usa la ZONA HORARIA del navegador como aproximación
 *     de dónde está físicamente (America/… latinoamericanas). No es infalible
 *     (VPN, reloj mal configurado), pero no requiere geolocalización por IP ni
 *     permisos. Quien quede fuera por error puede elegir su país y la verá.
 *
 * Para precisión total (por IP real) haría falta un servicio de geo-IP en el
 * borde; se deja documentado por si más adelante se quiere endurecer.
 */
import { COUNTRIES } from '@/data/countries';

/** Países de América Latina (ISO alpha-2): hispanohablantes + Brasil. */
const LATAM_CODES = new Set([
  'MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', // Norte y Centroamérica
  'CU', 'DO', 'PR', // Caribe hispano
  'CO', 'VE', 'EC', 'PE', 'BO', 'CL', 'AR', 'PY', 'UY', // Sudamérica hispana
  'BR', // Brasil
]);

const CODE_BY_NAME: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.name, c.code]),
);

/** Zonas horarias IANA de LatAm (México, Centroamérica, Caribe hispano y Sudamérica). */
const LATAM_TZ = new Set([
  // México
  'America/Mexico_City', 'America/Cancun', 'America/Merida', 'America/Monterrey',
  'America/Matamoros', 'America/Chihuahua', 'America/Ciudad_Juarez', 'America/Ojinaga',
  'America/Mazatlan', 'America/Bahia_Banderas', 'America/Hermosillo', 'America/Tijuana',
  // Centroamérica
  'America/Guatemala', 'America/Belize', 'America/Tegucigalpa', 'America/El_Salvador',
  'America/Managua', 'America/Costa_Rica', 'America/Panama',
  // Caribe hispano
  'America/Havana', 'America/Santo_Domingo', 'America/Puerto_Rico',
  // Sudamérica hispana
  'America/Bogota', 'America/Caracas', 'America/Guayaquil', 'America/Galapagos',
  'America/Lima', 'America/La_Paz', 'America/Santiago', 'America/Punta_Arenas',
  'Pacific/Easter', 'America/Asuncion', 'America/Montevideo',
  // Brasil
  'America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife',
  'America/Manaus', 'America/Belem', 'America/Cuiaba', 'America/Campo_Grande',
  'America/Porto_Velho', 'America/Rio_Branco', 'America/Boa_Vista', 'America/Maceio',
  'America/Araguaina', 'America/Santarem', 'America/Eirunepe', 'America/Noronha',
]);

function timezoneIsLatam(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    // Argentina tiene muchas subzonas (America/Argentina/Buenos_Aires, …).
    return LATAM_TZ.has(tz) || tz.startsWith('America/Argentina/');
  } catch {
    return false;
  }
}

/**
 * ¿La visita corresponde a México / Latinoamérica?
 * @param country nombre del país elegido en el selector (o null si no eligió).
 */
export function isLatamAudience(country: string | null): boolean {
  if (country) {
    const code = CODE_BY_NAME[country];
    return code ? LATAM_CODES.has(code) : false;
  }
  return timezoneIsLatam();
}
