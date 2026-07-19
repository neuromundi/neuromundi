import { describe, it, expect } from 'vitest';
import { offerSchema, defaultOfferValues } from './schemas';

describe('offerSchema', () => {
  it('acepta un porcentaje válido (happy path)', () => {
    const res = offerSchema.safeParse({
      ...defaultOfferValues(),
      title: '15% en terapias',
      discount_type: 'percentage',
      discount_value: 15,
      status: 'active',
    });
    expect(res.success).toBe(true);
  });

  it('rechaza porcentaje fuera de 1–100 (error path)', () => {
    const res = offerSchema.safeParse({
      ...defaultOfferValues(),
      title: 'Descuento enorme',
      discount_type: 'percentage',
      discount_value: 150,
    });
    expect(res.success).toBe(false);
  });

  it('exige monto en descuento fijo', () => {
    const res = offerSchema.safeParse({
      ...defaultOfferValues(),
      title: 'Monto fijo',
      discount_type: 'fixed',
      discount_value: null,
    });
    expect(res.success).toBe(false);
  });

  it('cortesía no requiere valor', () => {
    const res = offerSchema.safeParse({
      ...defaultOfferValues(),
      title: 'Café de cortesía',
      discount_type: 'freebie',
      discount_value: null,
    });
    expect(res.success).toBe(true);
  });

  it('valida que la fecha de fin sea posterior a la de inicio', () => {
    const res = offerSchema.safeParse({
      ...defaultOfferValues(),
      title: 'Fechas',
      discount_type: 'freebie',
      discount_value: null,
      valid_from: '2026-07-01T10:00',
      valid_until: '2026-06-01T10:00',
    });
    expect(res.success).toBe(false);
  });
});
