/**
 * CountryFilter — selector de país reutilizable, conectado al store global
 * (useCountry). Segmenta la sección actual por país. Si la persona ya eligió
 * país en el Home, aquí aparece preseleccionado (y viceversa).
 */
import { useMemo } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCountry } from '@/stores/countryStore';
import { COUNTRIES } from '@/data/countries';
import { cn } from '@/lib/utils';

export function CountryFilter({ id = 'country-filter', className }: { id?: string; className?: string }) {
  const { t, i18n } = useTranslation();
  const { country, setCountry } = useCountry();

  const countries = useMemo(() => {
    let display: (code: string) => string = (c) => c;
    try {
      const dn = new Intl.DisplayNames([i18n.language], { type: 'region' });
      display = (code) => dn.of(code) ?? code;
    } catch {
      /* usa el nombre en español */
    }
    return COUNTRIES
      .map((c) => ({ value: c.name, label: display(c.code) || c.name }))
      .sort((a, b) => a.label.localeCompare(b.label, i18n.language));
  }, [i18n.language]);

  return (
    <div className={cn('flex flex-col gap-2 rounded-xl border border-brand-100 bg-brand-50 p-3 sm:flex-row sm:items-center', className)}>
      <label htmlFor={id} className="flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-800">
        <Globe className="h-4 w-4" aria-hidden="true" /> {t('directory.countryLabel')}
      </label>
      <select
        id={id}
        aria-label={t('directory.countryLabel')}
        value={country ?? ''}
        onChange={(e) => setCountry(e.target.value || null)}
        className="w-full rounded-xl border border-brand-200 bg-white p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:max-w-xs"
      >
        <option value="">{t('directory.countryAll')}</option>
        {countries.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      {country && (
        <button
          type="button"
          onClick={() => setCountry(null)}
          className="text-left text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:ml-auto"
        >
          {t('directory.countryClear')}
        </button>
      )}
    </div>
  );
}
