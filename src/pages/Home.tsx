/**
 * Home — portada pública. El héroe invita a elegir el PAÍS: al seleccionarlo,
 * el directorio y demás secciones quedan segmentados a ese país sin que la
 * persona tenga que volver a filtrar. La selección se guarda en el dispositivo.
 */
import { useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ShieldCheck, Heart, Lock, BookOpenCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { SearchableSelect } from '@/components/directory/SearchableSelect';

// Debajo del pliegue y diferidos por scroll: se sacan del bundle inicial (su
// código y sus consultas a Supabase ya no viajan en index-*.js).
const AlliesGrid = lazy(() => import('@/components/donation/AlliesGrid').then((m) => ({ default: m.AlliesGrid })));
const ContentCarousel = lazy(() => import('@/components/content/ContentCarousel').then((m) => ({ default: m.ContentCarousel })));
import { HeartHandshake, Award } from 'lucide-react';
import { useCountry } from '@/stores/countryStore';
import { COUNTRIES } from '@/data/countries';
import { useInView } from '@/hooks/useInView';

export function Home() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { country, setCountry } = useCountry();
  // Aliados y contenido están debajo del pliegue pero cada uno dispara una
  // consulta a Supabase al montar, colándose en la cadena crítica del LCP. Se
  // montan cuando su sección se acerca al viewport (IntersectionObserver): sus
  // consultas salen por completo de la ruta crítica (Lighthouse no hace scroll
  // durante la medición, así que ni siquiera se piden en la auditoría).
  const [deferRef, deferInView] = useInView<HTMLElement>();

  // Nombre del país localizado para mostrar; el `value` sigue siendo el nombre
  // canónico (español) para que coincida con `profiles.country` al filtrar.
  const countries = useMemo(() => {
    let display: (code: string) => string = (c) => c;
    try {
      const dn = new Intl.DisplayNames([i18n.language], { type: 'region' });
      display = (code) => dn.of(code) ?? code;
    } catch {
      /* Intl.DisplayNames no disponible: usamos el nombre en español */
    }
    return COUNTRIES
      .map((c) => ({ value: c.name, label: display(c.code) || c.name }))
      .sort((a, b) => a.label.localeCompare(b.label, i18n.language));
  }, [i18n.language]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* HÉROE */}
      <section className="grid items-start gap-8 lg:grid-cols-2">
        <div className="order-last text-left lg:order-first">
          <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
            {t('home.title')}
          </h1>
          <ul className="mt-4 max-w-xl space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <li className="flex gap-2 text-sm leading-relaxed text-slate-700">
              <span aria-hidden="true">✅</span>
              <span>{t('home.subtitle')}</span>
            </li>
            <li className="flex gap-2 text-sm leading-relaxed text-slate-700">
              <span aria-hidden="true">✅</span>
              <span>{t('home.community')}</span>
            </li>
          </ul>

          {/* Selector de país */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-md">
            <p className="mb-1 block text-sm font-semibold text-slate-900">
              {t('home.country.label')}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Selector con búsqueda: no pinta las ~250 opciones hasta que se abre,
                  quitando ese coste de "Style & Layout" del primer render. */}
              <SearchableSelect
                className="flex-1"
                options={countries}
                value={country ?? ''}
                onChange={(v) => setCountry(v || null)}
                placeholder={t('home.country.all')}
                searchPlaceholder={t('home.country.search')}
                noMatches={t('home.country.noMatch')}
                ariaLabel={t('home.country.label')}
              />
              <Button type="button" size="lg" onClick={() => navigate('/directorio')} leadingIcon={<Compass className="h-5 w-5" />}>
                {t('home.country.cta')}
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted">
              {country ? t('home.country.selected', { country }) : t('home.country.hint')}
            </p>
          </div>

          <p className="mt-3 text-sm text-muted">{t('home.search.free')}</p>
        </div>

        <div className="order-first lg:order-last">
          <HeroCarousel className="mx-auto w-full max-w-md lg:max-w-sm" />
        </div>
      </section>

      {/* Confianza */}
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Feature icon={<Heart className="h-6 w-6" />} title={t('home.f1.title')}>{t('home.f1.body')}</Feature>
        <Feature icon={<ShieldCheck className="h-6 w-6" />} title={t('home.f2.title')}>{t('home.f2.body')}</Feature>
        <Feature icon={<Compass className="h-6 w-6" />} title={t('home.f3.title')}>{t('home.f3.body')}</Feature>
        <Feature icon={<Lock className="h-6 w-6" />} title={t('home.f4.title')}>{t('home.f4.body')}</Feature>
      </div>

      {/* Acerca + invitación al Kit — en una misma línea en escritorio, apiladas en móvil */}
      <section className="mt-16 grid items-stretch gap-8 lg:grid-cols-2">
        <div className="flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-slate-900">{t('home.about.title')}</h2>
          <p className="mt-3 text-muted">{t('home.about.body1')}</p>
          <p className="mt-3 text-muted">{t('home.about.body2')}</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8">
          <div className="flex h-full flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" /> {t('kit.badge')}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{t('kit.home.title')}</h2>
            <p className="mt-2 leading-relaxed text-slate-700">{t('kit.home.text')}</p>
            <Button className="mt-5 w-fit" size="lg" onClick={() => navigate('/kit')} leadingIcon={<BookOpenCheck className="h-5 w-5" />}>
              {t('kit.home.cta')}
            </Button>
          </div>
        </div>
      </section>

      {/* Fundadores + Donantes: dos tarjetas gemelas (mismo contenedor degradado
          que la sección del Kit). Cada una conduce a su muro. En móvil se apilan. */}
      <section className="mt-16 grid items-stretch gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8">
          <div className="flex h-full flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm">
              <Award className="h-4 w-4" aria-hidden="true" /> {t('home.founders.badge')}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{t('home.founders.title')}</h2>
            <p className="mt-2 leading-relaxed text-slate-700">{t('home.founders.body')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="lg" onClick={() => navigate('/fundadores')} leadingIcon={<Award className="h-5 w-5" />}>
                {t('home.founders.cta')}
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8">
          <div className="flex h-full flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm">
              <HeartHandshake className="h-4 w-4" aria-hidden="true" /> {t('home.donors.badge')}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{t('home.donors.title')}</h2>
            <p className="mt-2 leading-relaxed text-slate-700">{t('home.donors.body')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="lg" onClick={() => navigate('/donantes')} leadingIcon={<HeartHandshake className="h-5 w-5" />}>
                {t('home.donors.cta')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Aliados: banda a todo el ancho debajo de Fundadores/Donantes, para que el
          grid pueda estirarse horizontalmente y mostrar más logos por fila. */}
      <section ref={deferRef} className="mt-16">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t('allies.title')}</h2>
        {deferInView && <Suspense fallback={null}><AlliesGrid /></Suspense>}
      </section>

      {deferInView && <Suspense fallback={null}><ContentCarousel /></Suspense>}
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">{icon}</span>
      <h2 className="mt-3 font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}
