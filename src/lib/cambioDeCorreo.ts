/**
 * cambioDeCorreo — pedir el cambio del correo de acceso.
 *
 * Vive fuera de la pantalla de Ajustes para poder probarlo: dentro de una
 * pantalla de 900 lineas no habia forma de comprobar ni que rechace un correo
 * mal escrito ni que mande a la gente a la pagina que le explica que pasa.
 *
 * Supabase tiene activada la opcion "Secure Email Change": manda DOS correos,
 * uno a la direccion actual y otro a la nueva, y el cambio solo se aplica
 * cuando se confirma desde las dos.
 */
import { supabase } from '@/lib/supabase';

export type ResultadoCambioDeCorreo =
  | { ok: true }
  | { ok: false; motivo: 'formato' | 'igual' | 'servidor'; mensaje?: string };

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Pagina a la que caen los dos enlaces de confirmacion. */
export const DESTINO_DE_CONFIRMACION = '/correo-confirmado';

export async function pedirCambioDeCorreo(
  correoActual: string,
  correoNuevo: string,
): Promise<ResultadoCambioDeCorreo> {
  const destino = correoNuevo.trim().toLowerCase();
  if (!CORREO_VALIDO.test(destino)) return { ok: false, motivo: 'formato' };
  if (destino === correoActual.trim().toLowerCase()) return { ok: false, motivo: 'igual' };

  const { error } = await supabase.auth.updateUser(
    { email: destino },
    { emailRedirectTo: `${window.location.origin}${DESTINO_DE_CONFIRMACION}` },
  );
  if (error) return { ok: false, motivo: 'servidor', mensaje: error.message };
  return { ok: true };
}
