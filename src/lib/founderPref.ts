/**
 * founderPref — preferencia local de "no ser Fundador".
 * Se marca en el registro cuando el usuario opta por una cuenta ordinaria; en la
 * primera sesión se persiste en el servidor (set_founder_optout) y se limpia.
 */
const OPTOUT_KEY = 'nm_founder_optout';

export function setFounderOptoutFlag(optout: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (optout) window.localStorage.setItem(OPTOUT_KEY, '1');
    else window.localStorage.removeItem(OPTOUT_KEY);
  } catch { /* noop */ }
}

export function getFounderOptoutFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(OPTOUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearFounderOptoutFlag(): void {
  setFounderOptoutFlag(false);
}
