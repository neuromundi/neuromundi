/**
 * firmaSvix — comprueba que un aviso (webhook) viene de verdad de quien dice.
 *
 * Resend firma cada aviso con el esquema de Svix. Sin esta comprobacion,
 * cualquiera que conozca la direccion del endpoint podria inventar un aviso de
 * "rebotado" y conseguir que Neuromundi deje de escribirle a una ficha, o uno
 * de "entregado" para que las cifras del panel mientan.
 *
 * El procedimiento (documentacion de Svix, consultada el 20 de octubre de 2026):
 *   1. Se arma el contenido firmado como `${id}.${timestamp}.${cuerpo}`, con el
 *      cuerpo EXACTO que llego: si se vuelve a serializar el JSON, la firma ya
 *      no coincide.
 *   2. Al secreto se le quita el prefijo `whsec_` y lo que queda se decodifica
 *      de base64: esos BYTES son la clave, no el texto.
 *   3. HMAC-SHA256 sobre el contenido firmado, y el resultado en base64.
 *   4. La cabecera `svix-signature` trae una lista separada por espacios de
 *      entradas `version,firma`. Basta que una `v1` coincida.
 *   5. Se compara en tiempo constante y se rechaza un aviso demasiado viejo.
 */

const aBytes = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const aBase64 = (bytes: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));

/** Comparacion en tiempo constante: no delata por cuanto tarda. */
export function igualesEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

export interface AvisoFirmado {
  /** Cuerpo tal como llego, sin volver a serializar. */
  cuerpo: string;
  id: string;
  /** Segundos desde el epoch, tal como vienen en la cabecera. */
  timestamp: string;
  /** Contenido de `svix-signature`: "v1,xxx v1,yyy". */
  firmas: string;
  /** Secreto del endpoint, con o sin el prefijo `whsec_`. */
  secreto: string;
  /** Margen permitido entre el reloj del aviso y el nuestro. 5 min por omision. */
  toleranciaSegundos?: number;
  /** Solo para pruebas: fija "ahora" en segundos del epoch. */
  ahoraSegundos?: number;
}

export async function firmaEsValida(aviso: AvisoFirmado): Promise<boolean> {
  const { cuerpo, id, timestamp, firmas, secreto } = aviso;
  if (!cuerpo || !id || !timestamp || !firmas || !secreto) return false;

  const tolerancia = aviso.toleranciaSegundos ?? 300;
  if (tolerancia > 0) {
    const t = Number.parseInt(timestamp, 10);
    if (!Number.isFinite(t)) return false;
    const ahora = aviso.ahoraSegundos ?? Math.floor(Date.now() / 1000);
    if (Math.abs(ahora - t) > tolerancia) return false;
  }

  let clave: CryptoKey;
  try {
    clave = await crypto.subtle.importKey(
      'raw',
      aBytes(secreto.replace(/^whsec_/, '')),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  } catch {
    return false; // secreto mal formado: no se valida nada
  }

  const contenido = new TextEncoder().encode(`${id}.${timestamp}.${cuerpo}`);
  const esperada = aBase64(await crypto.subtle.sign('HMAC', clave, contenido));

  // Puede venir mas de una firma (rotacion del secreto): basta una v1 buena.
  return firmas
    .split(' ')
    .filter((p) => p.startsWith('v1,'))
    .some((p) => igualesEnTiempoConstante(p.slice(3), esperada));
}
