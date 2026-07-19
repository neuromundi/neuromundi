import { describe, it, expect } from 'vitest';
import { computeBadge, discountPoints, contentPoints, type BadgeInputs } from './badge';

const base: BadgeInputs = {
  documentalVerified: true,
  avgQuality: 5,
  avgHumanTreatment: 5,
  avgProfessionalism: 5,
  evsScore: 5,
  totalReviews: 20,
  discountPct: 0,
  contentCount: 0,
  responseRatePct: 0,
  retentionPct: 0,
};

describe('discountPoints', () => {
  it('respeta los tramos', () => {
    expect(discountPoints(0)).toBe(0);
    expect(discountPoints(5)).toBe(10);
    expect(discountPoints(9)).toBe(10);
    expect(discountPoints(10)).toBe(20);
    expect(discountPoints(14)).toBe(20);
    expect(discountPoints(15)).toBe(30);
    expect(discountPoints(25)).toBe(30);
  });
});

describe('contentPoints', () => {
  it('1 punto por publicación con tope 5', () => {
    expect(contentPoints(0)).toBe(0);
    expect(contentPoints(3)).toBe(3);
    expect(contentPoints(9)).toBe(5);
  });
});

describe('Filtro Cero', () => {
  it('sin validación documental → En Revisión, sin distintivo', () => {
    const r = computeBadge({ ...base, documentalVerified: false, discountPct: 20 });
    expect(r.status).toBe('en_revision');
    expect(r.level).toBeNull();
  });
});

describe('niveles', () => {
  it('Miembro Verificado con calificación ≥ 4.0', () => {
    const r = computeBadge({ ...base, evsScore: 4.2, discountPct: 5 });
    expect(r.level).toBe('miembro');
    expect(r.status).toBe('badged');
  });

  it('Miembro Verificado por nuevo ingreso (pocas reseñas)', () => {
    const r = computeBadge({ ...base, evsScore: null, totalReviews: 0, avgQuality: null, avgHumanTreatment: null, avgProfessionalism: null });
    expect(r.isNew).toBe(true);
    expect(r.level).toBe('miembro');
  });

  it('Aliado Destacado: descuento ≥10% y ≥4.5', () => {
    const r = computeBadge({ ...base, evsScore: 4.6, discountPct: 12 });
    expect(r.level).toBe('aliado');
  });

  it('Embajador: descuento ≥15%, ≥4.8 y empatía ≥18/20', () => {
    const r = computeBadge({ ...base, evsScore: 4.9, discountPct: 18, avgHumanTreatment: 5 });
    expect(r.breakdown.empathy).toBe(20);
    expect(r.level).toBe('embajador');
  });

  it('Sin empatía suficiente NO es Embajador (cae a Aliado)', () => {
    const r = computeBadge({ ...base, evsScore: 4.9, discountPct: 18, avgHumanTreatment: 4 });
    expect(r.breakdown.empathy).toBeLessThan(18);
    expect(r.level).toBe('aliado');
  });

  it('Verificado pero con baja calificación → sin distintivo', () => {
    const r = computeBadge({ ...base, evsScore: 3.5, discountPct: 5 });
    expect(r.status).toBe('sin_distintivo');
    expect(r.level).toBeNull();
  });
});

describe('puntaje', () => {
  it('100 pts con todo al máximo', () => {
    const r = computeBadge({
      ...base, discountPct: 20, contentCount: 5, responseRatePct: 100, retentionPct: 100,
    });
    expect(r.breakdown.qualityHuman).toBe(50);
    expect(r.breakdown.economic).toBe(30);
    expect(r.breakdown.commitment).toBe(20);
    expect(r.score).toBe(100);
  });
});
