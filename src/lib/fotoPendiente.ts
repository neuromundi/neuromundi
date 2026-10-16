/**
 * fotoPendiente — la foto elegida en el registro, hasta que haya sesión.
 *
 * Por qué existe (15 oct 2026): los siete formularios de registro guardaban la
 * foto en una vista previa del navegador y la tiraban al enviar, mientras la
 * pantalla decía «Tu foto se subirá cuando inicies sesión por primera vez».
 * Era falso, y como el perfil completo exige foto, el formulario le hacía creer
 * al prestador que ya había entregado justo el requisito que lo dejaba
 * invisible en el directorio. (Auditoría del 15 oct 2026, hallazgo C-7.)
 *
 * Cómo funciona ahora:
 *  · Si al terminar el alta ya hay sesión, la foto sube en ese momento.
 *  · Si no la hay (falta confirmar el correo), se guarda optimizada en este
 *    dispositivo y useFotoPendiente la sube en el primer acceso. Entonces sí
 *    es cierto lo que dice la pantalla.
 */
import { supabase, AVATAR_BUCKET } from '@/lib/supabase';
import { optimizeImageToWebp, logger } from '@/lib/utils';

const CLAVE = 'nm_foto_pendiente';

/** Sube la foto y devuelve su dirección pública, o null si no se pudo. */
export async function subirFotoDePerfil(blob: Blob, userId: string): Promise<string | null> {
  const ruta = `${userId}/avatar.webp`;
  const { error: errSubida } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(ruta, blob, { upsert: true, contentType: 'image/webp' });
  if (errSubida) { logger.error('subir foto de perfil', errSubida); return null; }

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(ruta);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: errPerfil } = await supabase
    .from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (errPerfil) { logger.error('guardar avatar_url', errPerfil); return null; }
  return url;
}

/** Guarda la foto en este dispositivo para subirla en cuanto haya sesión. */
async function dejarPendiente(file: File): Promise<boolean> {
  try {
    const webp = await optimizeImageToWebp(file, { maxDimension: 512 });
    const dataUrl = await new Promise<string>((listo, falla) => {
      const lector = new FileReader();
      lector.onload = () => listo(String(lector.result));
      lector.onerror = () => falla(lector.error);
      lector.readAsDataURL(webp);
    });
    localStorage.setItem(CLAVE, dataUrl);
    return true;
  } catch (e) {
    logger.error('dejar foto pendiente', e);
    return false;
  }
}

/**
 * Entrega la foto elegida en el registro. Si hay sesión la sube ya; si no, la
 * deja guardada. Devuelve qué pasó, para que el formulario diga la verdad.
 */
export async function entregarFotoDeRegistro(
  file: File, userId: string | null,
): Promise<'subida' | 'pendiente' | 'fallo'> {
  if (userId) {
    try {
      const webp = await optimizeImageToWebp(file, { maxDimension: 512 });
      if (await subirFotoDePerfil(webp, userId)) return 'subida';
    } catch (e) {
      logger.error('subir foto de registro', e);
    }
  }
  return (await dejarPendiente(file)) ? 'pendiente' : 'fallo';
}

/** Sube lo que hubiera quedado pendiente. Se llama al abrir sesión. */
export async function subirFotoPendiente(userId: string): Promise<boolean> {
  let dataUrl: string | null = null;
  try { dataUrl = localStorage.getItem(CLAVE); } catch { return false; }
  if (!dataUrl) return false;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const url = await subirFotoDePerfil(blob, userId);
    if (url) { try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } return true; }
  } catch (e) {
    logger.error('subir foto pendiente', e);
  }
  return false;
}

export function hayFotoPendiente(): boolean {
  try { return !!localStorage.getItem(CLAVE); } catch { return false; }
}
