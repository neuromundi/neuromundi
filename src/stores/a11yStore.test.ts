import { describe, it, expect, beforeEach } from 'vitest';
import { applyA11y, useA11y, initA11y, type A11yPrefs } from './a11yStore';

const el = () => document.documentElement;

describe('applyA11y', () => {
  it('aplica escala de texto y atributos data-* al <html> (happy path)', () => {
    const prefs: A11yPrefs = { fontScale: 'lg', reduceMotion: true, calm: true, dyslexia: false, highContrast: true };
    applyA11y(prefs);
    expect(el().style.fontSize).toBe('112.5%');
    expect(el().dataset.reduceMotion).toBe('true');
    expect(el().dataset.calm).toBe('true');
    expect(el().dataset.dyslexia).toBe('false');
    expect(el().dataset.contrast).toBe('true');
  });

  it('escala normal = 100%', () => {
    applyA11y({ fontScale: 'normal', reduceMotion: false, calm: false, dyslexia: false, highContrast: false });
    expect(el().style.fontSize).toBe('100%');
    expect(el().dataset.calm).toBe('false');
  });
});

describe('useA11y (store)', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* noop */ }
  });

  it('toggleCalm alterna el estado, persiste y refleja en el <html>', () => {
    const before = useA11y.getState().calm;
    useA11y.getState().toggleCalm();
    const after = useA11y.getState().calm;
    expect(after).toBe(!before);
    expect(el().dataset.calm).toBe(after ? 'true' : 'false');
    expect(localStorage.getItem('neuromundi.a11y.calm')).toBe(after ? '1' : '0');
    // regresa al estado previo para no contaminar otros tests
    useA11y.getState().toggleCalm();
    expect(useA11y.getState().calm).toBe(before);
  });

  it('setFontScale actualiza escala y persiste', () => {
    useA11y.getState().setFontScale('xl');
    expect(useA11y.getState().fontScale).toBe('xl');
    expect(el().style.fontSize).toBe('125%');
    expect(localStorage.getItem('neuromundi.a11y.fontScale')).toBe('xl');
    useA11y.getState().setFontScale('normal');
  });

  it('initA11y no lanza y deja atributos definidos', () => {
    expect(() => initA11y()).not.toThrow();
    expect(el().dataset.calm).toBeDefined();
  });
});
