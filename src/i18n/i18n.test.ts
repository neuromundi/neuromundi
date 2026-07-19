import { describe, it, expect } from 'vitest';
import { resolveInitialLanguage } from './index';

describe('resolveInitialLanguage', () => {
  it('navegador en español → español', () => {
    expect(resolveInitialLanguage('es-MX', null)).toBe('es');
    expect(resolveInitialLanguage('es', null)).toBe('es');
    expect(resolveInitialLanguage('es-ES', null)).toBe('es');
  });

  it('cualquier otro idioma del navegador → inglés (regla del requisito)', () => {
    expect(resolveInitialLanguage('fr-FR', null)).toBe('en');
    expect(resolveInitialLanguage('de', null)).toBe('en');
    expect(resolveInitialLanguage('ja', null)).toBe('en');
    expect(resolveInitialLanguage('zh-CN', null)).toBe('en');
    expect(resolveInitialLanguage('pt-BR', null)).toBe('en');
  });

  it('una elección guardada válida tiene prioridad sobre el navegador', () => {
    expect(resolveInitialLanguage('fr-FR', 'ja')).toBe('ja');
    expect(resolveInitialLanguage('es-MX', 'de')).toBe('de');
  });

  it('una elección guardada inválida se ignora', () => {
    expect(resolveInitialLanguage('fr-FR', 'xx')).toBe('en');
  });
});
