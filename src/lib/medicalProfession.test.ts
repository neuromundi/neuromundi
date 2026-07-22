import { describe, it, expect } from 'vitest';
import { isMedicalProfession, MEDICAL_PROFESSIONS, PROFESSIONS } from '@/data/specialistCatalog';

/**
 * Criterio: ISCO-08 reserva "médico" al grupo 221 (2211/2212). El resto del
 * personal sanitario —psicología, fisioterapia, logopedia, nutrición, terapia
 * ocupacional— son profesionales de la salud, pero no médicos. En México la Ley
 * General de Salud (art. 79) distingue igual la medicina de las demás.
 */
describe('clasificación médica de profesiones', () => {
  it('las especialidades médicas se marcan como médicas', () => {
    for (const p of ['psiquiatria', 'paidopsiquiatria', 'neuropediatria', 'neurologia', 'pediatria', 'genetica_medica', 'medicina_rehabilitacion']) {
      expect(isMedicalProfession(p)).toBe(true);
    }
  });

  it('las profesiones de salud no médicas se marcan como no médicas', () => {
    for (const p of ['psicologia_clinica', 'psicologia_infantil', 'neuropsicologia', 'terapia_ocupacional', 'logopedia', 'fisioterapia', 'nutricion', 'musicoterapia']) {
      expect(isMedicalProfession(p)).toBe(false);
    }
  });

  it('las profesiones educativas no son médicas', () => {
    expect(isMedicalProfession('psicopedagogia')).toBe(false);
    expect(isMedicalProfession('educacion_especial')).toBe(false);
  });

  it('"otro" queda indeterminado: lo revisa el administrador', () => {
    expect(isMedicalProfession('otro')).toBeNull();
  });

  it('valores desconocidos o vacíos quedan indeterminados', () => {
    expect(isMedicalProfession('astronauta')).toBeNull();
    expect(isMedicalProfession('')).toBeNull();
    expect(isMedicalProfession(null)).toBeNull();
    expect(isMedicalProfession(undefined)).toBeNull();
  });

  it('toda profesión médica existe en el catálogo (sin claves huérfanas)', () => {
    const values = new Set(PROFESSIONS.map((p) => p.value));
    for (const m of MEDICAL_PROFESSIONS) {
      expect(values.has(m)).toBe(true);
    }
  });

  it('nutrición NO es médica aunque sea profesión sanitaria regulada', () => {
    // ISCO-08 la clasifica en 2265 (dietistas y nutricionistas), fuera del 221.
    expect(isMedicalProfession('nutricion')).toBe(false);
  });
});
