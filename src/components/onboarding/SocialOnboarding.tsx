/**
 * SocialOnboarding — paso OBLIGATORIO para quien entra por login social. Como los
 * proveedores sociales no indican el tipo de usuario, aquí se elige y se completan
 * los datos propios de cada tipo. Bloquea la app por completo hasta terminarse.
 *
 * Adaptaciones por tipo:
 *   • Paciente / Padre de familia → leyenda "registro sin costo".
 *   • Prestador / Comercio / Escuela → nota de revisión + (escuela) grados que atiende.
 *   • Si el país es México → selector de Estado y Municipio (cascada).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCountryLabel } from '@/lib/countryLabel';
import { createPortal } from 'react-dom';
import { Gift } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { RULES_VERSION } from '@/lib/legal';
import { COUNTRIES, MEXICO_NAME } from '@/data/countries';
import { MX_ESTADOS, MX_MUNICIPIOS } from '@/data/mxStatesMunicipalities';
import { SCHOOL_GRADES } from '@/data/satCatalogs';

type Role = 'patient' | 'parent' | 'provider';
type PType = 'service_provider' | 'merchant' | 'school';

const TYPES: { role: Role; ptype?: PType; key: string }[] = [
  { role: 'parent', key: 'reg.typeParent' },
  { role: 'patient', key: 'reg.typePatient' },
  { role: 'provider', ptype: 'service_provider', key: 'reg.typeService' },
  { role: 'provider', ptype: 'merchant', key: 'reg.typeMerchant' },
  { role: 'provider', ptype: 'school', key: 'reg.typeSchool' },
];

const input = 'w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function SocialOnboarding() {
  const { t } = useTranslation();
  const countryLabel = useCountryLabel();
  const toast = useToast();
  const { fullName, completeOnboarding, signOut } = useAuth();

  const [sel, setSel] = useState(0);
  const [name, setName] = useState(fullName ?? '');
  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [grades, setGrades] = useState<string[]>([]);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptRules, setAcceptRules] = useState(false);
  const [busy, setBusy] = useState(false);

  const choice = TYPES[sel];
  const isConsumer = choice.role === 'patient' || choice.role === 'parent';
  const isProvider = choice.role === 'provider';
  const isSchool = choice.ptype === 'school';
  const isMexico = country === MEXICO_NAME;

  const municipios = useMemo(
    () => (isMexico && stateName ? MX_MUNICIPIOS[stateName] ?? [] : []),
    [isMexico, stateName],
  );

  const geoOk = !isMexico || (stateName && municipality);
  const gradesOk = !isSchool || grades.length > 0;
  const canSubmit =
    name.trim().length >= 2 && country && geoOk && gradesOk && acceptTerms && acceptRules;

  const toggleGrade = (g: string) =>
    setGrades((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    // Celebrar el registro con la lluvia de estrellas una vez que entre a la app.
    try { localStorage.setItem('neuromundi.pendingWelcome', '1'); } catch { /* ignore */ }
    const r = await completeOnboarding({
      role: choice.role,
      providerType: choice.ptype ?? null,
      fullName: name.trim(),
      country,
      state: isMexico ? stateName : '',
      municipality: isMexico ? municipality : '',
      schoolGrades: isSchool ? grades : [],
      rulesVersion: RULES_VERSION,
    });
    setBusy(false);
    if (!r.ok) {
      try { localStorage.removeItem('neuromundi.pendingWelcome'); } catch { /* ignore */ }
      toast.error(r.error);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 p-4">
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{t('onb.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('onb.intro')}</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block font-semibold text-slate-900">{t('onb.type')}</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TYPES.map((tp, i) => (
                <button
                  key={tp.key}
                  type="button"
                  onClick={() => { setSel(i); setGrades([]); }}
                  aria-pressed={sel === i}
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${sel === i ? 'border-brand-500 bg-brand-50 font-semibold text-brand-800' : 'border-slate-200 text-slate-700'}`}
                >
                  {t(tp.key)}
                </button>
              ))}
            </div>
          </div>

          {/* Aviso de gratuidad (idéntico al del registro normal) */}
          {isConsumer && (
            <div className="flex gap-3 rounded-xl border border-evs-5/30 bg-evs-5/10 p-4">
              <Gift className="mt-0.5 h-5 w-5 shrink-0 text-evs-5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-slate-900">{t('reg.freeTitle')}</p>
                <p className="text-sm text-slate-700">{t('reg.freeNotice')}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="onb-name" className="mb-1 block font-semibold text-slate-900">{t('onb.name')}</label>
            <input id="onb-name" className={input} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label htmlFor="onb-country" className="mb-1 block font-semibold text-slate-900">{t('reg.country')}</label>
            <select
              id="onb-country"
              className={input}
              value={country}
              onChange={(e) => { setCountry(e.target.value); setStateName(''); setMunicipality(''); }}
            >
              <option value="">{t('reg.selectCountry')}</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>
              ))}
            </select>
          </div>

          {/* Cascada México: Estado → Municipio */}
          {isMexico && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="onb-state" className="mb-1 block font-semibold text-slate-900">{t('reg.state')}</label>
                <select
                  id="onb-state"
                  className={input}
                  value={stateName}
                  onChange={(e) => { setStateName(e.target.value); setMunicipality(''); }}
                >
                  <option value="">{t('reg.selectState')}</option>
                  {MX_ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="onb-mun" className="mb-1 block font-semibold text-slate-900">{t('reg.municipality')}</label>
                <select
                  id="onb-mun"
                  className={input}
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  disabled={!stateName}
                >
                  <option value="">{t('reg.selectMunicipality')}</option>
                  {municipios.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Grados que atiende (solo escuelas) */}
          {isSchool && (
            <div>
              <label className="mb-1 block font-semibold text-slate-900">{t('reg.schoolGrades')}</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-3">
                {SCHOOL_GRADES.map((g) => (
                  <label key={g} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-500"
                      checked={grades.includes(g)}
                      onChange={() => toggleGrade(g)}
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Nota para prestadores/comercios/escuelas */}
          {isProvider && (
            <p className="rounded-lg bg-brand-50 p-2 text-xs text-brand-800">{t('onb.providerNote')}</p>
          )}

          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-500" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
            <span>{t('onb.acceptTerms')}</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-500" checked={acceptRules} onChange={(e) => setAcceptRules(e.target.checked)} />
            <span>{t('onb.acceptRules')}</span>
          </label>

          <div className="flex flex-col gap-2">
            <Button onClick={submit} loading={busy} disabled={!canSubmit} fullWidth>{t('onb.finish')}</Button>
            <button type="button" onClick={() => void signOut()} className="text-xs text-muted hover:underline">
              {t('onb.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
