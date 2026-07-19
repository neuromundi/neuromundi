/**
 * OfferForm — alta y edición de ofertas.
 *
 * React Hook Form + resolver Zod (offerSchema). Oculta el valor del descuento
 * para cortesías, ofrece un toggle "Sin límite" para los canjes y muestra una
 * vista previa de cómo verá la oferta el padre. Los errores se anuncian con
 * role="alert" y mensajes en tono accionable.
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { offerSchema, defaultOfferValues, type OfferFormValues } from '@/lib/schemas';
import { discountLabel } from '@/lib/utils';

export interface OfferFormProps {
  /** Valores iniciales para editar; si se omite, formulario en blanco. */
  initial?: Partial<OfferFormValues>;
  submitting?: boolean;
  onSubmit: (values: OfferFormValues) => void;
  onCancel: () => void;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const labelCls = 'mb-1 block font-semibold text-slate-900';

export function OfferForm({ initial, submitting, onSubmit, onCancel }: OfferFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: { ...defaultOfferValues(), ...initial },
  });

  const discountType = watch('discount_type');
  const maxRedemptions = watch('max_redemptions');
  const unlimited = maxRedemptions == null;

  const previewTitle = watch('title') || t('offer.titleDefault');
  const previewValue = watch('discount_value');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label htmlFor="title" className={labelCls}>
          {t('offer.title')}
        </label>
        <input id="title" className={inputCls} placeholder={t('offer.titlePlaceholder')} {...register('title')} />
        {errors.title && (
          <p role="alert" className="mt-1 text-sm text-evs-1">
            {t(errors.title.message!)}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="description" className={labelCls}>
          {t('offer.description')}
        </label>
        <textarea
          id="description"
          rows={2}
          className={inputCls}
          placeholder={t('offer.descPlaceholder')}
          {...register('description')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="discount_type" className={labelCls}>
            {t('offer.type')}
          </label>
          <select id="discount_type" className={inputCls} {...register('discount_type')}>
            <option value="percentage">{t('offer.typePercentage')}</option>
            <option value="fixed">{t('offer.typeFixed')}</option>
            <option value="freebie">{t('offer.typeFreebie')}</option>
          </select>
        </div>

        {discountType !== 'freebie' && (
          <div>
            <label htmlFor="discount_value" className={labelCls}>
              {discountType === 'percentage' ? t('offer.valuePercent') : t('offer.valueAmount')}
            </label>
            <input
              id="discount_value"
              type="number"
              min={0}
              step={discountType === 'percentage' ? 1 : 0.01}
              className={inputCls}
              {...register('discount_value', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
          </div>
        )}
      </div>
      {errors.discount_value && (
        <p role="alert" className="-mt-2 text-sm text-evs-1">
          {t(errors.discount_value.message!)}
        </p>
      )}

      <div>
        <label htmlFor="terms" className={labelCls}>
          {t('offer.terms')}
        </label>
        <input id="terms" className={inputCls} placeholder={t('offer.termsPlaceholder')} {...register('terms')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="valid_from" className={labelCls}>
            {t('offer.validFrom')}
          </label>
          <input id="valid_from" type="datetime-local" className={inputCls} {...register('valid_from')} />
        </div>
        <div>
          <label htmlFor="valid_until" className={labelCls}>
            {t('offer.validUntil')}
          </label>
          <input id="valid_until" type="datetime-local" className={inputCls} {...register('valid_until')} />
        </div>
      </div>
      {errors.valid_until && (
        <p role="alert" className="-mt-2 text-sm text-evs-1">
          {t(errors.valid_until.message!)}
        </p>
      )}

      <div>
        <label className={labelCls}>{t('offer.limit')}</label>
        <label className="mb-2 flex items-center gap-3">
          <input
            type="checkbox"
            checked={unlimited}
            onChange={(e) => setValue('max_redemptions', e.target.checked ? null : 50)}
            className="h-5 w-5 rounded border-slate-300 text-brand-500 focus-visible:ring-brand-500"
          />
          <span className="text-sm text-slate-700">{t('offer.unlimited')}</span>
        </label>
        {!unlimited && (
          <input
            type="number"
            min={1}
            aria-label={t('offer.maxAria')}
            className={inputCls}
            {...register('max_redemptions', {
              setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
            })}
          />
        )}
      </div>

      {/* Vista previa */}
      <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
          {t('offer.previewLabel')}
        </p>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-700">
            <Tag className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">{previewTitle}</p>
            <p className="text-sm text-warm-700">
              {discountLabel(t, discountType, previewValue ?? null)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('offer.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {t('offer.save')}
        </Button>
      </div>
    </form>
  );
}
