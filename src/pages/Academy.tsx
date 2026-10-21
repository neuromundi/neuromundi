/**
 * Academy — formación en neuroeducación y neurodesarrollo.
 *
 * Entrada por PERFIL (familias / especialistas / docentes): cada perfil tiene su
 * tono y sus temáticas transversales. Al elegir un perfil se muestran sus temas y
 * el catálogo se filtra por audiencia (los cursos sin audiencia son generales y
 * aparecen en los tres) y por nivel. Cualquiera puede inscribirse.
 */
import { useMemo, useState } from 'react';
import { useEmpresaLimitada } from '@/hooks/useEmpresaLimitada';
import { EmpresaLimitadaMuro } from '@/components/membership/EmpresaLimitadaMuro';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listaDeTextos } from '@/lib/listaDeTextos';
import { GraduationCap, BookOpen, Play, Check, HeartHandshake, Stethoscope, School, Search } from 'lucide-react';
import { Button, SkeletonCard, useToast, EmptyState, HowTo , AvisoDeFallo } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAcademy } from '@/hooks/useAcademy';
import { CountryFilter } from '@/components/common/CountryFilter';
import { AvisoDeSeccion } from '@/components/common/AvisoDeSeccion';
import { useCountry } from '@/stores/countryStore';
import { SectionFilter, perteneceASeccion } from '@/components/common/SectionFilter';
import type { SectionValue } from '@/data/sections';

type ProfileKey = 'families' | 'specialists' | 'educators';

const PROFILES: { key: ProfileKey; icon: typeof HeartHandshake; color: string }[] = [
  { key: 'families', icon: HeartHandshake, color: 'from-emerald-500 to-teal-600' },
  { key: 'specialists', icon: Stethoscope, color: 'from-brand-600 to-indigo-600' },
  { key: 'educators', icon: School, color: 'from-amber-500 to-orange-600' },
];

export function Academy() {
  const { limitada: empresaLimitada } = useEmpresaLimitada();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { courses, enrolledIds, loading, fallo, enroll, reload } = useAcademy();
  const { country } = useCountry();

  const [profile, setProfile] = useState<ProfileKey | null>(null);
  const [level, setLevel] = useState<string>('');
  const [q, setQ] = useState('');
  // Las tres áreas de Neuromundi, igual que en el directorio y el blog.
  const [section, setSection] = useState<SectionValue | null>(null);

  const levels = useMemo(
    () => [...new Set(courses.map((c) => c.level).filter((l): l is string => !!l))].sort(),
    [courses],
  );

  const filtered = useMemo(
    () =>
      courses.filter((c) => {
        const aud = (c as { audience?: string | null }).audience ?? null;
        const matchProfile = !profile || aud === null || aud === profile;
        const matchLevel = !level || c.level === level;
        const term = q.trim().toLowerCase();
        const matchText = !term || `${c.title} ${c.description ?? ''}`.toLowerCase().includes(term);
        const matchArea = perteneceASeccion(c.sections, section);
        return matchProfile && matchLevel && matchText && matchArea;
      }),
    [courses, profile, level, q, section],
  );

  const themes = profile ? listaDeTextos(t, `lms.profiles.${profile}.themes`) : [];

  // Empresa con 45 días sin publicar oferta: esta pantalla queda limitada
  // hasta que publique una (migración 0223). No hay cargo de por medio.
  if (empresaLimitada) return <EmpresaLimitadaMuro />;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-evs-5 p-8 text-white shadow-lg">
        <GraduationCap className="h-10 w-10 opacity-90" />
        <h1 className="mt-3 text-3xl font-extrabold">{t('lms.title')}</h1>
        <p className="mt-2 max-w-xl text-white/90">{t('lms.subtitle')}</p>
      </section>

      <HowTo stepsKey="howto.academyLearner" />

      {/* Tarjetas de perfil */}
      <section>
        <h2 className="text-lg font-bold text-slate-900">{t('lms.chooseProfile')}</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {PROFILES.map(({ key, icon: Icon, color }) => {
            const active = profile === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setProfile(active ? null : key); setLevel(''); }}
                aria-pressed={active}
                className={`group rounded-2xl border p-5 text-left transition ${active ? 'border-brand-500 ring-2 ring-brand-500' : 'border-slate-100 hover:shadow-md'}`}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white`}>
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-3 font-bold text-slate-900">{t(`lms.profiles.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-muted">{t(`lms.profiles.${key}.desc`)}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-brand-700">
                  {active ? t('lms.viewingProfile') : t('lms.enterProfile')}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Temáticas del perfil elegido */}
      {profile && themes.length > 0 && (
        <section className="rounded-2xl bg-brand-50/60 p-5">
          <h3 className="font-bold text-slate-900">{t('lms.profileThemesTitle')}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {themes.map((th) => (
              <span key={th} className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 shadow-sm">{th}</span>
            ))}
          </div>
        </section>
      )}

      {/* Segmentación por país (por el país del autor del curso) */}
      <CountryFilter />

      {/* Filtro por las tres áreas de Neuromundi */}
      <SectionFilter value={section} onChange={setSection} />

      {/* Buscador de cursos */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 rtl:left-auto rtl:right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 rtl:pl-3 rtl:pr-10 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          placeholder={t('lms.searchPlaceholder')}
          aria-label={t('lms.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Filtro por nivel */}
      {levels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{t('lms.level')}:</span>
          <button
            onClick={() => setLevel('')}
            className={`rounded-full px-3 py-1 text-sm ${level === '' ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {t('lms.levelAll')}
          </button>
          {levels.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`rounded-full px-3 py-1 text-sm ${level === l ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Catálogo */}
      {loading ? (
        <SkeletonCard rows={4} />
      ) : filtered.length === 0 ? (
        fallo ? (
          <AvisoDeFallo onRetry={() => void reload()} />
        ) : courses.length === 0 ? (
          // CATALOGO VACIO DE VERDAD: no hay ni un curso en la plataforma.
          // Se distingue del caso de abajo porque decir "estamos preparando
          // los primeros cursos" cuando SI hay cursos y el filtro no devolvio
          // ninguno es falso, y manda al visitante a esperar algo que ya esta.
          <EmptyState
            icon={<GraduationCap className="h-6 w-6" />}
            title={t('lms.emptyTitle')}
            description={t('lms.empty')}
            action={
              <div className="flex flex-col items-center gap-3">
                <AvisoDeSeccion seccion="academy" pais={country} />
                <Link to="/crear-cuenta" className="text-sm font-semibold text-brand-700 underline">
                  {t('lms.emptyTeachCta')}
                </Link>
              </div>
            }
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
            {t('lms.noResults')}
          </p>
        )
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const isEnrolled = enrolledIds.has(c.id);
            return (
              <article key={c.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
                <div className="relative h-32 bg-gradient-to-br from-brand-100 to-evs-5/20">
                  {c.cover_url ? (
                    <img loading="lazy" decoding="async" src={c.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-brand-300"><BookOpen className="h-10 w-10" /></div>
                  )}
                  {c.level && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-slate-700">{c.level}</span>}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-bold text-slate-900">{c.title}</h3>
                  {c.description && <p className="mt-1 line-clamp-3 text-sm text-muted">{c.description}</p>}
                  <div className="mt-auto pt-3">
                    {isEnrolled ? (
                      <Button fullWidth variant="secondary" onClick={() => navigate(`/academy/${c.id}`)} leadingIcon={<Play className="h-4 w-4" />}>
                        {t('lms.continue')}
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button fullWidth onClick={async () => {
                          if (!isAuthenticated) { navigate(`/academy/${c.id}`); return; }
                          const r = await enroll(c.id);
                          if (r.ok) navigate(`/academy/${c.id}`); else toast.error(r.error);
                        }}>
                          {t('lms.enroll')}
                        </Button>
                      </div>
                    )}
                    {isEnrolled && <p className="mt-2 flex items-center justify-center gap-1 text-xs text-evs-5"><Check className="h-3.5 w-3.5" /> {t('lms.enrolled')}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
