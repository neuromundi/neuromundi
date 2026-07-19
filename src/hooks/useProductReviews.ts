/**
 * useProductReviews — reseñas de un producto de la tienda.
 *
 * Lee las reseñas públicas y el promedio agregado (vista public_product_ratings).
 * Una persona registrada puede dejar/editar UNA reseña (upsert por
 * product_id+reviewer_id) o eliminarla. Degrada con gracia si la migración 0017
 * aún no se aplicó (la lista queda vacía).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toMessage } from '@/lib/utils';
import type { Result } from '@/types/app';

export interface ProductReview {
  id: string;
  product_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ProductRatingSummary {
  avg: number;
  count: number;
}

export function useProductReviews(productId: string | null) {
  const { userId } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ProductRatingSummary>({ avg: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!productId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('product_reviews' as never)
      .select('id, product_id, reviewer_id, rating, comment, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50);
    const list = (data ?? []) as unknown as ProductReview[];
    setReviews(list);
    const count = list.length;
    const avg = count ? list.reduce((a, r) => a + r.rating, 0) / count : 0;
    setSummary({ avg, count });
    setLoading(false);
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  const myReview = userId ? reviews.find((r) => r.reviewer_id === userId) ?? null : null;

  const submitReview = useCallback(
    async (rating: number, comment: string): Promise<Result<true>> => {
      if (!userId) return { ok: false, error: 'auth.required' };
      if (!productId) return { ok: false, error: 'No product' };
      if (rating < 1 || rating > 5) return { ok: false, error: 'shop.reviewNeedStars' };
      setSaving(true);
      const { error } = await supabase
        .from('product_reviews' as never)
        .upsert(
          {
            product_id: productId,
            reviewer_id: userId,
            rating,
            comment: comment.trim() || null,
          } as never,
          { onConflict: 'product_id,reviewer_id' },
        );
      setSaving(false);
      if (error) return { ok: false, error: toMessage(error) };
      await load();
      return { ok: true, data: true };
    },
    [userId, productId, load],
  );

  const deleteReview = useCallback(async (): Promise<Result<true>> => {
    if (!userId || !myReview) return { ok: false, error: 'No review' };
    setSaving(true);
    const { error } = await supabase
      .from('product_reviews' as never)
      .delete()
      .eq('id', myReview.id);
    setSaving(false);
    if (error) return { ok: false, error: toMessage(error) };
    await load();
    return { ok: true, data: true };
  }, [userId, myReview, load]);

  return { reviews, summary, myReview, loading, saving, submitReview, deleteReview, reload: load };
}
