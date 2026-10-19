/**
 * Pruebas del camino que mas importa: darse de alta.
 *
 * Existen por tres defectos reales del 19 de octubre de 2026, los tres en este
 * mismo formulario y los tres invisibles desde la pantalla:
 *   - un campo obligatorio que no se dibuja bloqueaba el alta por Google;
 *   - las casillas sin marcar llegaban como `false` y el esquema las rechazaba;
 *   - al faltar datos no se decia CUALES, solo "completa los obligatorios".
 *
 * Como no hay traducciones cargadas en las pruebas, los textos aparecen como su
 * clave ('reg.miss.email'), que es justo lo que conviene comprobar: es estable.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signUp = vi.fn();
const completeProfile = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ signUp, completeProfile, fullName: 'Jorge Medina' }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

import { RegisterForm } from './RegisterForm';

/** Rellena los datos de una persona real que se registra desde Colombia. */
async function llenarComoPaciente(usuario: ReturnType<typeof userEvent.setup>, conCuenta = true) {
  const campo = (n: string) => document.querySelector(`[name="${n}"]`) as HTMLElement;

  await usuario.type(campo('full_name'), 'Ana Ruiz');
  await usuario.selectOptions(document.getElementById('reg-country') as HTMLSelectElement, 'Colombia');
  await usuario.type(document.getElementById('reg-state') as HTMLElement, 'Antioquia');

  if (conCuenta) {
    await usuario.type(campo('email'), 'ana@correo.com');
    await usuario.type(campo('confirm_email'), 'ana@correo.com');
    await usuario.type(campo('password'), 'Prueba123!');
    await usuario.type(campo('confirm_password'), 'Prueba123!');
  }
  for (const n of ['accept_terms', 'accept_rules', 'accept_manifesto']) {
    await usuario.click(campo(n));
  }
}

beforeEach(() => {
  signUp.mockReset().mockResolvedValue({ ok: true, data: {} });
  completeProfile.mockReset().mockResolvedValue({ ok: true, data: true });
});

describe('alta de paciente', () => {
  it('al enviar en blanco dice QUE falta, campo por campo, y no da de alta', async () => {
    const usuario = userEvent.setup();
    render(<RegisterForm initialType="patient" />);

    await usuario.click(screen.getByRole('button', { name: 'auth.createAccount' }));

    const aviso = await screen.findByText('reg.missTitle');
    const lista = aviso.parentElement as HTMLElement;
    const faltantes = within(lista).getAllByRole('listitem').map((li) => li.textContent);

    expect(faltantes).toEqual(expect.arrayContaining([
      'reg.miss.email', 'reg.miss.password',
      'reg.miss.terms', 'reg.miss.rules', 'reg.miss.manifesto',
      'reg.fullName', 'reg.miss.pais', 'reg.miss.estado',
    ]));
    expect(signUp).not.toHaveBeenCalled();
  });

  it('con los datos completos da de alta como paciente', async () => {
    const usuario = userEvent.setup();
    render(<RegisterForm initialType="patient" />);

    await llenarComoPaciente(usuario);
    await usuario.click(screen.getByRole('button', { name: 'auth.createAccount' }));

    expect(signUp).toHaveBeenCalledTimes(1);
    const datos = signUp.mock.calls[0][0];
    expect(datos).toMatchObject({
      role: 'patient',
      fullName: 'Ana Ruiz',
      country: 'Colombia',
      state: 'Antioquia',
      email: 'ana@correo.com',
    });
  });

  it('no exige marcar secciones ni intereses: sin marcar nada tambien se da de alta', async () => {
    const usuario = userEvent.setup();
    render(<RegisterForm initialType="patient" />);

    await llenarComoPaciente(usuario);
    await usuario.click(screen.getByRole('button', { name: 'auth.createAccount' }));

    expect(signUp).toHaveBeenCalledTimes(1);
    expect(signUp.mock.calls[0][0].sections).toEqual([]);
    expect(signUp.mock.calls[0][0].interests).toEqual([]);
  });
});

describe('alta por Google, LinkedIn o Microsoft (completar perfil)', () => {
  it('completa el perfil sin pedir correo ni contrasena, y no crea otra cuenta', async () => {
    const usuario = userEvent.setup();
    render(<RegisterForm complete initialType="patient" />);

    // En este modo NO se dibujan los campos de cuenta.
    expect(document.querySelector('[name="email"]')).toBeNull();
    expect(document.querySelector('[name="password"]')).toBeNull();

    await llenarComoPaciente(usuario, false);
    await usuario.click(screen.getByRole('button', { name: 'onb.finish' }));

    expect(completeProfile).toHaveBeenCalledTimes(1);
    expect(signUp).not.toHaveBeenCalled();
    expect(completeProfile.mock.calls[0][0]).toMatchObject({ role: 'patient', country: 'Colombia' });
  });
});
