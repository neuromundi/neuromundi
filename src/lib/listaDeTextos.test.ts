import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { listaDeTextos } from './listaDeTextos';

/** t() de juguete que imita a i18next: devuelve la clave si no la conoce. */
function tDe(diccionario: Record<string, unknown>): TFunction {
  return ((clave: string) => (clave in diccionario ? diccionario[clave] : clave)) as unknown as TFunction;
}

describe('listaDeTextos', () => {
  it('devuelve la lista cuando existe', () => {
    const t = tDe({ 'tribe.rules': ['uno', 'dos'] });
    expect(listaDeTextos(t, 'tribe.rules')).toEqual(['uno', 'dos']);
  });

  it('devuelve lista vacia cuando falta la traduccion (i18next devuelve la clave)', () => {
    const t = tDe({});
    expect(listaDeTextos(t, 'tribe.rules')).toEqual([]);
  });

  it('no revienta con un objeto en vez de una lista', () => {
    const t = tDe({ 'x.y': { a: 1 } });
    expect(listaDeTextos(t, 'x.y')).toEqual([]);
  });

  it('descarta los elementos que no son texto', () => {
    const t = tDe({ 'x.y': ['bueno', 3, null, { a: 1 }, 'tambien'] });
    expect(listaDeTextos(t, 'x.y')).toEqual(['bueno', 'tambien']);
  });

  it('con null o undefined devuelve lista vacia', () => {
    expect(listaDeTextos(tDe({ 'x.y': null }), 'x.y')).toEqual([]);
    expect(listaDeTextos(tDe({ 'x.y': undefined }), 'x.y')).toEqual([]);
  });
});
