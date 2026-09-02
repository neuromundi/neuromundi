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
 * Toda clave que se lee con `returnObjects: true` debe ser una LISTA en los 11
 * idiomas. Si falta, i18next devuelve el texto de la clave (un string); el
 * helper `tList` evita que eso rompa la pantalla, pero la lista se vería VACÍA
 * y el usuario perdería contenido en silencio. Este test detecta el hueco.
 *
 * Nace de un fallo real: `founder.groups.companies` nunca se agregó al crear el
 * track de fundador para empresas, y el registro de empresas quedó con
 * "Unexpected Application Error: m.map is not a function".
 *
 * Al añadir un `tList(t, 'x.y')` nuevo en el código, agrega aquí su clave.
 */
describe('claves de i18n leídas como listas', () => {
  const LOCALES = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ar', 'he'] as const;

  const FOUNDER_KINDS = ['families', 'professionals', 'providers', 'companies'];
  const LMS_PROFILES = ['families', 'specialists', 'educators'];
  const MILESTONE_BANDS = ['0-6m', '6-12m', '12-24m', '2-3a', '3-4a', '4-6a'];
  const MILESTONE_AREAS = ['motor', 'lenguaje', 'social', 'cognitivo'];
  const ROLE_TYPES = [
    'patient', 'parent', 'service_provider', 'merchant', 'school', 'clinic',
    'wellness', 'tourism', 'legal', 'ngo', 'caregiver', 'company',
  ];

  const KEYS: string[] = [
    'agenda.weekdays',
    'home.slides',
    'tribe.ethics',
    'tribe.rules',
    'founder.allBenefits',
    'lms.levels',
    'dataprot.law.rights',
    'expert.form.notes',
    ...FOUNDER_KINDS.flatMap((k) => [`founder.groups.${k}.benefits`, `founder.groups.${k}.reqs`]),
    ...LMS_PROFILES.map((p) => `lms.profiles.${p}.themes`),
    ...MILESTONE_BANDS.flatMap((b) => MILESTONE_AREAS.map((a) => `milestones.${b}.${a}`)),
    ...ROLE_TYPES.map((r) => `roleFeatures.${r}.features`),
  ];

  const at = (dict: unknown, path: string): unknown =>
    path.split('.').reduce<unknown>(
      (cur, part) =>
        cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)
          ? (cur as Record<string, unknown>)[part]
          : undefined,
      dict,
    );

  it.each(LOCALES)('%s: todas las claves de lista son arreglos', async (loc) => {
    const dict = (await import(`./locales/${loc}.json`)).default;
    const rotas = KEYS.filter((k) => !Array.isArray(at(dict, k)));
    expect(rotas, `${loc}: estas claves no son listas -> ${rotas.join(', ')}`).toEqual([]);
  });
});
