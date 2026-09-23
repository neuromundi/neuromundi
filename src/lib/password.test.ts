import { describe, it, expect } from 'vitest';
import { isStrongPassword } from './password';

describe('isStrongPassword', () => {
  it('rechaza contraseñas cortas o incompletas', () => {
    expect(isStrongPassword('Ab1!')).toBe(false); // < 8
    expect(isStrongPassword('todo minuscula1!')).toBe(false); // sin mayúscula
    expect(isStrongPassword('TODOMAYUS1!')).toBe(false); // sin minúscula
    expect(isStrongPassword('SinDigitos!')).toBe(false); // sin número
    expect(isStrongPassword('SinSimbolo1')).toBe(false); // sin símbolo
  });
  it('acepta contraseñas con las cuatro clases y ≥ 8', () => {
    expect(isStrongPassword('Abcdef1!')).toBe(true);
    expect(isStrongPassword('Str0ng#Pass')).toBe(true);
    expect(isStrongPassword('N3uro.Mundi!')).toBe(true);
  });
});
