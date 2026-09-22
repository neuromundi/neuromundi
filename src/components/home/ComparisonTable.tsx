/**
 * ComparisonTable — tabla comparativa de la portada. Neuromundi frente a las
 * plataformas de salud más usadas EN CADA REGIÓN (los datos por región están en
 * `lib/comparisonRegions`). La región se decide por el país elegido o, si no
 * eligió, por la zona horaria del navegador; siempre hay una región válida, así
 * que la tabla se muestra en todo el mundo (fuera de LatAm/Europa/EE. UU. cae a
 * una comparación genérica sin marcas). Palomita = tiene la función; tache = no.
 *
 * Los nombres de marca son propios y NO se traducen; el resto sale de i18n.
 * La columna de Neuromundi va resaltada. La tabla scrollea en móvil.
 */
import { useTranslation } from 'react-i18next';
import { Check, X, ListChecks } from 'lucide-react';
import { useCountry } from '@/stores/countryStore';
import { comparisonRegionOf, nmPrice, REGIONS, FEATURE_KEYS, type Col } from '@/lib/comparisonRegions';

function Mark({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return on ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100" role="img" aria-label={yes}>
      <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} aria-hidden="true" />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100" role="img" aria-label={no}>
      <X className="h-4 w-4 text-slate-400" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

export function ComparisonTable() {
  const { t } = useTranslation();
  const { country } = useCountry();
  const region = comparisonRegionOf(country);
  const { cols } = REGIONS[region];
  const nm = nmPrice(country);

  const yes = t('home.compare.yes');
  const no = t('home.compare.no');
  const colName = (c: Col) => (c.brand ? c.brand : t(c.nameKey ?? ''));

  return (
    <section className="mt-16">
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm">
        <ListChecks className="h-4 w-4" aria-hidden="true" /> {t('home.compare.badge')}
      </span>
      <h2 className="mt-3 text-2xl font-bold text-slate-900">{t('home.compare.title')}</h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-slate-700">{t('home.compare.subtitle')}</p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="p-4 text-start text-xs font-semibold uppercase tracking-wide text-muted">
                  {t('home.compare.colFeature')}
                </th>
                <th className="bg-gradient-to-b from-brand-500 to-brand-700 p-4 text-center align-middle text-white">
                  <span className="block text-[15px] font-bold">Neuromundi</span>
                  <span className="mt-0.5 block text-xs font-medium text-brand-100">{t('home.compare.nmTag')}</span>
                </th>
                {cols.map((c, i) => (
                  <th key={i} className="p-4 text-center align-middle">
                    <span className="block text-[15px] font-bold text-slate-900">{colName(c)}</span>
                    <span className="mt-0.5 block text-xs font-medium text-muted">{t(c.tagKey)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_KEYS.map((fk) => (
                <tr key={fk} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-[340px] p-4 text-start align-middle">
                    <span className="font-semibold text-slate-800">{t(`home.compare.rows.${fk}`)}</span>
                    {(fk === 'neuroaffirm' || fk === 'community') && (
                      <span className="mt-0.5 block text-xs font-normal text-muted">
                        {t(`home.compare.rows.${fk}Sub`)}
                      </span>
                    )}
                  </td>
                  <td className="bg-brand-50/60 p-4 text-center align-middle">
                    <Mark on yes={yes} no={no} />
                  </td>
                  {cols.map((c, i) => (
                    <td key={i} className="p-4 text-center align-middle">
                      <Mark on={c.marks[fk]} yes={yes} no={no} />
                    </td>
                  ))}
                </tr>
              ))}
              {/* Fila de precios */}
              <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm">
                <td className="p-4 text-start align-middle">
                  <span className="font-extrabold text-slate-900">{t('home.compare.price.label')}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted">{t('home.compare.price.sub')}</span>
                </td>
                <td className="bg-brand-100/70 p-4 text-center align-middle">
                  <span className="font-extrabold text-brand-700">{nm.value ?? t(nm.key ?? '')}</span>
                  <span className="mt-0.5 block text-xs font-medium text-muted">{t(nm.subKey)}</span>
                </td>
                {cols.map((c, i) => (
                  <td key={i} className="p-4 text-center align-middle">
                    <span className="font-extrabold text-slate-900">
                      {c.priceValue ?? t(c.priceKey ?? '')}
                    </span>
                    {c.priceSubKey && (
                      <span className="mt-0.5 block text-xs font-medium text-muted">{t(c.priceSubKey)}</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 px-1 text-xs leading-relaxed text-muted">{t('home.compare.footnote')}</p>
    </section>
  );
}
