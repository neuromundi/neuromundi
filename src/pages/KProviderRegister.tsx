/**
 * KProviderRegister — registro genérico (config-driven) para los 5 tipos del
 * bloque K: wellness, tourism, legal, ngo, caregiver. Mismo patrón de secciones
 * + vista previa en vivo. Las ofertas se guardan en specialties[] (indexable).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setFounderOptoutFlag } from '@/lib/founderPref';
import { isStrictEmail } from '@/lib/email';
import { useCountryLabel } from '@/lib/countryLabel';
import { FounderProgressCard } from '@/components/founder/FounderProgressCard';
import { founderKindFor } from '@/hooks/useFounder';
import { Camera, Eye, ChevronDown, MapPin, BadgeCheck, HeartPulse, Plane, Scale, HeartHandshake, HandHeart } from 'lucide-react';
import { Button, useToast, PasswordInput} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCatLabel } from '@/lib/catLabel';
import { RULES_VERSION } from '@/lib/legal';
import { COUNTRIES, MEXICO_NAME } from '@/data/countries';
import { MX_ESTADOS, MX_MUNICIPIOS } from '@/data/mxStatesMunicipalities';
import { K_OFFERINGS, K_CONFIG, type KType } from '@/data/kCatalog';

const inputCls = 'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';
const sectionTitle = 'text-sm font-semibold uppercase tracking-wide text-muted';

const ICONS: Record<KType, typeof HeartPulse> = {
  wellness: HeartPulse, tourism: Plane, legal: Scale, ngo: HeartHandshake, caregiver: HandHeart,
};

function useToggleList(initial: string[] = []) {
  const [list, setList] = useState<string[]>(initial);
  const toggle = (v: string) => setList((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  return [list, toggle] as const;
}

export function KProviderRegister({ typeKey }: { typeKey: KType }) {
  const { t } = useTranslation();
  const countryLabel = useCountryLabel();
  const catLabel = useCatLabel();
  const { signUp } = useAuth();
  const toast = useToast();
  const Icon = ICONS[typeKey];
  const cfg = K_CONFIG[typeKey];
  const offerings = K_OFFERINGS[typeKey];

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [picked, togglePick] = useToggleList();
  const [otherOffering, setOtherOffering] = useState('');
  // Contacto
  const [whatsapp, setWhatsapp] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [address, setAddress] = useState('');
  // Validaciones
  const [registration, setRegistration] = useState('');
  const [rfc, setRfc] = useState('');
  // Beneficio
  const [benefitDesc, setBenefitDesc] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [benefitTerms, setBenefitTerms] = useState('');
  const [benefitValidator, setBenefitValidator] = useState('');
  // Cuenta
  const [contactName, setContactName] = useState('');
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
  const isNgo = typeKey === 'ngo';

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setLogoUrl(URL.createObjectURL(f));
  };


  const [missing, setMissing] = useState<string[]>([]);

  const submit = async () => {
    const miss: string[] = [];
    if (name.trim().length < 2) miss.push(t('reg.miss.institution'));
    if (picked.includes('otro') && !otherOffering.trim()) miss.push(t('reg.miss.otherSpecify'));
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
    const details: Record<string, unknown> = { k_type: typeKey };
    if (otherOffering.trim()) details.offering_other = otherOffering.trim();
    if (contactName.trim()) details.contact_name = contactName.trim();
    if (contactEmail.trim()) details.contact_email = contactEmail.trim();
    if (registration.trim()) details.registration = registration.trim();
    if (benefitDesc.trim()) details.benefit_desc = benefitDesc.trim();
    const discountPctNum = parseInt(discountPct, 10);
    if (!Number.isNaN(discountPctNum) && discountPctNum > 0) details.discount_pct = Math.min(100, discountPctNum);
    if (benefitTerms.trim()) details.benefit_terms = benefitTerms.trim();
    if (benefitValidator.trim()) details.benefit_validator = benefitValidator.trim();

    const res = await signUp({
      email, password, fullName: name.trim(),
      role: 'provider', providerType: typeKey, isCompany: true, businessName: name.trim(),
      bio: description || null, website: website || null, whatsapp: whatsapp || null, rfc: isMexico ? (rfc || null) : null,
      country: country || null, state: isMexico ? stateName : null, municipality: isMexico ? municipality : null,
      address: address || null,
      specialties: picked, // indexable para el buscador
      providerDetails: details,
      rulesVersion: RULES_VERSION,
    });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    if (logoUrl) toast.success(t('k.logoLater'));
    try { localStorage.setItem('neuromundi.pendingWelcome', '1'); } catch { /* ignore */ }
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-xl bg-brand-50 p-4 text-center text-sm text-slate-700">
        {t('auth.checkEmail')}
        <p className="mt-2 text-muted">{t('k.afterInfo')}</p>
      </div>
    );
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700'}`;

  const founderKind = founderKindFor('provider', typeKey);
  const preview = (
    <>
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t('k.previewTitle')}</p>
      <div className="flex items-center gap-3">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${cfg.color} text-white`}>
          {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Icon className="h-7 w-7" />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{name || t('k.yourName')}</p>
          <p className="text-sm text-brand-700">{t(`create.cards.${typeKey}.title`)}</p>
          {(municipality || stateName) && (
            <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {[municipality, stateName].filter(Boolean).join(', ')}</p>
          )}
        </div>
      </div>
      {description && <p className="mt-3 line-clamp-3 text-sm text-slate-600">{description}</p>}
      {picked.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {picked.map((v) => (
            <span key={v} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
              {catLabel(v, offerings.find((x) => x.value === v)?.label ?? v)}
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
          <h3 className={sectionTitle}>{t('k.s1')}</h3>
          <div className="flex items-center gap-4">
            <label className={`flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${cfg.color} text-white/80 ring-2 ring-slate-100`}>
              {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" />}
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
            </label>
            <p className="text-xs text-muted">{t('k.logoHint')}</p>
          </div>
          <div><label className={labelCls}>{t('k.name')} *</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <label className={labelCls}>{isNgo ? t('k.mission') : t('k.description')}</label>
            <textarea maxLength={300} rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
            <p className="mt-1 text-right text-xs text-muted">{description.length}/300</p>
          </div>
        </section>

        {/* 2. Oferta */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('k.s2')}</h3>
          <div>
            <label className={labelCls}>{t('k.offerings')}</label>
            <div className="flex flex-wrap gap-2">
              {offerings.map((o) => <button type="button" key={o.value} onClick={() => togglePick(o.value)} className={chip(picked.includes(o.value))}>{catLabel(o.value, o.label)}</button>)}
            </div>
            <input className={`${inputCls} mt-2`} placeholder={t('k.otherPlaceholder')} value={otherOffering} onChange={(e) => setOtherOffering(e.target.value)} />
          </div>
        </section>

        {/* 3. Contacto y ubicación */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('k.s3')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>{t('k.whatsapp')}</label><input className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+52 55…" /></div>
            <div><label className={labelCls}>{t('k.contactEmail')}</label><input type="email" className={inputCls} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>{t('k.website')}</label><input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
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
          <div><label className={labelCls}>{t('k.address')}</label><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        </section>

        {/* 4. Validaciones */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('k.s4')}</h3>
          <div><label className={labelCls}>{isNgo ? t('k.regNgo') : typeKey === 'legal' ? t('k.regLegal') : t('k.registration')}</label><input className={inputCls} value={registration} onChange={(e) => setRegistration(e.target.value)} /></div>
          {isMexico && !isNgo && <div><label className={labelCls}>RFC</label><input className={inputCls} value={rfc} onChange={(e) => setRfc(e.target.value)} /></div>}
        </section>

        {/* 5. Beneficio / QR */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{isNgo ? t('k.s5ngo') : t('k.s5')}</h3>
          <div><label className={labelCls}>{isNgo ? t('k.benefitNgo') : t('k.benefit')}</label><input className={inputCls} placeholder={t('k.benefitPlaceholder')} value={benefitDesc} onChange={(e) => setBenefitDesc(e.target.value)} /></div>
          <div><label className={labelCls}>{t('reg.discountPct')}</label><input type="number" min="0" max="100" className={inputCls} placeholder="0" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /><p className="mt-1 text-xs text-muted">{t('reg.discountPctHelp')}</p></div>
          <div><label className={labelCls}>{t('k.benefitTerms')}</label><input className={inputCls} value={benefitTerms} onChange={(e) => setBenefitTerms(e.target.value)} /></div>
          <div><label className={labelCls}>{t('k.validator')}</label><input className={inputCls} value={benefitValidator} onChange={(e) => setBenefitValidator(e.target.value)} /></div>
        </section>

        {/* 6. Cuenta */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('k.s6')}</h3>
          <div><label className={labelCls}>{t('k.contactName')}</label><input className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
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

      <aside className="hidden lg:block">
        <div className="sticky top-20">{preview}</div>
      </aside>
      <div className="lg:hidden">
        <button type="button" onClick={() => setShowPreview((s) => !s)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
          <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> {t('k.previewToggle')}</span>
          <ChevronDown className={`h-4 w-4 transition ${showPreview ? 'rotate-180' : ''}`} />
        </button>
        {showPreview && <div className="mt-3">{preview}</div>}
      </div>
    </div>
  );
}
