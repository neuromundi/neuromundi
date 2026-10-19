/**
 * El relleno del alta social TIENE que pasar el esquema de registro. Si deja de
 * pasarlo, el formulario se bloquea en campos que no se dibujan y nadie ve por
 * que. Esta prueba existe por un defecto real del 19 de octubre de 2026.
 */
import { describe, it, expect } from 'vitest';
import { registerSchema } from './schemas';
import { RELLENO_LOGIN_SOCIAL } from './registroSocial';

const datosDeUnaPersona = {
  regType: 'patient' as const,
  is_company: false,
  full_name: 'Ana Ruiz',
  country: 'México',
  state: 'Querétaro',
  municipality: 'Querétaro',
  locations: [],
  accept_terms: true,
  accept_rules: true,
  accept_manifesto: true,
};

describe('relleno del alta por login social', () => {
  it('pasa el esquema de registro tal cual', () => {
    const r = registerSchema.safeParse({ ...datosDeUnaPersona, ...RELLENO_LOGIN_SOCIAL });
    const motivos = r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    expect(motivos).toEqual([]);
  });

  it('tambien pasa cuando no se marca ninguna casilla de secciones ni intereses', () => {
    // react-hook-form devuelve `false` cuando un grupo de casillas va vacio.
    const r = registerSchema.safeParse({
      ...datosDeUnaPersona, ...RELLENO_LOGIN_SOCIAL,
      sections: false, interests: false, school_grades: false,
    });
    const motivos = r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    expect(motivos).toEqual([]);
  });

  it('el correo y la contrasena de relleno coinciden con su confirmacion', () => {
    expect(RELLENO_LOGIN_SOCIAL.email).toBe(RELLENO_LOGIN_SOCIAL.confirm_email);
    expect(RELLENO_LOGIN_SOCIAL.password).toBe(RELLENO_LOGIN_SOCIAL.confirm_password);
  });
});
