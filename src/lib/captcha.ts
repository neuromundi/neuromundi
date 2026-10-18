/**
 * captcha — obtiene un comprobante de "no soy un robot" para las llamadas de
 * autenticación (alta, entrada, reenvío de confirmación y restablecimiento).
 *
 * POR QUÉ: la campaña reparte más de mil invitaciones con un enlace público de
 * registro. Esa es justo la puerta que los robots encuentran y empiezan a
 * golpear, y cada intento suyo consume envíos de correo y ensucia la base.
 *
 * REGLA DE SEGURIDAD DE ESTE ARCHIVO, que es la parte importante:
 * si NO hay clave configurada (`VITE_TURNSTILE_SITE_KEY` vacía), todo esto se
 * comporta exactamente como antes de existir: no carga ningún script, no pinta
 * nada y devuelve `undefined`. Así, publicar este código no cambia nada hasta
 * que la clave esté puesta. El orden correcto es: primero la clave y el
 * despliegue, DESPUÉS encender la protección en Supabase. Al revés, el
 * servidor exigiría un comprobante que el navegador todavía no sabe enviar y
 * se caerían todas las altas y todas las entradas.
 *
 * Se usa Cloudflare Turnstile. El widget se crea en el panel de Cloudflare en
 * modo «Managed» y aquí se pinta con `appearance: 'interaction-only'`: sólo se
 * hace visible si de verdad hace falta que la persona toque algo, que en la
 * inmensa mayoría de las visitas no ocurre. (`size: 'invisible'` NO existe:
 * los tamaños válidos son normal, flexible y compact, y «Invisible» es un modo
 * del panel, no un tamaño. Supabase también admite hCaptcha; si se cambiara de
 * proveedor, sólo hay que reescribir este archivo.)
 */

const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Si no hay clave, el captcha no existe para la aplicación. */
export function captchaConfigurado(): boolean {
  return !!SITE_KEY;
}

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let cargando: Promise<void> | null = null;

function cargarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (cargando) return cargando;
  cargando = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar el verificador'));
    document.head.appendChild(s);
  });
  return cargando;
}

/**
 * Devuelve un comprobante de un solo uso, o `undefined` si no hay captcha
 * configurado o si algo falla. NUNCA lanza ni deja la pantalla colgada: si el
 * verificador no responde en 15 segundos, se rinde y devuelve `undefined`.
 */
export async function tokenCaptcha(): Promise<string | undefined> {
  if (!SITE_KEY || typeof document === 'undefined') return undefined;

  try {
    await cargarScript();
    const api = window.turnstile;
    if (!api) return undefined;

    // La caja NO puede estar oculta. Con `interaction-only` el widget no pinta
    // nada mientras no haga falta, pero si Cloudflare decide que esta visita
    // debe resolver algo, tiene que poder verse: escondida, la persona no
    // vería el reto, se agotarían los 15 segundos y se quedaría sin entrar.
    // Por eso va flotando al pie, centrada y sin fondo: mientras no haya reto
    // es un recuadro vacío de cero altura que nadie percibe.
    const caja = document.createElement('div');
    caja.style.position = 'fixed';
    caja.style.left = '50%';
    caja.style.bottom = '24px';
    caja.style.transform = 'translateX(-50%)';
    caja.style.zIndex = '9999';
    document.body.appendChild(caja);

    const token = await new Promise<string | undefined>((resolve) => {
      let resuelto = false;
      const terminar = (v: string | undefined) => {
        if (resuelto) return;
        resuelto = true;
        resolve(v);
      };

      // Red lenta o verificador caído: no se deja al usuario esperando. El
      // reloj sólo cubre la espera automática; si aparece un reto de verdad se
      // cancela (ver `before-interactive-callback`), porque resolverlo a mano
      // tarda más de 15 segundos y sería absurdo rendirse justo entonces.
      const reloj = window.setTimeout(() => terminar(undefined), 15000);

      try {
        api.render(caja, {
          sitekey: SITE_KEY,
          appearance: 'interaction-only',
          'before-interactive-callback': () => window.clearTimeout(reloj),
          callback: (t: string) => {
            window.clearTimeout(reloj);
            terminar(t);
          },
          'error-callback': () => {
            window.clearTimeout(reloj);
            terminar(undefined);
          },
          'timeout-callback': () => {
            window.clearTimeout(reloj);
            terminar(undefined);
          },
        });
      } catch {
        window.clearTimeout(reloj);
        terminar(undefined);
      }
    });

    caja.remove();
    return token;
  } catch {
    return undefined;
  }
}
