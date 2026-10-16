/**
 * coordenadas — convierte lo que la persona COPIA de Google Maps en un par de
 * números.
 *
 * Por qué existe: los campos de latitud y longitud ya existían, pero pedían
 * DOS números por separado, y Google Maps entrega UNA sola cadena
 * («19.4326, -99.1332») o un enlace. Quien pegaba la cadena completa en el
 * primer campo dejaba el segundo vacío, y entonces el registro se guardaba
 * SIN pin, sin decir nada. El dato estaba al alcance y se perdía por la forma
 * del formulario.
 *
 * Se aceptan las tres formas en que Google Maps entrega una ubicación:
 *   · «19.4326, -99.1332»  (clic derecho sobre el punto → copiar)
 *   · https://www.google.com/maps/@19.4326,-99.1332,17z
 *   · https://maps.app.goo.gl/... con ?q=19.4326,-99.1332 o !3d19.4326!4d-99.1332
 */

export interface Coordenadas { lat: number; lng: number }

/** Latitud entre -90 y 90; longitud entre -180 y 180. */
export function coordenadasValidas(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    // 0,0 es el Golfo de Guinea: casi siempre significa "no se capturó".
    && !(lat === 0 && lng === 0);
}

/**
 * Devuelve las coordenadas que haya en el texto, o null si no hay ninguna
 * reconocible. Nunca adivina: si no está claro, no devuelve nada.
 */
export function leerCoordenadas(texto: string): Coordenadas | null {
  const s = (texto ?? '').trim();
  if (!s) return null;

  // 1) Enlace de Google Maps con !3d<lat>!4d<lng> (el formato del lugar exacto).
  const d3d4 = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (d3d4) {
    const lat = parseFloat(d3d4[1]), lng = parseFloat(d3d4[2]);
    return coordenadasValidas(lat, lng) ? { lat, lng } : null;
  }

  // 2) Enlace con @<lat>,<lng> (el centro del mapa) o con ?q=<lat>,<lng>.
  const arroba = s.match(/[@=](-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (arroba) {
    const lat = parseFloat(arroba[1]), lng = parseFloat(arroba[2]);
    return coordenadasValidas(lat, lng) ? { lat, lng } : null;
  }

  // 3) El par suelto, separado por coma o por espacios.
  const par = s.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (par) {
    const lat = parseFloat(par[1]), lng = parseFloat(par[2]);
    return coordenadasValidas(lat, lng) ? { lat, lng } : null;
  }

  return null;
}
