/**
 * DonationSection — embudo de donación de Neuromundi.
 *
 * Flujo, en orden:
 *  1. Elegir moneda (según el país del donante) y monto (preestablecido o libre).
 *  2. Tarjeta de recompensa que cambia sola según el nivel alcanzado.
 *  3. Si el nivel trae recompensa física, casilla para RENUNCIAR a ella.
 *  4. Si hay física y no se renuncia, formulario de envío (un miembro puede
 *     reusar su dirección registrada; un invitado la captura completa).
 *  5. Identidad del donante (persona o empresa), correo y consentimiento del muro.
 *  6. Explicación de a dónde va el dinero + CTA.
 *
 * Accesibilidad: todo control tiene <label> asociado, los grupos de opción usan
 * fieldset/legend y role adecuado, foco visible y textos claros. El público es
 * neurodivergente: se evita la sobrecarga mostrando cada bloque solo cuando toca.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, Sparkles, Gift, Truck, ShieldCheck, Building2, User } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useDonation } from '@/hooks/useDonation';
import { useDonationTiers } from '@/hooks/useDonationTiers';
import {
  currencyForCountry,
  currencyConfig,
  levelForAmount,
  hasPhysicalReward,
  LEVEL_REWARDS,
  formatDonation,
  type DonationLevel,
} from '@/lib/donation';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const LEVEL_STYLE: Record<DonationLevel, string> = {
  seed: 'from-sage-50 to-white border-sage-200',
  ally: 'from-brand-50 to-white border-brand-200',
  driver: 'from-warm-50 to-white border-warm-200',
  ambassador: 'from-brand-100 to-warm-50 border-brand-300',
};

export function DonationSection() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const profile = useAuthStore((s) => s.profile);
  const isMember = !!profile;
  const { donate, submitting } = useDonation();
  // Importes por moneda, editables por el admin (con los del código como respaldo).
  const { currencies } = useDonationTiers();

  // Moneda inicial: la del país del miembro, o USD para el invitado.
  const [currency, setCurrency] = useState(() => currencyForCountry(profile?.country));
  const cfg = currencyConfig(currency, currencies);

  const [amount, setAmount] = useState<number>(cfg.presets[1]); // arranca en el 2.º
  const [customMode, setCustomMode] = useState(false);
  const [custom, setCustom] = useState('');

  // Identidad.
  const [isCompany, setIsCompany] = useState(false);
  const [contactName, setContactName] = useState(profile?.full_name ?? '');
  const [orgName, setOrgName] = useState(profile?.business_name ?? '');
  const [email, setEmail] = useState(useAuthStore.getState().user?.email ?? '');
  // El invitado escribe su correo a mano → segundo campo para evitar typos. El
  // usuario con sesión trae su correo verificado de la cuenta (no se le pide).
  const authed = !!useAuthStore.getState().user;
  const [confirmEmail, setConfirmEmail] = useState('');

  // Muro.
  const [publishConsent, setPublishConsent] = useState(false);
  const [publishAs, setPublishAs] = useState('');

  // Física / envío.
  const [waivePhysical, setWaivePhysical] = useState(false);
  const [shipUseRegistered, setShipUseRegistered] = useState(isMember);
  const [shipRecipient, setShipRecipient] = useState(profile?.full_name ?? '');
  const [shipAddress, setShipAddress] = useState('');
  const [shipCity, setShipCity] = useState('');
  const [shipPostal, setShipPostal] = useState('');
  const [shipCountry, setShipCountry] = useState(profile?.country ?? '');

  const effectiveAmount = customMode ? Number(custom) : amount;
  const level = useMemo(() => levelForAmount(effectiveAmount, currency, currencies), [effectiveAmount, currency, currencies]);
  const physical = hasPhysicalReward(level);
  const needsShipping = physical && !waivePhysical;

  const onCurrency = (code: string) => {
    setCurrency(code);
    // Reajusta el monto al preestablecido equivalente para no quedar en un valor
    // de otra escala (10 USD → 10 en MXN sería casi nada).
    setCustomMode(false);
    setAmount(currencyConfig(code, currencies).presets[1]);
  };

  const validate = (): string | null => {
    if (!level) return t('donate.err.minAmount', { min: formatDonation(cfg.thresholds.seed, currency, i18n.language, currencies) });
    if (!contactName.trim()) return t('donate.err.name');
    if (isCompany && !orgName.trim()) return t('donate.err.org');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return t('donate.err.email');
    if (!authed && email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) return t('donate.err.emailMatch');
    if (needsShipping) {
      if (isMember && shipUseRegistered) {
        if (!shipRecipient.trim()) return t('donate.err.recipient');
      } else {
        if (!shipRecipient.trim()) return t('donate.err.recipient');
        if (!shipAddress.trim() || !shipCity.trim() || !shipPostal.trim() || !shipCountry.trim())
          return t('donate.err.address');
      }
    }
    return null;
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const useReg = needsShipping && isMember && shipUseRegistered;
    const r = await donate({
      amount: effectiveAmount,
      currency,
      isCompany,
      contactName: contactName.trim(),
      orgName: isCompany ? orgName.trim() : undefined,
      email: email.trim(),
      publishConsent,
      publishAs: publishConsent ? publishAs.trim() || undefined : undefined,
      waivePhysical: physical ? waivePhysical : false,
      shipUseRegistered: useReg,
      shipRecipient: needsShipping ? shipRecipient.trim() : undefined,
      shipAddress: needsShipping && !useReg ? shipAddress.trim() : undefined,
      shipCity: needsShipping && !useReg ? shipCity.trim() : undefined,
      shipPostal: needsShipping && !useReg ? shipPostal.trim() : undefined,
      shipCountry: needsShipping && !useReg ? shipCountry.trim() : undefined,
    });
    if (!r.ok) toast.error(t('donate.err.checkout'));
  };

  return (
    <section className="mx-auto max-w-2xl">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          <Heart className="h-4 w-4" aria-hidden="true" /> {t('donate.badge')}
        </span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{t('donate.title')}</h1>
        <p className="mt-2 text-muted">{t('donate.subtitle')}</p>
      </header>

      {/* 1. Moneda + monto */}
      <fieldset className="mt-8">
        <legend className="text-sm font-semibold text-slate-900">{t('donate.currency.label')}</legend>
        <div className="mt-2 flex gap-2" role="radiogroup" aria-label={t('donate.currency.label')}>
          {Object.keys(currencies).map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={currency === code}
              onClick={() => onCurrency(code)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium',
                currency === code ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50',
              )}
            >
              {code}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-slate-900">{t('donate.amount.label')}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cfg.presets.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={!customMode && amount === p}
              onClick={() => { setCustomMode(false); setAmount(p); }}
              className={cn(
                'rounded-xl border px-3 py-3 text-base font-semibold',
                !customMode && amount === p
                  ? 'border-brand-500 bg-brand-50 text-brand-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50',
              )}
            >
              {cfg.symbol}{p.toLocaleString(i18n.language)}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <label htmlFor="donate-custom" className="mb-1 block text-sm text-muted">
            {t('donate.amount.other')}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-500">{cfg.symbol}</span>
            <input
              id="donate-custom"
              type="number"
              min={cfg.thresholds.seed}
              step="1"
              inputMode="numeric"
              value={custom}
              onFocus={() => setCustomMode(true)}
              onChange={(e) => { setCustomMode(true); setCustom(e.target.value); }}
              placeholder={String(cfg.thresholds.driver)}
              className={inputCls}
            />
            <span className="text-sm text-muted">{currency}</span>
          </div>
        </div>
      </fieldset>

      {/* 2. Tarjeta de recompensa dinámica */}
      {level ? (
        <div className={cn('mt-6 rounded-2xl border bg-gradient-to-br p-5', LEVEL_STYLE[level])}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">{t(`donate.level.${level}.name`)}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-700">{t(`donate.level.${level}.tagline`)}</p>
          <ul className="mt-3 space-y-1.5">
            {LEVEL_REWARDS[level].map((rk) => (
              <li key={rk} className="flex items-start gap-2 text-sm text-slate-800">
                <Gift className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span>{t(rk)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-slate-50 p-3 text-center text-sm text-muted">
          {t('donate.belowMin', { min: formatDonation(cfg.thresholds.seed, currency, i18n.language, currencies) })}
        </p>
      )}

      {/* 3. Renuncia a recompensas físicas */}
      {physical && (
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 p-3">
          <input
            type="checkbox"
            checked={waivePhysical}
            onChange={(e) => setWaivePhysical(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">{t('donate.waive')}</span>
        </label>
      )}

      {/* 4. Envío condicional */}
      {needsShipping && (
        <fieldset className="mt-5 rounded-2xl border border-slate-200 p-4">
          <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-900">
            <Truck className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('donate.ship.title')}
          </legend>

          <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{t('donate.ship.costNote')}</p>

          {isMember && (
            <div className="mb-3 space-y-2" role="radiogroup" aria-label={t('donate.ship.title')}>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="ship" checked={shipUseRegistered} onChange={() => setShipUseRegistered(true)} className="h-4 w-4" />
                {t('donate.ship.useRegistered')}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="ship" checked={!shipUseRegistered} onChange={() => setShipUseRegistered(false)} className="h-4 w-4" />
                {t('donate.ship.useOther')}
              </label>
            </div>
          )}

          <label htmlFor="ship-recipient" className="mb-1 block text-sm text-muted">{t('donate.ship.recipient')}</label>
          <input id="ship-recipient" value={shipRecipient} onChange={(e) => setShipRecipient(e.target.value)} className={cn(inputCls, 'mb-3')} />

          {!(isMember && shipUseRegistered) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="ship-address" className="mb-1 block text-sm text-muted">{t('donate.ship.address')}</label>
                <input id="ship-address" value={shipAddress} onChange={(e) => setShipAddress(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="ship-city" className="mb-1 block text-sm text-muted">{t('donate.ship.city')}</label>
                <input id="ship-city" value={shipCity} onChange={(e) => setShipCity(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="ship-postal" className="mb-1 block text-sm text-muted">{t('donate.ship.postal')}</label>
                <input id="ship-postal" value={shipPostal} onChange={(e) => setShipPostal(e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ship-country" className="mb-1 block text-sm text-muted">{t('donate.ship.country')}</label>
                <input id="ship-country" value={shipCountry} onChange={(e) => setShipCountry(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}
          {isMember && shipUseRegistered && (
            <p className="text-xs text-muted">{t('donate.ship.registeredNote')}</p>
          )}
        </fieldset>
      )}

      {/* 5. Identidad + correo + muro */}
      <fieldset className="mt-5 rounded-2xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">{t('donate.who.title')}</legend>

        <div className="mb-3 flex gap-2" role="radiogroup" aria-label={t('donate.who.title')}>
          <button
            type="button" role="radio" aria-checked={!isCompany}
            onClick={() => setIsCompany(false)}
            className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium',
              !isCompany ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700')}
          >
            <User className="h-4 w-4" aria-hidden="true" /> {t('donate.who.person')}
          </button>
          <button
            type="button" role="radio" aria-checked={isCompany}
            onClick={() => setIsCompany(true)}
            className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium',
              isCompany ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700')}
          >
            <Building2 className="h-4 w-4" aria-hidden="true" /> {t('donate.who.company')}
          </button>
        </div>

        {isCompany && (
          <div className="mb-3">
            <label htmlFor="don-org" className="mb-1 block text-sm text-muted">{t('donate.who.orgName')}</label>
            <input id="don-org" value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputCls} />
          </div>
        )}

        <div className="mb-3">
          <label htmlFor="don-name" className="mb-1 block text-sm text-muted">
            {isCompany ? t('donate.who.contactName') : t('donate.who.personName')}
          </label>
          <input id="don-name" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} />
        </div>

        <div className="mb-3">
          <label htmlFor="don-email" className="mb-1 block text-sm text-muted">{t('donate.who.email')}</label>
          <input id="don-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>

        {!authed && (
          <div className="mb-3">
            <label htmlFor="don-email-confirm" className="mb-1 block text-sm text-muted">{t('donate.who.confirmEmail')}</label>
            <input id="don-email-confirm" type="email" inputMode="email" autoComplete="off" onPaste={(e) => e.preventDefault()} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className={inputCls} />
          </div>
        )}

        <label className="flex items-start gap-3">
          <input type="checkbox" checked={publishConsent} onChange={(e) => setPublishConsent(e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-slate-300" />
          <span className="text-sm text-slate-700">{t('donate.wall.consent')}</span>
        </label>
        {publishConsent && (
          <div className="mt-2">
            <label htmlFor="don-publishas" className="mb-1 block text-sm text-muted">{t('donate.wall.publishAs')}</label>
            <input
              id="don-publishas"
              value={publishAs}
              onChange={(e) => setPublishAs(e.target.value)}
              placeholder={isCompany ? orgName : contactName}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-muted">{t('donate.wall.publishAsHint')}</p>
          </div>
        )}
      </fieldset>

      {/* 6. Destino del dinero */}
      <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('donate.use.title')}
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          <li>• {t('donate.use.platform')}</li>
          <li>• {t('donate.use.outreach')}</li>
          <li>• {t('donate.use.scholarships')}</li>
          <li>• {t('donate.use.products')}</li>
        </ul>
      </div>

      {/* CTA */}
      <Button
        size="lg"
        fullWidth
        loading={submitting}
        onClick={onSubmit}
        leadingIcon={<Heart className="h-5 w-5" aria-hidden="true" />}
        className="mt-6"
      >
        {t('donate.cta')}
      </Button>
      <p className="mt-2 text-center text-xs text-muted">{t('donate.secureNote')}</p>
    </section>
  );
}
