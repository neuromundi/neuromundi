/**
 * useProviderReview — reseña DIRECTA a un prestador (sin transacción de descuento).
 * Pacientes y padres/tutores con relación previa (cita aceptada, pedido o canje)
 * pueden calificar. `canReview` consulta la elegibilidad; `submit` envía la
 * encuesta EVS por la RPC segura submit_provider_review.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ProviderType } from '@/types/app';
import type { SurveyFormValues } from '@/lib/schemas';

export function useProviderReview(providerId: string | null | undefined) {
  const [canReview, setCanReview] = useState(false);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    if (!providerId) { setCanReview(false); setChecking(false); return; }
    setChecking(true);
    const { data, error } = await supabase.rpc('can_review_provider', { p_provider: providerId });
    setCanReview(!error && data === true);
    setChecking(false);
  }, [providerId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const submit = useCallback(
    async (values: SurveyFormValues, providerType: ProviderType | null): Promise<{ ok: boolean; error?: string }> => {
      if (!providerId) return { ok: false, error: 'auth.required' };
      const isService = providerType === 'service_provider';
      const { error } = await supabase.rpc('submit_provider_review', {
        p_provider: providerId,
        p_quality: values.quality_score as number,
        p_human: values.human_treatment_score as number,
        p_accessibility: values.accessibility_score as number,
        p_price: values.price_value_score as number,
        p_offer: values.offer_compliance_score as number,
        p_sensory: values.sensory_adaptation_score as number,
        p_flexibility: values.flexibility_crisis_score as number,
        p_facilities: isService ? (values.facilities_score as number | null) : null,
        p_professionalism: isService ? (values.professionalism_score as number | null) : null,
        p_comment: values.comments.trim() ? values.comments.trim() : null,
        p_anonymous: values.is_anonymous,
      });
      if (error) return { ok: false, error: error.message };
      setCanReview(false);
      return { ok: true };
    },
    [providerId],
  );

  return { canReview, checking, submit, refresh };
}
