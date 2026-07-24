/**
 * ProviderReviews — reseñas públicas de familias en el perfil del prestador.
 *
 * Lee `public_provider_comments` (vista sin datos del padre: solo texto, fecha,
 * promedio y la respuesta del prestador). Cualquiera puede verlas. Es la
 * información que más pesa al elegir especialista.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquareQuote, CornerDownRight } from 'lucide-react';
import { StarRating, SkeletonCard } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';

interface PublicComment {
  id: string;
  comments: string;
  created_at: string;
  overall: number | null;
  provider_response: string | null;
  provider_response_at: string | null;
}

export function ProviderReviews({ providerId, providerName }: { providerId: string; providerName?: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<PublicComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('public_provider_comments' as never)
        .select('id, comments, created_at, overall, provider_response, provider_response_at')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (alive) {
        setItems(((data as unknown as PublicComment[]) ?? []));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [providerId]);

  if (loading) return <SkeletonCard rows={2} />;
  if (items.length === 0) return null; // sin reseñas, no ocupamos espacio.

  return (
    <section aria-label={t('reviews.title')}>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
        <MessageSquareQuote className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('reviews.title')}
      </h2>
      <ul className="space-y-3">
        {items.map((c) => (
          <li key={c.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              {c.overall != null ? (
                <StarRating value={Math.round(c.overall)} size="sm" label={t('reviews.ratingLabel', { n: c.overall })} />
              ) : <span />}
              <span className="text-xs text-muted">{formatDate(c.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{c.comments}</p>

            {/* Respuesta del prestador, si la hay. */}
            {c.provider_response && (
              <div className="mt-3 flex gap-2 rounded-xl bg-brand-50/60 p-3">
                <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-brand-800">
                    {t('reviews.replyBy', { name: providerName ?? t('reviews.theProvider') })}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{c.provider_response}</p>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
