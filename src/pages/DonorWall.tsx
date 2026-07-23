/**
 * DonorWall — muro público de donantes (/donantes).
 *
 * Explica por qué estas personas y organizaciones están destacadas, muestra
 * primero a los "Embajadores" (mención destacada, con logo/foto si la hay) y
 * después al resto. Termina con una invitación a donar.
 *
 * Solo se ve lo que el donante consintió publicar y el admin publicó: eso lo
 * garantiza donor_wall() en la base, no el front.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Star, Award, Building2, User } from 'lucide-react';
import { Button, SkeletonCard, EmptyState } from '@/components/ui';
import { useDonorWall, type WallEntry } from '@/hooks/useDonorWall';
import { cn } from '@/lib/utils';

const LEVEL_KEY: Record<string, string> = {
  seed: 'donate.level.seed.name',
  ally: 'donate.level.ally.name',
  driver: 'donate.level.driver.name',
  ambassador: 'donate.level.ambassador.name',
};

function Card({ e, featured }: { e: WallEntry; featured: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        featured ? 'border-brand-300 bg-gradient-to-br from-brand-50 to-warm-50 shadow-sm' : 'border-slate-100 bg-white',
      )}
    >
      <div className="flex items-center gap-3">
        {e.logo_url ? (
          <img src={e.logo_url} alt="" className="h-12 w-12 rounded-xl object-contain" loading="lazy" />
        ) : (
          <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl', featured ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>
            {e.is_company ? <Building2 className="h-6 w-6" aria-hidden="true" /> : <User className="h-6 w-6" aria-hidden="true" />}
          </span>
        )}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-slate-900">
            {featured && <Star className="h-4 w-4 shrink-0 text-warm-500" aria-hidden="true" />}
            <span className="truncate">{e.display_name}</span>
          </p>
          <p className="text-xs text-brand-700">{t(LEVEL_KEY[e.level] ?? 'donate.level.seed.name')}</p>
        </div>
      </div>
      {e.note && <p className="mt-2 text-sm text-slate-600">{e.note}</p>}
    </div>
  );
}

export function DonorWall() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { entries, loading } = useDonorWall();

  const { featured, rest } = useMemo(
    () => ({
      featured: entries.filter((e) => e.featured),
      rest: entries.filter((e) => !e.featured),
    }),
    [entries],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          <Award className="h-4 w-4" aria-hidden="true" /> {t('wall.badge')}
        </span>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">{t('wall.title')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">{t('wall.intro')}</p>
      </header>

      {loading ? (
        <div className="mt-8"><SkeletonCard rows={4} /></div>
      ) : entries.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={<Heart className="h-6 w-6" />} title={t('wall.emptyTitle')} description={t('wall.empty')} />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {featured.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Star className="h-5 w-5 text-warm-500" aria-hidden="true" /> {t('wall.featuredTitle')}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {featured.map((e, i) => <Card key={`f${i}`} e={e} featured />)}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              {featured.length > 0 && (
                <h2 className="mb-3 text-lg font-bold text-slate-900">{t('wall.othersTitle')}</h2>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((e, i) => <Card key={`r${i}`} e={e} featured={false} />)}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-brand-100 bg-brand-50/50 p-6 text-center">
        <h2 className="text-xl font-bold text-slate-900">{t('wall.ctaTitle')}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-700">{t('wall.ctaBody')}</p>
        <Button className="mt-4" size="lg" onClick={() => navigate('/donar')} leadingIcon={<Heart className="h-5 w-5" aria-hidden="true" />}>
          {t('donate.cta')}
        </Button>
      </div>
    </div>
  );
}
