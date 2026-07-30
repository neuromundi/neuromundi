/**
 * FoundersWallSection — cuerpo del muro de Miembros Fundadores, con selector por
 * país. Se monta dentro de la página propia /fundadores (la cabecera y el CTA los
 * pone la página). Muestra, de cada fundador curado por el admin: su nombre, su
 * folio (NM-000123) y su tipo (familia / profesional / comercio). Los destacados
 * van primero. Si no hay fundadores publicados, muestra un estado vacío amable.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Building2, User, Globe, Award } from 'lucide-react';
import { SkeletonCard, EmptyState } from '@/components/ui';
import { useFoundersWall, useFoundersWallCountries, type FounderEntry } from '@/hooks/useFoundersWall';
import { useCountry } from '@/stores/countryStore';
import { formatMemberNo } from '@/lib/referral';
import { cn } from '@/lib/utils';

const KIND_KEY: Record<FounderEntry['kind'], string> = {
  families: 'foundersWall.kind.families',
  professionals: 'foundersWall.kind.professionals',
  providers: 'foundersWall.kind.providers',
};

function FounderCard({ e, featured }: { e: FounderEntry; featured: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-4',
        featured ? 'border-brand-300 bg-gradient-to-br from-brand-50 to-warm-50 shadow-sm' : 'border-slate-100 bg-white',
      )}
    >
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', featured ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>
        {e.is_company ? <Building2 className="h-5 w-5" aria-hidden="true" /> : <User className="h-5 w-5" aria-hidden="true" />}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-semibold text-slate-900">
          {featured && <Star className="h-4 w-4 shrink-0 text-warm-500" aria-hidden="true" />}
          <span className="truncate">{e.display_name}</span>
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {e.member_no != null && <span className="font-mono text-brand-700">{formatMemberNo(e.member_no)}</span>}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{t(KIND_KEY[e.kind])}</span>
        </p>
      </div>
    </div>
  );
}

export function FoundersWallSection() {
  const { t } = useTranslation();
  const { country: globalCountry } = useCountry();
  const { countries } = useFoundersWallCountries();

  // Selector: por defecto el país global si tiene fundadores; si no, "todos".
  const [selected, setSelected] = useState<string>('');
  const effective = useMemo(() => {
    if (selected) return selected;
    if (globalCountry && countries.some((c) => c.country === globalCountry)) return globalCountry;
    return '';
  }, [selected, globalCountry, countries]);

  const { entries, loading } = useFoundersWall(effective || null);

  const { featured, rest } = useMemo(
    () => ({
      featured: entries.filter((e) => e.featured),
      rest: entries.filter((e) => !e.featured),
    }),
    [entries],
  );

  return (
    <div>
      {/* Selector por país */}
      <div className="mb-6 flex justify-end">
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <Globe className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="sr-only">{t('foundersWall.selectCountry')}</span>
          <select
            value={effective}
            onChange={(e) => setSelected(e.target.value)}
            className="bg-transparent pr-1 font-medium text-slate-800 focus:outline-none"
          >
            <option value="">{t('foundersWall.allCountries')}</option>
            {countries.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country} ({c.n})
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonCard rows={4} />
      ) : entries.length === 0 ? (
        <EmptyState icon={<Award className="h-6 w-6" />} title={t('foundersWall.title')} description={t('foundersWall.empty')} />
      ) : (
        <div className="space-y-6">
          {featured.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {featured.map((e, i) => <FounderCard key={`ff${i}`} e={e} featured />)}
            </div>
          )}
          {rest.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((e, i) => <FounderCard key={`fr${i}`} e={e} featured={false} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
