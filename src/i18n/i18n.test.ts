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
    expect(resolveInitialLanguage('ar', null)).toBe('ar');
    expect(resolveInitialLanguage('he-IL', null)).toBe('he');
    expect(resolveInitialLanguage('ko-KR', null)).toBe('ko');
  });

  it('idioma del navegador NO soportado → inglés', () => {
    expect(resolveInitialLanguage('ru-RU', null)).toBe('en');
    expect(resolveInitialLanguage('th', null)).toBe('en');
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

/**
 * Las claves que se leen con `returnObjects: true` deben ser LISTAS en los 11
 * idiomas. Si falta una, i18next devuelve el texto de la clave (un string) y el
 * `.map` del componente tumba la página entera.
 *
 * Este test nace de un fallo real: `founder.groups.companies` nunca se agregó
 * cuando se creó el track de fundador para empresas, y el registro de empresas
 * quedó con "Unexpected Application Error: m.map is not a function".
 */
describe('claves de i18n leídas como listas', () => {
  const LOCALES = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ar', 'he'] as const;
  const FOUNDER_KINDS = ['families', 'professionals', 'providers', 'companies'] as const;

  it.each(LOCALES)('%s: founder.groups.*.benefits y .reqs son listas', async (loc) => {
    const dict = (await import(`./locales/${loc}.json`)).default as Record<string, never>;
    const groups = (dict as { founder?: { groups?: Record<string, { benefits?: unknown; reqs?: unknown }> } })
      .founder?.groups;
    expect(groups, `${loc}: falta founder.groups`).toBeDefined();
    for (const kind of FOUNDER_KINDS) {
      expect(Array.isArray(groups?.[kind]?.benefits), `${loc}: founder.groups.${kind}.benefits no es lista`).toBe(true);
      expect(Array.isArray(groups?.[kind]?.reqs), `${loc}: founder.groups.${kind}.reqs no es lista`).toBe(true);
    }
  });
});
