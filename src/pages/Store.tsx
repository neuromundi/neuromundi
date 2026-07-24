/**
 * Store — Tienda Neuromundi (/tienda). Lista productos aprobados y activos de
 * TODOS los perfiles, con buscador y filtros por clasificación de neurodesarrollo,
 * una sección de promociones destacadas y el aviso de que Neuromundi no cobra
 * comisión ni promueve la comercialización. La compra se concreta con el oferente.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Tag, Search, Star, ShieldCheck, MessageSquare } from 'lucide-react';
import { Button, useToast, EmptyState, SkeletonCard, StarRating } from '@/components/ui';
import { useStore, getRefCode, type Product } from '@/hooks/useShop';
import { ProductReviewsModal } from '@/components/shop/ProductReviewsModal';
import { CountryFilter } from '@/components/common/CountryFilter';
import { useCountry } from '@/stores/countryStore';
import { useCatLabel } from '@/lib/catLabel';
import { STORE_CATEGORIES } from '@/data/storeCatalog';
import { cn } from '@/lib/utils';

export function Store() {
  const { t } = useTranslation();
  const toast = useToast();
  const catLabel = useCatLabel();
  const { products, ratings, sellers, loading, buy } = useStore();
  const { country } = useCountry();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewsFor, setReviewsFor] = useState<Product | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [corporate, setCorporate] = useState(false);
  const ref = getRefCode();

  const term = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (corporate && !p.is_featured) return false;
        if (cat && p.store_category !== cat) return false;
        if (country && sellers[p.vendor_id]?.country !== country) return false;
        if (term && !`${p.name} ${p.description ?? ''}`.toLowerCase().includes(term)) return false;
        return true;
      }),
    [products, cat, term, country, sellers, corporate],
  );
  const featured = useMemo(() => products.filter((p) => p.is_featured), [products]);
  const showFeatured = featured.length > 0 && !term && !cat && !corporate;

  const onBuy = async (p: Product) => {
    setBusyId(p.id);
    const r = await buy(p.id);
    setBusyId(null);
    if (!r.ok) toast.error(r.error || t('shop.buyError'));
  };

  const Card = ({ p }: { p: Product }) => (
    <article className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      {p.image_url ? (
        <img loading="lazy" decoding="async" src={p.image_url} alt="" className="mb-3 h-36 w-full rounded-xl object-cover" />
      ) : (
        <div className="mb-3 flex h-36 w-full items-center justify-center rounded-xl bg-slate-100 text-slate-300">
          <ShoppingBag className="h-10 w-10" />
        </div>
      )}
      <h3 className="font-semibold text-slate-900">{p.name}</h3>
      {p.store_category ? (
        <p className="mt-0.5 text-xs text-brand-700">
          {p.store_category === 'otro' && p.store_category_other
            ? p.store_category_other
            : catLabel(p.store_category, p.store_category)}
        </p>
      ) : null}
      {p.description ? <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p> : null}

      {/* Confianza del vendedor */}
      {(sellers[p.vendor_id]?.verified || sellers[p.vendor_id]?.memberNo != null) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {sellers[p.vendor_id]?.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2 py-0.5 font-semibold text-sage-700">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('shop.verifiedSeller')}
            </span>
          )}
          {sellers[p.vendor_id]?.memberNo != null && (
            <span className="font-mono text-muted">NM-{String(sellers[p.vendor_id]!.memberNo).padStart(6, '0')}</span>
          )}
        </div>
      )}

      {/* Promedio de reseñas */}
      {ratings[p.id]?.count ? (
        <button
          type="button"
          onClick={() => setReviewsFor(p)}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-700 hover:underline"
        >
          <StarRating value={ratings[p.id].avg} label={t('shop.avgRating')} size="sm" showLabel={false} />
          <span className="text-muted">({ratings[p.id].count})</span>
        </button>
      ) : null}

      <p className="mt-2 font-bold text-slate-900">
        {p.price != null ? `$${Number(p.price).toLocaleString()} ${p.currency}` : t('shop.noPrice')}
        {p.stock === 0 && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-muted">{t('shop.soldOut')}</span>}
      </p>
      <div className="mt-auto space-y-2 pt-3">
        <Button fullWidth loading={busyId === p.id} disabled={p.stock === 0} onClick={() => onBuy(p)} leadingIcon={<ShoppingBag className="h-4 w-4" />}>
          {p.stock === 0 ? t('shop.soldOut') : t('shop.buy')}
        </Button>
        <Button fullWidth variant="ghost" size="sm" onClick={() => setReviewsFor(p)} leadingIcon={<MessageSquare className="h-4 w-4" />}>
          {ratings[p.id]?.count ? t('shop.seeReviews') : t('shop.beFirstShort')}
        </Button>
      </div>
    </article>
  );

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 p-8 text-white shadow-lg">
        <ShoppingBag className="h-10 w-10 opacity-90" />
        <h1 className="mt-3 text-3xl font-extrabold">{t('shop.title')}</h1>
        <p className="mt-2 max-w-xl text-white/90">{t('shop.subtitle')}</p>
      </section>

      {/* Acceso directo a los productos propios de Neuromundi vs. toda la tienda */}
      <div
        className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1"
        role="group"
        aria-label={t('shop.scope')}
      >
        <button
          type="button"
          onClick={() => setCorporate(false)}
          aria-pressed={!corporate}
          className={cn(
            'flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors',
            !corporate ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {t('shop.allProducts')}
        </button>
        <button
          type="button"
          onClick={() => setCorporate(true)}
          aria-pressed={corporate}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors',
            corporate ? 'bg-white text-fuchsia-800 shadow-sm' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          <Star className={cn('h-4 w-4', corporate ? 'text-fuchsia-600' : 'text-slate-400')} aria-hidden="true" />
          {t('shop.corporate')}
        </button>
      </div>
      {corporate && <p className="text-xs text-muted">{t('shop.corporateHint')}</p>}

      <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
        {t('shop.noCommission')}
      </p>

      {ref ? (
        <p className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 p-2 text-sm text-brand-800">
          <Tag className="h-4 w-4" /> {t('shop.refActive')}
        </p>
      ) : null}

      <CountryFilter id="store-country" />

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('shop.searchPlaceholder')}
            aria-label={t('shop.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('shop.categories')}>
          <button
            type="button"
            onClick={() => setCat('')}
            aria-pressed={cat === ''}
            className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', cat === '' ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}
          >
            {t('shop.allCategories')}
          </button>
          {STORE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCat(cat === c.value ? '' : c.value)}
              aria-pressed={cat === c.value}
              className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', cat === c.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}
            >
              {catLabel(c.value, c.label)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="h-6 w-6" />} title={t('shop.emptyTitle')} description={t('shop.empty')} />
      ) : (
        <>
          {showFeatured ? (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Star className="h-5 w-5 text-amber-500" aria-hidden="true" /> {t('shop.featured')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((p) => (
                  <Card key={p.id} p={p} />
                ))}
              </div>
            </section>
          ) : null}

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">{t('shop.noResults')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <Card key={p.id} p={p} />
              ))}
            </div>
          )}
        </>
      )}

      {reviewsFor && (
        <ProductReviewsModal
          productId={reviewsFor.id}
          productName={reviewsFor.name}
          onClose={() => setReviewsFor(null)}
        />
      )}
    </main>
  );
}
