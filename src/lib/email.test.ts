import { describe, it, expect } from 'vitest';
import { isStrictEmail, isDisposableEmail, normalizeEmail } from './email';

describe('normalizeEmail', () => {
  it('recorta y pasa a minúsculas', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });
});

describe('isStrictEmail', () => {
  it('acepta correos bien formados (happy path)', () => {
    expect(isStrictEmail('ana@dominio.com')).toBe(true);
    expect(isStrictEmail('a.b+tag@sub.dominio.mx')).toBe(true);
    expect(isStrictEmail('USER@EJEMPLO.ORG')).toBe(true);
  });

  it('rechaza formatos inválidos (error path)', () => {
    expect(isStrictEmail('sin-arroba')).toBe(false);
    expect(isStrictEmail('a@b')).toBe(false);          // sin TLD
    expect(isStrictEmail('a@@b.com')).toBe(false);
    expect(isStrictEmail('a b@c.com')).toBe(false);     // espacio
    expect(isStrictEmail('a..b@c.com')).toBe(false);    // doble punto
    expect(isStrictEmail('.a@c.com')).toBe(false);      // punto inicial
    expect(isStrictEmail('a@c.com.')).toBe(false);      // punto final
    expect(isStrictEmail('a@.com')).toBe(false);        // dominio inicia en punto
  });
});

describe('isDisposableEmail', () => {
  it('detecta dominios desechables conocidos', () => {
    expect(isDisposableEmail('x@mailinator.com')).toBe(true);
    expect(isDisposableEmail('X@YOPMAIL.COM')).toBe(true); // no distingue mayúsculas
  });
  it('deja pasar dominios normales', () => {
    expect(isDisposableEmail('x@gmail.com')).toBe(false);
    expect(isDisposableEmail('sin-dominio')).toBe(false);
  });
});
