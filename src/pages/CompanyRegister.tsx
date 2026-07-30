/**
 * CompanyRegister — registro de "Empresa inclusiva" (provider_type = 'company').
 * Mismo patrón de secciones + vista previa en vivo que los demás prestadores.
 *
 * Datos que pide: empresa, rubro, descripción, persona de contacto, correo de
 * contacto, país, ciudad y redes sociales. Ninguno es obligatorio salvo el
 * nombre de la empresa. Al terminar, la empresa entra a su panel, donde publica
 * vacantes y descarga sus distintivos.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setFounderOptoutFlag } from '@/lib/founderPref';
import { isStrictEmail } from '@/lib/email';
import { useCountryLabel } from '@/lib/countryLabel';
import { FounderProgressCard } from '@/components/founder/FounderProgressCard';
import { founderKindFor } from '@/hooks/useFounder';
import { Camera, Eye, ChevronDown, MapPin, Building2 } from 'lucide-react';
import { Button, useToast, PasswordInput } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCatLabel } from '@/lib/catLabel';
import { RULES_VERSION } from '@/lib/legal';
import { COUNTRIES } from '@/data/countries';
import { COMPANY_SECTORS } from '@/data/companyCatalog';

const inputCls = 'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';
const sectionTitle = 'text-sm font-semibold uppercase tracking-wide text-muted';

export function CompanyRegister({ onSuccess, complete = false }: { onSuccess?: () => void; complete?: boolean }) {
  const { t } = useTranslation();
  const countryLabel = useCountryLabel();
  const catLabel = useCatLabel();
  const { signUp, completeProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [sector, setSector] = useState('');
  const [description, setDescription] = useState('');
  // Contacto y ubicación
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
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
  const [missing, setMissing] = useState<string[]>([]);

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setLogoUrl(URL.createObjectURL(f));
  };

  const submit = async () => {
    const miss: string[] = [];
    if (name.trim().length < 2) miss.push(t('company.miss.name'));
    if (contactEmail.trim() && !isStrictEmail(contactEmail)) miss.push(t('reg.miss.emailValid'));
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
    if (contactName.trim()) details.contact_name = contactName.trim();
    if (contactEmail.trim()) details.contact_email = contactEmail.trim();
    if (sector) details.rubro = sector;
    if (city.trim()) details.city = city.trim();

    const payload = {
      email, password, fullName: name.trim(),
      role: 'provider' as const, providerType: 'company' as const, isCompany: true, businessName: name.trim(),
      bio: description || null, website: website || null,
      instagram: instagram || null, tiktok: tiktok || null, facebook: facebook || null, linkedin: linkedin || null,
      country: country || null,
      specialties: sector ? [sector] : [], // indexable para el buscador
      providerDetails: details,
      rulesVersion: RULES_VERSION,
    };
    const res = complete ? await completeProfile(payload) : await signUp(payload);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    if (logoUrl) toast.success(t('k.logoLater'));
    try { localStorage.setItem('neuromundi.pendingWelcome', '1'); } catch { /* ignore */ }
    if (complete) { onSuccess?.(); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-xl bg-brand-50 p-4 text-center text-sm text-slate-700">
        {t('auth.checkEmail')}
        <p className="mt-2 text-muted">{t('company.afterInfo')}</p>
      </div>
    );
  }

  const founderKind = founderKindFor('provider', 'company');
  const preview = (
    <>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t('k.previewTitle')}</p>
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white">
            {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-7 w-7" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">{name || t('company.yourName')}</p>
            <p className="text-sm text-brand-700">{t('create.cards.company.title')}</p>
            {(city || country) && (
              <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {[city, country].filter(Boolean).join(', ')}</p>
            )}
          </div>
        </div>
        {sector && <p className="mt-3 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{catLabel(sector, COMPANY_SECTORS.find((s) => s.value === sector)?.label ?? sector)}</p>}
        {description && <p className="mt-3 line-clamp-3 text-sm text-slate-600">{description}</p>}
      </div>
      {founderKind ? <FounderProgressCard kind={founderKind} country={country || null} /> : null}
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-6" noValidate>
        {/* 1. Empresa */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('company.s1')}</h3>
          <div className="flex items-center gap-4">
            <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white/80 ring-2 ring-slate-100">
              {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" />}
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
            </label>
            <p className="text-xs text-muted">{t('k.logoHint')}</p>
          </div>
          <div><label className={labelCls}>{t('company.name')} *</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <label className={labelCls}>{t('company.sector')}</label>
            <select className={inputCls} value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">{t('company.selectSector')}</option>
              {COMPANY_SECTORS.map((s) => <option key={s.value} value={s.value}>{catLabel(s.value, s.label)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t('company.description')}</label>
            <textarea maxLength={400} rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
            <p className="mt-1 text-right text-xs text-muted">{description.length}/400</p>
          </div>
        </section>

        {/* 2. Contacto y ubicación */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('company.s2')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>{t('company.contactName')}</label><input className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
            <div><label className={labelCls}>{t('company.contactEmail')}</label><input type="email" className={inputCls} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>{t('k.website')}</label><input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t('reg.country')}</label>
              <select className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">{t('reg.selectCountry')}</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>{t('company.city')}</label><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} /></div>
          </div>
        </section>

        {/* 3. Redes sociales */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('reg.socialOptional')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>{t('reg.instagram')}</label><input className={inputCls} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" /></div>
            <div><label className={labelCls}>{t('reg.tiktok')}</label><input className={inputCls} value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@usuario" /></div>
            <div><label className={labelCls}>{t('reg.facebook')}</label><input className={inputCls} value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/…" /></div>
            <div><label className={labelCls}>LinkedIn</label><input className={inputCls} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/…" /></div>
          </div>
        </section>

        {/* 4. Cuenta */}
        {!complete && (
          <section className="space-y-4">
            <h3 className={sectionTitle}>{t('k.s6')}</h3>
            <div><label className={labelCls}>{t('auth.email')}</label><input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label className={labelCls}>{t('auth.confirmEmail')}</label><input type="email" inputMode="email" autoComplete="off" onPaste={(e) => e.preventDefault()} className={inputCls} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} /></div>
            <div><label className={labelCls}>{t('auth.password')}</label><PasswordInput className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div><label className={labelCls}>{t('auth.confirmPassword')}</label><PasswordInput className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
          </section>
        )}

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
          <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> {t('k.previewToggle')}</span>
          <ChevronDown className={`h-4 w-4 transition ${showPreview ? 'rotate-180' : ''}`} />
        </button>
        {showPreview && <div className="mt-3">{preview}</div>}
      </div>
    </div>
  );
}
