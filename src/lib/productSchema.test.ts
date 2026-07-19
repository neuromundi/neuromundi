import { describe, it, expect } from 'vitest';
import { productSchema, defaultProductValues } from './schemas';

describe('productSchema', () => {
  it('acepta un producto válido (happy path)', () => {
    const res = productSchema.safeParse({
      ...defaultProductValues(),
      name: 'Audífonos sensoriales',
      price: 899,
      purchase_url: 'https://tienda.com/audifonos',
    });
    expect(res.success).toBe(true);
  });

  it('rechaza nombre muy corto (error path)', () => {
    const res = productSchema.safeParse({ ...defaultProductValues(), name: 'a' });
    expect(res.success).toBe(false);
  });

  it('rechaza enlace de compra inválido', () => {
    const res = productSchema.safeParse({
      ...defaultProductValues(),
      name: 'Producto',
      purchase_url: 'no-es-url',
    });
    expect(res.success).toBe(false);
  });

  it('acepta enlace vacío (opcional)', () => {
    const res = productSchema.safeParse({
      ...defaultProductValues(),
      name: 'Producto sin enlace',
      purchase_url: '',
    });
    expect(res.success).toBe(true);
  });

  it('rechaza precio negativo', () => {
    const res = productSchema.safeParse({
      ...defaultProductValues(),
      name: 'Producto',
      price: -10,
    });
    expect(res.success).toBe(false);
  });
});
