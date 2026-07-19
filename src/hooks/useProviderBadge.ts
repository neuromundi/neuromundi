/**
 * useProviderBadge — calcula el distintivo oficial de un proveedor.
 * Lee los insumos de la vista `provider_badge_inputs` y aplica el motor puro
 * de src/lib/badge (fuente única de la lógica de puntuación).
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { computeBadge, type BadgeResult, type BadgeInputs } from '@/lib/badge';
import type { Views } from '@/types/database';

type BadgeInputRow = Views<'provider_badge_inputs'>;

export function inputsFromRow(r: BadgeInputRow): BadgeInputs {
  return {
    documentalVerified: r.documental_verified,
    avgQuality: r.avg_quality,
    avgHumanTreatment: r.avg_human_treatment,
    avgProfessionalism: r.avg_professionalism,
    evsScore: r.evs_score,
    totalReviews: r.total_reviews ?? 0,
    discountPct: Number(r.discount_pct ?? 0),
    contentCount: r.content_count ?? 0,
    responseRatePct: Number(r.response_rate_pct ?? 0),
    retentionPct: Number(r.retention_pct ?? 0),
  };
}

export function useProviderBadge(providerId: string | null | undefined) {
  const [badge, setBadge] = useState<BadgeResult | null>(null);
  const [loading, setLoading] = useState<boolean>(!!providerId);

  useEffect(() => {
    if (!providerId) {
      setBadge(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('provider_badge_inputs')
        .select('*')
        .eq('provider_id', providerId)
        .maybeSingle();
      if (!active) return;
      setBadge(data ? computeBadge(inputsFromRow(data)) : null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [providerId]);

  return { badge, loading };
}
