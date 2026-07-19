/**
 * ProductReviewsModal — opiniones de un producto.
 *
 * Muestra el promedio y las reseñas existentes, y permite a una persona con
 * sesión dejar/editar/eliminar SU reseña (1–5 estrellas + comentario). Sin
 * sesión, invita a registrarse. Pensado para dar confianza en la tienda.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, useToast, StarRating } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useProductReviews } from '@/hooks/useProductReviews';
import { formatDate } from '@/lib/utils';

export function ProductReviewsModal({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const { reviews, summary, myReview, loading, saving, submitReview, deleteReview } =
    useProductReviews(productId);
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [comment, setComment] = useState(myReview?.comment ?? '');

  const onSubmit = async () => {
    const res = await submitReview(rating, comment);
    if (res.ok) toast.success(t('shop.reviewSaved'));
    else toast.error(res.error === 'shop.reviewNeedStars' ? t('shop.reviewNeedStars') : res.error);
  };

  const onDelete = async () => {
    const res = await deleteReview();
    if (res.ok) { setRating(0); setComment(''); toast.success(t('shop.reviewDeleted')); }
    else toast.error(res.error);
  };

  return (
    <Modal open onClose={onClose} title={t('shop.reviewsTitle', { name: productName })}>
      <div className="space-y-4">
        {/* Resumen */}
        <div className="flex items-center gap-3">
          <StarRating value={summary.avg} label={t('shop.avgRating')} size="sm" showLabel={false} />
          <span className="text-sm text-muted">
            {summary.count > 0
              ? t('shop.reviewCount', { avg: summary.avg.toFixed(1), count: summary.count })
              : t('shop.noReviews')}
          </span>
        </div>

        {/* Dejar / editar reseña */}
        {isAuthenticated ? (
          <div className="rounded-2xl border border-slate-100 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-900">
              {myReview ? t('shop.editYourReview') : t('shop.leaveReview')}
            </p>
            <StarRating value={rating} onChange={setRating} label={t('shop.yourRating')} />
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('shop.reviewPlaceholder')}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <div className="mt-2 flex gap-2">
              <Button size="sm" loading={saving} onClick={onSubmit}>
                {myReview ? t('shop.updateReview') : t('shop.sendReview')}
              </Button>
              {myReview && (
                <Button size="sm" variant="ghost" loading={saving} onClick={onDelete}>
                  {t('shop.deleteReview')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
            {t('shop.reviewNeedLogin')}
          </p>
        )}

        {/* Lista de reseñas */}
        {loading ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted">{t('shop.beFirst')}</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <StarRating value={r.rating} label={t('shop.avgRating')} size="sm" showLabel={false} />
                  <span className="text-xs text-muted">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-slate-700">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
