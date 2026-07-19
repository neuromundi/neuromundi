/**
 * useProviderRatings — datos de la pestaña "Mis Calificaciones".
 *
 * Lee el EVS propio y los promedios por dimensión desde la vista pública
 * `public_provider_ratings` (no expone encuestas individuales). Calcula la
 * comparativa contra el promedio de la categoría y, si existe la vista
 * `public_provider_comments`, trae los últimos comentarios SIN datos del padre.
 *
 * Nota: `public_provider_comments` es una vista opcional (SQL en el README de
 * esta fase). Si no existe, los comentarios degradan a lista vacía con aviso.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toMessage } from '@/lib/utils';
import {
  dimensionsForProviderType,
  RATING_AVG_COLUMN,
  type ProviderRating,
  type ProviderType,
  type SurveyDimension,
} from '@/types/app';

export interface RadarDatum {
  /** Clave de la dimensión; la etiqueta se traduce al renderizar. */
  key: SurveyDimension;
  value: number;
}

export interface ProviderComment {
  comments: string;
  created_at: string;
  overall: number | null;
}

export interface UseProviderRatingsValue {
  loading: boolean;
  error: string | null;
  rating: ProviderRating | null;
  radar: RadarDatum[];
  categoryAverageEvs: number | null;
  comments: ProviderComment[];
  commentsUnavailable: boolean;
  refetch: () => Promise<void>;
}

export function useProviderRatings(
  providerId: string | null,
  providerType: ProviderType | null,
): UseProviderRatingsValue {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<ProviderRating | null>(null);
  const [radar, setRadar] = useState<RadarDatum[]>([]);
  const [categoryAverageEvs, setCategoryAverageEvs] = useState<number | null>(null);
  const [comments, setComments] = useState<ProviderComment[]>([]);
  const [commentsUnavailable, setCommentsUnavailable] = useState(false);

  const refetch = useCallback(async () => {
    if (!providerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1) EVS propio + promedios.
      const { data: own, error: ownErr } = await supabase
        .from('public_provider_ratings')
        .select('*')
        .eq('provider_id', providerId)
        .maybeSingle();
      if (ownErr) throw ownErr;
      setRating(own ?? null);

      // 2) Radar de dimensiones aplicables.
      if (own) {
        setRadar(
          dimensionsForProviderType(providerType)
            .map((key) => ({
              key,
              value: Number(own[RATING_AVG_COLUMN[key]] ?? 0),
            }))
            .filter((d) => d.value > 0),
        );
      } else {
        setRadar([]);
      }

      // 3) Comparativa de categoría.
      const { data: myCats } = await supabase
        .from('provider_categories')
        .select('category_id')
        .eq('provider_id', providerId);
      const categoryIds = (myCats ?? []).map((c) => c.category_id);

      if (categoryIds.length > 0) {
        const { data: peers } = await supabase
          .from('provider_categories')
          .select('provider_id')
          .in('category_id', categoryIds);
        const peerIds = [
          ...new Set((peers ?? []).map((p) => p.provider_id).filter((id) => id !== providerId)),
        ];
        if (peerIds.length > 0) {
          const { data: peerRatings } = await supabase
            .from('public_provider_ratings')
            .select('evs_score')
            .in('provider_id', peerIds);
          const scores = (peerRatings ?? [])
            .map((r) => r.evs_score)
            .filter((s): s is number => s != null);
          setCategoryAverageEvs(
            scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
          );
        } else {
          setCategoryAverageEvs(null);
        }
      } else {
        setCategoryAverageEvs(null);
      }

      // 4) Comentarios (vista opcional, degrada con gracia).
      const { data: cmts, error: cmtErr } = await supabase
        .from('public_provider_comments' as never)
        .select('comments, created_at, overall')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (cmtErr) {
        setCommentsUnavailable(true);
        setComments([]);
      } else {
        setCommentsUnavailable(false);
        setComments((cmts ?? []) as unknown as ProviderComment[]);
      }
    } catch (e) {
      setError(toMessage(e, 'No se pudieron cargar tus calificaciones.'));
    } finally {
      setLoading(false);
    }
  }, [providerId, providerType]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    loading,
    error,
    rating,
    radar,
    categoryAverageEvs,
    comments,
    commentsUnavailable,
    refetch,
  };
}
