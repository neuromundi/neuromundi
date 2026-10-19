/**
 * El traductor de errores se tragaba el motivo real.
 *
 * El 19 de octubre de 2026 el alta por Google estuvo rota horas y la pantalla
 * solo decia "Algo no salio bien", porque Supabase no devuelve errores como
 * instancias de Error sino como objetos simples con `message`, y el traductor
 * solo miraba el primer caso. El motivo verdadero —"No se puede modificar
 * desde el perfil: rules_accepted_at"— se tiraba a la basura en CADA fallo de
 * toda la plataforma.
 */
import { describe, it, expect } from 'vitest';
import { toMessage } from './utils';

describe('traductor de errores', () => {
  it('lee el mensaje de un error de Supabase, que es un objeto simple', () => {
    const errorDeSupabase = { code: '42501', message: 'No se puede modificar desde el perfil: rules_accepted_at' };
    expect(toMessage(errorDeSupabase)).toContain('rules_accepted_at');
  });

  it('sigue leyendo los errores normales de JavaScript', () => {
    expect(toMessage(new Error('se cayo la red'))).toContain('se cayo la red');
  });

  it('lee tambien un texto suelto', () => {
    expect(toMessage('sin conexion')).toContain('sin conexion');
  });

  it('solo recurre al texto de relleno cuando de verdad no hay motivo', () => {
    expect(toMessage({ codigo: 7 })).toBe('Algo no salió bien.');
    expect(toMessage(null)).toBe('Algo no salió bien.');
  });
});
