/**
 * LaborInclusion — página pública de inclusión laboral (/inclusion-laboral).
 * Lista las vacantes activas de las Empresas inclusivas, con buscador por país y
 * por texto. Muestra los datos que cada empresa quiso completar (todos opcionales):
 * plazas, empresa, puesto, experiencia, formación, salario, país/ciudad,
 * habilidades, y el correo o enlace para postularse.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, MapPin, Search, Globe, Users, GraduationCap, Wallet, Mail, ExternalLink, Info } from 'lucide-react';
import { SkeletonCard, EmptyState } from '@/components/ui';
import { usePublicJobs, usePublicJobsCountries, type PublicJob, type OpportunityType } from '@/hooks/useJobOpenings';
import { useCountry } from '@/stores/countryStore';
import { useCountryLabel } from '@/lib/countryLabel';
import { COUNTRIES } from '@/data/countries';

const OPP_TYPES: (OpportunityType | 'all')[] = ['all', 'employment', 'volunteering', 'social_service'];

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number | null }) {
  if (value == null || String(value).trim() === '') return null;
  return (
    <p className="flex items-start gap-1.5 text-sm text-slate-700">
      <span className="mt-0.5 text-slate-400" aria-hidden="true">{icon}</span>
      <span><span className="font-semibold text-slate-900">{label}:</span> {value}</span>
    </p>
  );
}

function JobCard({ job }: { job: PublicJob }) {
  const { t } = useTranslation();
  const place = [job.city, job.country].filter(Boolean).join(', ');
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="mb-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{t(`labor.type.${job.opportunity_type}`)}</span>
          <h2 className="truncate text-lg font-bold text-slate-900">{job.title || t('labor.untitled')}</h2>
          <p className="flex items-center gap-1.5 text-sm text-brand-700">
            <Briefcase className="h-4 w-4" aria-hidden="true" /> {job.company_name}
          </p>
          {place && <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {place}</p>}
        </div>
        {job.positions != null && (
          <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
            {t('labor.positions', { n: job.positions })}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        <Field icon={<GraduationCap className="h-4 w-4" />} label={t('labor.experience')} value={job.experience} />
        <Field icon={<GraduationCap className="h-4 w-4" />} label={t('labor.education')} value={job.education} />
        <Field icon={<Wallet className="h-4 w-4" />} label={t('labor.salary')} value={job.salary_text} />
        <Field icon={<Users className="h-4 w-4" />} label={t('labor.skills')} value={job.skills} />
        <Field icon={<Info className="h-4 w-4" />} label={t('labor.note')} value={job.note} />
      </div>

      {(job.apply_email || job.apply_url) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {job.apply_email && (
            <a href={`mailto:${job.apply_email}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              <Mail className="h-4 w-4" /> {t('labor.applyEmail')}
            </a>
          )}
          {job.apply_url && (
            <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100">
              <ExternalLink className="h-4 w-4" /> {t('labor.applyLink')}
            </a>
          )}
        </div>
      )}
    </article>
  );
}

export function LaborInclusion() {
  const { t } = useTranslation();
  const { country: globalCountry } = useCountry();
  const { countries } = usePublicJobsCountries();
  const countryLabel = useCountryLabel();
  const [selected, setSelected] = useState<string>('');
  const [oppType, setOppType] = useState<OpportunityType | 'all'>('all');
  const [q, setQ] = useState('');

  // El selector lista TODOS los países (localizados), no solo los que ya tienen
  // vacantes: así nunca aparece vacío. Se muestra el conteo cuando existe.
  const countMap = useMemo(() => Object.fromEntries(countries.map((c) => [c.country, c.n])), [countries]);
  const countryOptions = useMemo(
    () => COUNTRIES.map((c) => ({ name: c.name, label: countryLabel(c.code, c.name) })).sort((a, b) => a.label.localeCompare(b.label)),
    [countryLabel],
  );

  const effective = useMemo(() => {
    if (selected) return selected;
    if (globalCountry) return globalCountry;
    return '';
  }, [selected, globalCountry]);

  const { jobs, loading } = usePublicJobs(effective || null, oppType === 'all' ? null : oppType);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return jobs;
    return jobs.filter((j) =>
      [j.title, j.company_name, j.skills, j.city, j.education, j.experience]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(needle)),
    );
  }, [jobs, q]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          <Briefcase className="h-4 w-4" aria-hidden="true" /> {t('labor.badge')}
        </span>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">{t('labor.title')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">{t('labor.intro')}</p>
      </header>

      {/* Filtro por tipo de oportunidad */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {OPP_TYPES.map((ot) => (
          <button
            key={ot}
            type="button"
            onClick={() => setOppType(ot)}
            className={
              oppType === ot
                ? 'rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white'
                : 'rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'
            }
          >
            {t(`labor.type.${ot}`)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('labor.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <Globe className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="sr-only">{t('labor.selectCountry')}</span>
          <select value={effective} onChange={(e) => setSelected(e.target.value)} className="bg-transparent font-medium text-slate-800 focus:outline-none">
            <option value="">{t('labor.allCountries')}</option>
            {countryOptions.map((c) => (
              <option key={c.name} value={c.name}>{c.label}{countMap[c.name] ? ` (${countMap[c.name]})` : ''}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        {loading ? (
          <SkeletonCard rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Briefcase className="h-6 w-6" />} title={t('labor.emptyTitle')} description={t('labor.empty')} />
        ) : (
          <div className="space-y-4">
            {filtered.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        )}
      </div>
    </div>
  );
}
