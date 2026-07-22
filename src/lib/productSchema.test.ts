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

  it('rechaza "otro" sin especificar la clasificación', () => {
    const res = productSchema.safeParse({
      ...defaultProductValues(),
      name: 'Producto raro',
      store_category: 'otro',
      store_category_other: '',
    });
    expect(res.success).toBe(false);
  });

  it('rechaza "otro" con especificación de solo espacios', () => {
    const res = productSchema.safeParse({
      ...defaultProductValues(),
      name: 'Producto raro',
      store_category: 'otro',
      store_category_other: '   ',
    });
    expect(res.success).toBe(false);
  });

  it('acepta "otro" con la clasificación especificada', () => {
    const res = productSchema.safeParse({
      ...defaultProductValues(),
      name: 'Producto raro',
      store_category: 'otro',
      store_category_other: 'Mobiliario adaptado',
    });
    expect(res.success).toBe(true);
  });

  it('no exige especificación cuando la clasificación no es "otro"', () => {
    const res = productSchema.safeParse({
      ...defaultProductValues(),
      name: 'Producto',
      store_category: 'sensorial',
      store_category_other: '',
    });
    expect(res.success).toBe(true);
  });
});
