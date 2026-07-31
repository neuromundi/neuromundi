/**
 * TribuNeuromundi — módulo de Inclusión Social (/tribu). Fundación (F1):
 * inscripción con reglas + semáforo de energía, clubes/foros temáticos (creados
 * por los miembros, aprobados por el admin), búsqueda por país/idioma/tema,
 * unión, invitaciones y chat básico. Solo para pacientes, padres/tutores y
 * especialistas (consumidores y prestadores no comerciales).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Search, Globe, Sparkles, MailPlus, Check, X, HeartHandshake, ShieldCheck, Gauge, CalendarCheck, UserPlus, LogIn } from 'lucide-react';
import { Button, SkeletonCard, EmptyState, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useTribeMembership, useTribeForums, useTribeInvites, useTribeModerator, type TribeForum } from '@/hooks/useTribe';
import { JoinTribeModal, tribeLogo } from '@/components/tribe/JoinTribeModal';
import { EnergyPicker } from '@/components/tribe/EnergyBadge';
import { ForumRoom } from '@/components/tribe/ForumRoom';
import { TribeLevelCard } from '@/components/tribe/TribeLevelCard';
import { ModeratorsSection } from '@/components/tribe/ModeratorsSection';
import { MentorshipSection } from '@/components/tribe/MentorshipSection';
import { EventsSection } from '@/components/tribe/EventsSection';
import { COUNTRIES } from '@/data/countries';
import { useCountryLabel } from '@/lib/countryLabel';

const LANGS: { code: string; label: string }[] = [
  { code: 'es', label: 'Español' }, { code: 'en', label: 'English' }, { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' }, { code: 'it', label: 'Italiano' }, { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' }, { code: 'zh', label: '中文' }, { code: 'ar', label: 'العربية' },
  { code: 'he', label: 'עברית' }, { code: 'ko', label: '한국어' },
];
const inputCls = 'w-full rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

interface CreateForumInput { title: string; description: string; theme: string; country: string; city: string; language: string; notifyCountries: string[]; applyModerator: boolean }

function CreateForumForm({ onCreate, onCancel }: { onCreate: (i: CreateForumInput) => Promise<boolean>; onCancel: () => void }) {
  const { t, i18n } = useTranslation();
  const countryLabel = useCountryLabel();
  const toast = useToast();
  const { mod } = useTribeModerator();
  const isApprovedMod = mod?.status === 'approved';
  const [f, setF] = useState({ title: '', description: '', theme: '', country: '', city: '', language: i18n.language.slice(0, 2) });
  const [notify, setNotify] = useState<string[]>([]);
  const [applyMod, setApplyMod] = useState(false);
  const [showCountries, setShowCountries] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const toggleCountry = (name: string) => setNotify((p) => (p.includes(name) ? p.filter((c) => c !== name) : [...p, name]));

  const submit = async () => {
    if (f.title.trim().length < 3) { toast.error(t('tribe.forumTitleReq')); return; }
    setBusy(true);
    const ok = await onCreate({ ...f, notifyCountries: notify, applyModerator: applyMod && isApprovedMod });
    setBusy(false);
    if (ok) { toast.success(t('tribe.forumPending')); onCancel(); }
    else toast.error(t('tribe.forumErr'));
  };

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-900">{t('tribe.newForum')}</h3>

      {/* Aviso: aprobación + moderador + reglas + código de ética */}
      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        {t('tribe.forumTerms')}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold text-slate-800">{t('tribe.forumTitle')}</label><input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder={t('tribe.forumTitlePh')} /></div>
        <div><label className="mb-1 block text-sm font-semibold text-slate-800">{t('tribe.theme')}</label><input className={inputCls} value={f.theme} onChange={(e) => set('theme', e.target.value)} placeholder={t('tribe.themePh')} /></div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-800">{t('tribe.language')}</label>
          <select className={inputCls} value={f.language} onChange={(e) => set('language', e.target.value)}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-800">{t('tribe.country')}</label>
          <select className={inputCls} value={f.country} onChange={(e) => set('country', e.target.value)}>
            <option value="">{t('tribe.anyCountry')}</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>)}
          </select>
        </div>
        <div><label className="mb-1 block text-sm font-semibold text-slate-800">{t('tribe.city')}</label><input className={inputCls} value={f.city} onChange={(e) => set('city', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold text-slate-800">{t('tribe.forumDesc')}</label><textarea rows={2} className={inputCls} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
      </div>

      {/* Países a los que llega el aviso de creación (vacío = todos) */}
      <div className="mt-3">
        <button type="button" onClick={() => setShowCountries((v) => !v)} className="text-sm font-semibold text-brand-700 hover:underline">
          {t('tribe.notifyCountries')} {notify.length > 0 ? `(${notify.length})` : `· ${t('tribe.allCountries')}`}
        </button>
        {showCountries && (
          <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {COUNTRIES.map((c) => (
                <label key={c.code} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <input type="checkbox" checked={notify.includes(c.name)} onChange={() => toggleCountry(c.name)} className="h-4 w-4 rounded border-slate-300 text-brand-500" />
                  <span className="truncate">{countryLabel(c.code, c.name)}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Postularse como moderador (solo moderadores aprobados) */}
      {isApprovedMod && (
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={applyMod} onChange={(e) => setApplyMod(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-brand-500" />
          <span>{t('tribe.applyAsModerator')}</span>
        </label>
      )}

      <div className="mt-3 flex gap-2">
        <Button size="sm" loading={busy} onClick={() => void submit()}>{t('tribe.createForum')}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t('tribe.cancel')}</Button>
      </div>
    </div>
  );
}

/** Características de Tribu que se muestran en el área de acceso pública. */
const TRIBE_FEATURES = [
  { k: 'forums', icon: Users },
  { k: 'mentor', icon: HeartHandshake },
  { k: 'mods', icon: ShieldCheck },
  { k: 'energy', icon: Gauge },
  { k: 'events', icon: CalendarCheck },
] as const;

export function TribuNeuromundi() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const countryLabel = useCountryLabel();
  const { isConsumer, isProvider, userId, isAuthenticated } = useAuth();
  const { member, loading, isSuspended, canWrite, setEnergy, setSilent, reload } = useTribeMembership();
  const [showJoin, setShowJoin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<TribeForum | null>(null);
  // Filtros de búsqueda de chats
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [theme, setTheme] = useState('');
  const filters = useMemo(() => ({ query: q, country, language, theme }), [q, country, language, theme]);

  const { forums, loading: loadingForums, create, joinForum, closeForum } = useTribeForums(filters);
  const { invites, respond } = useTribeInvites();

  // Elegibles: consumidores (paciente/familia) y especialistas (prestador).
  const eligible = isConsumer || isProvider;

  if (loading) return <div className="mx-auto max-w-3xl p-4"><SkeletonCard rows={4} /></div>;

  // No inscrito (o sin sesión) → área de acceso pública: qué es la Tribu,
  // sus características y cómo entrar (crear cuenta o iniciar sesión).
  if (!member) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center">
          <img src={tribeLogo(i18n.language)} alt="Tribu Neuromundi" className="mx-auto h-28 w-auto" />
          <h1 className="mt-4 text-3xl font-bold text-slate-900">{t('tribe.title')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">{t('tribe.landing')}</p>
        </div>

        {/* Características de Tribu Neuromundi */}
        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-900">{t('tribe.about.title')}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {TRIBE_FEATURES.map(({ k, icon: Icon }) => (
              <div key={k} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t(`tribe.about.${k}T`)}</p>
                  <p className="mt-0.5 text-sm text-muted">{t(`tribe.about.${k}D`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo acceder */}
        <section className="mt-8 rounded-2xl border border-brand-100 bg-brand-50/50 p-5 text-center">
          <h2 className="text-lg font-bold text-slate-900">{t('tribe.access.title')}</h2>
          {!isAuthenticated ? (
            <>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-700">{t('tribe.access.body')}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button size="lg" onClick={() => navigate('/crear-cuenta')} leadingIcon={<UserPlus className="h-5 w-5" />}>{t('tribe.access.createBtn')}</Button>
                <Button size="lg" variant="secondary" onClick={() => navigate('/entrar')} leadingIcon={<LogIn className="h-5 w-5" />}>{t('tribe.access.loginBtn')}</Button>
              </div>
            </>
          ) : eligible ? (
            <>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-700">{t('tribe.access.ready')}</p>
              <Button className="mt-4" size="lg" onClick={() => setShowJoin(true)} leadingIcon={<Sparkles className="h-5 w-5" />}>{t('tribe.joinCta')}</Button>
            </>
          ) : (
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{t('tribe.onlyEligible')}</p>
          )}
        </section>

        {showJoin && <JoinTribeModal onClose={() => setShowJoin(false)} onJoined={() => { setShowJoin(false); void reload(); }} />}
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{t('tribe.title')}</h1>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{t('tribe.suspended')}</p>
      </div>
    );
  }

  if (open) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <ForumRoom forum={open} canWrite={canWrite} onBack={() => setOpen(null)} onCloseForum={closeForum} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex items-center gap-3">
        <img src={tribeLogo(i18n.language)} alt="Tribu Neuromundi" className="h-12 w-auto" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('tribe.title')}</h1>
          <p className="text-sm text-muted">{t('tribe.hubSubtitle')}</p>
        </div>
      </header>

      {/* Nivel, puntos e impacto (con modo silencioso) */}
      {userId && <div className="mt-6"><TribeLevelCard member={member} userId={userId} onToggleSilent={(s) => void setSilent(s)} /></div>}

      {/* Semáforo de energía del día */}
      <section className="mt-6 rounded-2xl border border-slate-100 p-4">
        <p className="mb-2 text-sm font-semibold text-slate-900">{t('tribe.energyToday')}</p>
        {member && <EnergyPicker value={member.energy} onChange={(e) => void setEnergy(e)} />}
      </section>

      {/* Moderadores: postulación y directorio */}
      {userId && <ModeratorsSection userId={userId} />}

      {/* Mentoría de pares */}
      <MentorshipSection />

      {/* Eventos con guía de anticipación */}
      <EventsSection />

      {/* Invitaciones pendientes */}
      {invites.length > 0 && (
        <section className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><MailPlus className="h-4 w-4 text-brand-600" /> {t('tribe.invitesTitle')}</h2>
          <ul className="mt-2 space-y-2">
            {invites.map((iv) => (
              <li key={iv.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5">
                <span className="min-w-0 text-sm text-slate-800"><span className="font-semibold">{iv.forum_title}</span> · {iv.inviter_name}</span>
                <span className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => void respond(iv.id, true)} className="rounded-lg bg-brand-600 p-1.5 text-white hover:bg-brand-700"><Check className="h-4 w-4" /></button>
                  <button type="button" onClick={() => void respond(iv.id, false)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" /></button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Buscador de chats */}
      <section className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Users className="h-5 w-5 text-brand-600" /> {t('tribe.forums')}</h2>
          {canWrite && !creating && <Button size="sm" onClick={() => setCreating(true)} leadingIcon={<Plus className="h-4 w-4" />}>{t('tribe.newForum')}</Button>}
        </div>

        {creating && <div className="mt-3"><CreateForumForm onCreate={create} onCancel={() => setCreating(false)} /></div>}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('tribe.searchPh')} className={`${inputCls} pl-9`} />
          </div>
          <select className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">{t('tribe.anyCountry')}</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>)}
          </select>
          <select className={inputCls} value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">{t('tribe.anyLanguage')}</option>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <input className={inputCls} value={theme} onChange={(e) => setTheme(e.target.value)} placeholder={t('tribe.themeFilter')} />
        </div>

        <div className="mt-4 space-y-2">
          {loadingForums ? (
            <SkeletonCard rows={3} />
          ) : forums.length === 0 ? (
            <EmptyState icon={<Globe className="h-6 w-6" />} title={t('tribe.noForumsTitle')} description={t('tribe.noForums')} />
          ) : (
            forums.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{f.title}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    {f.theme && <span>{f.theme}</span>}
                    {f.country && <span>{f.country}</span>}
                    <span>{t('tribe.membersCount', { n: f.members })}</span>
                  </p>
                </div>
                {f.i_member ? (
                  <Button size="sm" onClick={() => setOpen(f)}>{t('tribe.enter')}</Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={async () => { const ok = await joinForum(f.id); if (ok) setOpen({ ...f, i_member: true }); }}>{t('tribe.joinForum')}</Button>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
