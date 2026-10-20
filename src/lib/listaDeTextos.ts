/**
 * listaDeTextos — pide al diccionario una LISTA de textos sin riesgo de que la
 * pantalla reviente.
 *
 * Por que existe (repaso adversario, 19 de octubre de 2026): i18next, cuando se
 * le pide una lista con `returnObjects: true` y la clave NO existe en el idioma
 * activo, no devuelve una lista vacia ni lanza un error: devuelve la CLAVE, que
 * es una cadena. La pantalla hace `.map(...)` sobre esa cadena, `.map` no
 * existe en las cadenas, y la pantalla entera queda en blanco. Sin mensaje y
 * solo en el idioma al que le falte el texto, asi que puede pasar meses sin que
 * nadie lo vea: la misma familia de fallos callados que el resto del repaso.
 *
 * Nueve sitios pedian listas asi. Tres se blindaban con `Array.isArray` y seis
 * no, dos de ellos con un `?? []` que no protege de nada (una cadena no es
 * null). Ahora hay un solo sitio donde se hace, y `npm run revisar:textos`
 * reclama cualquier `returnObjects: true` que no se blinde.
 */
import type { TFunction } from 'i18next';

export function listaDeTextos(t: TFunction, clave: string): string[] {
  const valor = t(clave, { returnObjects: true });
  if (!Array.isArray(valor)) return [];
  // Una lista puede traer objetos (p. ej. `home.slides`): aqui solo se admiten
  // textos, que es lo que esperan todas las pantallas que la usan.
  return valor.filter((v): v is string => typeof v === 'string');
}
