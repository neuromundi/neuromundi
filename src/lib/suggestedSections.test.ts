import { describe, it, expect } from 'vitest';
import { suggestedSections } from './suggestedSections';

describe('suggestedSections', () => {
  it('sugiere la base para profesiones de neurodesarrollo/neurodivergencia', () => {
    expect(suggestedSections('terapia_ocupacional')).toEqual(['neurodesarrollo', 'neurodivergencias']);
    expect(suggestedSections('logopedia')).toEqual(['neurodesarrollo', 'neurodivergencias']);
  });

  it('añade afecciones para profesiones de neurología clínica', () => {
    expect(suggestedSections('neurologia')).toContain('afecciones');
    expect(suggestedSections('epileptologia')).toContain('afecciones');
    expect(suggestedSections('neuropediatria')).toEqual([
      'neurodesarrollo', 'neurodivergencias', 'afecciones',
    ]);
  });

  it('cae a la base con profesión nula, desconocida u "otro"', () => {
    expect(suggestedSections(null)).toEqual(['neurodesarrollo', 'neurodivergencias']);
    expect(suggestedSections(undefined)).toEqual(['neurodesarrollo', 'neurodivergencias']);
    expect(suggestedSections('otro')).toEqual(['neurodesarrollo', 'neurodivergencias']);
    expect(suggestedSections('xyz_inexistente')).toEqual(['neurodesarrollo', 'neurodivergencias']);
  });

  it('nunca devuelve valores de sección inválidos', () => {
    const valid = new Set(['neurodesarrollo', 'neurodivergencias', 'afecciones']);
    for (const p of ['neurologia', 'psicologia_clinica', 'otro', null]) {
      for (const s of suggestedSections(p)) expect(valid.has(s)).toBe(true);
    }
  });
});
