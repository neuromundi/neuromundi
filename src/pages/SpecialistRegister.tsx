/**
 * SpecialistRegister — registro dedicado del ESPECIALISTA con perfil profesional
 * y VISTA PREVIA EN VIVO. En escritorio, el formulario va a la izquierda y la
 * vista previa a la derecha (sticky). En móvil, la vista previa se muestra en un
 * panel plegable para no estorbar la UX.
 *
 * No pide fecha de nacimiento, "empresa" ni "servicios que ofrece".
 * La FOTO se previsualiza localmente; su subida se completa al iniciar sesión
 * (durante el registro puede no haber sesión activa por la confirmación de correo).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setFounderOptoutFlag } from '@/lib/founderPref';
import { isStrictEmail } from '@/lib/email';
import { useCountryLabel } from '@/lib/countryLabel';
import { FounderProgressCard } from '@/components/founder/FounderProgressCard';
import { founderKindFor } from '@/hooks/useFounder';
import { Camera, Eye, ChevronDown, MapPin, Stethoscope, BadgeCheck } from 'lucide-react';
import { Button, useToast, PasswordInput} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCatLabel } from '@/lib/catLabel';
import { RULES_VERSION } from '@/lib/legal';
import { COUNTRIES, MEXICO_NAME } from '@/data/countries';
import { MX_ESTADOS, MX_MUNICIPIOS } from '@/data/mxStatesMunicipalities';
import {
  TITLE_PREFIXES, PROFESSIONS, SPECIALTIES, MODALITIES, AGE_RANGES, INTERVENTION_AREAS, CERTIFICATIONS,
} from '@/data/specialistCatalog';

const inputCls = 'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';
const sectionTitle = 'text-sm font-semibold uppercase tracking-wide text-muted';

function useToggleList(initial: string[] = []) {
  const [list, setList] = useState<string[]>(initial);
  const toggle = (v: string) => setList((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  return [list, toggle] as const;
}

export function SpecialistRegister({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const countryLabel = useCountryLabel();
  const catLabel = useCatLabel();
  const { signUp } = useAuth();
  const toast = useToast();

  // Perfil
  const [titlePrefix, setTitlePrefix] = useState('');
  const [fullName, setFullName] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [modalities, toggleModality] = useToggleList();
  // Contacto
  const [whatsapp, setWhatsapp] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [instagram, setInstagram] = useState('');
  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [address, setAddress] = useState('');
  // Especialización
  const [specialties, toggleSpecialty] = useToggleList();
  const [specialtyOther, setSpecialtyOther] = useState('');
  const [certs, toggleCert] = useToggleList();
  const [ageRanges, toggleAge] = useToggleList();
  const [areas, toggleArea] = useToggleList();
  const [areaOther, setAreaOther] = useState('');
  // Validaciones
  const [cedula, setCedula] = useState('');
  const [rfc, setRfc] = useState('');
  // Beneficio
  const [benefitDesc, setBenefitDesc] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [benefitTerms, setBenefitTerms] = useState('');
  const [benefitValidator, setBenefitValidator] = useState('');
  // Cuenta
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptRules, setAcceptRules] = useState(false);
  const [acceptManifesto, setAcceptManifesto] = useState(false);
  const [wantsFounder, setWantsFounder] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const onlineOnly = modalities.length === 1 && modalities[0] === 'online';
  const isMexico = country === MEXICO_NAME;
  const municipios = useMemo(() => (isMexico && stateName ? MX_MUNICIPIOS[stateName] ?? [] : []), [isMexico, stateName]);
  const _prof = PROFESSIONS.find((p) => p.value === profession);
  const professionLabel = _prof ? catLabel(_prof.value, _prof.label) : '';

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPhotoUrl(URL.createObjectURL(f));
  };


  const [missing, setMissing] = useState<string[]>([]);

  const submit = async () => {
    const miss: string[] = [];
    if (fullName.trim().length < 2) miss.push(t('reg.miss.name'));
    if (!profession) miss.push(t('reg.miss.profession'));
    if (!cedula.trim()) miss.push(t('reg.miss.cedula'));
    if (specialties.includes('otro') && !specialtyOther.trim()) miss.push(t('reg.miss.otherSpecify'));
    if (areas.includes('otro') && !areaOther.trim()) miss.push(t('reg.miss.otherSpecify'));
    if (!email.trim()) miss.push(t('reg.miss.email'));
    if (email.trim() && !isStrictEmail(email)) miss.push(t('reg.miss.emailValid'));
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) miss.push(t('reg.miss.emailMatch'));
    if (password.length < 8) miss.push(t('reg.miss.password'));
    if (password !== confirmPassword) miss.push(t('reg.miss.passwordMatch'));
    if (!acceptTerms) miss.push(t('reg.miss.terms'));
    if (!acceptRules) miss.push(t('reg.miss.rules'));
    if (!acceptManifesto) miss.push(t('reg.miss.manifesto'));
    if (miss.length) { setMissing(miss); return; }
    setMissing([]);
    setFounderOptoutFlag(!wantsFounder);
    setBusy(true);
    const details: Record<string, unknown> = {};
    if (specialtyOther.trim()) details.specialty_other = specialtyOther.trim();
    if (areaOther.trim()) details.area_other = areaOther.trim();
    if (certs.length) details.certifications = certs;
    if (contactEmail.trim()) details.contact_email = contactEmail.trim();
    if (benefitDesc.trim()) details.benefit_desc = benefitDesc.trim();
    const discountPctNum = parseInt(discountPct, 10);
    if (!Number.isNaN(discountPctNum) && discountPctNum > 0) details.discount_pct = Math.min(100, discountPctNum);
    if (benefitTerms.trim()) details.benefit_terms = benefitTerms.trim();
    if (benefitValidator.trim()) details.benefit_validator = benefitValidator.trim();

    const res = await signUp({
      email, password, fullName: fullName.trim(),
      role: 'provider', providerType: 'service_provider', isCompany: false,
      country: country || null, state: isMexico ? stateName : null, municipality: isMexico ? municipality : null,
      address: onlineOnly ? null : (address || null),
      titlePrefix: titlePrefix || null, profession: profession || null, bio: bio || null,
      whatsapp: whatsapp || null, bookingUrl: bookingUrl || null, linkedin: linkedin || null,
      instagram: instagram || null, cedulaProfesional: cedula || null, rfc: isMexico ? (rfc || null) : null,
      specialties, modalities, ageRanges, interventionAreas: areas, providerDetails: details,
      rulesVersion: RULES_VERSION,
    });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    if (photoUrl) toast.success(t('spec.photoLater'));
    try { localStorage.setItem('neuromundi.pendingWelcome', '1'); } catch { /* ignore */ }
    setDone(true);
    onSuccess?.();
  };

  if (done) {
    return (
      <div className="rounded-xl bg-brand-50 p-4 text-center text-sm text-slate-700">
        {t('auth.checkEmail')}
        <p className="mt-2 text-muted">{t('spec.afterInfo')}</p>
      </div>
    );
  }

  const founderKind = founderKindFor('provider', 'service_provider');
  const preview = (
    <>
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t('spec.previewTitle')}</p>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-300">
          {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : <Stethoscope className="h-7 w-7" />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{[titlePrefix, fullName].filter(Boolean).join(' ') || t('spec.yourName')}</p>
          {professionLabel && <p className="text-sm text-brand-700">{professionLabel}</p>}
          {(municipality || stateName) && (
            <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {[municipality, stateName].filter(Boolean).join(', ')}</p>
          )}
        </div>
      </div>
      {bio && <p className="mt-3 line-clamp-4 text-sm text-slate-600">{bio}</p>}
      {specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {specialties.map((s) => (
            <span key={s} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
              {catLabel(s, SPECIALTIES.find((x) => x.value === s)?.label ?? s)}
            </span>
          ))}
        </div>
      )}
      {modalities.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          {modalities.map((m) => catLabel(m, MODALITIES.find((x) => x.value === m)?.label ?? m)).join(' · ')}
        </p>
      )}
      {benefitDesc && (
        <p className="mt-3 flex items-center gap-1 rounded-lg bg-evs-5/10 px-2 py-1 text-xs font-semibold text-evs-5">
          <BadgeCheck className="h-4 w-4" /> {benefitDesc}
        </p>
      )}
    </div>
    {founderKind ? <FounderProgressCard kind={founderKind} country={country || null} /> : null}
    </>
  );

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700'}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-6" noValidate>
        {/* 1. Perfil profesional */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('spec.s1')}</h3>
          <div className="flex items-center gap-4">
            <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-400 ring-2 ring-brand-100">
              {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" />}
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
            <p className="text-xs text-muted">{t('spec.photoHint')}</p>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-2">
            <div>
              <label className={labelCls}>{t('spec.title')}</label>
              <select className={inputCls} value={titlePrefix} onChange={(e) => setTitlePrefix(e.target.value)}>
                <option value="">—</option>
                {TITLE_PREFIXES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('reg.fullName')}</label>
              <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t('spec.profession')}</label>
            <select className={inputCls} value={profession} onChange={(e) => setProfession(e.target.value)}>
              <option value="">{t('spec.professionSelect')}</option>
              {PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{catLabel(p.value, p.label)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t('spec.bio')}</label>
            <textarea maxLength={500} rows={3} className={inputCls} placeholder={t('spec.bioPlaceholder')} value={bio} onChange={(e) => setBio(e.target.value)} />
            <p className="mt-1 text-right text-xs text-muted">{bio.length}/500</p>
          </div>
          <div>
            <label className={labelCls}>{t('spec.modalities')}</label>
            <div className="flex flex-wrap gap-2">
              {MODALITIES.map((m) => (
                <button type="button" key={m.value} onClick={() => toggleModality(m.value)} className={chip(modalities.includes(m.value))}>{catLabel(m.value, m.label)}</button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Contacto y ubicación */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('spec.s2')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>{t('spec.whatsapp')}</label><input className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+52 55…" /></div>
            <div><label className={labelCls}>{t('spec.contactEmail')}</label><input type="email" className={inputCls} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
            <div><label className={labelCls}>{t('spec.booking')}</label><input type="url" className={inputCls} value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://calendly.com/…" /></div>
            <div><label className={labelCls}>LinkedIn</label><input className={inputCls} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Instagram</label><input className={inputCls} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>{t('reg.country')}</label>
              <select className={inputCls} value={country} onChange={(e) => { setCountry(e.target.value); setStateName(''); setMunicipality(''); }}>
                <option value="">{t('reg.selectCountry')}</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>)}
              </select>
            </div>
            {isMexico && (
              <>
                <div>
                  <label className={labelCls}>{t('reg.state')}</label>
                  <select className={inputCls} value={stateName} onChange={(e) => { setStateName(e.target.value); setMunicipality(''); }}>
                    <option value="">{t('reg.selectState')}</option>
                    {MX_ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t('reg.municipality')}</label>
                  <select className={inputCls} value={municipality} onChange={(e) => setMunicipality(e.target.value)} disabled={!stateName}>
                    <option value="">{t('reg.selectMunicipality')}</option>
                    {municipios.map((mn) => <option key={mn} value={mn}>{mn}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
          {!onlineOnly && (
            <div><label className={labelCls}>{t('spec.address')}</label><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          )}
        </section>

        {/* 3. Especialización */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('spec.s3')}</h3>
          <div>
            <label className={labelCls}>{t('spec.specialties')}</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <button type="button" key={s.value} onClick={() => toggleSpecialty(s.value)} className={chip(specialties.includes(s.value))}>{catLabel(s.value, s.label)}</button>
              ))}
            </div>
            {specialties.includes('otro') && (
              <input className={`${inputCls} mt-2`} placeholder={t('spec.specifySpecialty')} value={specialtyOther} onChange={(e) => setSpecialtyOther(e.target.value)} />
            )}
          </div>
          <div>
            <label className={labelCls}>{t('spec.certifications')}</label>
            <div className="flex flex-wrap gap-2">
              {CERTIFICATIONS.map((c) => (
                <button type="button" key={c} onClick={() => toggleCert(c)} className={chip(certs.includes(c))}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>{t('spec.ageRanges')}</label>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGES.map((a) => (
                <button type="button" key={a.value} onClick={() => toggleAge(a.value)} className={chip(ageRanges.includes(a.value))}>{catLabel(a.value, a.label)}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>{t('spec.areas')}</label>
            <div className="flex flex-wrap gap-2">
              {INTERVENTION_AREAS.map((a) => (
                <button type="button" key={a.value} onClick={() => toggleArea(a.value)} className={chip(areas.includes(a.value))}>{catLabel(a.value, a.label)}</button>
              ))}
            </div>
            {areas.includes('otro') && (
              <input className={`${inputCls} mt-2`} placeholder={t('reg.otherPlaceholder')} value={areaOther} onChange={(e) => setAreaOther(e.target.value)} />
            )}
          </div>
        </section>

        {/* 4. Validaciones */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('spec.s4')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>{t('spec.cedula')} *</label><input className={inputCls} value={cedula} onChange={(e) => setCedula(e.target.value)} /></div>
            {isMexico && <div><label className={labelCls}>RFC</label><input className={inputCls} value={rfc} onChange={(e) => setRfc(e.target.value)} /></div>}
          </div>
          <p className="text-xs text-muted">{t('spec.idNote')}</p>
        </section>

        {/* 5. Beneficio / QR */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('spec.s5')}</h3>
          <div><label className={labelCls}>{t('spec.benefit')}</label><input className={inputCls} placeholder={t('spec.benefitPlaceholder')} value={benefitDesc} onChange={(e) => setBenefitDesc(e.target.value)} /></div>
          <div><label className={labelCls}>{t('reg.discountPct')}</label><input type="number" min="0" max="100" className={inputCls} placeholder="0" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /><p className="mt-1 text-xs text-muted">{t('reg.discountPctHelp')}</p></div>
          <div><label className={labelCls}>{t('spec.benefitTerms')}</label><input className={inputCls} placeholder={t('spec.benefitTermsPlaceholder')} value={benefitTerms} onChange={(e) => setBenefitTerms(e.target.value)} /></div>
          <div><label className={labelCls}>{t('spec.validator')}</label><input className={inputCls} placeholder={t('spec.validatorPlaceholder')} value={benefitValidator} onChange={(e) => setBenefitValidator(e.target.value)} /></div>
        </section>

        {/* 6. Cuenta */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('reg.account')}</h3>
          <div><label className={labelCls}>{t('auth.email')}</label><input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className={labelCls}>{t('auth.confirmEmail')}</label><input type="email" inputMode="email" autoComplete="off" onPaste={(e) => e.preventDefault()} className={inputCls} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} /></div>
          <div><label className={labelCls}>{t('auth.password')}</label><PasswordInput className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div><label className={labelCls}>{t('auth.confirmPassword')}</label><PasswordInput className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
        </section>

        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-500" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
          <span>{t('onb.acceptTerms')}</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-500" checked={acceptRules} onChange={(e) => setAcceptRules(e.target.checked)} />
          <span>{t('onb.acceptRules')}</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-500" checked={acceptManifesto} onChange={(e) => setAcceptManifesto(e.target.checked)} />
          <span>{t('reg.acceptManifestoPre')} <a href="/manifiesto" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">{t('footer.manifesto')}</a>{t('reg.acceptManifestoPost')}</span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-500" checked={wantsFounder} onChange={(e) => setWantsFounder(e.target.checked)} />
          <span><span className="font-semibold text-slate-900">{t('reg.wantFounder')}</span> {t('reg.wantFounderHint')}{!wantsFounder ? ` — ${t('reg.ordinaryDiscount')}` : ''}</span>
        </label>

        {missing.length > 0 && (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-evs-1">
            <p className="font-semibold">{t('reg.missTitle')}</p>
            <ul className="mt-1 list-disc pl-5">
              {missing.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}
        <Button type="submit" loading={busy} fullWidth>{t('auth.createAccount')}</Button>
      </form>

      {/* Vista previa: escritorio sticky, móvil plegable */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">{preview}</div>
      </aside>
      <div className="lg:hidden">
        <button type="button" onClick={() => setShowPreview((s) => !s)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
          <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> {t('spec.previewToggle')}</span>
          <ChevronDown className={`h-4 w-4 transition ${showPreview ? 'rotate-180' : ''}`} />
        </button>
        {showPreview && <div className="mt-3">{preview}</div>}
      </div>
    </div>
  );
}
