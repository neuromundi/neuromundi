/**
 * AdminBilling — administración de la cuota de afiliación:
 *  - Cuotas base por tipo (USD).
 *  - Precios por país (moneda + tipo de cambio).
 *  - Códigos promocionales (crear, activar/desactivar, eliminar).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button, SkeletonCard, useToast } from '@/components/ui';
import { useAdminBilling, type MembershipFee } from '@/hooks/useAdminBilling';

const inputCls =
  'w-full rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const FEE_LABEL: Record<string, string> = {
  patient: 'admin.typePatient',
  parent: 'admin.typeParent',
  service_provider: 'admin.typeService',
  merchant: 'admin.typeMerchant',
};

export function AdminBilling() {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    fees,
    pricing,
    promos,
    loading,
    saveFee,
    savePricing,
    deletePricing,
    createPromo,
    togglePromo,
    deletePromo,
  } = useAdminBilling();

  const [draftFees, setDraftFees] = useState<Record<string, MembershipFee>>({});
  const [newCountry, setNewCountry] = useState({ country_label: '', currency: 'USD', fx_per_usd: '1', zero_decimal: false });
  const [newPromo, setNewPromo] = useState({ code: '', kind: 'personal', scope: 'all', max_uses: '', note: '' });

  if (loading) return <SkeletonCard rows={4} />;

  const feeValue = (f: MembershipFee) => draftFees[f.affiliate_type] ?? f;

  const onSaveFee = async (f: MembershipFee) => {
    const res = await saveFee(feeValue(f));
    toast[res.ok ? 'success' : 'error'](res.ok ? t('admin.saved') : res.error);
  };

  const onAddCountry = async () => {
    if (!newCountry.country_label.trim()) return;
    const res = await savePricing({
      country_label: newCountry.country_label,
      currency: newCountry.currency.trim().toUpperCase(),
      fx_per_usd: Number(newCountry.fx_per_usd) || 1,
      zero_decimal: newCountry.zero_decimal,
    });
    if (res.ok) {
      toast.success(t('admin.saved'));
      setNewCountry({ country_label: '', currency: 'USD', fx_per_usd: '1', zero_decimal: false });
    } else toast.error(res.error);
  };

  const onCreatePromo = async () => {
    if (!newPromo.code.trim()) {
      toast.error(t('admin.errCode'));
      return;
    }
    const res = await createPromo({
      code: newPromo.code,
      kind: newPromo.kind,
      scope: newPromo.scope,
      max_uses: newPromo.max_uses === '' ? null : Number(newPromo.max_uses),
      note: newPromo.note || null,
    });
    if (res.ok) {
      toast.success(t('admin.created'));
      setNewPromo({ code: '', kind: 'personal', scope: 'all', max_uses: '', note: '' });
    } else toast.error(res.error);
  };

  return (
    <div className="space-y-6">
      {/* Cuotas por tipo */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">{t('admin.feesTitle')}</h2>
        <ul className="space-y-2">
          {fees.map((f) => {
            const v = feeValue(f);
            return (
              <li key={f.affiliate_type} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-slate-700">{t(FEE_LABEL[f.affiliate_type] ?? f.affiliate_type)}</span>
                <input
                  type="number"
                  step="0.01"
                  aria-label={t('admin.baseUsd')}
                  className={`${inputCls} w-28`}
                  value={v.base_usd}
                  onChange={(e) =>
                    setDraftFees((d) => ({ ...d, [f.affiliate_type]: { ...v, base_usd: Number(e.target.value) } }))
                  }
                />
                <label className="flex items-center gap-1 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={v.is_active}
                    onChange={(e) =>
                      setDraftFees((d) => ({ ...d, [f.affiliate_type]: { ...v, is_active: e.target.checked } }))
                    }
                  />
                  {t('admin.activeCol')}
                </label>
                <button
                  type="button"
                  onClick={() => onSaveFee(f)}
                  aria-label={t('admin.save')}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-50"
                >
                  <Save className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Precios por país */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">{t('admin.pricingTitle')}</h2>
        <ul className="space-y-2">
          {pricing.map((p) => (
            <li key={p.country_label} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate text-slate-700">{p.country_label}</span>
              <span className="w-14 text-center font-medium">{p.currency}</span>
              <span className="w-20 text-right text-muted">{p.fx_per_usd}</span>
              {p.country_label !== 'default' && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await deletePricing(p.country_label);
                    toast[res.ok ? 'success' : 'error'](res.ok ? t('admin.deleted') : res.error);
                  }}
                  aria-label={t('admin.del')}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4">
          <input
            className={inputCls}
            placeholder={t('admin.colCountry')}
            value={newCountry.country_label}
            onChange={(e) => setNewCountry((c) => ({ ...c, country_label: e.target.value }))}
          />
          <input
            className={inputCls}
            placeholder={t('admin.colCurrency')}
            value={newCountry.currency}
            onChange={(e) => setNewCountry((c) => ({ ...c, currency: e.target.value }))}
          />
          <input
            className={inputCls}
            type="number"
            step="0.000001"
            placeholder={t('admin.colFx')}
            value={newCountry.fx_per_usd}
            onChange={(e) => setNewCountry((c) => ({ ...c, fx_per_usd: e.target.value }))}
          />
          <Button size="sm" onClick={onAddCountry} leadingIcon={<Plus className="h-4 w-4" />}>
            {t('admin.addCountry')}
          </Button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={newCountry.zero_decimal}
            onChange={(e) => setNewCountry((c) => ({ ...c, zero_decimal: e.target.checked }))}
          />
          {t('admin.colZero')}
        </label>
      </section>

      {/* Códigos promocionales */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">{t('admin.promoTitle')}</h2>
        <ul className="space-y-2">
          {promos.map((c) => (
            <li key={c.code} className="flex items-center gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-slate-900">{c.code}</span>
                <span className="ml-2 text-xs text-muted">
                  {t(c.kind === 'universal' ? 'admin.kindUniversal' : 'admin.kindPersonal')} ·{' '}
                  {c.scope === 'consumer'
                    ? t('admin.scopeConsumer')
                    : c.scope === 'provider'
                      ? t('admin.scopeProvider')
                      : t('admin.scopeAll')}{' '}
                  · {c.used_count}/{c.max_uses ?? '∞'}
                </span>
              </div>
              <label className="flex items-center gap-1 text-xs text-muted">
                <input type="checkbox" checked={c.is_active} onChange={(e) => void togglePromo(c.code, e.target.checked)} />
                {t('admin.activeCol')}
              </label>
              <button
                type="button"
                onClick={async () => {
                  const res = await deletePromo(c.code);
                  toast[res.ok ? 'success' : 'error'](res.ok ? t('admin.deleted') : res.error);
                }}
                aria-label={t('admin.del')}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <input
            className={inputCls}
            placeholder={t('admin.code')}
            value={newPromo.code}
            onChange={(e) => setNewPromo((c) => ({ ...c, code: e.target.value }))}
          />
          <select className={inputCls} value={newPromo.scope} onChange={(e) => setNewPromo((c) => ({ ...c, scope: e.target.value }))}>
            <option value="all">{t('admin.scopeAll')}</option>
            <option value="consumer">{t('admin.scopeConsumer')}</option>
            <option value="provider">{t('admin.scopeProvider')}</option>
          </select>
          <select className={inputCls} value={newPromo.kind} onChange={(e) => setNewPromo((c) => ({ ...c, kind: e.target.value }))}>
            <option value="personal">{t('admin.kindPersonal')}</option>
            <option value="universal">{t('admin.kindUniversal')}</option>
          </select>
          <input
            className={inputCls}
            type="number"
            min="1"
            placeholder={t('admin.maxUses')}
            value={newPromo.max_uses}
            onChange={(e) => setNewPromo((c) => ({ ...c, max_uses: e.target.value }))}
          />
          <input
            className={`${inputCls} col-span-2`}
            placeholder={t('admin.note')}
            value={newPromo.note}
            onChange={(e) => setNewPromo((c) => ({ ...c, note: e.target.value }))}
          />
          <Button size="sm" onClick={onCreatePromo} leadingIcon={<Plus className="h-4 w-4" />} className="col-span-2">
            {t('admin.createCode')}
          </Button>
        </div>
      </section>
    </div>
  );
}
