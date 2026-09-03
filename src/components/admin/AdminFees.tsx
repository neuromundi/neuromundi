/**
 * AdminFees — cuotas de afiliación por tipo de usuario, país y clase de miembro.
 *
 * Estructura del negocio:
 *  · Dos periodicidades que el usuario elige al pagar: MENSUAL o ANUAL.
 *  · El ANUAL equivale a 10 meses (contrata 12, paga 10). El importe de 12 meses
 *    se guarda como precio de REFERENCIA para mostrarlo tachado.
 *  · Dos clases de miembro con precios distintos: FUNDADOR y ORDINARIA.
 *
 * Al escribir el importe mensual, los otros dos se calculan solos (×10 y ×12),
 * pero se pueden ajustar a mano: el negocio manda sobre la fórmula.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Save, RotateCcw, Pencil, Check, Crown, User } from 'lucide-react';
import { Button, useToast, SkeletonCard } from '@/components/ui';
import { useCountryPrices, type CountryPriceRow, type MemberClass } from '@/hooks/useAdminPricing';
import { COUNTRIES } from '@/data/countries';
import { annualFromMonthly, listFromMonthly } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { FeesCsvPanel } from './FeesCsvPanel';
import { AdminPromoCodes } from './AdminPromoCodes';
import { AdminCountryDiscounts } from './AdminCountryDiscounts';

const TYPE_KEY: Record<string, string> = {
  patient: 'fees.typePatient',
  parent: 'fees.typeParent',
  medical_specialist: 'fees.typeMedical',
  nonmedical_specialist: 'fees.typeNonMedical',
  service_provider: 'fees.typeService',
  merchant: 'fees.typeMerchant',
  school: 'fees.typeSchool',
  clinic: 'fees.typeClinic',
  ngo: 'fees.typeNgo',
};

/**
 * Forma canónica del país: minúsculas y SIN acentos. Debe coincidir con
 * `normalize_country()` de la base; si no, "México" y "Mexico" volverían a
 * verse como dos países distintos en el selector.
 */
const toLabel = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const money = (n: number | null, cur: string) =>
  n == null ? '—' : `${Number(n).toLocaleString()} ${cur}`;

function ClassBlock({
  row,
  onSave,
  onClear,
}: {
  row: CountryPriceRow;
  onSave: (monthly: number, annual: number, list: number, currency: string, zero: boolean) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [monthly, setMonthly] = useState(String(row.monthly_amount ?? ''));
  const [annual, setAnnual] = useState(String(row.annual_amount ?? ''));
  const [list, setList] = useState(String(row.annual_list_amount ?? ''));
  const [currency, setCurrency] = useState(row.currency ?? '');
  const [zero, setZero] = useState(row.zero_decimal ?? false);
  const [busy, setBusy] = useState(false);

  const isFounder = row.member_class === 'founder';

  /** Al teclear el mensual, deriva anual (10 meses) y referencia (12 meses). */
  const onMonthly = (v: string) => {
    setMonthly(v);
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) {
      setAnnual(String(annualFromMonthly(n)));
      setList(String(listFromMonthly(n)));
    }
  };

  const save = async () => {
    const m = Number(monthly);
    const a = Number(annual);
    const l = Number(list);
    if (!Number.isFinite(m) || m < 0 || !Number.isFinite(a) || a < 0) return;
    setBusy(true);
    await onSave(m, a, Number.isFinite(l) ? l : m * 12, currency.trim().toUpperCase(), zero);
    setBusy(false);
    setEditing(false);
  };

  const header = (
    <div className="flex items-center gap-1.5">
      {isFounder ? (
        <Crown className="h-4 w-4 text-warm-600" aria-hidden="true" />
      ) : (
        <User className="h-4 w-4 text-slate-500" aria-hidden="true" />
      )}
      <span className="text-sm font-semibold text-slate-900">
        {isFounder ? t('fees.classFounder') : t('fees.classOrdinary')}
      </span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[11px] font-medium',
          row.is_override ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600',
        )}
      >
        {row.is_override ? t('fees.explicit') : t('fees.auto')}
      </span>
    </div>
  );

  if (!editing) {
    return (
      <div className={cn('rounded-xl border p-3', isFounder ? 'border-warm-200 bg-warm-50/40' : 'border-slate-200')}>
        {header}
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">{t('fees.monthly')}</dt>
          <dd className="text-right font-semibold text-slate-900">{money(row.monthly_amount, row.currency)}</dd>
          <dt className="text-muted">{t('fees.annual')}</dt>
          <dd className="text-right font-semibold text-slate-900">
            {money(row.annual_amount, row.currency)}
            {row.annual_list_amount != null && row.annual_amount != null && row.annual_list_amount > row.annual_amount && (
              <span className="ml-2 text-xs font-normal text-muted line-through">
                {Number(row.annual_list_amount).toLocaleString()}
              </span>
            )}
          </dd>
        </dl>
        {row.annual_list_amount != null && row.annual_amount != null && row.annual_list_amount > row.annual_amount && (
          <p className="mt-1 text-[11px] text-sage-700">{t('fees.savingNote')}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} leadingIcon={<Pencil className="h-4 w-4" />}>
            {t('fees.edit')}
          </Button>
          {row.is_override && (
            <Button size="sm" variant="ghost" onClick={() => void onClear()} leadingIcon={<RotateCcw className="h-4 w-4" />}>
              {t('fees.reset')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const field = (label: string, value: string, set: (v: string) => void, hint?: string) => (
    <div>
      <label className="mb-0.5 block text-[11px] font-semibold text-slate-700">{label}</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => set(e.target.value)}
        className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      />
      {hint ? <p className="mt-0.5 text-[10px] text-muted">{hint}</p> : null}
    </div>
  );

  return (
    <div className={cn('rounded-xl border p-3', isFounder ? 'border-warm-200 bg-warm-50/40' : 'border-slate-200')}>
      {header}
      <div className="mt-2 flex flex-wrap items-start gap-3">
        {field(t('fees.monthly'), monthly, onMonthly)}
        {field(t('fees.annual'), annual, setAnnual, t('fees.annualHint'))}
        {field(t('fees.annualList'), list, setList, t('fees.listHint'))}
        <div>
          <label className="mb-0.5 block text-[11px] font-semibold text-slate-700">{t('fees.currency')}</label>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            maxLength={3}
            placeholder="MXN"
            className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>
      </div>
      <label className="mt-2 flex items-center gap-1.5 text-xs text-slate-700">
        <input type="checkbox" checked={zero} onChange={(e) => setZero(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        {t('fees.zeroDecimal')}
      </label>
      <div className="mt-2 flex gap-1">
        <Button size="sm" loading={busy} onClick={save} leadingIcon={<Save className="h-4 w-4" />}>
          {t('fees.save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}

export function AdminFees() {
  const { t } = useTranslation();
  const toast = useToast();
  const [country, setCountry] = useState('mexico');
  const { rows, configured, loading, reload, setPrice, clearPrice } = useCountryPrices(country);

  const configuredList = useMemo(
    () => Object.keys(configured).filter((c) => c !== 'default').sort(),
    [configured],
  );

  /** Agrupa por tipo de afiliado: fundador y ordinaria juntos. */
  const byType = useMemo(() => {
    const map = new Map<string, CountryPriceRow[]>();
    for (const r of rows) {
      const list = map.get(r.affiliate_type) ?? [];
      list.push(r);
      map.set(r.affiliate_type, list);
    }
    return [...map.entries()];
  }, [rows]);

  const handleSave = async (
    r: CountryPriceRow,
    monthly: number,
    annual: number,
    list: number,
    currency: string,
    zero: boolean,
  ) => {
    const res = await setPrice(r.affiliate_type, r.member_class as MemberClass, currency, monthly, annual, list, zero);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('fees.saved') : t('fees.saveError'));
  };
  const handleClear = async (r: CountryPriceRow) => {
    const res = await clearPrice(r.affiliate_type, r.member_class as MemberClass);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('fees.cleared') : t('fees.saveError'));
  };

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
        {t('fees.hint')}
      </p>

      {/* Carga y descarga masiva: para configurar muchos países de una vez. */}
      <FeesCsvPanel onImported={() => void reload()} />

      <section className="space-y-2 rounded-2xl border border-slate-100 p-4">
        <label htmlFor="fees-country" className="block text-sm font-semibold text-slate-900">
          {t('fees.country')}
        </label>
        <select
          id="fees-country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <option value="default">{t('fees.defaultCountry')}</option>
          {configuredList.length > 0 && (
            <optgroup label={t('fees.groupConfigured')}>
              {configuredList.map((c) => (
                <option key={`cfg-${c}`} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={t('fees.groupAll')}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={toLabel(c.name)}>
                {c.name}
                {configured[toLabel(c.name)] ? ' ✓' : ''}
              </option>
            ))}
          </optgroup>
        </select>

        <p className="text-xs text-muted">
          {country === 'default' ? t('fees.defaultHint') : t('fees.countryHint')}
        </p>

        {configured[country] ? (
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {t('fees.configuredCount', { count: configured[country] })}
          </p>
        ) : null}
      </section>

      {loading ? (
        <SkeletonCard rows={3} />
      ) : byType.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-muted">
          {t('fees.noTypes')}
        </p>
      ) : (
        <ul className="space-y-3">
          {byType.map(([type, classRows]) => (
            <li key={type} className="rounded-2xl border border-slate-100 p-4">
              <h3 className="mb-2 font-semibold text-slate-900">
                {t(TYPE_KEY[type] ?? 'fees.typeOther', { defaultValue: type })}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {classRows.map((r) => (
                  <ClassBlock
                    key={`${r.affiliate_type}-${r.member_class}`}
                    row={r}
                    onSave={(m, a, l, c, z) => handleSave(r, m, a, l, c, z)}
                    onClear={() => handleClear(r)}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <Coins className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {t('fees.freeNote')}
      </p>

      {/* Política de descuentos por país (migración 0089). */}
      <AdminCountryDiscounts />

      {/* Códigos promocionales (antes en "Facturación"). */}
      <AdminPromoCodes />
    </div>
  );
}
