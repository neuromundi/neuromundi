import { describe, it, expect } from 'vitest';
import { combinedDiscountPct, priceAfterPct } from './pricing';

describe('combinedDiscountPct', () => {
  it('compone de forma multiplicativa, no aditiva', () => {
    // 50% (fundador) ∘ 5% (recomendación) = 1 - 0.5*0.95 = 52.5% → redondea a 53
    expect(combinedDiscountPct([50, 5])).toBe(53);
  });

  it('devuelve 0 sin descuentos', () => {
    expect(combinedDiscountPct([])).toBe(0);
    expect(combinedDiscountPct([0, 0, 0])).toBe(0);
  });

  it('ignora nulos/indefinidos', () => {
    expect(combinedDiscountPct([null, undefined, 10])).toBe(10);
  });

  it('un solo descuento se respeta', () => {
    expect(combinedDiscountPct([25])).toBe(25);
  });

  it('acota el total al 90%', () => {
    // 80 ∘ 80 = 96% → topado a 90
    expect(combinedDiscountPct([80, 80])).toBe(90);
  });
});

describe('priceAfterPct', () => {
  it('aplica el porcentaje al importe', () => {
    expect(priceAfterPct(10000, 53)).toBe(4700);
    expect(priceAfterPct(1000, 5)).toBe(950);
  });

  it('sin descuento devuelve el mismo importe', () => {
    expect(priceAfterPct(1234.5, 0)).toBe(1234.5);
  });
});
