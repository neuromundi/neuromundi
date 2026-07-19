/**
 * AdminProducts — moderación de productos de la tienda. El admin aprueba o
 * rechaza/suspende. Compromiso: revisión en ≤24 h. No se admiten "productos
 * milagro"; Neuromundi puede suspender cualquier producto en cualquier momento.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, ExternalLink, ShoppingBag, Star } from 'lucide-react';
import { Button, SkeletonCard, useToast } from '@/components/ui';
import { useProductModeration, type ProductFilter, type ModProduct } from '@/hooks/useProductModeration';

function ProductRow({ p, filter, onApprove, onReject, onToggleFeatured }: {
  p: ModProduct;
  filter: ProductFilter;
  onApprove: (id: string) => void;
  onReject: (id: string, note: string) => void;
  onToggleFeatured: (id: string, value: boolean) => void;
}) {
  const { t } = useTranslation();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const vendor = p.vendor?.business_name || p.vendor?.full_name || '';

  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {p.image_url ? (
          <img loading="lazy" decoding="async" src={p.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300"><ShoppingBag className="h-6 w-6" /></span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{p.name}</p>
          <p className="text-sm text-muted">
            {p.price != null ? `$${Number(p.price).toLocaleString()} ${p.currency}` : t('product.noPrice')}
            {vendor ? ` · ${vendor}` : ''}
          </p>
          {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-700">{p.description}</p>}
          {p.purchase_url && (
            <a href={p.purchase_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> {t('admin.viewLink')}
            </a>
          )}
          {p.review_note && <p className="mt-1 text-xs text-evs-1">{t('product.reviewNote')}: {p.review_note}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {filter !== 'approved' && (
          <Button size="sm" onClick={() => onApprove(p.id)} leadingIcon={<Check className="h-4 w-4" />}>{t('admin.approve')}</Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => setRejecting((v) => !v)} leadingIcon={<X className="h-4 w-4" />}>
          {filter === 'approved' ? t('admin.suspend') : t('admin.reject')}
        </Button>
        {filter === 'approved' && (
          <Button
            size="sm"
            variant={p.is_featured ? 'primary' : 'secondary'}
            onClick={() => onToggleFeatured(p.id, !p.is_featured)}
            leadingIcon={<Star className={`h-4 w-4 ${p.is_featured ? 'fill-current' : ''}`} />}
          >
            {p.is_featured ? t('admin.featuredOn') : t('admin.featuredOff')}
          </Button>
        )}
      </div>

      {rejecting && (
        <div className="mt-2 space-y-2">
          <input
            className="w-full rounded-lg border border-slate-200 p-2 text-sm"
            placeholder={t('admin.reasonPlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button size="sm" variant="danger" onClick={() => onReject(p.id, note)}>{t('admin.confirmReject')}</Button>
        </div>
      )}
    </li>
  );
}

function ProductList({ filter }: { filter: ProductFilter }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { items, loading, approve, reject, toggleFeatured } = useProductModeration(filter);

  if (loading) return <SkeletonCard rows={3} />;
  if (items.length === 0) return <p className="py-8 text-center text-sm text-muted">{t('admin.noProducts')}</p>;

  return (
    <ul className="space-y-3">
      {items.map((p) => (
        <ProductRow
          key={p.id}
          p={p}
          filter={filter}
          onApprove={async (id) => { const r = await approve(id); toast[r.ok ? 'success' : 'error'](r.ok ? t('admin.approved') : r.error); }}
          onReject={async (id, note) => { const r = await reject(id, note); toast[r.ok ? 'success' : 'error'](r.ok ? t('admin.rejected') : r.error); }}
          onToggleFeatured={async (id, value) => { const r = await toggleFeatured(id, value); if (!r.ok) toast.error(r.error); }}
        />
      ))}
    </ul>
  );
}

export function AdminProducts() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<ProductFilter>('pending');

  return (
    <div>
      <p className="mb-3 rounded-xl bg-warm-50 p-3 text-xs text-warm-700">{t('admin.productsNote')}</p>
      <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1">
        {(['pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-muted'}`}
          >
            {t(f === 'pending' ? 'product.statusPending' : f === 'approved' ? 'product.statusApproved' : 'product.statusRejected')}
          </button>
        ))}
      </div>
      <ProductList filter={filter} />
    </div>
  );
}
