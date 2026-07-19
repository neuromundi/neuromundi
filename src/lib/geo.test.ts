import { describe, it, expect } from 'vitest';
import { haversineKm, DEFAULT_CENTER } from './utils';

describe('haversineKm', () => {
  it('da 0 para el mismo punto (happy path)', () => {
    expect(haversineKm(DEFAULT_CENTER, DEFAULT_CENTER)).toBeCloseTo(0, 5);
  });

  it('mide una distancia conocida con tolerancia razonable', () => {
    // CDMX → Querétaro ≈ 170 km en línea recta.
    const queretaro = { lat: 20.5888, lng: -100.3899 };
    const d = haversineKm(DEFAULT_CENTER, queretaro);
    expect(d).toBeGreaterThan(150);
    expect(d).toBeLessThan(200);
  });

  it('es simétrica', () => {
    const a = { lat: 19.43, lng: -99.13 };
    const b = { lat: 25.67, lng: -100.31 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});
