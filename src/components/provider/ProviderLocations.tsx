/**
 * ProviderLocations — gestión de sucursales del proveedor (Ajustes).
 *
 * Lista las sucursales y permite agregar, editar y eliminar. Cada sucursal lleva
 * dirección, teléfono, horarios y coordenadas opcionales para el mapa.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { Button, Modal, SkeletonCard, useToast } from '@/components/ui';
import { useProviderLocations, type LocationDraft } from '@/hooks/useProviderLocations';
import type { ProviderLocation } from '@/types/app';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';
const errCls = 'mt-1 text-sm text-evs-1';

const numOrNull = (v: unknown) => (v === '' || v == null ? null : Number(v));

const locationFormSchema = z.object({
  label: z.string().optional().default(''),
  address: z.string().trim().min(1, 'reg.errAddress'),
  phone: z.string().optional().default(''),
  hours: z.string().optional().default(''),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});
type LocationFormValues = z.input<typeof locationFormSchema>;

export function ProviderLocations({ providerId }: { providerId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { locations, loading, add, update, remove } = useProviderLocations(providerId);
  const [editing, setEditing] = useState<ProviderLocation | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProviderLocation | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: { label: '', address: '', phone: '', hours: '', latitude: null, longitude: null },
  });

  const openNew = () => {
    setEditing(null);
    reset({ label: '', address: '', phone: '', hours: '', latitude: null, longitude: null });
    setOpen(true);
  };

  const openEdit = (loc: ProviderLocation) => {
    setEditing(loc);
    reset({
      label: loc.label ?? '',
      address: loc.address,
      phone: loc.phone ?? '',
      hours: loc.hours ?? '',
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    setOpen(true);
  };

  const onSubmit = async (values: LocationFormValues) => {
    const draft: LocationDraft = {
      label: values.label || null,
      address: values.address!,
      phone: values.phone || null,
      hours: values.hours || null,
      latitude: values.latitude ?? null,
      longitude: values.longitude ?? null,
    };
    const res = editing ? await update(editing.id, draft) : await add(draft);
    if (res.ok) {
      toast.success(t('loc.savedToast'));
      setOpen(false);
    } else {
      toast.error(res.error);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await remove(deleting.id);
    setDeleting(null);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('loc.removedToast') : res.error);
  };

  return (
    <fieldset className="space-y-3 rounded-2xl border border-slate-100 p-4">
      <legend className="px-1 font-semibold text-slate-900">{t('loc.title')}</legend>

      {loading ? (
        <SkeletonCard rows={0} />
      ) : locations.length === 0 ? (
        <p className="text-sm text-muted">{t('loc.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => (
            <li key={loc.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
              <MapPin className="h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {loc.label || loc.address || t('loc.noAddress')}
                </p>
                {loc.label && <p className="truncate text-sm text-muted">{loc.address}</p>}
                {loc.hours && <p className="truncate text-xs text-muted">{loc.hours}</p>}
              </div>
              <button
                type="button"
                onClick={() => openEdit(loc)}
                aria-label={t('loc.edit')}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(loc)}
                aria-label={t('reg.removeBranch')}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="secondary" onClick={openNew} leadingIcon={<Plus className="h-4 w-4" />} fullWidth>
        {t('loc.add')}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('loc.editTitle') : t('loc.newTitle')}
        size="lg"
      >
        {/* Form anidado: el submit lo maneja RHF, no hay <form> externo en Settings. */}
        <div className="space-y-4">
          <div>
            <label htmlFor="loc-label" className={labelCls}>{t('reg.branchLabel')}</label>
            <input id="loc-label" className={inputCls} {...register('label')} />
          </div>
          <div>
            <label htmlFor="loc-address" className={labelCls}>{t('reg.address')}</label>
            <input id="loc-address" className={inputCls} {...register('address')} />
            {errors.address && <p role="alert" className={errCls}>{t(errors.address.message!)}</p>}
          </div>
          <div>
            <label htmlFor="loc-phone" className={labelCls}>{t('reg.branchPhone')}</label>
            <input id="loc-phone" type="tel" className={inputCls} {...register('phone')} />
          </div>
          <div>
            <label htmlFor="loc-hours" className={labelCls}>{t('reg.hoursLabel')}</label>
            <input id="loc-hours" className={inputCls} placeholder={t('reg.hoursPlaceholder')} {...register('hours')} />
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-muted">{t('reg.coords')}</legend>
            <div className="grid grid-cols-2 gap-3">
              <input
                className={inputCls}
                type="number"
                step="any"
                placeholder={t('reg.lat')}
                aria-label={t('reg.lat')}
                {...register('latitude', { setValueAs: numOrNull })}
              />
              <input
                className={inputCls}
                type="number"
                step="any"
                placeholder={t('reg.lng')}
                aria-label={t('reg.lng')}
                {...register('longitude', { setValueAs: numOrNull })}
              />
            </div>
          </fieldset>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('loc.cancel')}</Button>
            <Button type="button" loading={isSubmitting} onClick={handleSubmit(onSubmit)}>{t('loc.save')}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={t('loc.deleteTitle')}
        description={deleting?.label || deleting?.address || undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>{t('common.betterNot')}</Button>
            <Button variant="danger" onClick={confirmDelete}>{t('settings.deleteConfirm')}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">{t('loc.deleteBody')}</p>
      </Modal>
    </fieldset>
  );
}
