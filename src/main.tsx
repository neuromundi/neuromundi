/**
 * Punto de entrada. Carga i18n antes de la app y la monta en AppProviders.
 */
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { initI18n } from '@/i18n';
import { AppProviders } from '@/AppProviders';
import { App } from '@/App';
import './styles/globals.css';
import { initA11y } from '@/stores/a11yStore';
import { initTheme } from '@/stores/themeStore';

initA11y();
initTheme();

// ── Actualización de la PWA ────────────────────────────────────────────────
// Objetivo: que el usuario SIEMPRE vea la versión recién publicada sin quedarse
// con una copia vieja en caché, y sin recargas en bucle.
//
// Guarda anti-bucle compartida: permite recargar de nuevo si ha pasado tiempo
// suficiente (un despliegue posterior en la misma sesión debe poder recargar),
// pero nunca dos veces seguidas en pocos segundos.
const RELOAD_KEY = 'nm-last-reload';
const RELOAD_COOLDOWN_MS = 15000;

// Recargar mientras alguien escribe le borra lo que llevaba. Si hay un campo
// con el foco o un formulario empezado, se espera: la recarga se hace en
// cuanto suelte el campo, no en medio de la frase.
function estaEscribiendo(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
  if (el?.isContentEditable) return true;
  return [...document.querySelectorAll('form input, form textarea')].some((c) => {
    const campo = c as HTMLInputElement | HTMLTextAreaElement;
    if (campo.type === 'checkbox' || campo.type === 'radio') return (campo as HTMLInputElement).checked;
    return (campo.value ?? '') !== '';
  });
}

let recargaPendiente: string | null = null;

function reloadOnce(reason: string): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Number.isFinite(last) && Date.now() - last < RELOAD_COOLDOWN_MS) return;
  } catch {
    /* almacenamiento no disponible: seguimos */
  }
  if (estaEscribiendo()) {
    if (!recargaPendiente) {
      recargaPendiente = reason;
      console.info('[pwa] recarga aplazada: hay datos escritos sin enviar');
      const reintentar = () => {
        if (!recargaPendiente || estaEscribiendo()) return;
        const motivo = recargaPendiente;
        recargaPendiente = null;
        reloadOnce(motivo);
      };
      document.addEventListener('focusout', () => setTimeout(reintentar, 400));
      window.addEventListener('pagehide', reintentar);
    }
    return;
  }
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* ignorar */ }
  console.info('[pwa] recargando:', reason);
  window.location.reload();
}

// Tras un nuevo despliegue, una pestaña abierta puede referenciar chunks con
// hash antiguo que ya no existen. Si un import dinámico falla, recargamos para
// tomar el index.html nuevo (con los hashes correctos).
window.addEventListener('vite:preloadError', () => reloadOnce('chunk no encontrado'));

// Bajo react-snap (prerender) NO registramos el SW: su ciclo skipWaiting +
// clientsClaim dispara `controllerchange` → recarga → "Execution context was
// destroyed" y react-snap aborta el snapshot. En el HTML servido a usuarios el
// SW sí se registra normalmente (esta guarda solo aplica durante el prerender).
const isReactSnap = typeof navigator !== 'undefined' && navigator.userAgent === 'ReactSnap';

if (!isReactSnap && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Busca versión nueva al abrir y en cada señal de que la pestaña vuelve
        // a estar en uso. Medido el 19 de octubre de 2026: una pestaña siguió
        // ejecutando el programa de las 11:24 cuando el servidor ya tenía el de
        // las 13:31, con tres despliegues en medio. Con el equipo dormido los
        // temporizadores no corren y la pestaña puede seguir marcada como
        // "visible", así que mirar solo cada media hora y al cambiar de pestaña
        // no basta: se añaden el foco de la ventana y la vuelta de la red.
        const check = () => { void reg.update().catch(() => {}); };
        check();
        setInterval(check, 5 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
        window.addEventListener('focus', check);
        window.addEventListener('online', check);
      })
      .catch(() => {
        /* entorno sin soporte/permiso de SW: ignorar sin romper la app */
      });

    // Cuando el SW nuevo toma el control (skipWaiting + clientsClaim), la página
    // sigue ejecutando el código viejo. Recargamos para quedar coherentes: es
    // una sola recarga limpia en vez de errores sueltos de chunks.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      reloadOnce('service worker actualizado');
    });
  });
}

// Se espera al diccionario del idioma detectado antes de montar: así nadie ve
// claves sin traducir, y a cambio el bundle ya no carga los 8 idiomas (~900 KiB
// de JSON) sino solo el que se usa.
// Si la portada viene PRERENDERIZADA (react-snap deja el HTML del app en #root,
// sin el fallback SEO marcado con data-nm-shell), hidratamos en lugar de
// re-renderizar: así el LCP ya está pintado en el HTML y React solo lo "adopta".
const rootEl = document.getElementById('root')!;
/**
 * El HTML prerenderizado por react-snap es UNO solo: la portada, capturada en
 * espanol y sin sesion. El service worker, en cambio, responde CUALQUIER
 * navegacion con ese mismo index.html (NavigationRoute -> index.html). Resultado
 * medido el 17 de octubre de 2026: al entrar a /directorio, /eventos o
 * /tienda con el service worker activo, React hidrataba la portada contra el
 * arbol de otra ruta y la consola soltaba errores 418/425/423 en cada carga;
 * React descartaba el HTML servido y repintaba la pagina entera, que es
 * justo lo contrario de lo que el prerender buscaba.
 *
 * Solo se hidrata cuando el HTML recibido PUEDE coincidir con lo que el cliente
 * va a pintar. Son tres condiciones, todas comprobables antes de montar:
 *   1. la ruta es la portada, que es lo unico prerenderizado;
 *   2. el idioma a usar es el espanol, que es el idioma del snapshot;
 *   3. no hay sesion guardada, porque el snapshot trae el encabezado de
 *      visitante (Entrar) y no el de alguien con sesion (Panel, Mi Perfil).
 * En cualquier otro caso se monta con createRoot: mismo resultado visible, sin
 * el trabajo de descartar el HTML y sin errores en consola.
 */
function hayDiccionarioEnEspanol(): boolean {
  try {
    const guardado = window.localStorage.getItem('neuro.lang');
    if (guardado) return guardado === 'es';
  } catch {
    /* almacenamiento bloqueado: se decide por el idioma del navegador */
  }
  return (navigator.language || 'en').toLowerCase().split('-')[0] === 'es';
}

function haySesionGuardada(): boolean {
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) return true;
    }
  } catch {
    /* almacenamiento bloqueado: se asume que no hay sesion */
  }
  return false;
}

const hayHtmlDeLaPortada = rootEl.hasChildNodes() && !rootEl.querySelector('[data-nm-shell]');
const prerendered =
  hayHtmlDeLaPortada &&
  window.location.pathname === '/' &&
  hayDiccionarioEnEspanol() &&
  !haySesionGuardada();

void initI18n().then(() => {
  const tree = (
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>
  );
  if (prerendered) hydrateRoot(rootEl, tree);
  else createRoot(rootEl).render(tree);
});
