/**
 * EsparcimientoRegister — registro de un lugar de "Esparcimiento" (provider_type
 * = 'tourism', reetiquetado). Cines, restaurantes, museos, parques, hoteles… con
 * ubicación geográfica y datos de accesibilidad: horarios de bajo impacto
 * sensorial y adaptaciones cognitivas/otras.
 *
 * Guarda lo específico en provider_details (venue_type, sensory_hours,
 * cognitive_adaptations, other_adaptations, city, address) y el tipo de lugar
 * también en specialties[] para que sea indexable en el buscador.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setFounderOptoutFlag } from '@/lib/founderPref';
import { isStrictEmail } from '@/lib/email';
import { useCountryLabel } from '@/lib/countryLabel';
import { FounderProgressCard } from '@/components/founder/FounderProgressCard';
import { SectionsField } from '@/components/onboarding/SectionsField';
import { founderKindFor } from '@/hooks/useFounder';
import { Camera, Eye, ChevronDown, MapPin, Ticket } from 'lucide-react';
import { Button, useToast, PasswordInput } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCatLabel } from '@/lib/catLabel';
import { RULES_VERSION } from '@/lib/legal';
import { COUNTRIES } from '@/data/countries';
import { VENUE_TYPES } from '@/data/esparcimientoCatalog';

const inputCls = 'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';
const sectionTitle = 'text-sm font-semibold uppercase tracking-wide text-muted';

export function EsparcimientoRegister({ onSuccess, complete = false }: { onSuccess?: () => void; complete?: boolean }) {
  const { t } = useTranslation();
  const countryLabel = useCountryLabel();
  const catLabel = useCatLabel();
  const { signUp, completeProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [venueType, setVenueType] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<string[]>([]);
  const [neuroConditions, setNeuroConditions] = useState<string[]>([]);
  const toggleSection = (v: string) => setSections((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));
  const toggleCondition = (v: string) => setNeuroConditions((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));
  // Ubicación geográfica
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  // Accesibilidad
  const [sensoryHours, setSensoryHours] = useState('');
  const [cognitive, setCognitive] = useState('');
  const [otherAdapt, setOtherAdapt] = useState('');
  // Contacto
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
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
    if (name.trim().length < 2) miss.push(t('esp.miss.name'));
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
    if (venueType) details.venue_type = venueType;
    if (city.trim()) details.city = city.trim();
    if (address.trim()) details.address_text = address.trim();
    if (mapUrl.trim()) details.map_url = mapUrl.trim();
    if (sensoryHours.trim()) details.sensory_hours = sensoryHours.trim();
    if (cognitive.trim()) details.cognitive_adaptations = cognitive.trim();
    if (otherAdapt.trim()) details.other_adaptations = otherAdapt.trim();
    if (contactEmail.trim()) details.contact_email = contactEmail.trim();

    // Ubicación geográfica: si hay coordenadas válidas, se crea una sucursal con
    // lat/long para que el lugar aparezca con pin en el mapa del directorio.
    const latN = parseFloat(lat), lngN = parseFloat(lng);
    const hasCoords = !Number.isNaN(latN) && !Number.isNaN(lngN) && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180;
    const locations = hasCoords
      ? [{ label: name.trim() || null, address: address.trim() || city.trim() || name.trim(), country: country || null, latitude: latN, longitude: lngN }]
      : undefined;

    const payload = {
      email, password, fullName: name.trim(),
      role: 'provider' as const, providerType: 'tourism' as const, isCompany: true, businessName: name.trim(),
      bio: description || null, website: website || null, phone: phone || null,
      instagram: instagram || null, facebook: facebook || null,
      country: country || null, address: address || null,
      specialties: venueType ? [venueType] : [], // indexable para el buscador
      sections, neuroConditions,
      providerDetails: details,
      ...(locations ? { locations } : {}),
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
        <p className="mt-2 text-muted">{t('esp.afterInfo')}</p>
      </div>
    );
  }

  const founderKind = founderKindFor('provider', 'tourism');
  const preview = (
    <>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t('k.previewTitle')}</p>
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white">
            {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Ticket className="h-7 w-7" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">{name || t('esp.yourName')}</p>
            <p className="text-sm text-brand-700">{t('create.cards.tourism.title')}</p>
            {(city || country) && (
              <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {[city, country].filter(Boolean).join(', ')}</p>
            )}
          </div>
        </div>
        {venueType && <p className="mt-3 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{catLabel(venueType, VENUE_TYPES.find((v) => v.value === venueType)?.label ?? venueType)}</p>}
        {sensoryHours && <p className="mt-3 line-clamp-2 text-xs text-slate-600"><span className="font-semibold">{t('esp.sensoryHours')}:</span> {sensoryHours}</p>}
      </div>
      {founderKind ? <FounderProgressCard kind={founderKind} country={country || null} /> : null}
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-6" noValidate>
        {/* 1. El lugar */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('esp.s1')}</h3>
          <div className="flex items-center gap-4">
            <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white/80 ring-2 ring-slate-100">
              {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" />}
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
            </label>
            <p className="text-xs text-muted">{t('k.logoHint')}</p>
          </div>
          <div><label className={labelCls}>{t('esp.name')} *</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <label className={labelCls}>{t('esp.venueType')}</label>
            <select className={inputCls} value={venueType} onChange={(e) => setVenueType(e.target.value)}>
              <option value="">{t('esp.selectVenue')}</option>
              {VENUE_TYPES.map((v) => <option key={v.value} value={v.value}>{catLabel(v.value, v.label)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t('esp.description')}</label>
            <textarea maxLength={400} rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
            <p className="mt-1 text-right text-xs text-muted">{description.length}/400</p>
          </div>
        </section>

        {/* 2. Ubicación geográfica */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('esp.s2')}</h3>
          <SectionsField
            sections={sections}
            onToggleSection={toggleSection}
            neuroConditions={neuroConditions}
            onToggleCondition={toggleCondition}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t('reg.country')}</label>
              <select className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">{t('reg.selectCountry')}</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>{t('esp.city')}</label><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} /></div>
          </div>
          <div><label className={labelCls}>{t('esp.address')}</label><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div><label className={labelCls}>{t('esp.mapUrl')}</label><input className={inputCls} value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://maps.google.com/…" /><p className="mt-1 text-xs text-muted">{t('esp.mapUrlHelp')}</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>{t('esp.lat')}</label><input className={inputCls} inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="19.4326" /></div>
            <div><label className={labelCls}>{t('esp.lng')}</label><input className={inputCls} inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-99.1332" /></div>
          </div>
          <p className="text-xs text-muted">{t('esp.coordsHelp')}</p>
        </section>

        {/* 3. Accesibilidad sensorial y cognitiva */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('esp.s3')}</h3>
          <div><label className={labelCls}>{t('esp.sensoryHours')}</label><textarea rows={2} className={inputCls} value={sensoryHours} onChange={(e) => setSensoryHours(e.target.value)} placeholder={t('esp.sensoryHoursPlaceholder')} /></div>
          <div><label className={labelCls}>{t('esp.cognitive')}</label><textarea rows={2} className={inputCls} value={cognitive} onChange={(e) => setCognitive(e.target.value)} placeholder={t('esp.cognitivePlaceholder')} /></div>
          <div><label className={labelCls}>{t('esp.otherAdapt')}</label><textarea rows={2} className={inputCls} value={otherAdapt} onChange={(e) => setOtherAdapt(e.target.value)} /></div>
        </section>

        {/* 4. Contacto */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('esp.s4')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>{t('k.whatsapp')}</label><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+52 55…" /></div>
            <div><label className={labelCls}>{t('company.contactEmail')}</label><input type="email" className={inputCls} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
            <div><label className={labelCls}>{t('k.website')}</label><input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
            <div><label className={labelCls}>{t('reg.instagram')}</label><input className={inputCls} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" /></div>
            <div><label className={labelCls}>{t('reg.facebook')}</label><input className={inputCls} value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/…" /></div>
          </div>
        </section>

        {/* 5. Cuenta */}
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
