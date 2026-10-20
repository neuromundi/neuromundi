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
    // Prerender (react-snap): el snapshot estático se captura en ESPAÑOL, que es
    // el idioma canónico (x-default) de la portada. Así el HTML servido a todos
    // sale en español y el cliente cambia al idioma del usuario al hidratar.
    if (navigator.userAgent === 'ReactSnap') return 'es';
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
/**
 * ¿Se puede arrancar con el chunk crítico? Solo en la PORTADA.
 *
 * El chunk crítico contiene únicamente los textos de la portada. Si alguien
 * llega directo a otra dirección —y con 1,121 invitaciones en la calle,
 * `/crear-cuenta` y `/entrar` son justo eso— esa pantalla se pinta antes de
 * que llegue el diccionario y enseña las claves crudas («auth.email» en vez de
 * «Correo»). Medido el 20 de octubre de 2026 con un navegador real sobre el
 * sitio publicado: pasaba de forma intermitente en /entrar, /crear-cuenta,
 * /reglamento, /proteccion-datos, /conocer-mas, /fundadores, /aliados,
 * /terminos, /privacidad y /correo-confirmado. Fuera de la portada se espera
 * el diccionario completo, como antes del refactor de arranque: la mejora
 * medida de LCP era en la portada y ahí se conserva intacta.
 */
export function arrancaSoloConLoCritico(): boolean {
  if (typeof window === 'undefined') return false;
  if (navigator.userAgent === 'ReactSnap') return false;
  const ruta = window.location.pathname.replace(/\/+$/, '');
  return ruta === '' || ruta === '/index.html';
}

export async function initI18n(): Promise<void> {
  const lng = detectInitial();
  const soloCritico = arrancaSoloConLoCritico();
  const inicial = soloCritico
    ? (await CRITICAL_LOADERS[lng]()).default
    : (await LOADERS[lng]()).default;
  if (!soloCritico) loaded.add(lng);
  await i18n.use(initReactI18next).init({
    resources: { [lng]: { translation: inicial } },
    lng,
    // Apunta al propio idioma: el respaldo nunca debe ser un bundle no
    // descargado. La paridad de claves es 0, así que no se pierde nada.
    fallbackLng: lng,
    interpolation: { escapeValue: false },
  });
  applyDirection(lng);
  applyDocumentTitle();
  // El diccionario completo se pide DESPUES del primer pintado, no en el mismo
  // instante del arranque: asi no compite por ancho de banda con el paquete
  // principal durante la ventana del LCP.
  //
  // MEDIDO (20 oct 2026, mediana de 5 corridas de Lighthouse sobre el mismo
  // servidor con gzip): LCP 2,902 ms -> 2,477 ms y FCP 2,251 -> 2,025. Y se
  // midio tambien por separado: ampliar el chunk critico SIN diferir no mejora
  // nada (LCP 2,971), asi que el beneficio viene de aqui; diferir SIN ampliar
  // el critico deja el indice de velocidad inestable (de 4,788 a 6,058 ms entre
  // corridas) porque la portada enseñaba claves crudas y repintaba tarde. Van
  // juntos a proposito.
  if (!soloCritico) return;  // ya se cargó completo; no hay nada que diferir.
  let pedido = false;
  const pedirCompleto = () => {
    if (pedido) return;
    pedido = true;
    void loadLanguage(lng).then(applyDocumentTitle);
  };
  if (typeof window === 'undefined') {
    pedirCompleto();
  } else {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if ('requestIdleCallback' in window) {
        (window as unknown as { requestIdleCallback: (f: () => void, o?: { timeout: number }) => void })
          .requestIdleCallback(pedirCompleto, { timeout: 1200 });
      } else {
        setTimeout(pedirCompleto, 200);
      }
    }));
    // Cualquier gesto lo trae de inmediato: para salir de la portada hay que
    // tocar algo, asi que ninguna otra pantalla llega antes que sus textos.
    const gestos = ['pointerdown', 'keydown', 'touchstart'] as const;
    const alGesto = () => {
      gestos.forEach((g) => window.removeEventListener(g, alGesto));
      pedirCompleto();
    };
    gestos.forEach((g) => window.addEventListener(g, alGesto, { once: true, passive: true }));
  }
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
