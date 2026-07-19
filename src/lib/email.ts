/**
 * email — utilidades de validación de correo.
 *  - DISPOSABLE_DOMAINS: dominios de correo temporal/desechable más comunes.
 *  - isStrictEmail: formato más estricto que el básico.
 *  - isDisposableEmail: detecta si el dominio es desechable.
 *
 * Nota: la garantía REAL de que un correo existe es la confirmación por enlace
 * (doble opt-in), que ya está activada. Esto solo filtra entradas evidentes.
 */

// Conjunto curado de dominios desechables frecuentes (no exhaustivo).
export const DISPOSABLE_DOMAINS = new Set<string>([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.net',
  'sharklasers.com', 'grr.la', 'guerrillamailblock.com', '10minutemail.com',
  '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'tempmailo.com',
  'tmpmail.org', 'tmpmail.net', 'throwawaymail.com', 'getnada.com', 'nada.email',
  'maildrop.cc', 'dispostable.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'trashmail.com', 'trashmail.de', 'mailnesia.com', 'mohmal.com', 'fakeinbox.com',
  'spam4.me', 'mytemp.email', 'emailondeck.com', 'mailcatch.com', 'inboxbear.com',
  'tempr.email', 'discard.email', 'discardmail.com', 'mailtemp.net', 'tempmailaddress.com',
  'burnermail.io', 'mintemail.com', '33mail.com', 'einrot.com', 'wegwerfmail.de',
  'spamgourmet.com', 'jetable.org', 'mailexpire.com', 'tempinbox.com', '0-mail.com',
  'instantemailaddress.com', 'fakemailgenerator.com', 'tempemail.co', 'moakt.com',
]);

// Formato razonablemente estricto (un punto en el dominio, sin espacios, TLD ≥ 2).
const STRICT_EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[a-z]{2,}$/i;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isStrictEmail(value: string): boolean {
  const v = normalizeEmail(value);
  // Evita dobles puntos y puntos al inicio/fin de la parte local o dominio.
  if (/\.\./.test(v) || /^\./.test(v) || /@\./.test(v) || /\.$/.test(v)) return false;
  return STRICT_EMAIL_RE.test(v);
}

export function isDisposableEmail(value: string): boolean {
  const domain = normalizeEmail(value).split('@')[1] ?? '';
  return DISPOSABLE_DOMAINS.has(domain);
}
