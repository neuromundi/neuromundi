/**
 * SchoolRegister — registro de ESCUELA / centro educativo con perfil de inclusión
 * y VISTA PREVIA EN VIVO (mismo patrón que especialista/proveedor).
 *
 * provider_type = 'school'. Reutiliza columnas existentes y guarda lo específico
 * en provider_details. Grados en school_grades[]; modelos/servicios de inclusión
 * en intervention_areas[] (indexable, aparece en el buscador).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setFounderOptoutFlag } from '@/lib/founderPref';
import { isStrictEmail } from '@/lib/email';
import { useCountryLabel } from '@/lib/countryLabel';
import { FounderProgressCard } from '@/components/founder/FounderProgressCard';
import { SectionsField } from '@/components/onboarding/SectionsField';
import { founderKindFor } from '@/hooks/useFounder';
import { Camera, Eye, ChevronDown, MapPin, School, BadgeCheck } from 'lucide-react';
import { Button, useToast, PasswordInput} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCatLabel } from '@/lib/catLabel';
import { RULES_VERSION } from '@/lib/legal';
import { COUNTRIES, MEXICO_NAME } from '@/data/countries';
import { MX_ESTADOS, MX_MUNICIPIOS } from '@/data/mxStatesMunicipalities';
import { SCHOOL_GRADES } from '@/data/satCatalogs';
import { INSTITUTION_TYPES, INCLUSION_MODELS, SUPPORT_SERVICES } from '@/data/schoolCatalog';

const inputCls = 'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';
const sectionTitle = 'text-sm font-semibold uppercase tracking-wide text-muted';

function useToggleList(initial: string[] = []) {
  const [list, setList] = useState<string[]>(initial);
  const toggle = (v: string) => setList((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  return [list, toggle] as const;
}

export function SchoolRegister({ onSuccess, complete = false }: { onSuccess?: () => void; complete?: boolean }) {
  const { t } = useTranslation();
  const countryLabel = useCountryLabel();
  const catLabel = useCatLabel();
  // `complete`: usuario ya autenticado (login social) → ACTUALIZA su perfil.
  const { signUp, completeProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [institutionType, setInstitutionType] = useState('');
  const [description, setDescription] = useState('');
  // Ubicación y contacto
  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [publicEmail, setPublicEmail] = useState('');
  const [website, setWebsite] = useState('');
  // Oferta e inclusión
  const [grades, toggleGrade] = useToggleList();
  const [sections, toggleSection] = useToggleList();
  const [neuroConditions, toggleCondition] = useToggleList();
  const [models, toggleModel] = useToggleList();
  const [modelOther, setModelOther] = useState('');
  const [services, toggleService] = useToggleList();
  const [serviceOther, setServiceOther] = useState('');
  // Validaciones
  const [rvoe, setRvoe] = useState('');
  const [rfc, setRfc] = useState('');
  const [directorName, setDirectorName] = useState('');
  // Beneficio
  const [benefitDesc, setBenefitDesc] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [benefitTerms, setBenefitTerms] = useState('');
  const [benefitValidator, setBenefitValidator] = useState('');
  // Cuenta
  const [adminName, setAdminName] = useState('');
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

  const isMexico = country === MEXICO_NAME;
  const municipios = useMemo(() => (isMexico && stateName ? MX_MUNICIPIOS[stateName] ?? [] : []), [isMexico, stateName]);
  const _inst = INSTITUTION_TYPES.find((i) => i.value === institutionType);
  const instLabel = _inst ? catLabel(_inst.value, _inst.label) : '';

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setLogoUrl(URL.createObjectURL(f));
  };


  const [missing, setMissing] = useState<string[]>([]);

  const submit = async () => {
    const miss: string[] = [];
    if (name.trim().length < 2) miss.push(t('reg.miss.institution'));
    if (models.includes('otro') && !modelOther.trim()) miss.push(t('reg.miss.otherSpecify'));
    if (services.includes('otro') && !serviceOther.trim()) miss.push(t('reg.miss.otherSpecify'));
    if (!complete) {
      if (!email.trim()) miss.push(t('reg.miss.email'));
      if (email.trim() && !isStrictEmail(email)) miss.push(t('reg.miss.emailValid'));
      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) miss.push(t('reg.miss.emailMatch'));
      if (password.length < 8) miss.push(t('reg.miss.password'));
      if (password !== confirmPassword) miss.push(t('reg.miss.passwordMatch'));
    }
    if (!acceptTerms) miss.push(t('reg.miss.terms'));
    if (!acceptRules) miss.push(t('reg.miss.rules'));
    if (!acceptManifesto) miss.push(t('reg.miss.manifesto'));
    if (miss.length) { setMissing(miss); return; }
    setMissing([]);
    setFounderOptoutFlag(!wantsFounder);
    setBusy(true);
    const details: Record<string, unknown> = {};
    if (institutionType) details.institution_type = institutionType;
    if (rvoe.trim()) details.rvoe = rvoe.trim();
    if (modelOther.trim()) details.model_other = modelOther.trim();
    if (serviceOther.trim()) details.service_other = serviceOther.trim();
    if (directorName.trim()) details.director_name = directorName.trim();
    if (adminName.trim()) details.contact_name = adminName.trim();
    if (phone.trim()) details.phone_fixed = phone.trim();
    if (publicEmail.trim()) details.public_email = publicEmail.trim();
    if (benefitDesc.trim()) details.benefit_desc = benefitDesc.trim();
    const discountPctNum = parseInt(discountPct, 10);
    if (!Number.isNaN(discountPctNum) && discountPctNum > 0) details.discount_pct = Math.min(100, discountPctNum);
    if (benefitTerms.trim()) details.benefit_terms = benefitTerms.trim();
    if (benefitValidator.trim()) details.benefit_validator = benefitValidator.trim();

    const payload = {
      email, password, fullName: name.trim(),
      role: 'provider' as const, providerType: 'school' as const, isCompany: true, businessName: name.trim(),
      bio: description || null, website: website || null, whatsapp: whatsapp || null, rfc: isMexico ? (rfc || null) : null,
      instagram: instagram || null, tiktok: tiktok || null, facebook: facebook || null, linkedin: linkedin || null,
      country: country || null, state: isMexico ? stateName : null, municipality: isMexico ? municipality : null,
      address: address || null,
      schoolGrades: grades,
      interventionAreas: [...models, ...services], // indexable para el buscador
      sections, neuroConditions,
      providerDetails: details,
      rulesVersion: RULES_VERSION,
    };
    const res = complete ? await completeProfile(payload) : await signUp(payload);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    if (logoUrl) toast.success(t('sch.logoLater'));
    try { localStorage.setItem('neuromundi.pendingWelcome', '1'); } catch { /* ignore */ }
    if (complete) { onSuccess?.(); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-xl bg-brand-50 p-4 text-center text-sm text-slate-700">
        {t('auth.checkEmail')}
        <p className="mt-2 text-muted">{t('sch.afterInfo')}</p>
      </div>
    );
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700'}`;

  const founderKind = founderKindFor('provider', 'school');
  const preview = (
    <>
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t('sch.previewTitle')}</p>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-50 text-amber-400">
          {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <School className="h-7 w-7" />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{name || t('sch.yourName')}</p>
          {instLabel && <p className="text-sm text-amber-700">{instLabel}</p>}
          {(municipality || stateName) && (
            <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {[municipality, stateName].filter(Boolean).join(', ')}</p>
          )}
        </div>
      </div>
      {description && <p className="mt-3 line-clamp-3 text-sm text-slate-600">{description}</p>}
      {grades.length > 0 && <p className="mt-3 text-xs text-muted">{grades.map((g) => t(`grades.${g}`)).join(' · ')}</p>}
      {(models.length > 0 || services.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[...models, ...services].slice(0, 6).map((v) => (
            <span key={v} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              {catLabel(v, INCLUSION_MODELS.find((x) => x.value === v)?.label ?? SUPPORT_SERVICES.find((x) => x.value === v)?.label ?? v)}
            </span>
          ))}
        </div>
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-6" noValidate>
        {/* 1. Perfil */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('sch.s1')}</h3>
          <div className="flex items-center gap-4">
            <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-amber-50 text-amber-400 ring-2 ring-amber-100">
              {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" />}
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
            </label>
            <p className="text-xs text-muted">{t('sch.logoHint')}</p>
          </div>
          <div><label className={labelCls}>{t('sch.name')} *</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <label className={labelCls}>{t('sch.institutionType')}</label>
            <select className={inputCls} value={institutionType} onChange={(e) => setInstitutionType(e.target.value)}>
              <option value="">{t('sch.institutionSelect')}</option>
              {INSTITUTION_TYPES.map((i) => <option key={i.value} value={i.value}>{catLabel(i.value, i.label)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t('sch.description')}</label>
            <textarea maxLength={300} rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
            <p className="mt-1 text-right text-xs text-muted">{description.length}/300</p>
          </div>
        </section>

        {/* 2. Ubicación y contacto */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('sch.s2')}</h3>
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
          <div><label className={labelCls}>{t('sch.address')}</label><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>{t('sch.phone')}</label><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><label className={labelCls}>{t('sch.whatsapp')}</label><input className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
            <div><label className={labelCls}>{t('sch.publicEmail')}</label><input type="email" className={inputCls} value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} /></div>
            <div><label className={labelCls}>{t('sch.website')}</label><input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
          </div>
        </section>

        {/* 3. Oferta educativa e inclusión */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('sch.s3')}</h3>
          <SectionsField
            sections={sections}
            onToggleSection={toggleSection}
            neuroConditions={neuroConditions}
            onToggleCondition={toggleCondition}
          />
          <div>
            <label className={labelCls}>{t('sch.grades')}</label>
            <div className="flex flex-wrap gap-2">{SCHOOL_GRADES.map((g) => <button type="button" key={g} onClick={() => toggleGrade(g)} className={chip(grades.includes(g))}>{t(`grades.${g}`)}</button>)}</div>
          </div>
          <div>
            <label className={labelCls}>{t('sch.models')}</label>
            <div className="flex flex-wrap gap-2">{INCLUSION_MODELS.map((m) => <button type="button" key={m.value} onClick={() => toggleModel(m.value)} className={chip(models.includes(m.value))}>{catLabel(m.value, m.label)}</button>)}</div>
            {models.includes('otro') && <input className={`${inputCls} mt-2`} placeholder={t('reg.otherPlaceholder')} value={modelOther} onChange={(e) => setModelOther(e.target.value)} />}
          </div>
          <div>
            <label className={labelCls}>{t('sch.services')}</label>
            <div className="flex flex-wrap gap-2">{SUPPORT_SERVICES.map((s) => <button type="button" key={s.value} onClick={() => toggleService(s.value)} className={chip(services.includes(s.value))}>{catLabel(s.value, s.label)}</button>)}</div>
            {services.includes('otro') && <input className={`${inputCls} mt-2`} placeholder={t('reg.otherPlaceholder')} value={serviceOther} onChange={(e) => setServiceOther(e.target.value)} />}
          </div>
        </section>

        {/* 4. Validaciones */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('sch.s4')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>{t('sch.rvoe')}</label><input className={inputCls} placeholder={t('sch.rvoePlaceholder')} value={rvoe} onChange={(e) => setRvoe(e.target.value)} /></div>
            {isMexico && <div><label className={labelCls}>RFC</label><input className={inputCls} value={rfc} onChange={(e) => setRfc(e.target.value)} /></div>}
          </div>
          <div><label className={labelCls}>{t('sch.director')}</label><input className={inputCls} value={directorName} onChange={(e) => setDirectorName(e.target.value)} /></div>
          <p className="text-xs text-muted">{t('sch.docNote')}</p>
        </section>

        {/* 5. Beneficio / QR */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('sch.s5')}</h3>
          <div><label className={labelCls}>{t('sch.benefit')}</label><input className={inputCls} placeholder={t('sch.benefitPlaceholder')} value={benefitDesc} onChange={(e) => setBenefitDesc(e.target.value)} /></div>
          <div><label className={labelCls}>{t('reg.discountPct')}</label><input type="number" min="0" max="100" className={inputCls} placeholder="0" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /><p className="mt-1 text-xs text-muted">{t('reg.discountPctHelp')}</p></div>
          <div><label className={labelCls}>{t('sch.benefitTerms')}</label><input className={inputCls} placeholder={t('sch.benefitTermsPlaceholder')} value={benefitTerms} onChange={(e) => setBenefitTerms(e.target.value)} /></div>
          <div><label className={labelCls}>{t('sch.validator')}</label><input className={inputCls} placeholder={t('sch.validatorPlaceholder')} value={benefitValidator} onChange={(e) => setBenefitValidator(e.target.value)} /></div>
        </section>

        {/* Redes sociales (opcional) */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('reg.socialOptional')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>{t('reg.instagram')}</label><input className={inputCls} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" /></div>
            <div><label className={labelCls}>{t('reg.tiktok')}</label><input className={inputCls} value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@usuario" /></div>
            <div><label className={labelCls}>{t('reg.facebook')}</label><input className={inputCls} value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/…" /></div>
            <div><label className={labelCls}>LinkedIn</label><input className={inputCls} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/…" /></div>
          </div>
        </section>

        {/* 6. Cuenta */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('sch.s6')}</h3>
          <div><label className={labelCls}>{t('sch.adminName')}</label><input className={inputCls} value={adminName} onChange={(e) => setAdminName(e.target.value)} /></div>
          {!complete && (
            <>
              <div><label className={labelCls}>{t('auth.email')}</label><input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><label className={labelCls}>{t('auth.confirmEmail')}</label><input type="email" inputMode="email" autoComplete="off" onPaste={(e) => e.preventDefault()} className={inputCls} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} /></div>
              <div><label className={labelCls}>{t('auth.password')}</label><PasswordInput className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <div><label className={labelCls}>{t('auth.confirmPassword')}</label><PasswordInput className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
            </>
          )}
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
        <Button type="submit" loading={busy} fullWidth>{complete ? t('onb.finish') : t('auth.createAccount')}</Button>
      </form>

      <aside className="hidden lg:block">
        <div className="sticky top-20">{preview}</div>
      </aside>
      <div className="lg:hidden">
        <button type="button" onClick={() => setShowPreview((s) => !s)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
          <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> {t('sch.previewToggle')}</span>
          <ChevronDown className={`h-4 w-4 transition ${showPreview ? 'rotate-180' : ''}`} />
        </button>
        {showPreview && <div className="mt-3">{preview}</div>}
      </div>
    </div>
  );
}
