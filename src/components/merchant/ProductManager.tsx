/**
 * ProductManager — catálogo del oferente afiliado (merchant).
 *
 * Lista los productos del vendedor (activos e inactivos) y permite crear/editar
 * con validación Zod, activar/ocultar y eliminar. El `purchase_url` es el enlace
 * donde el padre concreta la compra directamente con el proveedor.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, useToast, SkeletonCard } from '@/components/ui';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useCatLabel } from '@/lib/catLabel';
import { STORE_CATEGORIES } from '@/data/storeCatalog';
import {
  productSchema,
  defaultProductValues,
  type ProductFormValues,
} from '@/lib/schemas';
import type { ProductInsert, ProductWithVendor } from '@/types/app';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';

function toInsert(v: ProductFormValues): Omit<ProductInsert, 'vendor_id'> {
  const orNull = (s?: string) => (s && s.trim() ? s.trim() : null);
  return {
    name: v.name.trim(),
    description: orNull(v.description),
    price: v.price,
    image_url: orNull(v.image_url),
    purchase_url: orNull(v.purchase_url),
    category_id: v.category_id,
    store_category: orNull(v.store_category),
    store_subcategory: v.store_category && v.store_category !== 'otro' ? orNull(v.store_subcategory) : null,
    store_category_other: v.store_category === 'otro' ? orNull(v.store_category_other) : null,
    stock: v.stock ?? null,
    is_active: v.is_active,
  };
}

export function ProductManager({ vendorId }: { vendorId: string }) {
  const { t } = useTranslation();
  const { products, loading, createProduct, updateProduct, toggleActive, deleteProduct } =
    useProducts({ vendorId, includeInactive: true });
  const { categories } = useCategories();
  const catLabel = useCatLabel();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithVendor | null>(null);
  const [deleting, setDeleting] = useState<ProductWithVendor | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<ProductFormValues>({
      resolver: zodResolver(productSchema),
      defaultValues: defaultProductValues(),
    });
  const selectedCat = watch('store_category');
  const isOtherCategory = selectedCat === 'otro';
  const subOptions = STORE_CATEGORIES.find((c) => c.value === selectedCat)?.sub ?? [];

  const openNew = () => {
    setEditing(null);
    reset(defaultProductValues());
    setOpen(true);
  };
  const openEdit = (p: ProductWithVendor) => {
    setEditing(p);
    reset({
      name: p.name,
      description: p.description ?? '',
      price: p.price,
      image_url: p.image_url ?? '',
      purchase_url: p.purchase_url ?? '',
      category_id: p.category_id,
      store_category: p.store_category ?? '',
      store_subcategory: p.store_subcategory ?? '',
      store_category_other: p.store_category_other ?? '',
      stock: p.stock ?? null,
      is_active: p.is_active,
    });
    setOpen(true);
  };

  const onSubmit = async (values: ProductFormValues) => {
    const payload = toInsert(values);
    const res = editing
      ? await updateProduct(editing.id, payload)
      : await createProduct(payload);
    if (res.ok) {
      toast.success(editing ? t('product.updated') : t('product.added'));
      setOpen(false);
    } else {
      toast.error(res.error);
    }
  };

  if (loading) return <div className="space-y-3"><SkeletonCard rows={0} /><SkeletonCard rows={0} /></div>;

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; key: string }> = {
      pending: { cls: 'bg-warm-100 text-warm-700', key: 'product.statusPending' },
      approved: { cls: 'bg-sage-50 text-sage-700', key: 'product.statusApproved' },
      rejected: { cls: 'bg-evs-1/10 text-evs-1', key: 'product.statusRejected' },
    };
    const s = map[status] ?? map.pending;
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{t(s.key)}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Guía rápida + reglas de la tienda */}
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">{t('product.guideTitle')}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>{t('product.guide1')}</li>
          <li>{t('product.guide2')}</li>
          <li>{t('product.guide3')}</li>
        </ol>
        <p className="mt-2 text-xs text-muted">{t('product.moderationTip')}</p>
        <p className="mt-1 text-xs font-medium text-slate-600">{t('shop.noCommission')}</p>
      </div>

      <Button onClick={openNew} leadingIcon={<Plus className="h-5 w-5" />} fullWidth>
        {t('product.addProduct')}
      </Button>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('product.empty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              {p.image_url ? (
                <img loading="lazy" decoding="async" src={p.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="h-14 w-14 shrink-0 rounded-lg bg-slate-100" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-900">{p.name}</p>
                  {statusBadge(p.status)}
                </div>
                <p className="text-sm text-muted">
                  {p.price != null ? `$${p.price.toLocaleString()} ${p.currency}` : t('product.noPrice')}
                  {p.stock != null && ` · ${p.stock === 0 ? t('product.soldOut') : t('product.inStock', { n: p.stock })}`}
                  {!p.is_active && ` · ${t('product.hidden')}`}
                </p>
                {p.status === 'rejected' && p.review_note && (
                  <p className="mt-1 text-xs text-evs-1">{t('product.reviewNote')}: {p.review_note}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => toggleActive(p.id, !p.is_active)}
                  aria-label={p.is_active ? t('product.hide') : t('product.show')}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-slate-100"
                >
                  {p.is_active ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
                <button type="button" onClick={() => openEdit(p)} aria-label={t('product.edit')} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-slate-100">
                  <Pencil className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => setDeleting(p)} aria-label={t('product.delete')} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-slate-100">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('product.editTitle') : t('product.newTitle')} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="p-name" className={labelCls}>{t('product.name')}</label>
            <input id="p-name" className={inputCls} {...register('name')} />
            {errors.name && <p role="alert" className="mt-1 text-sm text-evs-1">{t(errors.name.message!)}</p>}
          </div>
          <div>
            <label htmlFor="p-desc" className={labelCls}>{t('product.description')}</label>
            <textarea id="p-desc" rows={2} className={inputCls} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="p-price" className={labelCls}>{t('product.price')}</label>
              <input
                id="p-price"
                type="number"
                min={0}
                step={0.01}
                className={inputCls}
                {...register('price', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
              />
            </div>
            <div>
              <label htmlFor="p-stock" className={labelCls}>{t('product.stock')}</label>
              <input
                id="p-stock"
                type="number"
                min={0}
                step={1}
                placeholder={t('product.stockUnlimited')}
                className={inputCls}
                {...register('stock', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
              />
              <p className="mt-0.5 text-[11px] text-muted">{t('product.stockHint')}</p>
            </div>
            <div>
              <label htmlFor="p-cat" className={labelCls}>{t('product.category')}</label>
              <select
                id="p-cat"
                className={inputCls}
                {...register('category_id', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
              >
                <option value="">{t('product.noCategory')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{catLabel(c.slug, c.name)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="p-scat" className={labelCls}>{t('product.storeCategory')}</label>
            <select id="p-scat" className={inputCls} {...register('store_category', { onChange: () => setValue('store_subcategory', '') })}>
              <option value="">{t('product.noCategory')}</option>
              {STORE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{catLabel(c.value, c.label)}</option>
              ))}
            </select>
            {subOptions.length > 0 && (
              <div className="mt-2">
                <label htmlFor="p-ssub" className={labelCls}>{t('product.storeSubcategory')}</label>
                <select id="p-ssub" className={inputCls} {...register('store_subcategory')}>
                  <option value="">{t('product.noSubcategory')}</option>
                  {subOptions.map((s) => (
                    <option key={s.value} value={s.value}>{catLabel(s.value, s.label)}</option>
                  ))}
                </select>
              </div>
            )}
            {isOtherCategory && (
              <div className="mt-2">
                <label htmlFor="p-scat-other" className={labelCls}>
                  {t('product.storeCategoryOther')} <span aria-hidden="true" className="text-evs-1">*</span>
                </label>
                <input
                  id="p-scat-other"
                  className={inputCls}
                  required
                  aria-required="true"
                  placeholder={t('product.storeCategoryOtherPlaceholder')}
                  {...register('store_category_other')}
                />
                <p className="mt-1 text-xs text-muted">{t('product.storeCategoryOtherHint')}</p>
                {errors.store_category_other && (
                  <p role="alert" className="mt-1 text-sm text-evs-1">{t(errors.store_category_other.message!)}</p>
                )}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="p-img" className={labelCls}>{t('product.imageUrl')}</label>
            <input id="p-img" className={inputCls} placeholder="https://…" {...register('image_url')} />
            {errors.image_url && <p role="alert" className="mt-1 text-sm text-evs-1">{t(errors.image_url.message!)}</p>}
          </div>
          <div>
            <label htmlFor="p-url" className={labelCls}>{t('product.purchaseUrl')}</label>
            <input id="p-url" className={inputCls} placeholder="https://tu-tienda.com/producto" {...register('purchase_url')} />
            <p className="mt-1 text-xs text-muted">{t('product.purchaseHint')}</p>
            {errors.purchase_url && <p role="alert" className="mt-1 text-sm text-evs-1">{t(errors.purchase_url.message!)}</p>}
          </div>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-brand-500" {...register('is_active')} />
            <span className="text-sm text-slate-700">{t('product.visible')}</span>
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('product.cancel')}</Button>
            <Button type="submit" loading={isSubmitting}>{t('product.save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={t('product.deleteTitle')}
        description={deleting?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>{t('common.betterNot')}</Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!deleting) return;
                const res = await deleteProduct(deleting.id);
                setDeleting(null);
                toast[res.ok ? 'success' : 'error'](res.ok ? t('product.removed') : res.error);
              }}
            >
              {t('settings.deleteConfirm')}
            </Button>
          </>
        }
      >
        <p className="flex items-center gap-2 text-sm text-slate-700">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Las recetas existentes conservan el producto registrado.
        </p>
      </Modal>
    </div>
  );
}
