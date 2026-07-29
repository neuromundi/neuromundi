/**
 * ProviderRegister — registro del PROVEEDOR comercial con productos indexables
 * y VISTA PREVIA EN VIVO (misma estructura que el especialista: formulario a la
 * izquierda, vista previa a la derecha en escritorio; plegable en móvil).
 *
 * Los productos que ofrece se indexan (products_offered) para el buscador.
 * El logotipo se previsualiza; su subida se completa al iniciar sesión.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setFounderOptoutFlag } from '@/lib/founderPref';
import { isStrictEmail } from '@/lib/email';
import { useCountryLabel } from '@/lib/countryLabel';
import { FounderProgressCard } from '@/components/founder/FounderProgressCard';
import { founderKindFor } from '@/hooks/useFounder';
import { Camera, Eye, ChevronDown, MapPin, Store, BadgeCheck, Plus, X } from 'lucide-react';
import { Button, useToast, PasswordInput} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCatLabel } from '@/lib/catLabel';
import { RULES_VERSION } from '@/lib/legal';
import { COUNTRIES, MEXICO_NAME } from '@/data/countries';
import { MX_ESTADOS, MX_MUNICIPIOS } from '@/data/mxStatesMunicipalities';
import {
  PRODUCT_CATEGORIES, SALES_CHANNELS, SHIPPING_COVERAGE, PRICE_RANGES, REDEMPTION_METHODS,
} from '@/data/providerCatalog';

const inputCls = 'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';
const sectionTitle = 'text-sm font-semibold uppercase tracking-wide text-muted';

function useToggleList(initial: string[] = []) {
  const [list, setList] = useState<string[]>(initial);
  const toggle = (v: string) => setList((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  return [list, toggle] as const;
}

export function ProviderRegister({ onSuccess, complete = false }: { onSuccess?: () => void; complete?: boolean }) {
  const { t } = useTranslation();
  const countryLabel = useCountryLabel();
  const catLabel = useCatLabel();
  // `complete`: usuario ya autenticado (login social) → ACTUALIZA su perfil.
  const { signUp, completeProfile } = useAuth();
  const toast = useToast();

  // Marca
  const [brand, setBrand] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [channels, toggleChannel] = useToggleList();
  // Productos
  const [categories, toggleCategory] = useToggleList();
  const [categoryOther, setCategoryOther] = useState('');
  const [products, setProducts] = useState<string[]>([]);
  const [productInput, setProductInput] = useState('');
  const [priceRange, setPriceRange] = useState('');
  // Logística
  const [ecommerce, setEcommerce] = useState('');
  const [shipping, toggleShipping] = useToggleList();
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [address, setAddress] = useState('');
  // Confianza
  const [rfc, setRfc] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');
  const [warranty, setWarranty] = useState('');
  // Beneficio
  const [benefitDesc, setBenefitDesc] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [redemption, setRedemption] = useState('');
  const [benefitTerms, setBenefitTerms] = useState('');
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

  const onlineOnly = channels.length > 0 && channels.every((c) => c === 'online' || c === 'whatsapp');
  const isMexico = country === MEXICO_NAME;
  const municipios = useMemo(() => (isMexico && stateName ? MX_MUNICIPIOS[stateName] ?? [] : []), [isMexico, stateName]);

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setLogoUrl(URL.createObjectURL(f));
  };
  const addProduct = () => {
    const v = productInput.trim();
    if (v && !products.includes(v)) setProducts((p) => [...p, v]);
    setProductInput('');
  };


  const [missing, setMissing] = useState<string[]>([]);

  const submit = async () => {
    const miss: string[] = [];
    if (brand.trim().length < 2) miss.push(t('reg.miss.brand'));
    if (categories.length === 0) miss.push(t('reg.miss.category'));
    if (categories.includes('otro') && !categoryOther.trim()) miss.push(t('reg.miss.otherSpecify'));
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
    if (categoryOther.trim()) details.category_other = categoryOther.trim();
    if (returnPolicy.trim()) details.return_policy = returnPolicy.trim();
    if (warranty.trim()) details.warranty = warranty.trim();
    if (benefitDesc.trim()) details.benefit_desc = benefitDesc.trim();
    const discountPctNum = parseInt(discountPct, 10);
    if (!Number.isNaN(discountPctNum) && discountPctNum > 0) details.discount_pct = Math.min(100, discountPctNum);
    if (redemption) details.redemption_method = redemption;
    if (benefitTerms.trim()) details.benefit_terms = benefitTerms.trim();

    const payload = {
      email, password, fullName: brand.trim(),
      role: 'provider' as const, providerType: 'merchant' as const, isCompany: true, businessName: brand.trim(),
      bio: description || null, website: ecommerce || null, whatsapp: whatsapp || null, rfc: isMexico ? (rfc || null) : null,
      instagram: instagram || null, tiktok: tiktok || null, facebook: facebook || null, linkedin: linkedin || null,
      country: country || null, state: isMexico ? stateName : null, municipality: isMexico ? municipality : null,
      address: onlineOnly ? null : (address || null),
      productCategories: categories, productsOffered: products, salesChannels: channels,
      shippingCoverage: shipping, priceRange: priceRange || null, providerDetails: details,
      rulesVersion: RULES_VERSION,
    };
    const res = complete ? await completeProfile(payload) : await signUp(payload);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    if (logoUrl) toast.success(t('prov.logoLater'));
    try { localStorage.setItem('neuromundi.pendingWelcome', '1'); } catch { /* ignore */ }
    if (complete) { onSuccess?.(); return; }
    setDone(true);
    onSuccess?.();
  };

  if (done) {
    return (
      <div className="rounded-xl bg-brand-50 p-4 text-center text-sm text-slate-700">
        {t('auth.checkEmail')}
        <p className="mt-2 text-muted">{t('prov.afterInfo')}</p>
      </div>
    );
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700'}`;

  const founderKind = founderKindFor('provider', 'merchant');
  const preview = (
    <>
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t('prov.previewTitle')}</p>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-fuchsia-50 text-fuchsia-300">
          {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Store className="h-7 w-7" />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{brand || t('prov.yourBrand')}</p>
          {priceRange && <p className="text-sm text-fuchsia-700">{priceRange}</p>}
          {(municipality || stateName) && (
            <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {[municipality, stateName].filter(Boolean).join(', ')}</p>
          )}
        </div>
      </div>
      {description && <p className="mt-3 line-clamp-3 text-sm text-slate-600">{description}</p>}
      {categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <span key={c} className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-xs text-fuchsia-700">
              {catLabel(c, PRODUCT_CATEGORIES.find((x) => x.value === c)?.label ?? c)}
            </span>
          ))}
        </div>
      )}
      {products.length > 0 && <p className="mt-2 text-xs text-muted">{products.slice(0, 6).join(' · ')}</p>}
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
        {/* 1. Marca */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('prov.s1')}</h3>
          <div className="flex items-center gap-4">
            <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-fuchsia-50 text-fuchsia-400 ring-2 ring-fuchsia-100">
              {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" />}
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
            </label>
            <p className="text-xs text-muted">{t('prov.logoHint')}</p>
          </div>
          <div><label className={labelCls}>{t('prov.brand')}</label><input className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
          <div>
            <label className={labelCls}>{t('prov.description')}</label>
            <textarea maxLength={300} rows={3} className={inputCls} placeholder={t('prov.descPlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} />
            <p className="mt-1 text-right text-xs text-muted">{description.length}/300</p>
          </div>
          <div>
            <label className={labelCls}>{t('prov.channels')}</label>
            <div className="flex flex-wrap gap-2">
              {SALES_CHANNELS.map((c) => (
                <button type="button" key={c.value} onClick={() => toggleChannel(c.value)} className={chip(channels.includes(c.value))}>{catLabel(c.value, c.label)}</button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Productos */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('prov.s2')}</h3>
          <div>
            <label className={labelCls}>{t('prov.categories')} *</label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_CATEGORIES.map((c) => (
                <button type="button" key={c.value} onClick={() => toggleCategory(c.value)} className={chip(categories.includes(c.value))}>{catLabel(c.value, c.label)}</button>
              ))}
            </div>
            {categories.includes('otro') && (
              <input className={`${inputCls} mt-2`} placeholder={t('reg.otherPlaceholder')} value={categoryOther} onChange={(e) => setCategoryOther(e.target.value)} />
            )}
          </div>
          <div>
            <label className={labelCls}>{t('prov.products')}</label>
            <p className="mb-2 text-xs text-muted">{t('prov.productsHelp')}</p>
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder={t('prov.productPlaceholder')}
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProduct(); } }}
              />
              <Button type="button" variant="secondary" onClick={addProduct} leadingIcon={<Plus className="h-4 w-4" />}>{t('prov.add')}</Button>
            </div>
            {products.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {products.map((p) => (
                  <span key={p} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                    {p}
                    <button type="button" onClick={() => setProducts((prev) => prev.filter((x) => x !== p))} aria-label={t('common.close')}><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>{t('prov.priceRange')}</label>
            <div className="flex gap-2">
              {PRICE_RANGES.map((p) => (
                <button type="button" key={p} onClick={() => setPriceRange(priceRange === p ? '' : p)} className={chip(priceRange === p)}>{p}</button>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Logística */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('prov.s3')}</h3>
          <div><label className={labelCls}>{t('prov.ecommerce')}</label><input type="url" className={inputCls} placeholder="https://" value={ecommerce} onChange={(e) => setEcommerce(e.target.value)} /></div>
          <div>
            <label className={labelCls}>{t('prov.shipping')}</label>
            <div className="flex flex-wrap gap-2">
              {SHIPPING_COVERAGE.map((s) => (
                <button type="button" key={s.value} onClick={() => toggleShipping(s.value)} className={chip(shipping.includes(s.value))}>{catLabel(s.value, s.label)}</button>
              ))}
            </div>
          </div>
          <div><label className={labelCls}>{t('prov.whatsapp')}</label><input className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+52 55…" /></div>
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
            <div><label className={labelCls}>{t('prov.storeAddress')}</label><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          )}
        </section>

        {/* 4. Confianza */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('prov.s4')}</h3>
          {isMexico && <div><label className={labelCls}>{t('prov.rfc')}</label><input className={inputCls} value={rfc} onChange={(e) => setRfc(e.target.value)} /></div>}
          <div><label className={labelCls}>{t('prov.returnPolicy')}</label><input className={inputCls} placeholder={t('prov.returnPlaceholder')} value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} /></div>
          <div><label className={labelCls}>{t('prov.warranty')}</label><input className={inputCls} placeholder={t('prov.warrantyPlaceholder')} value={warranty} onChange={(e) => setWarranty(e.target.value)} /></div>
        </section>

        {/* 5. Beneficio / QR */}
        <section className="space-y-4">
          <h3 className={sectionTitle}>{t('prov.s5')}</h3>
          <div><label className={labelCls}>{t('prov.benefit')}</label><input className={inputCls} placeholder={t('prov.benefitPlaceholder')} value={benefitDesc} onChange={(e) => setBenefitDesc(e.target.value)} /></div>
          <div><label className={labelCls}>{t('reg.discountPct')}</label><input type="number" min="0" max="100" className={inputCls} placeholder="0" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /><p className="mt-1 text-xs text-muted">{t('reg.discountPctHelp')}</p></div>
          <div>
            <label className={labelCls}>{t('prov.redemption')}</label>
            <div className="space-y-2">
              {REDEMPTION_METHODS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="redemption" value={r.value} checked={redemption === r.value} onChange={(e) => setRedemption(e.target.value)} className="h-4 w-4 text-brand-500" />
                  {catLabel(r.value, r.label)}
                </label>
              ))}
            </div>
          </div>
          <div><label className={labelCls}>{t('prov.benefitTerms')}</label><input className={inputCls} placeholder={t('prov.benefitTermsPlaceholder')} value={benefitTerms} onChange={(e) => setBenefitTerms(e.target.value)} /></div>
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
          <h3 className={sectionTitle}>{t('prov.s6')}</h3>
          <div><label className={labelCls}>{t('prov.contactName')}</label><input className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
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
          <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> {t('prov.previewToggle')}</span>
          <ChevronDown className={`h-4 w-4 transition ${showPreview ? 'rotate-180' : ''}`} />
        </button>
        {showPreview && <div className="mt-3">{preview}</div>}
      </div>
    </div>
  );
}
