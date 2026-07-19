import { describe, it, expect, vi } from 'vitest';
import { evsColor, formatDiscount, scoreLabel, debounce, EVS_COLORS } from './utils';

describe('evsColor', () => {
  it('mapea un score al escalón de color correcto (happy path)', () => {
    expect(evsColor(5)).toBe(EVS_COLORS[5]);
    expect(evsColor(4.7)).toBe(EVS_COLORS[5]); // redondea
    expect(evsColor(2.4)).toBe(EVS_COLORS[2]);
    expect(evsColor(1)).toBe(EVS_COLORS[1]);
  });

  it('devuelve un color neutro ante valores ausentes (error path)', () => {
    expect(evsColor(null)).toBe('#94a3b8');
    expect(evsColor(undefined)).toBe('#94a3b8');
    expect(evsColor(NaN)).toBe('#94a3b8');
  });

  it('acota fuera de rango', () => {
    expect(evsColor(9)).toBe(EVS_COLORS[5]);
    expect(evsColor(-3)).toBe(EVS_COLORS[1]);
  });
});

describe('formatDiscount', () => {
  it('formatea porcentaje, fijo y cortesía', () => {
    expect(formatDiscount('percentage', 15)).toContain('15%');
    expect(formatDiscount('fixed', 50)).toContain('$50');
    expect(formatDiscount('freebie', null)).toMatch(/cortesía|Regalo/);
  });
});

describe('scoreLabel', () => {
  it('etiqueta cada nivel', () => {
    expect(scoreLabel(1)).toBe('Muy malo');
    expect(scoreLabel(5)).toBe('Excelente');
  });
});

describe('debounce', () => {
  it('agrupa llamadas y respeta cancel()', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 200);
    d();
    d();
    d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);

    d();
    d.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
