import '@testing-library/jest-dom/vitest';

// crypto.randomUUID existe en jsdom moderno; fallback por si acaso.
if (!globalThis.crypto?.randomUUID) {
  // @ts-expect-error — polyfill mínimo para entorno de test.
  globalThis.crypto = { ...globalThis.crypto, randomUUID: () => 'test-uuid' };
}
