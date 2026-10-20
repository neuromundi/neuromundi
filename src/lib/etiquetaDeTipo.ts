/**
 * etiquetaDeTipo — convierte la clave interna del tipo de miembro
 * (`service_provider`, `ngo`, `wellness`…) en la etiqueta legible del idioma
 * activo. Antes varias pantallas de administración imprimían la clave cruda,
 * porque pedían una traducción que no existía y caían al respaldo.
 *
 * Orden de busqueda: `tipoMiembro.<clave>`, luego el catálogo `cat.<clave>`
 * (que sólo cubre algunos valores) y, como último recurso, la clave misma.
 */
import type { TFunction } from 'i18next';

export function etiquetaDeTipo(t: TFunction, clave: string | null | undefined): string {
  const c = (clave ?? '').trim();
  if (!c) return '';
  return t(`tipoMiembro.${c}`, { defaultValue: t(`cat.${c}`, { defaultValue: c }) }) as string;
}

/**
 * etiquetaLegible — ultimo recurso para cualquier clave interna que llegue a la
 * pantalla sin traduccion: `empresa_inclusiva` se lee "Empresa inclusiva" en
 * vez de mostrarse cruda. No sustituye a la traduccion; evita que el usuario
 * vea el nombre tecnico cuando falta.
 */
export function etiquetaLegible(clave: string | null | undefined): string {
  const c = (clave ?? '').trim().replace(/[_-]+/g, ' ');
  if (!c) return '';
  return c.charAt(0).toUpperCase() + c.slice(1);
}
