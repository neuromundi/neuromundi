/**
 * Settings — ajustes de la cuenta (núcleo de AccountSettings 3.1), internacionalizado.
 *
 * Edita datos del perfil (con avatar) y, para proveedores, los datos del negocio
 * y la publicación. Incluye el selector de idioma y la zona de peligro.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Camera, LogOut, Trash2, KeyRound, HelpCircle, BellRing } from 'lucide-react';
import { usePushSubscribe } from '@/hooks/usePushSubscribe';
import { Button, Modal, useToast, SkeletonCard, PasswordInput} from '@/components/ui';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { ProviderLocations } from '@/components/provider';
import { FiscalSchoolFields } from '@/components/provider/FiscalSchoolFields';
import { MyReports } from '@/components/report/MyReports';
import { GuidedTour } from '@/components/onboarding';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { profileSchema, type ProfileFormValues } from '@/lib/schemas';
import type { ProfileUpdate } from '@/hooks/useProfile';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';

function PushSection() {
  const { t } = useTranslation();
  const { state, enable } = usePushSubscribe();
  if (state === 'unsupported' || state === 'unconfigured') return null;
  return (
    <section className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
      <span className="flex items-center gap-2 font-semibold text-slate-900">
        <BellRing className="h-5 w-5 text-brand-600" aria-hidden="true" />
        {state === 'granted' ? t('push.on') : t('push.title')}
      </span>
      {state !== 'granted' && (
        <Button
          variant="secondary"
          size="sm"
          loading={state === 'busy'}
          disabled={state === 'denied'}
          onClick={() => void enable()}
        >
          {state === 'denied' ? t('push.blocked') : t('push.enable')}
        </Button>
      )}
    </section>
  );
}

export function Settings() {
  const { isProvider, signOut } = useAuth();
  const { profile, saving, updateProfile, uploadAvatar, deleteAccount } = useProfile();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchParams] = useSearchParams();
  const recovery = searchParams.get('recovery') === '1';
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [pwAttempts, setPwAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockLeft, setLockLeft] = useState(0);
  const pwMatch = newPassword2.length === 0 ? null : newPassword === newPassword2;

  useEffect(() => {
    if (lockUntil == null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setLockLeft(left);
      if (left <= 0) { setLockUntil(null); setPwAttempts(0); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockUntil]);
  const pwLocked = lockUntil != null && lockLeft > 0;

  const changePassword = async () => {
    if (pwLocked) return;
    if (newPassword.length < 8) { toast.error(t('settings.pwMin')); return; }
    if (newPassword !== newPassword2) { toast.error(t('settings.pwMismatch')); return; }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwBusy(false);
    if (error) {
      const msg = (error.message || '').toLowerCase();
      const same =
        msg.includes('different') ||
        msg.includes('same password') ||
        (error as { code?: string }).code === 'same_password';
      const next = pwAttempts + 1;
      setPwAttempts(next);
      // Control de seguridad: tras 5 intentos fallidos, enfriamiento de 60 s.
      if (next >= 5) setLockUntil(Date.now() + 60000);
      toast.error(same ? t('settings.pwSameAsOld') : error.message);
      return;
    }
    setPwAttempts(0);
    setNewPassword(''); setNewPassword2('');
    toast.success(t('settings.pwUpdated'));
    if (recovery) {
      // El enlace de recuperación es de un solo uso: al terminar cerramos la
      // sesión temporal para que no pueda reutilizarse; el usuario entra con su
      // nueva contraseña.
      await signOut();
      navigate('/auth', { replace: true });
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          full_name: profile.full_name,
          phone: profile.phone ?? '',
          bio: profile.bio ?? '',
          business_name: profile.business_name ?? '',
          website_url: profile.website_url ?? '',
          address: profile.address ?? '',
          city: profile.city ?? '',
          country: profile.country ?? '',
          state: profile.state ?? '',
          municipality: profile.municipality ?? '',
          birth_date: profile.birth_date ?? '',
          gender: profile.gender ?? '',
          condition: profile.condition ?? '',
          rfc: profile.rfc ?? '',
          fiscal_razon_social: profile.fiscal_razon_social ?? '',
          fiscal_regimen: profile.fiscal_regimen ?? '',
          fiscal_uso_cfdi: profile.fiscal_uso_cfdi ?? '',
          fiscal_cp: profile.fiscal_cp ?? '',
          fiscal_direccion: profile.fiscal_direccion ?? '',
          fiscal_email: profile.fiscal_email ?? '',
          fiscal_tax_id: profile.fiscal_tax_id ?? '',
          fiscal_country: profile.fiscal_country ?? '',
          school_grades: profile.school_grades ?? [],
          is_company: profile.is_company ?? false,
          services_offered: profile.services_offered ?? '',
          provider_type: profile.provider_type,
          is_published: profile.is_published,
        }
      : undefined,
  });

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <SkeletonCard rows={2} />
      </div>
    );
  }

  const watchType = watch('provider_type');

  const onSubmit = async (values: ProfileFormValues) => {
    const orNull = (s?: string) => (s && s.trim() ? s.trim() : null);
    const patch: ProfileUpdate = {
      full_name: values.full_name.trim(),
      phone: orNull(values.phone),
      bio: orNull(values.bio),
      country: orNull(values.country),
      state: orNull(values.state),
      municipality: orNull(values.municipality),
      birth_date: orNull(values.birth_date),
      gender: orNull(values.gender),
      condition: orNull(values.condition),
      rfc: orNull(values.rfc),
    };
    if (isProvider) {
      patch.business_name = orNull(values.business_name);
      patch.website_url = orNull(values.website_url);
      patch.address = orNull(values.address);
      patch.city = orNull(values.city);
      patch.is_company = values.is_company ?? false;
      patch.services_offered = orNull(values.services_offered);
      patch.provider_type = values.provider_type;
      patch.is_published = values.is_published;
      // Datos fiscales (factura México/CFDI e internacional).
      patch.fiscal_razon_social = orNull(values.fiscal_razon_social);
      patch.fiscal_regimen = orNull(values.fiscal_regimen);
      patch.fiscal_uso_cfdi = orNull(values.fiscal_uso_cfdi);
      patch.fiscal_cp = orNull(values.fiscal_cp);
      patch.fiscal_direccion = orNull(values.fiscal_direccion);
      patch.fiscal_email = orNull(values.fiscal_email);
      patch.fiscal_tax_id = orNull(values.fiscal_tax_id);
      patch.fiscal_country = orNull(values.fiscal_country);
      // Grados escolares (solo escuelas).
      patch.school_grades = values.provider_type === 'school' ? (values.school_grades ?? []) : [];
    }
    const res = await updateProfile(patch);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('settings.savedToast') : res.error);
  };

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const res = await uploadAvatar(file);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('settings.photoToast') : res.error);
  };

  const handleDelete = async () => {
    const res = await deleteAccount();
    setConfirmDelete(false);
    if (res.ok) {
      toast.success(t('settings.deletedToast'));
      navigate('/');
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('settings.title')}</h1>
        <LanguageSwitcher />
      </div>

      {profile.member_no != null && (
        <div className="flex items-center justify-between rounded-2xl border border-brand-200 bg-brand-50 p-3">
          <span className="text-sm font-semibold text-brand-800">{t('account.memberNo')}</span>
          <span className="font-mono text-base font-bold tracking-wide text-slate-900">
            NM-{String(profile.member_no).padStart(6, '0')}
          </span>
        </div>
      )}

      {/* Avatar */}
      <section className="flex items-center gap-4">
        {preview || profile.avatar_url ? (
          <img loading="lazy" decoding="async" src={preview ?? profile.avatar_url!} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Camera className="h-7 w-7" aria-hidden="true" />
          </span>
        )}
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} loading={saving}>
            {t('settings.changePhoto')}
          </Button>
          <p className="mt-1 text-xs text-muted">{t('settings.photoHint')}</p>
        </div>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="s-name" className={labelCls}>{t('settings.name')}</label>
          <input id="s-name" className={inputCls} {...register('full_name')} />
          {errors.full_name && <p role="alert" className="mt-1 text-sm text-evs-1">{t(errors.full_name.message!)}</p>}
        </div>
        <div>
          <label htmlFor="s-phone" className={labelCls}>{t('settings.phone')}</label>
          <input id="s-phone" className={inputCls} {...register('phone')} />
        </div>
        <div>
          <label htmlFor="s-rfc" className={labelCls}>{t('pay.rfc')}</label>
          <input id="s-rfc" className={inputCls} placeholder={t('pay.rfcHint')} {...register('rfc')} />
        </div>
        <div>
          <label htmlFor="s-bio" className={labelCls}>{t('settings.about')}</label>
          <textarea id="s-bio" rows={3} className={inputCls} {...register('bio')} />
        </div>

        <fieldset className="space-y-4 rounded-2xl border border-slate-100 p-4">
          <legend className="px-1 font-semibold text-slate-900">{t('reg.location')}</legend>
          <div>
            <label htmlFor="s-birth" className={labelCls}>{t('reg.birthDate')}</label>
            <input id="s-birth" type="date" className={inputCls} {...register('birth_date')} />
          </div>
          {!isProvider && (
            <>
              <div>
                <label htmlFor="s-cond" className={labelCls}>{t('reg.condition')}</label>
                <input id="s-cond" className={inputCls} placeholder={t('reg.conditionPlaceholder')} {...register('condition')} />
              </div>
              <div>
                <label htmlFor="s-gender" className={labelCls}>{t('reg.gender')}</label>
                <input id="s-gender" className={inputCls} placeholder={t('reg.genderPlaceholder')} {...register('gender')} />
              </div>
            </>
          )}
          <div>
            <label htmlFor="s-country" className={labelCls}>{t('reg.country')}</label>
            <input id="s-country" className={inputCls} {...register('country')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="s-state" className={labelCls}>{t('reg.state')}</label>
              <input id="s-state" className={inputCls} {...register('state')} />
            </div>
            <div>
              <label htmlFor="s-muni" className={labelCls}>{t('reg.municipality')}</label>
              <input id="s-muni" className={inputCls} {...register('municipality')} />
            </div>
          </div>
        </fieldset>

        {isProvider && (
          <fieldset className="space-y-4 rounded-2xl border border-slate-100 p-4">
            <legend className="px-1 font-semibold text-slate-900">{t('settings.business')}</legend>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-brand-500" {...register('is_company')} />
              <span className="text-sm text-slate-700">{t('reg.isCompany')}</span>
            </label>
            <div>
              <label htmlFor="s-biz" className={labelCls}>{t('settings.businessName')}</label>
              <input id="s-biz" className={inputCls} {...register('business_name')} />
            </div>
            <div>
              <label htmlFor="s-type" className={labelCls}>{t('settings.providerType')}</label>
              <select id="s-type" className={inputCls} {...register('provider_type', { setValueAs: (v) => (v === '' ? null : v) })}>
                <option value="">{t('settings.typeUndefined')}</option>
                <option value="service_provider">{t('settings.typeService')}</option>
                <option value="merchant">{t('settings.typeMerchant')}</option>
                <option value="school">{t('reg.typeSchool')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="s-offered" className={labelCls}>
                {watchType === 'merchant' ? t('reg.products') : t('reg.services')}
              </label>
              <textarea id="s-offered" rows={2} className={inputCls} placeholder={t('reg.offeredPlaceholder')} {...register('services_offered')} />
            </div>
            <div>
              <label htmlFor="s-web" className={labelCls}>{t('settings.website')}</label>
              <input id="s-web" className={inputCls} placeholder="https://…" {...register('website_url')} />
              {errors.website_url && <p role="alert" className="mt-1 text-sm text-evs-1">{t(errors.website_url.message!)}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="s-city" className={labelCls}>{t('settings.city')}</label>
                <input id="s-city" className={inputCls} {...register('city')} />
              </div>
              <div>
                <label htmlFor="s-addr" className={labelCls}>{t('settings.address')}</label>
                <input id="s-addr" className={inputCls} {...register('address')} />
              </div>
            </div>
            <FiscalSchoolFields register={register} country={watch('country')} providerType={watchType} />

            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-brand-500" {...register('is_published')} />
              <span className="text-sm text-slate-700">{t('settings.publish')}</span>
            </label>
          </fieldset>
        )}

        <Button type="submit" loading={saving} disabled={!isDirty} fullWidth>
          {t('settings.save')}
        </Button>
      </form>

      {isProvider && <ProviderLocations providerId={profile.id} />}

      {/* Cambio de contraseña (también atiende el flujo de recuperación) */}
      <section id="password" className={`space-y-3 rounded-2xl border p-4 ${recovery ? 'border-brand-300 bg-brand-50' : 'border-slate-100'}`}>
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <KeyRound className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('settings.changePassword')}
        </h2>
        {recovery && <p className="text-sm text-brand-800">{t('settings.recoveryHint')}</p>}
        <div>
          <label htmlFor="new-pw" className={labelCls}>{t('settings.newPassword')}</label>
          <PasswordInput id="new-pw" autoComplete="new-password" className={inputCls} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <PasswordStrength value={newPassword} />
        </div>
        <div>
          <label htmlFor="new-pw2" className={labelCls}>{t('auth.confirmPassword')}</label>
          <PasswordInput id="new-pw2" autoComplete="new-password" className={inputCls} value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} />
          {pwMatch === true && <p className="mt-1 text-sm font-medium text-sage-700">{t('settings.pwMatch')}</p>}
          {pwMatch === false && <p role="alert" className="mt-1 text-sm text-evs-1">{t('settings.pwMismatch')}</p>}
        </div>
        {pwLocked && (
          <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-evs-1">{t('settings.pwLocked', { s: lockLeft })}</p>
        )}
        <Button loading={pwBusy} disabled={pwLocked || pwMatch === false || newPassword.length < 8} onClick={changePassword} leadingIcon={<KeyRound className="h-4 w-4" />}>
          {t('settings.updatePassword')}
        </Button>
      </section>

      {/* Notificaciones push nativas */}
      <PushSection />

      {/* Seguimiento de denuncias del miembro */}
      <MyReports />

      {/* Ayuda: reabrir la guía rápida */}
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          <HelpCircle className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('tour.reopenTitle')}
        </span>
        <Button variant="secondary" size="sm" onClick={() => setShowTour(true)}>
          {t('tour.reopen')}
        </Button>
      </section>
      {showTour && <GuidedTour onClose={() => setShowTour(false)} />}

      <section className="space-y-3 border-t border-slate-100 pt-6">
        <Button variant="ghost" onClick={async () => { await signOut(); navigate('/'); }} leadingIcon={<LogOut className="h-5 w-5" />}>
          {t('settings.signOut')}
        </Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)} leadingIcon={<Trash2 className="h-5 w-5" />}>
          {t('settings.deleteAccount')}
        </Button>
      </section>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('settings.deleteTitle')}
      >
        <p className="text-sm text-slate-700">{t('settings.deleteDesc')}</p>
        <p className="mt-1 text-sm text-muted">{t('settings.deleteBody')}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
          <Button variant="danger" loading={saving} onClick={handleDelete}>{t('settings.deleteConfirm')}</Button>
        </div>
      </Modal>
    </div>
  );
}
