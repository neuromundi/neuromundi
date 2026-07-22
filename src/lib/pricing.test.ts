import { describe, it, expect } from 'vitest';
import {
  annualFromMonthly,
  listFromMonthly,
  monthlyFromAnnual,
  annualSaving,
  annualSavingPct,
  ANNUAL_MONTHS_CHARGED,
  ANNUAL_MONTHS_TOTAL,
} from './pricing';

describe('aritmética de la cuota', () => {
  it('reproduce la tabla del negocio para fundadores', () => {
    // Mensual $1,000 → anual $10,000 con referencia $12,000
    expect(annualFromMonthly(1000)).toBe(10000);
    expect(listFromMonthly(1000)).toBe(12000);
  });

  it('reproduce la tabla del negocio para cuota ordinaria', () => {
    // Mensual $1,500 → anual $15,000 con referencia $18,000
    expect(annualFromMonthly(1500)).toBe(15000);
    expect(listFromMonthly(1500)).toBe(18000);
  });

  it('el anual equivale a 10 meses y la referencia a 12', () => {
    expect(ANNUAL_MONTHS_CHARGED).toBe(10);
    expect(ANNUAL_MONTHS_TOTAL).toBe(12);
  });

  it('deriva el mensual desde un anual ya fijado', () => {
    expect(monthlyFromAnnual(10000)).toBe(1000);
    expect(monthlyFromAnnual(15000)).toBe(1500);
  });

  it('ida y vuelta: mensual → anual → mensual', () => {
    for (const m of [499.9, 1000, 1250.5, 2999.99]) {
      expect(monthlyFromAnnual(annualFromMonthly(m))).toBeCloseTo(m, 2);
    }
  });

  it('no arrastra errores de punto flotante', () => {
    // 0.1 * 10 daría 1.0000000000000002 sin redondeo.
    expect(annualFromMonthly(0.1)).toBe(1);
    expect(listFromMonthly(10.07)).toBe(120.84);
  });

  it('calcula el ahorro del plan anual', () => {
    expect(annualSaving(10000, 12000)).toBe(2000);
    expect(annualSaving(15000, 18000)).toBe(3000);
  });

  it('el ahorro es 0 si falta la referencia o no supera al cobrado', () => {
    expect(annualSaving(10000, null)).toBe(0);
    expect(annualSaving(null, 12000)).toBe(0);
    expect(annualSaving(12000, 12000)).toBe(0);
    // Nunca se inventa un ahorro negativo.
    expect(annualSaving(12000, 10000)).toBe(0);
  });

  it('el porcentaje de ahorro es coherente con la regla 12→10', () => {
    // Pagar 10 de 12 meses es ahorrar ~17%.
    expect(annualSavingPct(10000, 12000)).toBe(17);
    expect(annualSavingPct(15000, 18000)).toBe(17);
  });

  it('el porcentaje es 0 cuando no hay ahorro', () => {
    expect(annualSavingPct(12000, 12000)).toBe(0);
    expect(annualSavingPct(10000, null)).toBe(0);
    expect(annualSavingPct(10000, 0)).toBe(0);
  });
});
