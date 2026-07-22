/**
 * a11yStore — preferencias de accesibilidad del usuario, persistidas localmente:
 *   - fontScale: escala del tamaño de texto (afecta a toda la app vía rem).
 *   - reduceMotion: atenúa/elimina animaciones (además de prefers-reduced-motion).
 *   - calm: "Modo calma" — reduce la saturación de los degradados intensos para
 *     bajar la carga sensorial visual (hipersensibilidad).
 *   - dyslexia: tipografía y espaciado amigables para dislexia.
 *   - highContrast: refuerza el contraste de texto y bordes.
 *
 * Se aplican mutando el <html>: font-size para la escala y atributos
 * data-* que activan reglas globales en globals.css.
 */
import { create } from 'zustand';

export type FontScale = 'sm' | 'normal' | 'lg' | 'xl';

const SCALE_PCT: Record<FontScale, number> = {
  sm: 90,
  normal: 100,
  lg: 112.5,
  xl: 125,
};

const LS_FONT = 'neuromundi.a11y.fontScale';
const LS_MOTION = 'neuromundi.a11y.reduceMotion';
const LS_CALM = 'neuromundi.a11y.calm';
/**
 * La tipografía para dislexia (Atkinson Hyperlegible) solo la usa quien activa
 * ese modo. Cargarla siempre costaba una petición a Google Fonts en la ruta
 * crítica para el 100% de las visitas; ahora se inyecta la primera vez que
 * alguien enciende el modo.
 */
let dyslexiaFontLoaded = false;
function ensureDyslexiaFont(): void {
  if (dyslexiaFontLoaded || typeof document === 'undefined') return;
  dyslexiaFontLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';
  document.head.appendChild(link);
}

const LS_DYSLEXIA = 'neuromundi.a11y.dyslexia';
const LS_CONTRAST = 'neuromundi.a11y.highContrast';

function readFont(): FontScale {
  try {
    const v = localStorage.getItem(LS_FONT) as FontScale | null;
    if (v && v in SCALE_PCT) return v;
  } catch { /* ignore */ }
  return 'normal';
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch { /* ignore */ }
  return false;
}

export interface A11yPrefs {
  fontScale: FontScale;
  reduceMotion: boolean;
  calm: boolean;
  dyslexia: boolean;
  highContrast: boolean;
}

/** Aplica las preferencias al documento. Idempotente. */
export function applyA11y(p: A11yPrefs): void {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.style.fontSize = `${SCALE_PCT[p.fontScale]}%`;
  el.dataset.reduceMotion = p.reduceMotion ? 'true' : 'false';
  el.dataset.calm = p.calm ? 'true' : 'false';
  el.dataset.dyslexia = p.dyslexia ? 'true' : 'false';
  if (p.dyslexia) ensureDyslexiaFont();
  el.dataset.contrast = p.highContrast ? 'true' : 'false';
}

interface A11yState extends A11yPrefs {
  setFontScale: (s: FontScale) => void;
  toggleReduceMotion: () => void;
  toggleCalm: () => void;
  toggleDyslexia: () => void;
  toggleHighContrast: () => void;
}

function currentPrefs(get: () => A11yState): A11yPrefs {
  const s = get();
  return {
    fontScale: s.fontScale,
    reduceMotion: s.reduceMotion,
    calm: s.calm,
    dyslexia: s.dyslexia,
    highContrast: s.highContrast,
  };
}

export const useA11y = create<A11yState>((set, get) => ({
  fontScale: readFont(),
  reduceMotion: readFlag(LS_MOTION),
  calm: readFlag(LS_CALM),
  dyslexia: readFlag(LS_DYSLEXIA),
  highContrast: readFlag(LS_CONTRAST),
  setFontScale: (s) => {
    try { localStorage.setItem(LS_FONT, s); } catch { /* ignore */ }
    applyA11y({ ...currentPrefs(get), fontScale: s });
    set({ fontScale: s });
  },
  toggleReduceMotion: () => {
    const next = !get().reduceMotion;
    try { localStorage.setItem(LS_MOTION, next ? '1' : '0'); } catch { /* ignore */ }
    applyA11y({ ...currentPrefs(get), reduceMotion: next });
    set({ reduceMotion: next });
  },
  toggleCalm: () => {
    const next = !get().calm;
    try { localStorage.setItem(LS_CALM, next ? '1' : '0'); } catch { /* ignore */ }
    applyA11y({ ...currentPrefs(get), calm: next });
    set({ calm: next });
  },
  toggleDyslexia: () => {
    const next = !get().dyslexia;
    try { localStorage.setItem(LS_DYSLEXIA, next ? '1' : '0'); } catch { /* ignore */ }
    applyA11y({ ...currentPrefs(get), dyslexia: next });
    set({ dyslexia: next });
  },
  toggleHighContrast: () => {
    const next = !get().highContrast;
    try { localStorage.setItem(LS_CONTRAST, next ? '1' : '0'); } catch { /* ignore */ }
    applyA11y({ ...currentPrefs(get), highContrast: next });
    set({ highContrast: next });
  },
}));

/** Lee las preferencias guardadas y las aplica al cargar la app. */
export function initA11y(): void {
  applyA11y({
    fontScale: readFont(),
    reduceMotion: readFlag(LS_MOTION),
    calm: readFlag(LS_CALM),
    dyslexia: readFlag(LS_DYSLEXIA),
    highContrast: readFlag(LS_CONTRAST),
  });
}
