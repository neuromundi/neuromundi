/**
 * sucursalesPendientes — las sucursales capturadas en el registro, hasta que
 * haya sesión.
 *
 * Por qué existe (auditoría 15 oct 2026, hallazgo M-17): las sucursales sólo se
 * insertaban `if (data.session)`. Si la confirmación de correo está activada,
 * al registrarse NO hay sesión, así que el pin del mapa —el valor central de un
 * espacio de esparcimiento, y lo que lo hace aparecer en las búsquedas por
 * municipio— se perdía sin decirle nada al usuario.
 *
 * Y la corrección no depende de saber si la confirmación está activada hoy:
 * con sesión se insertan en el momento, y sin ella se guardan en este
 * dispositivo y entran en el primer acceso. Funciona en los dos casos, que es
 * lo que hacía falta, porque esa configuración puede cambiar sin avisar al
 * código. Es el mismo patrón de fotoPendiente.
 */
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils';
import type { SignUpLocation } from '@/stores/authStore';

const CLAVE = 'nm_sucursales_pendientes';

function aFilas(locations: SignUpLocation[], userId: string) {
  return locations
    .filter((l) => l.address && l.address.trim() !== '')
    .map((l, i) => ({
      provider_id: userId,
      label: l.label ?? null,
      address: l.address,
      country: l.country ?? null,
      state: l.state ?? null,
      municipality: l.municipality ?? null,
      latitude: l.latitude ?? null,
      longitude: l.longitude ?? null,
      phone: l.phone ?? null,
      hours: l.hours ?? null,
      sort_order: i,
    }));
}

/** Guarda las sucursales en este dispositivo para insertarlas al haber sesión. */
export function dejarSucursalesPendientes(locations: SignUpLocation[]): boolean {
  try {
    const utiles = locations.filter((l) => l.address && l.address.trim() !== '');
    if (utiles.length === 0) return false;
    localStorage.setItem(CLAVE, JSON.stringify(utiles));
    return true;
  } catch (e) {
    logger.error('dejar sucursales pendientes', e);
    return false;
  }
}

export function haySucursalesPendientes(): boolean {
  try { return !!localStorage.getItem(CLAVE); } catch { return false; }
}

export function olvidarSucursalesPendientes(): void {
  try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
}

/**
 * Inserta las sucursales que hubieran quedado pendientes. Se llama al abrir
 * sesión. Sólo se descartan del dispositivo si la escritura salió bien: si
 * falla, se vuelve a intentar en el siguiente acceso.
 */
export async function insertarSucursalesPendientes(userId: string): Promise<boolean> {
  let crudo: string | null = null;
  try { crudo = localStorage.getItem(CLAVE); } catch { return false; }
  if (!crudo) return false;

  let locations: SignUpLocation[];
  try {
    const leido: unknown = JSON.parse(crudo);
    if (!Array.isArray(leido)) { olvidarSucursalesPendientes(); return false; }
    locations = leido as SignUpLocation[];
  } catch {
    olvidarSucursalesPendientes();
    return false;
  }

  const filas = aFilas(locations, userId);
  if (filas.length === 0) { olvidarSucursalesPendientes(); return false; }

  // Si ya tiene sucursales, las pendientes sobran: se descartan sin duplicar.
  const { data: yaTiene, error: errLectura } = await supabase
    .from('provider_locations').select('id').eq('provider_id', userId).limit(1);
  if (errLectura) return false;
  if ((yaTiene ?? []).length > 0) { olvidarSucursalesPendientes(); return false; }

  const { error } = await supabase.from('provider_locations').insert(filas);
  if (error) { logger.error('insertar sucursales pendientes', error); return false; }
  olvidarSucursalesPendientes();
  return true;
}
