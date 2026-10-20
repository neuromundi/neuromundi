/**
 * limpiarAlSalir — borra del dispositivo lo que es de UNA persona cuando esa
 * persona cierra sesion.
 *
 * Al salir, `signOut` limpiaba el estado en memoria y nada mas. Lo guardado en
 * el navegador se quedaba, y ahi vivia la credencial Neuromundi ID en cache
 * —nombre, numero de miembro y su `qr_token`, que es justo lo que un prestador
 * escanea— ademas de una foto a medio subir y los datos de sucursales
 * pendientes. En un dispositivo compartido, la siguiente persona abria /mi-id y
 * veia la credencial de la anterior. Nada fallaba: la pantalla hacia
 * exactamente lo que le pedia el codigo. (Repaso adversario, 19 oct 2026.)
 *
 * Lo que NO se borra, y por que: el idioma elegido, el tamano de texto y las
 * demas preferencias de accesibilidad son del DISPOSITIVO, no de la cuenta, y
 * borrarlas al salir seria una molestia sin ninguna ganancia. El avance de
 * lectura del Kit tampoco: es anonimo y se guarda a proposito para quien no
 * tiene cuenta.
 */

/** Claves que contienen datos de la persona que cierra sesion. */
export const CLAVES_DE_LA_PERSONA = [
  'neuro.id.card',               // credencial en cache, incluye su qr_token
  'nm_foto_pendiente',           // foto a medio subir, como data URL
  'nm_sucursales_pendientes',    // sucursales capturadas sin guardar
  'neuromundi.pendingWelcome',   // bienvenida pendiente de su alta
] as const;

export function limpiarAlSalir(): void {
  for (const clave of CLAVES_DE_LA_PERSONA) {
    try { localStorage.removeItem(clave); } catch { /* almacenamiento no disponible */ }
  }
  // Los avisos fechados por usuario (`nm_renewal_notice_<id>`) y la marca de
  // popup de fundador llevan el identificador dentro o no dicen nada de nadie,
  // pero se barren igual los que empiezan por el prefijo del aviso: si la
  // persona vuelve a entrar, el aviso se recalcula solo.
  try {
    const aBorrar: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith('nm_renewal_notice_')) aBorrar.push(k);
    }
    for (const k of aBorrar) localStorage.removeItem(k);
  } catch { /* almacenamiento no disponible */ }
}
