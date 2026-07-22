/**
 * ClinicRegister — registro de CLÍNICA / centro terapéutico como formulario por
 * pasos (multi-step) para una UX fluida. Reutiliza columnas de proveedor y guarda
 * lo específico en provider_details. provider_type = 'clinic'.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setFounderOptoutFlag } from '@/lib/founderPref';
import { isStrictEmail } from '@/lib/email';
import { useCountryLabel } from '@/lib/countryLabel';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button, useToast, PasswordInput} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCatLabel } from '@/lib/catLabel';
import { RULES_VERSION } from '@/lib/legal';
import { COUNTRIES, MEXICO_NAME } from '@/data/countries';
import { MX_ESTADOS, MX_MUNICIPIOS } from '@/data/mxStatesMunicipalities';
import { AGE_RANGES } from '@/data/specialistCatalog';
import {
  CLINIC_MODALITIES, CLINIC_SPECIALTIES, CLINIC_SERVICES,
  CLINIC_CATEGORIES, IMAGING_SERVICES, LAB_SERVICES,
  TAC_EQUIPMENT, SAMPLE_COLLECTION, LAB_PROCESSING, DIAG_DEFAULT_INDICATIONS,
} from '@/data/clinicCatalog';

const inputCls = 'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelCls = 'mb-1 block font-semibold text-slate-900';

function useToggleList(initial: string[] = []) {
  const [list, setList] = useState<string[]>(initial);
  const toggle = (v: string) => setList((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  return [list, toggle] as const;
}

export function ClinicRegister() {
  const { t } = useTranslation();
  const countryLabel = useCountryLabel();
  const catLabel = useCatLabel();
  const { signUp } = useAuth();
  const toast = useToast();

  const STEPS = [t('clin.s1'), t('clin.s2'), t('clin.s3'), t('clin.s4'), t('clin.s5'), t('clin.s6')];
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // 1. General
  const [name, setName] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [description, setDescription] = useState('');
  const [modalities, toggleModality] = useToggleList();
  // Categorías de registro (clínica / gabinete de imagen / laboratorio de análisis)
  const [categories, setCategories] = useState<string[]>(['clinic']);
  // 2. Ubicación y contacto
  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [address, setAddress] = useState('');
  const [phoneFixed, setPhoneFixed] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [publicEmail, setPublicEmail] = useState('');
  const [website, setWebsite] = useState('');
  // 3. Especialidades y servicios
  const [specialties, toggleSpecialty] = useToggleList();
  const [clinicSpecialtyOther, setClinicSpecialtyOther] = useState('');
  const [ageRanges, toggleAge] = useToggleList();
  const [services, toggleService] = useToggleList();
  const [clinicServiceOther, setClinicServiceOther] = useState('');
  // 3b. Servicios diagnósticos (gabinete / laboratorio) + indicaciones automatizadas
  const [diagServices, setDiagServices] = useState<string[]>([]);
  const [indications, setIndications] = useState<Record<string, string>>({});
  const toggleDiag = (v: string) =>
    setDiagServices((prev) => {
      if (prev.includes(v)) return prev.filter((x) => x !== v);
      // Al activar un servicio, sembramos su indicación por defecto (si existe).
      if (DIAG_DEFAULT_INDICATIONS[v]) {
        setIndications((ind) => (v in ind ? ind : { ...ind, [v]: DIAG_DEFAULT_INDICATIONS[v] }));
      }
      return [...prev, v];
    });
  // Campos dinámicos — Tomografía (TAC)
  const [tacEquipment, setTacEquipment] = useState('');
  const [tacContrast, setTacContrast] = useState<'' | 'si' | 'no'>('');
  const [tacDelivery, setTacDelivery] = useState('');
  // Campos dinámicos — Análisis de sangre
  const [bloodSampling, setBloodSampling] = useState('');
  const [labCerts, setLabCerts] = useState('');
  const [labProcessing, setLabProcessing] = useState('');
  // Sección desplegable de laboratorio
  const [homeSampling, setHomeSampling] = useState<'' | 'si' | 'no'>('');
  const [urgentResults, setUrgentResults] = useState<'' | 'si' | 'no'>('');

  // Alterna una categoría. Al DESMARCAR "gabinete" o "laboratorio" limpiamos los
  // datos que dependían de ella para no persistir información huérfana.
  const toggleCategory = (v: string) => {
    setCategories((prev) => {
      const has = prev.includes(v);
      if (has) {
        const owned = v === 'gabinete' ? IMAGING_SERVICES.map((s) => s.value)
          : v === 'laboratorio' ? LAB_SERVICES.map((s) => s.value) : [];
        if (owned.length) {
          setDiagServices((ds) => ds.filter((x) => !owned.includes(x)));
          setIndications((ind) => {
            const next = { ...ind };
            owned.forEach((k) => delete next[k]);
            return next;
          });
        }
        if (v === 'gabinete') { setTacEquipment(''); setTacContrast(''); setTacDelivery(''); }
        if (v === 'laboratorio') {
          setBloodSampling(''); setLabCerts(''); setLabProcessing('');
          setHomeSampling(''); setUrgentResults('');
        }
        return prev.filter((x) => x !== v);
      }
      return [...prev, v];
    });
  };
  // 4. Validaciones
  const [directorCedulas, setDirectorCedulas] = useState('');
  const [rfc, setRfc] = useState('');
  const [sanitaryPermit, setSanitaryPermit] = useState('');
  // 5. Beneficio / QR
  const [benefitDesc, setBenefitDesc] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [benefitTerms, setBenefitTerms] = useState('');
  const [benefitValidator, setBenefitValidator] = useState('');
  // 6. Cuenta
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptRules, setAcceptRules] = useState(false);
  const [acceptManifesto, setAcceptManifesto] = useState(false);
  const [wantsFounder, setWantsFounder] = useState(true);

  const isMexico = country === MEXICO_NAME;
  const municipios = useMemo(() => (isMexico && stateName ? MX_MUNICIPIOS[stateName] ?? [] : []), [isMexico, stateName]);

  // Flags de categoría para la lógica condicional del formulario
  const isGabinete = categories.includes('gabinete');
  const isLab = categories.includes('laboratorio');
  const hasTac = isGabinete && diagServices.includes('tac');
  const hasSangre = isLab && diagServices.includes('sangre');

  const canNext = () => {
    if (step === 0) return name.trim().length >= 2 && categories.length > 0;
    if (step === 2) return !(specialties.includes('otro') && !clinicSpecialtyOther.trim()) && !(services.includes('otro') && !clinicServiceOther.trim());
    if (step === 5) return isStrictEmail(email) && email.trim().toLowerCase() === confirmEmail.trim().toLowerCase() && password.length >= 8 && password === confirmPassword && acceptTerms && acceptRules && acceptManifesto;
    return true;
  };

  const stepMissing = (): string[] => {
    const m: string[] = [];
    if (step === 0) {
      if (name.trim().length < 2) m.push(t('reg.miss.institution'));
      if (categories.length === 0) m.push(t('reg.miss.category'));
    }
    if (step === 5) {
      if (!email.trim()) m.push(t('reg.miss.email'));
    if (email.trim() && !isStrictEmail(email)) m.push(t('reg.miss.emailValid'));
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) m.push(t('reg.miss.emailMatch'));
      if (password.length < 8) m.push(t('reg.miss.password'));
    if (password !== confirmPassword) m.push(t('reg.miss.passwordMatch'));
      if (!acceptTerms) m.push(t('reg.miss.terms'));
      if (!acceptRules) m.push(t('reg.miss.rules'));
    if (!acceptManifesto) m.push(t('reg.miss.manifesto'));
    }
    return m;
  };

  const submit = async () => {
    if (!canNext()) return;
    setFounderOptoutFlag(!wantsFounder);
    setBusy(true);
    const details: Record<string, unknown> = { services, categories };
    if (clinicSpecialtyOther.trim()) details.specialty_other = clinicSpecialtyOther.trim();
    if (clinicServiceOther.trim()) details.service_other = clinicServiceOther.trim();
    // Servicios diagnósticos (gabinete / laboratorio) y sus campos dinámicos
    if (diagServices.length) {
      details.diagnostic_services = diagServices;
      // Indicaciones automatizadas al paciente, solo de servicios seleccionados
      const notes: Record<string, string> = {};
      diagServices.forEach((s) => { if (indications[s]?.trim()) notes[s] = indications[s].trim(); });
      if (Object.keys(notes).length) details.patient_indications = notes;
    }
    if (hasTac) {
      details.tac = {
        equipment: tacEquipment || null,
        contrast: tacContrast || null,
        delivery_time: tacDelivery.trim() || null,
      };
    }
    if (hasSangre) {
      details.blood_lab = {
        sampling: bloodSampling || null,
        certifications: labCerts.trim() || null,
        processing: labProcessing || null,
      };
    }
    if (isLab) {
      details.lab_options = {
        home_sampling: homeSampling || null,
        urgent_results: urgentResults || null,
      };
    }
    if (razonSocial.trim()) details.razon_social = razonSocial.trim();
    if (phoneFixed.trim()) details.phone_fixed = phoneFixed.trim();
    if (publicEmail.trim()) details.public_email = publicEmail.trim();
    if (directorCedulas.trim()) details.director_cedulas = directorCedulas.trim();
    if (sanitaryPermit.trim()) details.sanitary_permit = sanitaryPermit.trim();
    if (adminName.trim()) details.contact_name = adminName.trim();
    if (benefitDesc.trim()) details.benefit_desc = benefitDesc.trim();
    const discountPctNum = parseInt(discountPct, 10);
    if (!Number.isNaN(discountPctNum) && discountPctNum > 0) details.discount_pct = Math.min(100, discountPctNum);
    if (benefitTerms.trim()) details.benefit_terms = benefitTerms.trim();
    if (benefitValidator.trim()) details.benefit_validator = benefitValidator.trim();

    const res = await signUp({
      email, password, fullName: name.trim(),
      role: 'provider', providerType: 'clinic', isCompany: true, businessName: name.trim(),
      bio: description || null, website: website || null, whatsapp: whatsapp || null, rfc: isMexico ? (rfc || null) : null,
      country: country || null, state: isMexico ? stateName : null, municipality: isMexico ? municipality : null,
      address: address || null,
      specialties, ageRanges, modalities, providerDetails: details,
      rulesVersion: RULES_VERSION,
    });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    try { localStorage.setItem('neuromundi.pendingWelcome', '1'); } catch { /* ignore */ }
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-xl bg-brand-50 p-4 text-center text-sm text-slate-700">
        {t('auth.checkEmail')}
        <p className="mt-2 text-muted">{t('clin.afterInfo')}</p>
      </div>
    );
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700'}`;

  return (
    <div className="space-y-6">
      {/* Progreso */}
      <ol className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col items-center gap-1">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i < step ? 'bg-evs-5 text-white' : i === step ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className="hidden text-center text-[11px] text-muted sm:block">{label}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-900">{STEPS[step]}</h3>

        {step === 0 && (
          <div className="space-y-4">
            <div><label className={labelCls}>{t('clin.name')} *</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className={labelCls}>{t('clin.razonSocial')}</label><input className={inputCls} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} /></div>
            <div>
              <label className={labelCls}>{t('clin.description')}</label>
              <textarea maxLength={300} rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
              <p className="mt-1 text-right text-xs text-muted">{description.length}/300</p>
            </div>
            <div>
              <label className={labelCls}>{t('clin.modalities')}</label>
              <div className="flex flex-wrap gap-2">
                {CLINIC_MODALITIES.map((m) => <button type="button" key={m.value} onClick={() => toggleModality(m.value)} className={chip(modalities.includes(m.value))}>{catLabel(m.value, m.label)}</button>)}
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('clin.categories')}</label>
              <p className="mb-2 text-xs text-muted">{t('clin.categoriesHint')}</p>
              <div className="flex flex-wrap gap-2">
                {CLINIC_CATEGORIES.map((c) => <button type="button" key={c.value} onClick={() => toggleCategory(c.value)} className={chip(categories.includes(c.value))}>{catLabel(c.value, c.label)}</button>)}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
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
            <div><label className={labelCls}>{t('clin.address')}</label><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={labelCls}>{t('clin.phone')}</label><input className={inputCls} value={phoneFixed} onChange={(e) => setPhoneFixed(e.target.value)} /></div>
              <div><label className={labelCls}>{t('clin.whatsapp')}</label><input className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
              <div><label className={labelCls}>{t('clin.publicEmail')}</label><input type="email" className={inputCls} value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} /></div>
              <div><label className={labelCls}>{t('clin.website')}</label><input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{t('clin.specialties')}</label>
              <div className="flex flex-wrap gap-2">{CLINIC_SPECIALTIES.map((s) => <button type="button" key={s.value} onClick={() => toggleSpecialty(s.value)} className={chip(specialties.includes(s.value))}>{catLabel(s.value, s.label)}</button>)}</div>
              {specialties.includes('otro') && <input className={`${inputCls} mt-2`} placeholder={t('reg.otherPlaceholder')} value={clinicSpecialtyOther} onChange={(e) => setClinicSpecialtyOther(e.target.value)} />}
            </div>
            <div>
              <label className={labelCls}>{t('clin.population')}</label>
              <div className="flex flex-wrap gap-2">{AGE_RANGES.map((a) => <button type="button" key={a.value} onClick={() => toggleAge(a.value)} className={chip(ageRanges.includes(a.value))}>{catLabel(a.value, a.label)}</button>)}</div>
            </div>
            <div>
              <label className={labelCls}>{t('clin.services')}</label>
              <div className="flex flex-wrap gap-2">{CLINIC_SERVICES.map((s) => <button type="button" key={s.value} onClick={() => toggleService(s.value)} className={chip(services.includes(s.value))}>{catLabel(s.value, s.label)}</button>)}</div>
              {services.includes('otro') && <input className={`${inputCls} mt-2`} placeholder={t('reg.otherPlaceholder')} value={clinicServiceOther} onChange={(e) => setClinicServiceOther(e.target.value)} />}
            </div>

            {isGabinete && (
              <div>
                <label className={labelCls}>{t('clin.imagingServices')}</label>
                <div className="flex flex-wrap gap-2">{IMAGING_SERVICES.map((s) => <button type="button" key={s.value} onClick={() => toggleDiag(s.value)} className={chip(diagServices.includes(s.value))}>{catLabel(s.value, s.label)}</button>)}</div>
              </div>
            )}

            {isLab && (
              <div>
                <label className={labelCls}>{t('clin.labServices')}</label>
                <div className="flex flex-wrap gap-2">{LAB_SERVICES.map((s) => <button type="button" key={s.value} onClick={() => toggleDiag(s.value)} className={chip(diagServices.includes(s.value))}>{catLabel(s.value, s.label)}</button>)}</div>
              </div>
            )}

            {hasTac && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{t('clin.tacTitle')}</p>
                <div>
                  <label className={labelCls}>{t('clin.tacEquipment')}</label>
                  <select className={inputCls} value={tacEquipment} onChange={(e) => setTacEquipment(e.target.value)}>
                    <option value="">{t('clin.select')}</option>
                    {TAC_EQUIPMENT.map((o) => <option key={o.value} value={o.value}>{catLabel(o.value, o.label)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t('clin.tacContrast')}</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setTacContrast('si')} className={chip(tacContrast === 'si')}>{t('clin.yes')}</button>
                    <button type="button" onClick={() => setTacContrast('no')} className={chip(tacContrast === 'no')}>{t('clin.no')}</button>
                  </div>
                </div>
                <div><label className={labelCls}>{t('clin.deliveryTime')}</label><input className={inputCls} placeholder={t('clin.deliveryPlaceholder')} value={tacDelivery} onChange={(e) => setTacDelivery(e.target.value)} /></div>
              </div>
            )}

            {hasSangre && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{t('clin.bloodTitle')}</p>
                <div>
                  <label className={labelCls}>{t('clin.sampling')}</label>
                  <select className={inputCls} value={bloodSampling} onChange={(e) => setBloodSampling(e.target.value)}>
                    <option value="">{t('clin.select')}</option>
                    {SAMPLE_COLLECTION.map((o) => <option key={o.value} value={o.value}>{catLabel(o.value, o.label)}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>{t('clin.labCerts')}</label><input className={inputCls} placeholder={t('clin.labCertsPlaceholder')} value={labCerts} onChange={(e) => setLabCerts(e.target.value)} /></div>
                <div>
                  <label className={labelCls}>{t('clin.labProcessing')}</label>
                  <select className={inputCls} value={labProcessing} onChange={(e) => setLabProcessing(e.target.value)}>
                    <option value="">{t('clin.select')}</option>
                    {LAB_PROCESSING.map((o) => <option key={o.value} value={o.value}>{catLabel(o.value, o.label)}</option>)}
                  </select>
                </div>
              </div>
            )}

            {isLab && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{t('clin.labExtraTitle')}</p>
                <div>
                  <label className={labelCls}>{t('clin.homeSampling')}</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setHomeSampling('si')} className={chip(homeSampling === 'si')}>{t('clin.yes')}</button>
                    <button type="button" onClick={() => setHomeSampling('no')} className={chip(homeSampling === 'no')}>{t('clin.no')}</button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{t('clin.urgentResults')}</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setUrgentResults('si')} className={chip(urgentResults === 'si')}>{t('clin.yes')}</button>
                    <button type="button" onClick={() => setUrgentResults('no')} className={chip(urgentResults === 'no')}>{t('clin.no')}</button>
                  </div>
                </div>
              </div>
            )}

            {diagServices.length > 0 && (
              <div>
                <label className={labelCls}>{t('clin.indicationsTitle')}</label>
                <p className="mb-2 text-xs text-muted">{t('clin.indicationsHint')}</p>
                <div className="space-y-3">
                  {diagServices.map((s) => {
                    const item = [...IMAGING_SERVICES, ...LAB_SERVICES].find((x) => x.value === s);
                    return (
                      <div key={s}>
                        <label className="mb-1 block text-sm font-medium text-slate-700">{catLabel(s, item?.label ?? s)}</label>
                        <textarea rows={2} className={inputCls} value={indications[s] ?? ''} onChange={(e) => setIndications((ind) => ({ ...ind, [s]: e.target.value }))} placeholder={t('clin.indicationsPlaceholder')} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div><label className={labelCls}>{t('clin.directorCedulas')}</label><input className={inputCls} placeholder={t('clin.directorPlaceholder')} value={directorCedulas} onChange={(e) => setDirectorCedulas(e.target.value)} /></div>
            {isMexico && <div><label className={labelCls}>RFC</label><input className={inputCls} value={rfc} onChange={(e) => setRfc(e.target.value)} /></div>}
            <div><label className={labelCls}>{t('clin.permit')}</label><input className={inputCls} placeholder={t('clin.permitPlaceholder')} value={sanitaryPermit} onChange={(e) => setSanitaryPermit(e.target.value)} /></div>
            <p className="text-xs text-muted">{t('clin.docNote')}</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div><label className={labelCls}>{t('clin.benefit')}</label><input className={inputCls} placeholder={t('clin.benefitPlaceholder')} value={benefitDesc} onChange={(e) => setBenefitDesc(e.target.value)} /></div>
            <div><label className={labelCls}>{t('reg.discountPct')}</label><input type="number" min="0" max="100" className={inputCls} placeholder="0" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /><p className="mt-1 text-xs text-muted">{t('reg.discountPctHelp')}</p></div>
            <div><label className={labelCls}>{t('clin.benefitTerms')}</label><input className={inputCls} placeholder={t('clin.benefitTermsPlaceholder')} value={benefitTerms} onChange={(e) => setBenefitTerms(e.target.value)} /></div>
            <div><label className={labelCls}>{t('clin.validator')}</label><input className={inputCls} placeholder={t('clin.validatorPlaceholder')} value={benefitValidator} onChange={(e) => setBenefitValidator(e.target.value)} /></div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div><label className={labelCls}>{t('clin.adminName')}</label><input className={inputCls} value={adminName} onChange={(e) => setAdminName(e.target.value)} /></div>
            <div><label className={labelCls}>{t('auth.email')}</label><input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className={labelCls}>{t('auth.confirmEmail')}</label><input type="email" inputMode="email" autoComplete="off" onPaste={(e) => e.preventDefault()} className={inputCls} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} /></div>
            <div><label className={labelCls}>{t('auth.password')}</label><PasswordInput className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div><label className={labelCls}>{t('auth.confirmPassword')}</label><PasswordInput className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
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
          </div>
        )}
      </div>

      {stepMissing().length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-evs-1">
          <p className="font-semibold">{t('reg.missTitle')}</p>
          <ul className="mt-1 list-disc pl-5">
            {stepMissing().map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}
      <div className="flex items-center justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)} leadingIcon={<ArrowLeft className="h-4 w-4" />}>{t('clin.back')}</Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => canNext() && setStep((s) => s + 1)}>
            {t('clin.next')} <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button loading={busy} onClick={submit}>{t('auth.createAccount')}</Button>
        )}      </div>
    </div>
  );
}

