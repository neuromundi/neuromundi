/**
 * El cambio del correo de acceso estuvo roto el 19 de octubre de 2026: el
 * enlace dejaba a la persona en el inicio, sin sesion y sin mensaje. Estas
 * pruebas fijan lo que no puede volver a romperse.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted: la simulacion se eleva arriba del archivo, asi que la funcion
// falsa tiene que existir antes que ella.
const { updateUser } = vi.hoisted(() => ({ updateUser: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { updateUser } } }));

import { pedirCambioDeCorreo, DESTINO_DE_CONFIRMACION } from './cambioDeCorreo';

beforeEach(() => updateUser.mockReset().mockResolvedValue({ error: null }));

describe('pedir el cambio del correo de acceso', () => {
  it('rechaza un correo mal escrito sin molestar al servidor', async () => {
    const r = await pedirCambioDeCorreo('ana@correo.com', 'ana@correo');
    expect(r).toEqual({ ok: false, motivo: 'formato' });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rechaza pedir el mismo correo que ya se tiene, sin importar mayusculas ni espacios', async () => {
    const r = await pedirCambioDeCorreo('Ana@Correo.com', '  ana@correo.com ');
    expect(r).toEqual({ ok: false, motivo: 'igual' });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('pide el cambio y manda los enlaces a la pagina que explica que pasa', async () => {
    const r = await pedirCambioDeCorreo('ana@correo.com', 'ANA.NUEVA@correo.com');
    expect(r).toEqual({ ok: true });
    expect(updateUser).toHaveBeenCalledTimes(1);
    const [datos, opciones] = updateUser.mock.calls[0];
    expect(datos).toEqual({ email: 'ana.nueva@correo.com' });
    expect(String(opciones.emailRedirectTo)).toContain(DESTINO_DE_CONFIRMACION);
  });

  it('devuelve el motivo real cuando el servidor falla, en vez de tragarselo', async () => {
    updateUser.mockResolvedValue({ error: { message: 'correo ya registrado' } });
    const r = await pedirCambioDeCorreo('ana@correo.com', 'otra@correo.com');
    expect(r).toEqual({ ok: false, motivo: 'servidor', mensaje: 'correo ya registrado' });
  });
});
