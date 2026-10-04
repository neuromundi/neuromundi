import { describe, it, expect } from 'vitest';
import { qualityBadge } from './qualityBadge';

describe('qualityBadge', () => {
  it('otorga Productos a comercios que cumplen el umbral', () => {
    expect(qualityBadge('merchant', 4.5, 5)).toBe('productos-alta-calidad');
    expect(qualityBadge('merchant', 4.9, 20)).toBe('productos-alta-calidad');
  });

  it('otorga Servicios a clínicas y prestadores de servicios', () => {
    expect(qualityBadge('service_provider', 4.6, 8)).toBe('servicios-alta-calidad');
    expect(qualityBadge('clinic', 4.5, 5)).toBe('servicios-alta-calidad');
  });

  it('no otorga si no alcanza calificación o reseñas', () => {
    expect(qualityBadge('merchant', 4.4, 10)).toBeNull();
    expect(qualityBadge('service_provider', 4.9, 4)).toBeNull();
    expect(qualityBadge('merchant', null, 10)).toBeNull();
  });

  it('no otorga a tipos sin servicios ni productos (escuela, empresa)', () => {
    expect(qualityBadge('school', 5, 50)).toBeNull();
    expect(qualityBadge('company', 5, 50)).toBeNull();
  });
});
