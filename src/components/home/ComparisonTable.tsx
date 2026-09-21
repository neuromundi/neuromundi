/**
 * ComparisonTable — tabla comparativa de la portada: Neuromundi frente a los
 * directorios/plataformas de salud más usados (Doctoralia, Top Doctors,
 * Doctores.lat). Palomita = tiene la función; tache = no. Incluye una fila de
 * precios al final. Los nombres de marca son propios y NO se traducen; el resto
 * de textos salen de i18n (home.compare.*). La columna de Neuromundi va
 * resaltada. La tabla scrollea horizontalmente en móvil.
 *
 * Nota de marca/legal: comparativa con información pública a la fecha del pie;
 * las marcas mencionadas pertenecen a sus titulares (fin informativo).
 */
import { useTranslation } from 'react-i18next';
import { Check, X, ListChecks } from 'lucide-react';
import { useCountry } from '@/stores/countryStore';
import { isLatamAudience } from '@/lib/latamAudience';

type Marks = [boolean, boolean, boolean, boolean];

const ROWS: { key: string; sub?: boolean; marks: Marks }[] = [
  { key: 'specialized', marks: [true, false, false, false] },
  { key: 'free', marks: [true, true, true, true] },
  { key: 'booking', marks: [true, true, true, true] },
  { key: 'reviews', marks: [true, true, true, true] },
  { key: 'neuroaffirm', sub: true, marks: [true, false, false, false] },
  { key: 'community', sub: true, marks: [true, false, false, false] },
  { key: 'kit', marks: [true, false, false, false] },
  { key: 'inclusion', marks: [true, false, false, false] },
  { key: 'store', marks: [true, false, false, false] },
];

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

  // La tabla nombra plataformas y precios de México/LatAm: solo se muestra a esa
  // audiencia (país elegido de LatAm, o zona horaria de la región si no eligió).
  if (!isLatamAudience(country)) return null;

  const yes = t('home.compare.yes');
  const no = t('home.compare.no');
  const dirTag = t('home.compare.tagDirectory');

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
                <th className="p-4 text-center align-middle">
                  <span className="block text-[15px] font-bold text-slate-900">Doctoralia</span>
                  <span className="mt-0.5 block text-xs font-medium text-muted">{dirTag}</span>
                </th>
                <th className="p-4 text-center align-middle">
                  <span className="block text-[15px] font-bold text-slate-900">Top Doctors</span>
                  <span className="mt-0.5 block text-xs font-medium text-muted">{dirTag}</span>
                </th>
                <th className="p-4 text-center align-middle">
                  <span className="block text-[15px] font-bold text-slate-900">Doctores.lat</span>
                  <span className="mt-0.5 block text-xs font-medium text-muted">{dirTag}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-[340px] p-4 text-start align-middle">
                    <span className="font-semibold text-slate-800">{t(`home.compare.rows.${row.key}`)}</span>
                    {row.sub && (
                      <span className="mt-0.5 block text-xs font-normal text-muted">
                        {t(`home.compare.rows.${row.key}Sub`)}
                      </span>
                    )}
                  </td>
                  <td className="bg-brand-50/60 p-4 text-center align-middle">
                    <Mark on={row.marks[0]} yes={yes} no={no} />
                  </td>
                  <td className="p-4 text-center align-middle"><Mark on={row.marks[1]} yes={yes} no={no} /></td>
                  <td className="p-4 text-center align-middle"><Mark on={row.marks[2]} yes={yes} no={no} /></td>
                  <td className="p-4 text-center align-middle"><Mark on={row.marks[3]} yes={yes} no={no} /></td>
                </tr>
              ))}
              {/* Fila de precios */}
              <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm">
                <td className="p-4 text-start align-middle">
                  <span className="font-extrabold text-slate-900">{t('home.compare.price.label')}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted">{t('home.compare.price.sub')}</span>
                </td>
                <td className="bg-brand-100/70 p-4 text-center align-middle">
                  <span className="font-extrabold text-brand-700">{t('home.compare.price.nm')}</span>
                  <span className="mt-0.5 block text-xs font-medium text-muted">{t('home.compare.price.nmSub')}</span>
                </td>
                <td className="p-4 text-center align-middle">
                  <span className="font-extrabold text-slate-900">{t('home.compare.price.doctoralia')}</span>
                  <span className="mt-0.5 block text-xs font-medium text-muted">{t('home.compare.price.doctoraliaSub')}</span>
                </td>
                <td className="p-4 text-center align-middle">
                  <span className="font-extrabold text-slate-900">{t('home.compare.price.topdoctors')}</span>
                  <span className="mt-0.5 block text-xs font-medium text-muted">{t('home.compare.price.topdoctorsSub')}</span>
                </td>
                <td className="p-4 text-center align-middle">
                  <span className="font-extrabold text-slate-900">{t('home.compare.price.doctoreslat')}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 px-1 text-xs leading-relaxed text-muted">{t('home.compare.footnote')}</p>
    </section>
  );
}
