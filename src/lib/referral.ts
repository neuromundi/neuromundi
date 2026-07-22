/**
 * referral — utilidades del programa "Recomienda Neuromundi".
 *
 * El código de referido de cada usuario es su folio (member_no), mostrado como
 * NM-000123. El enlace de recomendación lleva ?ref=NM-000123; al abrirlo se
 * guarda el folio del referente para atribuirlo cuando la persona se registre.
 */
const REF_KEY = 'nm_referrer';
const REF_AT_KEY = 'nm_referrer_at';

/** Vigencia del enlace de recomendación: 7 días desde que se recibe. */
export const REFERRAL_VALIDITY_DAYS = 7;
const REF_MAX_AGE_MS = REFERRAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

/** Formatea el folio como NM-000123. */
export function formatMemberNo(memberNo: number): string {
  return `NM-${String(memberNo).padStart(6, '0')}`;
}

/** Extrae el número de folio de un valor de ?ref= (acepta "NM-000123" o "123"). */
export function parseRefCode(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Enlace de recomendación para un folio dado. */
export function referralUrl(memberNo: number): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://neuromundi.com';
  return `${origin}/?ref=${formatMemberNo(memberNo)}`;
}

/** Lee el parámetro ?ref= de la URL actual y, si es válido, lo guarda. */
export function captureRefFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = parseRefCode(params.get('ref'));
    if (ref != null) {
      window.localStorage.setItem(REF_KEY, String(ref));
      // Sella el momento de recepción para poder caducarlo a los 7 días.
      window.localStorage.setItem(REF_AT_KEY, String(Date.now()));
    }
  } catch {
    /* noop */
  }
}

/** Folio del referente guardado, o null si no hay o si el enlace ya caducó. */
export function getStoredReferrer(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const ref = parseRefCode(window.localStorage.getItem(REF_KEY));
    if (ref == null) return null;
    const at = Number(window.localStorage.getItem(REF_AT_KEY));
    // Sin sello (enlaces guardados antes de esta versión) se considera caducado.
    if (!Number.isFinite(at) || at <= 0) { clearStoredReferrer(); return null; }
    if (Date.now() - at > REF_MAX_AGE_MS) { clearStoredReferrer(); return null; }
    return ref;
  } catch {
    return null;
  }
}

/** Limpia el referente guardado (tras atribuirlo). */
export function clearStoredReferrer(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(REF_KEY);
    window.localStorage.removeItem(REF_AT_KEY);
  } catch {
    /* noop */
  }
}
