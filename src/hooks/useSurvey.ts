/**
 * useSurvey — contexto y envío de la encuesta de satisfacción.
 *
 * `loadContext` reúne los datos que el modal necesita mostrar (nombre del
 * proveedor, tipo, oferta canjeada). `submit` inserta la encuesta —el trigger
 * `complete_transaction_on_survey` marca la transacción como completada— y
 * devuelve el EVS ya actualizado para la pantalla de agradecimiento.
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDiscount, toMessage } from '@/lib/utils';
import type { SurveyFormValues } from '@/lib/schemas';
import type {
  ProviderType,
  Result,
  SurveyInsert,
  Transaction,
} from '@/types/app';

export interface SurveyContext {
  transaction: Transaction;
  providerName: string;
  providerType: ProviderType | null;
  offerTitle: string | null;
  discountText: string | null;
}

export interface SurveyResultData {
  evs: number | null;
  totalReviews: number | null;
}

export interface UseSurveyValue {
  submitting: boolean;
  error: string | null;
  loadContext: (transaction: Transaction) => Promise<Result<SurveyContext>>;
  submit: (
    transaction: Transaction,
    values: SurveyFormValues,
    providerType: ProviderType | null,
  ) => Promise<Result<SurveyResultData>>;
}

export function useSurvey(): UseSurveyValue {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContext = useCallback<UseSurveyValue['loadContext']>(async (transaction) => {
    try {
      const [providerRes, offerRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('business_name, full_name, provider_type')
          .eq('id', transaction.provider_id)
          .maybeSingle(),
        supabase
          .from('offers')
          .select('title, discount_type, discount_value')
          .eq('id', transaction.offer_id)
          .maybeSingle(),
      ]);

      if (providerRes.error) throw providerRes.error;

      const provider = providerRes.data;
      const offer = offerRes.data;

      return {
        ok: true,
        data: {
          transaction,
          providerName:
            provider?.business_name ?? provider?.full_name ?? 'el proveedor',
          providerType: provider?.provider_type ?? null,
          offerTitle: offer?.title ?? null,
          discountText: offer
            ? formatDiscount(offer.discount_type, offer.discount_value)
            : null,
        },
      };
    } catch (e) {
      const msg = toMessage(e, 'No se pudo cargar la información del canje.');
      setError(msg);
      return { ok: false, error: msg };
    }
  }, []);

  const submit = useCallback<UseSurveyValue['submit']>(
    async (transaction, values, providerType) => {
      setSubmitting(true);
      setError(null);
      try {
        const isService = providerType === 'service_provider';
        const payload: SurveyInsert = {
          transaction_id: transaction.id,
          parent_id: transaction.parent_id,
          provider_id: transaction.provider_id,
          quality_score: values.quality_score,
          human_treatment_score: values.human_treatment_score,
          accessibility_score: values.accessibility_score,
          price_value_score: values.price_value_score,
          offer_compliance_score: values.offer_compliance_score,
          sensory_adaptation_score: values.sensory_adaptation_score,
          flexibility_crisis_score: values.flexibility_crisis_score,
          // Solo se guardan para service_provider; en merchant van null.
          facilities_score: isService ? values.facilities_score : null,
          professionalism_score: isService ? values.professionalism_score : null,
          comments: values.comments.trim() ? values.comments.trim() : null,
          is_anonymous: values.is_anonymous,
        };

        const { error: insErr } = await supabase
          .from('satisfaction_surveys')
          .insert(payload);
        if (insErr) throw insErr;

        // EVS recalculado por la vista pública (el trigger ya completó la tx).
        const { data: rating } = await supabase
          .from('public_provider_ratings')
          .select('evs_score, total_reviews')
          .eq('provider_id', transaction.provider_id)
          .maybeSingle();

        return {
          ok: true,
          data: {
            evs: rating?.evs_score ?? null,
            totalReviews: rating?.total_reviews ?? null,
          },
        };
      } catch (e) {
        const msg = toMessage(e, 'No se pudo enviar tu calificación. Intenta de nuevo.');
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return { submitting, error, loadContext, submit };
}
