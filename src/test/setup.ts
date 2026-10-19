import '@testing-library/jest-dom/vitest';

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
