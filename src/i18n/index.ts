/**
 * Configuración de internacionalización.
 *
 * Regla de arranque (según requisito):
 *  - Elección guardada en el selector → esa.
 *  - Si no, el idioma del navegador si es uno de los 8 soportados → ese.
 *  - Si el navegador no está en ninguno de los 8 → inglés.
 * La elección manual del selector se recuerda.
 *
 * RENDIMIENTO: los diccionarios pesan ~900 KiB entre los 8 idiomas y antes
 * entraban TODOS al bundle principal, aunque cada persona use uno solo. Ahora
 * cada idioma es un chunk aparte que se descarga bajo demanda: al arrancar solo
 * viaja el idioma detectado, y los demás al cambiarlos desde el selector.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';


export const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'he', label: 'עברית' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as readonly string[];
const STORAGE_KEY = 'neuro.lang';

/** Idiomas de escritura de derecha a izquierda (árabe, hebreo). El japonés y el
 *  chino se escriben de izquierda a derecha en la web (horizontal), así que NO
 *  son RTL. */
export const RTL_LANGUAGES = new Set<string>(['ar', 'he']);

export function isRtl(code: string): boolean {
  return RTL_LANGUAGES.has(code);
}

/** Fija `dir` y `lang` en <html> según el idioma (sentido de lectura). */
export function applyDirection(code: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = code;
  document.documentElement.dir = isRtl(code) ? 'rtl' : 'ltr';
}

/** Mapea el idioma de la app a un locale BCP-47 para Intl (fechas, números). */
const LOCALE_MAP: Record<LanguageCode, string> = {
  es: 'es-MX',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ar: 'ar',
  he: 'he-IL',
};

/**
 * Regla de idioma inicial (pura, testeable):
 *  - elección guardada válida → esa.
 *  - idioma del navegador si es uno de los 8 soportados → ese.
 *  - cualquier otro → 'en'.
 */
export function resolveInitialLanguage(navLang: string, stored: string | null): LanguageCode {
  if (stored && CODES.includes(stored)) return stored as LanguageCode;
  const base = (navLang || 'en').toLowerCase().split('-')[0];
  return (CODES.includes(base) ? base : 'en') as LanguageCode;
}

function detectInitial(): LanguageCode {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return resolveInitialLanguage(navigator.language || 'en', stored);
  }
  return 'en';
}

/** Diccionarios como chunks independientes (Vite los separa por sí solo). */
const LOADERS: Record<LanguageCode, () => Promise<{ default: Record<string, unknown> }>> = {
  es: () => import('./locales/es.json'),
  en: () => import('./locales/en.json'),
  fr: () => import('./locales/fr.json'),
  de: () => import('./locales/de.json'),
  it: () => import('./locales/it.json'),
  pt: () => import('./locales/pt.json'),
  ja: () => import('./locales/ja.json'),
  zh: () => import('./locales/zh.json'),
  ar: () => import('./locales/ar.json'),
  he: () => import('./locales/he.json'),
};

const loaded = new Set<LanguageCode>();

/** Descarga un idioma y lo registra en i18next (una sola vez por idioma). */
async function loadLanguage(code: LanguageCode): Promise<void> {
  if (loaded.has(code)) return;
  const mod = await LOADERS[code]();
  i18n.addResourceBundle(code, 'translation', mod.default, true, true);
  loaded.add(code);
}

/**
 * Arranca i18n con el idioma detectado YA cargado. main.tsx espera esta promesa
 * antes de montar la app, así que nadie ve claves sin traducir.
 */
export async function initI18n(): Promise<void> {
  const lng = detectInitial();
  const mod = await LOADERS[lng]();
  loaded.add(lng);
  await i18n.use(initReactI18next).init({
    resources: { [lng]: { translation: mod.default } },
    lng,
    // Apunta al propio idioma: el respaldo nunca debe ser un bundle no
    // descargado. La paridad de claves es 0, así que no se pierde nada.
    fallbackLng: lng,
    interpolation: { escapeValue: false },
  });
  applyDirection(lng);
}

/** Cambia el idioma y lo recuerda. Descarga su diccionario si hace falta. */
export function changeLanguage(code: LanguageCode): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, code);
  }
  void loadLanguage(code).then(() => i18n.changeLanguage(code));
  applyDirection(code);
}

/** Locale Intl correspondiente al idioma actual de la app. */
export function currentLocale(): string {
  return LOCALE_MAP[(i18n.language as LanguageCode) in LOCALE_MAP ? (i18n.language as LanguageCode) : 'en'];
}

export default i18n;
