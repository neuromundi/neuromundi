/**
 * El 19 de octubre de 2026 el panel de administracion imprimia las claves
 * internas en pantalla ("service_provider", "ngo", "wellness") porque pedia
 * un texto que no existia en ningun idioma. Estas pruebas fijan el
 * comportamiento para que no vuelva a pasar inadvertido.
 */
import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { etiquetaDeTipo, etiquetaLegible } from './etiquetaDeTipo';

/** `t` de mentira: devuelve la traduccion si esta en el diccionario y, si no,
 *  el `defaultValue`, igual que hace i18next. */
function tDe(diccionario: Record<string, string>): TFunction {
  return ((clave: string, opciones?: { defaultValue?: string }) =>
    diccionario[clave] ?? opciones?.defaultValue ?? clave) as unknown as TFunction;
}

describe('etiquetaDeTipo', () => {
  it('usa el texto del grupo tipoMiembro cuando existe', () => {
    const t = tDe({ 'tipoMiembro.service_provider': 'Especialista' });
    expect(etiquetaDeTipo(t, 'service_provider')).toBe('Especialista');
  });

  it('cae al catalogo cat.<clave> si tipoMiembro no lo tiene', () => {
    const t = tDe({ 'cat.clinic': 'Clinica' });
    expect(etiquetaDeTipo(t, 'clinic')).toBe('Clinica');
  });

  it('devuelve la clave solo cuando no hay ningun texto', () => {
    expect(etiquetaDeTipo(tDe({}), 'ngo')).toBe('ngo');
  });

  it('con valor vacio o nulo no imprime nada', () => {
    const t = tDe({});
    expect(etiquetaDeTipo(t, '')).toBe('');
    expect(etiquetaDeTipo(t, null)).toBe('');
    expect(etiquetaDeTipo(t, undefined)).toBe('');
  });
});

describe('etiquetaLegible', () => {
  it('convierte la clave interna en algo que se puede leer', () => {
    expect(etiquetaLegible('empresa_inclusiva')).toBe('Empresa inclusiva');
    expect(etiquetaLegible('aliado-neuromundi')).toBe('Aliado neuromundi');
  });

  it('no inventa texto cuando no hay clave', () => {
    expect(etiquetaLegible('')).toBe('');
    expect(etiquetaLegible(null)).toBe('');
  });
});
