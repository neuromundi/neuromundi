/**
 * AdminCountryDiscounts — política de descuentos por país (migración 0089).
 * El admin fija un % de descuento por país sobre el PRIMER pago de cuota; el
 * checkout lo compone con recomendación/promo/fundador (tope 90%). Se lee/edita
 * con `admin_country_discounts` / `admin_set_country_discount`.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Percent, Trash2, Plus, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, useToast } from '@/components/ui';
import { COUNTRIES } from '@/data/countries';
import { useCountryLabel } from '@/lib/countryLabel';

interface Row { country_label: string; pct: number; is_active: boolean; note: string | null }

const inputCls = 'rounded-xl border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function AdminCountryDiscounts() {
  const { t } = useTranslation();
  const toast = useToast();
  const countryLabel = useCountryLabel();
  const [rows, setRows] = useState<Row[]>([]);
  const [country, setCountry] = useState('');
  const [pct, setPct] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('admin_country_discounts');
    setRows((data as Row[]) ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (c: string, p: number | null, active = true, n: string | null = null) => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_set_country_discount', { p_country: c, p_pct: p, p_active: active, p_note: n });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  const add = async () => {
    const p = parseInt(pct, 10);
    if (!country) { toast.error(t('disc.pickCountry')); return; }
    if (Number.isNaN(p) || p < 0 || p > 100) { toast.error(t('disc.badPct')); return; }
    await save(country, p, true, note || null);
    setCountry(''); setPct(''); setNote('');
    toast.success(t('disc.saved'));
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
        <Percent className="h-5 w-5 text-brand-600" /> {t('disc.title')}
      </h3>
      <p className="mb-3 text-xs text-muted">{t('disc.help')}</p>

      {/* Alta rápida */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700"><Globe className="h-3.5 w-3.5" /> {t('disc.country')}</label>
          <select className={`${inputCls} w-full`} value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">{t('disc.pickCountry')}</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>)}
          </select>
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs font-semibold text-slate-700">{t('disc.pct')}</label>
          <input type="number" min="0" max="100" className={`${inputCls} w-full`} value={pct} onChange={(e) => setPct(e.target.value)} placeholder="10" />
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-700">{t('disc.note')}</label>
          <input className={`${inputCls} w-full`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('disc.notePh')} />
        </div>
        <Button size="sm" onClick={() => void add()} loading={busy} leadingIcon={<Plus className="h-4 w-4" />}>{t('disc.add')}</Button>
      </div>

      {/* Listado */}
      {rows.length > 0 ? (
        <ul className="mt-4 divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.country_label} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="min-w-[10rem] flex-1 font-medium capitalize text-slate-900">{r.country_label}</span>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold text-brand-700">−{r.pct}%</span>
              <button
                type="button"
                onClick={() => void save(r.country_label, r.pct, !r.is_active, r.note)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {r.is_active ? t('disc.active') : t('disc.inactive')}
              </button>
              {r.note && <span className="text-xs text-muted">{r.note}</span>}
              <button type="button" onClick={() => void save(r.country_label, null)} aria-label={t('common.delete')} className="ml-auto text-slate-400 hover:text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">{t('disc.empty')}</p>
      )}
    </section>
  );
}
