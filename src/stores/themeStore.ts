/**
 * themeStore — tema de color de la app: 'light' | 'dark' | 'system'.
 * Persistido en el dispositivo. Aplica la clase `dark` en <html>; en modo
 * 'system' sigue la preferencia del sistema operativo y reacciona a sus cambios.
 */
import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

const LS_THEME = 'neuromundi.theme';

function read(): Theme {
  try {
    const v = localStorage.getItem(LS_THEME) as Theme | null;
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* ignore */ }
  // Por defecto la plataforma arranca en modo CLARO (no sigue el sistema).
  return 'light';
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/** Resuelve si debe estar oscuro según el tema elegido. */
export function isDark(theme: Theme): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark());
}

/** Aplica el tema al documento. Idempotente. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const dark = isDark(theme);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: read(),
  setTheme: (t) => {
    try { localStorage.setItem(LS_THEME, t); } catch { /* ignore */ }
    applyTheme(t);
    set({ theme: t });
  },
}));

/** Lee el tema guardado, lo aplica y reacciona a cambios del sistema (modo 'system'). */
export function initTheme(): void {
  applyTheme(read());
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', () => {
      if (useTheme.getState().theme === 'system') applyTheme('system');
    });
  }
}
