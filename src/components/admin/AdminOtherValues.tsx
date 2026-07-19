/**
 * AdminOtherValues — panel admin: los valores "Otro (especifica)" más usados por
 * los proveedores (opcionalmente por país) y un botón para convertir cada uno en
 * categoría real del directorio con un clic (enlaza a quienes lo escribieron).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Check, Globe, CheckCircle2 } from 'lucide-react';
import { Button, SkeletonCard, useToast } from '@/components/ui';
import { useAdminOther, type OtherValueRow } from '@/hooks/useAdminOther';
import { COUNTRIES } from '@/data/countries';

const KIND_KEY: Record<string, string> = {
  specialty_other: 'admin.otherKind.specialty',
  area_other: 'admin.otherKind.area',
  category_other: 'admin.otherKind.category',
  service_other: 'admin.otherKind.service',
  model_other: 'admin.otherKind.model',
  offering_other: 'admin.otherKind.offering',
};

export function AdminOtherValues() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [country, setCountry] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null);
  const { rows, loading, promote } = useAdminOther(country || null);

  const countries = useMemo(() => {
    let display: (code: string) => string = (c) => c;
    try {
      const dn = new Intl.DisplayNames([i18n.language], { type: 'region' });
      display = (code) => dn.of(code) ?? code;
    } catch {
      /* nombre en español */
    }
    return COUNTRIES
      .map((c) => ({ value: c.name, label: display(c.code) || c.name }))
      .sort((a, b) => a.label.localeCompare(b.label, i18n.language));
  }, [i18n.language]);

  const rowId = (r: OtherValueRow) => `${r.country ?? ''}|${r.kind}|${r.label}`;

  const onPromote = async (r: OtherValueRow) => {
    setBusy(rowId(r));
    const res = await promote(r.label, r.kind);
    setBusy(null);
    if (res.ok) toast.success(t('admin.otherPromoted', { label: r.label }));
    else toast.error(res.error);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('admin.otherIntro')}</p>

      {/* Filtro por país */}
      <div className="flex flex-col gap-2 rounded-xl border border-brand-100 bg-brand-50 p-3 sm:flex-row sm:items-center">
        <label htmlFor="admin-country" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-800">
          <Globe className="h-4 w-4" aria-hidden="true" /> {t('directory.countryLabel')}
        </label>
        <select
          id="admin-country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full rounded-xl border border-brand-200 bg-white p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:max-w-xs"
        >
          <option value="">{t('admin.otherAllCountries')}</option>
          {countries.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonCard rows={3} />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('admin.otherEmpty')}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={rowId(r)} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Tag className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{r.label}</p>
                <p className="text-xs text-muted">
                  {t(KIND_KEY[r.kind] ?? 'admin.otherKind.other')}
                  {r.country ? ` · ${r.country}` : ''} · {t('admin.otherUses', { count: r.uses })}
                </p>
              </div>
              {r.category_id != null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-3 py-1 text-sm font-semibold text-sage-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t('admin.otherAlready')}
                </span>
              ) : (
                <Button
                  size="sm"
                  loading={busy === rowId(r)}
                  onClick={() => onPromote(r)}
                  leadingIcon={<Check className="h-4 w-4" />}
                >
                  {t('admin.otherPromote')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
