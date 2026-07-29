import { describe, it, expect } from 'vitest';
import { resolveInitialLanguage } from './index';

describe('resolveInitialLanguage', () => {
  it('navegador en español → español', () => {
    expect(resolveInitialLanguage('es-MX', null)).toBe('es');
    expect(resolveInitialLanguage('es', null)).toBe('es');
    expect(resolveInitialLanguage('es-ES', null)).toBe('es');
  });

  it('idioma del navegador soportado → ese idioma', () => {
    expect(resolveInitialLanguage('fr-FR', null)).toBe('fr');
    expect(resolveInitialLanguage('de', null)).toBe('de');
    expect(resolveInitialLanguage('ja', null)).toBe('ja');
    expect(resolveInitialLanguage('zh-CN', null)).toBe('zh');
    expect(resolveInitialLanguage('pt-BR', null)).toBe('pt');
    expect(resolveInitialLanguage('it', null)).toBe('it');
  });

  it('idioma del navegador NO soportado → inglés', () => {
    expect(resolveInitialLanguage('ru-RU', null)).toBe('en');
    expect(resolveInitialLanguage('ko', null)).toBe('en');
    expect(resolveInitialLanguage('', null)).toBe('en');
  });

  it('una elección guardada válida tiene prioridad sobre el navegador', () => {
    expect(resolveInitialLanguage('fr-FR', 'ja')).toBe('ja');
    expect(resolveInitialLanguage('es-MX', 'de')).toBe('de');
  });

  it('una elección guardada inválida se ignora (usa el navegador)', () => {
    expect(resolveInitialLanguage('fr-FR', 'xx')).toBe('fr');
    expect(resolveInitialLanguage('ru-RU', 'xx')).toBe('en');
  });
});
