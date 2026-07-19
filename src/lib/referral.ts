/**
 * referral — utilidades del programa "Recomienda Neuromundi".
 *
 * El código de referido de cada usuario es su folio (member_no), mostrado como
 * NM-000123. El enlace de recomendación lleva ?ref=NM-000123; al abrirlo se
 * guarda el folio del referente para atribuirlo cuando la persona se registre.
 */
const REF_KEY = 'nm_referrer';

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
    if (ref != null) window.localStorage.setItem(REF_KEY, String(ref));
  } catch {
    /* noop */
  }
}

/** Folio del referente guardado (o null). */
export function getStoredReferrer(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseRefCode(window.localStorage.getItem(REF_KEY));
  } catch {
    return null;
  }
}

/** Limpia el referente guardado (tras atribuirlo). */
export function clearStoredReferrer(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(REF_KEY);
  } catch {
    /* noop */
  }
}
