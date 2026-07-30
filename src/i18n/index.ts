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
  { code: 'ko', label: '한국어' },
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

/** Fija el título de la pestaña del navegador con el texto localizado
 *  (`meta.title`). Cae al propio idioma, cuya paridad de claves es 0. */
export function applyDocumentTitle(): void {
  if (typeof document === 'undefined') return;
  const title = i18n.t('meta.title');
  if (title && title !== 'meta.title') document.title = title;
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
  ko: 'ko-KR',
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
  ko: () => import('./locales/ko.json'),
};

/**
 * Chunks CRÍTICOS: solo los namespaces que se pintan en el primer render de la
 * portada (encabezado + home + pie + intro). Los genera `scripts/gen_i18n_critical.mjs`
 * en cada build. Son ~9 KB (vs ~150 KB del completo), así que la app monta sin
 * esperar el diccionario entero y el resto se fusiona en segundo plano.
 */
const CRITICAL_LOADERS: Record<LanguageCode, () => Promise<{ default: Record<string, unknown> }>> = {
  es: () => import('./critical/es.crit.json'),
  en: () => import('./critical/en.crit.json'),
  fr: () => import('./critical/fr.crit.json'),
  de: () => import('./critical/de.crit.json'),
  it: () => import('./critical/it.crit.json'),
  pt: () => import('./critical/pt.crit.json'),
  ja: () => import('./critical/ja.crit.json'),
  zh: () => import('./critical/zh.crit.json'),
  ar: () => import('./critical/ar.crit.json'),
  he: () => import('./critical/he.crit.json'),
  ko: () => import('./critical/ko.crit.json'),
};

const loaded = new Set<LanguageCode>();

/** Descarga el diccionario COMPLETO de un idioma y lo fusiona (una vez por idioma). */
async function loadLanguage(code: LanguageCode): Promise<void> {
  if (loaded.has(code)) return;
  const mod = await LOADERS[code]();
  i18n.addResourceBundle(code, 'translation', mod.default, true, true);
  loaded.add(code);
}

/**
 * Arranca i18n con el chunk CRÍTICO del idioma detectado (pequeño, precargado
 * desde index.html) y monta la app enseguida; el diccionario completo se descarga
 * y fusiona en segundo plano. Así el LCP no espera a las ~2.7k claves.
 */
export async function initI18n(): Promise<void> {
  const lng = detectInitial();
  const crit = await CRITICAL_LOADERS[lng]();
  await i18n.use(initReactI18next).init({
    resources: { [lng]: { translation: crit.default } },
    lng,
    // Apunta al propio idioma: el respaldo nunca debe ser un bundle no
    // descargado. La paridad de claves es 0, así que no se pierde nada.
    fallbackLng: lng,
    interpolation: { escapeValue: false },
  });
  applyDirection(lng);
  applyDocumentTitle();
  // Fusiona el diccionario completo tras montar (no bloquea el primer pintado).
  void loadLanguage(lng).then(applyDocumentTitle);
}

/** Cambia el idioma y lo recuerda. Descarga su diccionario si hace falta. */
export function changeLanguage(code: LanguageCode): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, code);
  }
  void loadLanguage(code).then(() => i18n.changeLanguage(code).then(applyDocumentTitle));
  applyDirection(code);
}

/** Locale Intl correspondiente al idioma actual de la app. */
export function currentLocale(): string {
  return LOCALE_MAP[(i18n.language as LanguageCode) in LOCALE_MAP ? (i18n.language as LanguageCode) : 'en'];
}

export default i18n;
