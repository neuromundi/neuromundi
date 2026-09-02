/**
 * RegisterForm — registro de cuenta con 4 tipos de usuario:
 * paciente, padre/tutor, prestador de servicios y proveedor de productos.
 *
 * Los campos requeridos cambian según el tipo (ver registerSchema). Los
 * proveedores pueden agregar varias sucursales con dirección, coordenadas,
 * teléfono y horarios para ubicarse en el mapa.
 */
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { PasswordStrength } from './PasswordStrength';
import { GeoFields } from './GeoFields';
import { SCHOOL_GRADES } from '@/data/satCatalogs';
import { SECTIONS } from '@/data/sections';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Gift, Globe, Instagram, Facebook } from 'lucide-react';
import { RoleFeaturesPanel } from './RoleFeaturesPanel';
import { Button, PasswordInput} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { registerSchema, REG_TYPES, type RegisterValues, type RegType } from '@/lib/schemas';
import { RULES_VERSION } from '@/lib/legal';
import { setFounderOptoutFlag } from '@/lib/founderPref';
import { DIAL_CODES, DEFAULT_DIAL } from '@/data/dialCodes';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';
const errCls = 'mt-1 text-sm text-evs-1';

const TYPE_LABEL_KEY: Record<RegType, string> = {
  patient: 'reg.typePatient',
  parent: 'reg.typeParent',
  service_provider: 'reg.typeService',
  merchant: 'reg.typeMerchant',
  school: 'reg.typeSchool',
};

const numOrNull = (v: unknown) => (v === '' || v == null ? null : Number(v));

const LIFE_STAGES = ['young_adult', 'adult', 'adult_plus'] as const;
const INTEREST_OPTIONS = [
  'autism', 'adhd', 'executive', 'work', 'late_dx', 'sensory', 'no_label',
] as const;

export function RegisterForm({ onSuccess, initialType, complete = false }: { onSuccess?: (regType: RegType) => void; initialType?: RegType; complete?: boolean }) {
  // `complete`: usuario ya autenticado (login social) → se ACTUALIZA su perfil en
  // vez de crear cuenta. Se ocultan email/contraseña y, para que el esquema (que
  // los exige) no bloquee, se rellenan con valores válidos de relleno que
  // `completeProfile` ignora.
  const { signUp, completeProfile, fullName: authName } = useAuth();
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      regType: initialType ?? 'patient',
      is_company: false,
      locations: [],
      accept_terms: false,
      accept_rules: false,
      accept_manifesto: false,
      wants_founder: true,
      ...(complete
        ? {
            full_name: authName ?? '',
            email: 'social-login@neuromundi.app',
            confirm_email: 'social-login@neuromundi.app',
            password: 'SocialLogin1',
            confirm_password: 'SocialLogin1',
          }
        : {}),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'locations' });

  const regType = watch('regType') as RegType;
  const isCompany = watch('is_company');
  const acceptTerms = watch('accept_terms');
  const acceptRules = watch('accept_rules');
  const acceptManifesto = watch('accept_manifesto');
  const wantsFounder = watch('wants_founder');
  const country = watch('country');
  const isConsumer = regType === 'patient' || regType === 'parent';
  const isProvider = regType === 'service_provider' || regType === 'merchant' || regType === 'school';
  const isAdult = regType === 'patient';   // "Para mí (soy adulto)"
  const isParent = regType === 'parent';   // "Para mi hijo/a o familiar menor"
  const showBirthDate = isParent || (isProvider && !isCompany);
  const isMexico = /m[eé]xico/i.test(country ?? '');

  // Los prestadores necesitan al menos una sucursal; arrancamos con una visible
  // para que no parezca que falta un paso escondido (antes había que pulsar
  // "Agregar sucursal" o la validación fallaba en silencio).
  useEffect(() => {
    if (isProvider && fields.length === 0) {
      append({ label: '', address: '', phone: '', hours: '', latitude: null, longitude: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProvider]);

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    setFounderOptoutFlag(!values.wants_founder); // registro ordinario si desmarcó Fundador
    const provider = values.regType === 'service_provider' || values.regType === 'merchant' || values.regType === 'school';
    const payload = {
      email: values.email,
      password: values.password,
      fullName: (provider && values.is_company ? values.business_name : values.full_name) ?? '',
      role: (provider ? 'provider' : (values.regType as 'patient' | 'parent')) as 'provider' | 'patient' | 'parent',
      providerType: provider ? (values.regType as 'service_provider' | 'merchant' | 'school') : null,
      isCompany: values.is_company,
      businessName: values.business_name || null,
      birthDate: values.birth_date || null,
      gender: values.gender || null,
      condition: values.condition || null,
      country: values.country || null,
      state: values.state || null,
      municipality: values.municipality || null,
      phone: values.phone ? `${values.dial_code ?? DEFAULT_DIAL} ${values.phone}`.trim() : null,
      servicesOffered: values.services_offered || null,
      website: values.website || null,
      instagram: values.instagram || null,
      tiktok: values.tiktok || null,
      facebook: values.facebook || null,
      cedulaProfesional: values.cedula_profesional || null,
      rulesVersion: RULES_VERSION,
      schoolGrades: values.regType === 'school' ? (values.school_grades ?? []) : [],
      accountType: (values.regType === 'patient' ? 'adulto_independiente' : values.regType === 'parent' ? 'padre_tutor' : null) as 'adulto_independiente' | 'padre_tutor' | null,
      lifeStage: values.regType === 'patient' ? (values.life_stage || null) : null,
      interests: values.regType === 'patient' ? (values.interests ?? []) : [],
      // Secciones de interés (paciente/familiar). Los prestadores las declaran en
      // sus formularios dedicados, así que aquí solo aplica a consumidores.
      sections: (values.regType === 'patient' || values.regType === 'parent') ? (values.sections ?? []) : [],
      commsOptIn: values.regType === 'patient' ? !!values.comms_opt_in : false,
      locations: provider ? (values.locations ?? []) : [],
    };
    const res = complete ? await completeProfile(payload) : await signUp(payload);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    // Marca que, al confirmar el correo y volver, se muestre la bienvenida (1 vez).
    try { localStorage.setItem('neuromundi.pendingWelcome', '1'); } catch { /* ignore */ }
    setTimeout(() => onSuccess?.(values.regType), 0);
    // En modo "completar" (login social) no hay confirmación por correo: al
    // guardar, el perfil queda listo y la app se muestra.
    if (complete) return;
    setCheckEmail(true);
  };

  if (checkEmail) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-brand-50 p-4 text-center text-sm text-slate-700">
          {t('auth.checkEmail')}
        </div>
        {isProvider && (
          <div className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{t('reg.providerWelcomeTitle')}</p>
            <p className="mt-1 text-muted">{t('reg.providerWelcomeIntro')}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>{t('reg.providerStep1')}</li>
              <li>{t('reg.providerStep2')}</li>
              <li>{t('reg.providerStep3')}</li>
            </ol>
            <p className="mt-2 text-xs text-muted">{t('product.moderationTip')}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, () => setFormError(t('reg.missTitle')))} className="space-y-5" noValidate>
      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-evs-1">
          {formError}
        </p>
      )}

      {/* Divisor para consumidores: ¿para quién es la cuenta? */}
      {isConsumer ? (
        <fieldset>
          <legend className={labelCls}>{t('reg.forWhom')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={isParent}
              onClick={() => setValue('regType', 'parent')}
              className={cn('rounded-xl border p-3 text-left text-sm', isParent ? 'border-brand-500 bg-brand-50 font-semibold text-brand-800' : 'border-slate-200 text-slate-700')}
            >
              {t('reg.forChild')}
            </button>
            <button
              type="button"
              aria-pressed={isAdult}
              onClick={() => setValue('regType', 'patient')}
              className={cn('rounded-xl border p-3 text-left text-sm', isAdult ? 'border-brand-500 bg-brand-50 font-semibold text-brand-800' : 'border-slate-200 text-slate-700')}
            >
              {t('reg.forAdult')}
            </button>
          </div>
        </fieldset>
      ) : (
        <fieldset>
          <legend className={labelCls}>{t('auth.whoAreYou')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {REG_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={regType === value}
                onClick={() => setValue('regType', value)}
                className={cn(
                  'rounded-xl border p-3 text-sm font-semibold',
                  regType === value
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-slate-200 text-slate-700',
                )}
              >
                {t(TYPE_LABEL_KEY[value])}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Aviso de gratuidad para familias (paciente/padre) */}
      {isConsumer && (
        <div className="flex gap-3 rounded-xl border border-evs-5/30 bg-evs-5/10 p-4">
          <Gift className="mt-0.5 h-5 w-5 shrink-0 text-evs-5" aria-hidden="true" />
          <div>
            <p className="font-semibold text-slate-900">{t('reg.freeTitle')}</p>
            <p className="text-sm text-slate-700">{t('reg.freeNotice')}</p>
          </div>
        </div>
      )}

      {/* Qué incluye la cuenta según el tipo elegido (informativo). */}
      <RoleFeaturesPanel type={regType} />

      {/* Identidad */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('reg.identity')}</h3>

        {isProvider && (
          <label className="flex items-center gap-3">
            <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-brand-500" {...register('is_company')} />
            <span className="text-sm text-slate-700">{t('reg.isCompany')}</span>
          </label>
        )}

        {isProvider && isCompany ? (
          <div>
            <label htmlFor="reg-business" className={labelCls}>{t('reg.businessName')}</label>
            <input id="reg-business" className={inputCls} {...register('business_name')} />
            {errors.business_name && <p role="alert" className={errCls}>{t(errors.business_name.message!)}</p>}
          </div>
        ) : (
          <div>
            <label htmlFor="reg-name" className={labelCls}>{isAdult ? t('reg.nameOrAlias') : t('reg.fullName')}</label>
            <input id="reg-name" autoComplete="name" className={inputCls} {...register('full_name')} />
            {errors.full_name && <p role="alert" className={errCls}>{t(errors.full_name.message!)}</p>}
          </div>
        )}

        {showBirthDate && (
          <div>
            <label htmlFor="reg-birth" className={labelCls}>{t('reg.birthDate')}</label>
            <input id="reg-birth" type="date" className={inputCls} {...register('birth_date')} />
            {errors.birth_date && <p role="alert" className={errCls}>{t(errors.birth_date.message!)}</p>}
          </div>
        )}

        {/* Secciones de interés (paciente y familiar): Neuromundi abarca tres áreas. */}
        {isConsumer && (
          <div>
            <label className={labelCls}>{t('reg.sectionsInterest')}</label>
            <p className="mb-2 text-xs text-muted">{t('reg.sectionsInterestHelp')}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {SECTIONS.map((s) => (
                <label key={s.value} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-sm">
                  <input type="checkbox" value={s.value} className="h-4 w-4 rounded border-slate-300 text-brand-500" {...register('sections')} />
                  <span className="text-slate-700">{t(`sections.${s.value}.name`)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {isParent && (
          <>
            <div>
              <label htmlFor="reg-condition" className={labelCls}>
                {t('reg.conditionChild')}
              </label>
              <input
                id="reg-condition"
                className={inputCls}
                placeholder={t('reg.conditionPlaceholder')}
                {...register('condition')}
              />
              {errors.condition && <p role="alert" className={errCls}>{t(errors.condition.message!)}</p>}
            </div>
            <div>
              <label htmlFor="reg-gender" className={labelCls}>{t('reg.gender')}</label>
              <input id="reg-gender" className={inputCls} placeholder={t('reg.genderPlaceholder')} {...register('gender')} />
            </div>
          </>
        )}

        {/* Adulto independiente: etapa de vida + áreas de interés + aviso QR */}
        {isAdult && (
          <>
            <div>
              <label htmlFor="reg-lifestage" className={labelCls}>{t('reg.lifeStage')}</label>
              <select id="reg-lifestage" className={inputCls} {...register('life_stage')}>
                <option value="">{t('reg.lifeStageSelect')}</option>
                {LIFE_STAGES.map((s) => <option key={s} value={s}>{t(`reg.lifeStages.${s}`)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('reg.interests')}</label>
              <p className="mb-2 text-xs text-muted">{t('reg.interestsHelp')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {INTEREST_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-sm">
                    <input type="checkbox" value={opt} className="h-4 w-4 rounded border-slate-300 text-brand-500" {...register('interests')} />
                    <span className="text-slate-700">{t(`reg.interestOpts.${opt}`)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-slate-700">
              <Gift className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
              <span>{t('reg.qrInfo')}</span>
            </div>
          </>
        )}

        {isProvider && (
          <div>
            <label htmlFor="reg-offered" className={labelCls}>
              {regType === 'merchant' ? t('reg.products') : t('reg.services')}
            </label>
            <textarea
              id="reg-offered"
              rows={2}
              className={inputCls}
              placeholder={t('reg.offeredPlaceholder')}
              {...register('services_offered')}
            />
            {errors.services_offered && <p role="alert" className={errCls}>{t(errors.services_offered.message!)}</p>}
          </div>
        )}

        {regType === 'school' && (
          <div>
            <label className={labelCls}>{t('grades.title')}</label>
            <p className="mb-2 text-xs text-muted">{t('grades.help')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SCHOOL_GRADES.map((g) => (
                <label key={g} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-sm">
                  <input type="checkbox" value={g} className="h-4 w-4 rounded border-slate-300 text-brand-500" {...register('school_grades')} />
                  <span className="text-slate-700">{t(`grades.${g}`)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {isProvider && (
          <div className="space-y-3">
            <p className="text-xs text-muted">{t('reg.socialOptional')}</p>
            <div>
              <label htmlFor="reg-website" className={labelCls}>
                <Globe className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
                {t('reg.website')}
              </label>
              <input id="reg-website" type="url" inputMode="url" className={inputCls} placeholder="https://" {...register('website')} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="reg-ig" className={labelCls}>
                  <Instagram className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
                  {t('reg.instagram')}
                </label>
                <input id="reg-ig" className={inputCls} placeholder="@usuario" {...register('instagram')} />
              </div>
              <div>
                <label htmlFor="reg-tt" className={labelCls}>{t('reg.tiktok')}</label>
                <input id="reg-tt" className={inputCls} placeholder="@usuario" {...register('tiktok')} />
              </div>
              <div>
                <label htmlFor="reg-fb" className={labelCls}>
                  <Facebook className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
                  {t('reg.facebook')}
                </label>
                <input id="reg-fb" className={inputCls} placeholder="https://facebook.com/…" {...register('facebook')} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Ubicación / residencia */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('reg.location')}</h3>
        <GeoFields
          register={register}
          setValue={setValue}
          country={country}
          state={watch('state')}
          inputCls={inputCls}
          labelCls={labelCls}
        />
        {errors.country && <p role="alert" className={errCls}>{t(errors.country.message!)}</p>}
        {errors.state && <p role="alert" className={errCls}>{t(errors.state.message!)}</p>}
        {errors.municipality && <p role="alert" className={errCls}>{t(errors.municipality.message!)}</p>}

        {isProvider && isMexico && (
          <div>
            <label htmlFor="reg-cedula" className={labelCls}>{t('reg.cedula')}</label>
            <input id="reg-cedula" className={inputCls} placeholder={t('reg.cedulaPlaceholder')} {...register('cedula_profesional')} />
            <p className="mt-1 text-xs text-muted">{t('reg.cedulaHint')}</p>
          </div>
        )}
        {isConsumer && (
          <div>
            <label htmlFor="reg-phone" className={labelCls}>{t('reg.phone')}</label>
            <div className="flex gap-2">
              <select
                aria-label={t('reg.dialCode')}
                className="w-28 shrink-0 rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                {...register('dial_code')}
              >
                {DIAL_CODES.map((c) => (
                  <option key={c.iso} value={c.dial}>
                    {c.iso} {c.dial}
                  </option>
                ))}
              </select>
              <input id="reg-phone" type="tel" autoComplete="tel" className={inputCls} {...register('phone')} />
            </div>
          </div>
        )}
      </section>

      {/* Sucursales (solo proveedores) */}
      {isProvider && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('reg.branches')}</h3>
          <p className="text-sm text-muted">{t('reg.branchHint')}</p>
          {typeof errors.locations?.message === 'string' && (
            <p role="alert" className={errCls}>{t(errors.locations.message)}</p>
          )}

          {fields.map((field, i) => (
            <div key={field.id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{t('reg.branch')} {i + 1}</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={t('reg.removeBranch')}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div>
                <label className={labelCls}>{t('reg.branchLabel')}</label>
                <input className={inputCls} {...register(`locations.${i}.label` as const)} />
              </div>
              <div>
                <label className={labelCls}>{t('reg.address')}</label>
                <input className={inputCls} {...register(`locations.${i}.address` as const)} />
                {errors.locations?.[i]?.address && (
                  <p role="alert" className={errCls}>{t(errors.locations[i]!.address!.message!)}</p>
                )}
              </div>
              <div>
                <label className={labelCls}>{t('reg.branchPhone')}</label>
                <input className={inputCls} type="tel" {...register(`locations.${i}.phone` as const)} />
                {errors.locations?.[i]?.phone && (
                  <p role="alert" className={errCls}>{t(errors.locations[i]!.phone!.message!)}</p>
                )}
              </div>
              <div>
                <label className={labelCls}>{t('reg.hoursLabel')}</label>
                <input className={inputCls} placeholder={t('reg.hoursPlaceholder')} {...register(`locations.${i}.hours` as const)} />
                {errors.locations?.[i]?.hours && (
                  <p role="alert" className={errCls}>{t(errors.locations[i]!.hours!.message!)}</p>
                )}
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
                    {...register(`locations.${i}.latitude` as const, { setValueAs: numOrNull })}
                  />
                  <input
                    className={inputCls}
                    type="number"
                    step="any"
                    placeholder={t('reg.lng')}
                    aria-label={t('reg.lng')}
                    {...register(`locations.${i}.longitude` as const, { setValueAs: numOrNull })}
                  />
                </div>
              </fieldset>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={() => append({ label: '', address: '', phone: '', hours: '', latitude: null, longitude: null })}
            leadingIcon={<Plus className="h-4 w-4" />}
            fullWidth
          >
            {t('reg.addBranch')}
          </Button>
        </section>
      )}

      {/* Cuenta — solo al crear cuenta nueva. En modo "completar" (login social)
          la cuenta ya existe, así que se omite email/contraseña. */}
      {!complete && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('reg.account')}</h3>
          <div>
            <label htmlFor="reg-email" className={labelCls}>{t('auth.email')}</label>
            <input id="reg-email" type="email" inputMode="email" autoComplete="email" className={inputCls} {...register('email')} />
            {errors.email && <p role="alert" className={errCls}>{t(errors.email.message!)}</p>}
          </div>
          <div>
            <label htmlFor="reg-confirm-email" className={labelCls}>{t('auth.confirmEmail')}</label>
            <input id="reg-confirm-email" type="email" inputMode="email" autoComplete="off" onPaste={(e) => e.preventDefault()} className={inputCls} {...register('confirm_email')} />
            {errors.confirm_email && <p role="alert" className={errCls}>{t(errors.confirm_email.message!)}</p>}
          </div>
          <div>
            <label htmlFor="reg-password" className={labelCls}>{t('auth.password')}</label>
            <PasswordInput
              id="reg-password"
              autoComplete="new-password"
              className={inputCls}
              {...register('password')}
            />
            <PasswordStrength value={watch('password') ?? ''} />
            {errors.password && <p role="alert" className={errCls}>{t(errors.password.message!)}</p>}
          </div>
          <div>
            <label htmlFor="reg-confirm-password" className={labelCls}>{t('auth.confirmPassword')}</label>
            <PasswordInput
              id="reg-confirm-password"
              autoComplete="new-password"
              className={inputCls}
              {...register('confirm_password')}
            />
            {errors.confirm_password && <p role="alert" className={errCls}>{t(errors.confirm_password.message!)}</p>}
          </div>
        </section>
      )}

      {/* Aceptación obligatoria de Términos y Aviso de Privacidad */}
      <div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-500 focus-visible:ring-brand-500"
            {...register('accept_terms')}
          />
          <span className="text-sm text-slate-700">
            {t('reg.acceptPre')}{' '}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">
              {t('auth.terms')}
            </a>{' '}
            {t('reg.acceptMid')}{' '}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">
              {t('auth.privacy')}
            </a>
            {t('reg.acceptPost')}
          </span>
        </label>
        {errors.accept_terms && <p role="alert" className={errCls}>{t(errors.accept_terms.message!)}</p>}
      </div>

      {/* Aceptación obligatoria del Reglamento + Descargo de responsabilidad */}
      <div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-500 focus-visible:ring-brand-500"
            {...register('accept_rules')}
          />
          <span className="text-sm text-slate-700">
            {t('reg.acceptRulesPre')}{' '}
            <a href="/reglamento" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">
              {t('reg.rulesLink')}
            </a>
            {t('reg.acceptRulesPost')}
          </span>
        </label>
        {errors.accept_rules && <p role="alert" className={errCls}>{t(errors.accept_rules.message!)}</p>}
      </div>

      {/* Aceptación obligatoria del Manifiesto de la Comunidad */}
      <div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-500 focus-visible:ring-brand-500"
            {...register('accept_manifesto')}
          />
          <span className="text-sm text-slate-700">
            {t('reg.acceptManifestoPre')}{' '}
            <a href="/manifiesto" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">
              {t('footer.manifesto')}
            </a>
            {t('reg.acceptManifestoPost')}
          </span>
        </label>
        {errors.accept_manifesto && <p role="alert" className={errCls}>{t(errors.accept_manifesto.message!)}</p>}
      </div>

      {/* Programa Fundador: el usuario puede optar por una cuenta ordinaria */}
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-500 focus-visible:ring-brand-500"
            {...register('wants_founder')}
          />
          <span className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{t('reg.wantFounder')}</span>{' '}
            {t('reg.wantFounderHint')}
          </span>
        </label>
        {!wantsFounder && (
          <p className="mt-2 text-xs text-brand-800">{t('reg.ordinaryDiscount')}</p>
        )}
      </div>

      {isConsumer && (
        <p className="rounded-xl bg-sage-50 p-3 text-xs text-sage-700">{t('reg.freeLifetime')}</p>
      )}

      {/* Consentimiento OPCIONAL de comunicaciones (solo adulto) */}
      {isAdult && (
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-500 focus-visible:ring-brand-500"
            {...register('comms_opt_in')}
          />
          <span className="text-sm text-slate-700">{t('reg.commsOptIn')}</span>
        </label>
      )}

      {!acceptTerms && <p className={errCls}>• {t('reg.miss.terms')}</p>}
      {!acceptRules && <p className={errCls}>• {t('reg.miss.rules')}</p>}
      {!acceptManifesto && <p className={errCls}>• {t('reg.miss.manifesto')}</p>}
      <Button type="submit" loading={isSubmitting} fullWidth>
        {complete ? t('onb.finish') : t('auth.createAccount')}
      </Button>
    </form>
  );
}
