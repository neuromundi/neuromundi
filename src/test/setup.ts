import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// El cliente de Supabase LANZA al cargarse si faltan sus variables de entorno.
// En la maquina de quien desarrolla eso no se nota, porque hay un .env; en la
// integracion continua no hay .env y cualquier prueba que (aunque sea
// indirectamente) importe `@/lib/supabase` revienta antes de empezar. Fue
// exactamente lo que tumbo el despliegue #364 el 20 de octubre de 2026: la
// prueba de usePerfilDeLaSesion importa el almacen de sesion, el almacen
// importa el cliente, y el cliente no encontro las variables.
//
// Aqui se rellenan con valores de juguete SOLO si faltan, asi que en local
// siguen mandando las de verdad. Las pruebas nunca salen a la red.
// Se usa vi.stubEnv y no una asignacion directa: `import.meta.env` es de SOLO
// LECTURA para el compilador, y asignarle algo compila en mi maquina pero
// tumba `tsc --noEmit` en la integracion continua. (Me paso: despliegue #365.)
if (!import.meta.env.VITE_SUPABASE_URL) {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://pruebas.supabase.co');
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'clave-de-juguete-para-pruebas');
}

// crypto.randomUUID existe en jsdom moderno; fallback por si acaso.
if (!globalThis.crypto?.randomUUID) {
  // @ts-expect-error — polyfill mínimo para entorno de test.
  globalThis.crypto = { ...globalThis.crypto, randomUUID: () => 'test-uuid' };
}

// jsdom no implementa scrollIntoView y la aplicacion lo usa para traer a la
// vista el aviso de "esto te falta". Sin este relleno, cualquier prueba que
// envie un formulario incompleto falla por el entorno, no por la plataforma.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
