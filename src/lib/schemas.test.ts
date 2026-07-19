import { describe, it, expect } from 'vitest';
import {
  makeSurveySchema,
  emptySurveyValues,
  isSurveyComplete,
  type SurveyFormValues,
} from './schemas';

function filledUniversal(): SurveyFormValues {
  return {
    ...emptySurveyValues(),
    quality_score: 5,
    human_treatment_score: 5,
    accessibility_score: 4,
    price_value_score: 4,
    offer_compliance_score: 5,
    sensory_adaptation_score: 3,
    flexibility_crisis_score: 4,
  };
}

describe('makeSurveySchema', () => {
  it('un merchant válido pasa con las 7 universales (happy path)', () => {
    const result = makeSurveySchema('merchant').safeParse(filledUniversal());
    expect(result.success).toBe(true);
  });

  it('rechaza cuando falta una dimensión universal (error path)', () => {
    const values = { ...filledUniversal(), accessibility_score: 0 };
    const result = makeSurveySchema('merchant').safeParse(values);
    expect(result.success).toBe(false);
  });

  it('service_provider exige también instalaciones y profesionalismo', () => {
    const onlyUniversal = makeSurveySchema('service_provider').safeParse(filledUniversal());
    expect(onlyUniversal.success).toBe(false);

    const full = makeSurveySchema('service_provider').safeParse({
      ...filledUniversal(),
      facilities_score: 5,
      professionalism_score: 4,
    });
    expect(full.success).toBe(true);
  });
});

describe('isSurveyComplete', () => {
  it('detecta encuesta de merchant completa', () => {
    expect(isSurveyComplete(filledUniversal(), 'merchant')).toBe(true);
  });

  it('un service_provider sin las 2 extra no está completo', () => {
    expect(isSurveyComplete(filledUniversal(), 'service_provider')).toBe(false);
  });
});
