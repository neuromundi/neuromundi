/**
 * tList — lee una clave de i18n que debe ser una LISTA, sin riesgo de romper la
 * página.
 *
 * El problema que resuelve: `t(clave, { returnObjects: true })` devuelve el
 * TEXTO DE LA CLAVE (un string) cuando la traducción falta. Un `as string[]`
 * engaña al compilador —TypeScript se queda tranquilo— pero en tiempo de
 * ejecución el `.map()` revienta con "x.map is not a function" y tumba la
 * pantalla completa, no solo esa lista.
 *
 * Pasó de verdad: `founder.groups.companies` nunca se agregó a los archivos de
 * idioma al crear el track de fundador para empresas, y el registro de empresas
 * quedó inutilizable con "Unexpected Application Error".
 *
 * Un `?? []` NO basta: solo atrapa null/undefined, y aquí el valor problemático
 * es un string. Hay que comprobar que sea un array de verdad.
 *
 * Con esto, una traducción faltante degrada esa lista (se ve vacía) en vez de
 * romper la página. El test de i18n vigila aparte que las claves existan.
 */
import type { TFunction } from 'i18next';

export function tList(t: TFunction, key: string): string[] {
  const raw = t(key, { returnObjects: true, defaultValue: [] });
  return Array.isArray(raw) ? (raw as string[]) : [];
}
