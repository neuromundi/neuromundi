/**
 * SchoolInclusion — directorio de inclusión escolar (/inclusion-escolar). Lista
 * los perfiles de tipo escuela. Desde el perfil de cada escuela, las familias
 * pueden agendar un tour virtual (reusa la agenda de la Fase 2).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { School, MapPin, ArrowRight, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SkeletonCard } from '@/components/ui';
import type { Profile } from '@/types/app';
import { providerOtherText } from '@/lib/utils';
import { useCountry } from '@/stores/countryStore';
import { CountryFilter } from '@/components/common/CountryFilter';

export function SchoolInclusion() {
  const { t } = useTranslation();
  const [schools, setSchools] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const { country } = useCountry();

  useEffect(() => {
    setLoading(true);
    (async () => {
      // Segmentación por país en el servidor (no traemos escuelas de otros países).
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'provider')
        .eq('provider_type', 'school')
        .eq('is_published', true);
      if (country) query = query.eq('country', country);
      const { data } = await query;
      setSchools((data as Profile[]) ?? []);
      setLoading(false);
    })();
  }, [country]);

  const term = q.trim().toLowerCase();
  const filtered = term
    ? schools.filter((s) =>
        `${s.business_name ?? ''} ${s.full_name ?? ''} ${s.municipality ?? ''} ${s.state ?? ''} ${providerOtherText(s.provider_details)}`
          .toLowerCase()
          .includes(term),
      )
    : schools;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-orange-500 to-rose-500 p-8 text-white shadow-lg">
        <School className="h-10 w-10 opacity-90" />
        <h1 className="mt-3 text-3xl font-extrabold">{t('school.title')}</h1>
        <p className="mt-2 max-w-xl text-white/90">{t('school.subtitle')}</p>
      </header>

      {/* Segmentación por país */}
      <CountryFilter />

      {/* Buscador */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          placeholder={t('school.searchPlaceholder')}
          aria-label={t('school.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <SkeletonCard rows={3} />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted">{t('school.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link to={`/proveedor/${s.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-brand-200">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <School className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{s.business_name || s.full_name}</p>
                  {(s.municipality || s.state) && (
                    <p className="flex items-center gap-1 text-sm text-muted">
                      <MapPin className="h-3.5 w-3.5" /> {[s.municipality, s.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
