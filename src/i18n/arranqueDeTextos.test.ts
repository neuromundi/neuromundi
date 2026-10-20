/**
 * Con qué diccionario arranca cada pantalla.
 *
 * Existe porque el 20 de octubre de 2026 se midió, con un navegador real sobre
 * el sitio publicado, que quien llegaba directo a /entrar o /crear-cuenta veía
 * de forma intermitente las claves crudas («auth.email» en vez de «Correo»):
 * el arranque ligero de la portada se estaba aplicando a todas las pantallas.
 * Solo la portada puede arrancar con el diccionario recortado.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { arrancaSoloConLoCritico } from './index';

const original = window.location.pathname;
const enRuta = (ruta: string) => {
  window.history.replaceState({}, '', ruta);
  return arrancaSoloConLoCritico();
};

afterAll(() => window.history.replaceState({}, '', original));

describe('arranque de textos por pantalla', () => {
  it('la portada arranca con el diccionario recortado', () => {
    expect(enRuta('/')).toBe(true);
  });

  it('las pantallas de cuenta esperan el diccionario completo', () => {
    expect(enRuta('/entrar')).toBe(false);
    expect(enRuta('/crear-cuenta')).toBe(false);
  });

  it('tampoco se recorta en las pantallas legales ni en el directorio', () => {
    expect(enRuta('/reglamento')).toBe(false);
    expect(enRuta('/proteccion-datos')).toBe(false);
    expect(enRuta('/directorio')).toBe(false);
  });

  it('una barra final no convierte una pantalla en portada', () => {
    expect(enRuta('/entrar/')).toBe(false);
  });

  it('la portada con barra final sigue siendo la portada', () => {
    expect(enRuta('/index.html')).toBe(true);
  });
});
