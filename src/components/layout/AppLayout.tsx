/**
 * AppLayout — marco de la app con navegación accesible.
 *
 * Header con marca y enlaces; en móvil, barra inferior con destinos principales.
 * La navegación se adapta al estado de sesión y al rol. Áreas táctiles ≥44px,
 * estado activo visible y labels claros (poca carga cognitiva).
 */
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { Compass, LayoutDashboard, Settings, LogIn, LogOut, ShieldCheck, MessageCircleQuestion, School, GraduationCap, Grid3x3, X, BookOpenCheck, BookOpen, ShieldAlert, CalendarDays, ShoppingBag, MessageSquare, Heart, Lightbulb } from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/hooks/useMembership';
import { Button, SkeletonCard } from '@/components/ui';
import type { AuthView } from '@/components/onboarding/AuthModals';
import { track } from '@/lib/track';
import { NotificationsBell } from '@/components/content/NotificationsBell';
import { NavMoreMenu } from '@/components/layout/NavMoreMenu';
import { useFounderAutoClaim, useFounderProgressNotice } from '@/hooks/useFounder';
import { useReferralCapture } from '@/hooks/useReferral';
import { useMembershipGate } from '@/hooks/useMembershipGate';
import { useAppointmentReminders } from '@/hooks/useAppointmentRequests';

// ── Ventanas emergentes: fuera del bundle inicial ──────────────────────────
// Ninguna de estas se ve al abrir la portada, pero todas viajaban en index.js
// y había que descargarlas, analizarlas y ejecutarlas ANTES del primer pixel.
// Las dos más caras: AuthModals arrastraba react-hook-form + zod + todos los
// esquemas, y SocialOnboarding el catálogo de municipios de México (43 KB de
// fuente). Con React.lazy cada una se descarga el día que se abre.
//
// Todas se renderizan condicionalmente y envueltas en <Suspense fallback={null}>:
// mientras llega el chunk simplemente no hay modal, que es justo lo que había
// un instante antes.
const WelcomeVideo = lazy(() => import('@/components/onboarding/WelcomeVideo').then((m) => ({ default: m.WelcomeVideo })));
const AuthModals = lazy(() => import('@/components/onboarding/AuthModals').then((m) => ({ default: m.AuthModals })));
const SupportButton = lazy(() => import('@/components/onboarding/SupportButton').then((m) => ({ default: m.SupportButton })));
const SocialOnboarding = lazy(() => import('@/components/onboarding/SocialOnboarding').then((m) => ({ default: m.SocialOnboarding })));
const FounderPopup = lazy(() => import('@/components/onboarding/FounderPopup').then((m) => ({ default: m.FounderPopup })));
const GuidedTour = lazy(() => import('@/components/onboarding/GuidedTour').then((m) => ({ default: m.GuidedTour })));
const WelcomePopup = lazy(() => import('@/components/onboarding/WelcomePopup').then((m) => ({ default: m.WelcomePopup })));
const SoftSignupBanner = lazy(() => import('@/components/onboarding/SoftSignupBanner').then((m) => ({ default: m.SoftSignupBanner })));
const ReportModal = lazy(() => import('@/components/report/ReportModal').then((m) => ({ default: m.ReportModal })));
const MembershipReminderPopup = lazy(() => import('@/components/membership/MembershipReminderPopup').then((m) => ({ default: m.MembershipReminderPopup })));
const AccountInactiveModal = lazy(() => import('@/components/membership/AccountInactiveModal').then((m) => ({ default: m.AccountInactiveModal })));
const AccountReactivatedModal = lazy(() => import('@/components/membership/AccountReactivatedModal').then((m) => ({ default: m.AccountReactivatedModal })));
const SuspendedAccountModal = lazy(() => import('@/components/membership/SuspendedAccountModal').then((m) => ({ default: m.SuspendedAccountModal })));
const ImproveModal = lazy(() => import('@/components/layout/ImproveModal').then((m) => ({ default: m.ImproveModal })));
import { useAuthStore } from '@/stores/authStore';
import { setRefCode } from '@/hooks/useShop';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SocialLinks } from './SocialLinks';
import { AccessibilityMenu } from './AccessibilityMenu';
import { NavPill } from './NavPill';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { cn } from '@/lib/utils';

const INTRO_KEY = 'neuro.introSeen';
const TOUR_KEY = 'neuro.tourSeen';

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium md:flex-none md:flex-row md:gap-2 md:px-3 md:py-2 md:text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          isActive ? 'text-brand-700' : 'text-muted hover:text-slate-700',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

export function AppLayout() {
  const { isAuthenticated, isAdmin, fullName, signOut, needsOnboarding } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Perfil suspendido: bloquea con un aviso de reactivación al iniciar sesión.
  const suspendedAt = useAuthStore((s) => s.profile?.suspended_at ?? null);
  const suspendUntil = useAuthStore((s) => s.profile?.suspend_until ?? null);

  // Splash de video: una vez por navegador y SOLO en escritorio.
  //
  // En móvil cubría la pantalla en negro ~5 s en la primera visita: era la causa
  // del FCP de 4.4 s y el LCP de 5.1 s (la cadena de red era de solo 1.2 s).
  // Quien llega desde el teléfono —la mayoría— ve el sitio de inmediato; la
  // intro se conserva en pantallas grandes, donde la conexión suele ser mejor.
  const [showVideo, setShowVideo] = useState(() => {
    try {
      if (localStorage.getItem(INTRO_KEY) != null) return false;
      // Coincide con el breakpoint md de Tailwind (768px).
      const isDesktop =
        typeof window !== 'undefined' &&
        window.matchMedia('(min-width: 768px)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return isDesktop;
    } catch {
      return false;
    }
  });
  const [authView, setAuthView] = useState<AuthView>('none');
  const [showWelcome, setShowWelcome] = useState(false);
  // UI no crítica (banner de registro suave, botón flotante de soporte): sus
  // chunks se descargaban durante el primer pintado y entraban en la cadena
  // crítica del LCP (nodos SoftSignupBanner/SupportButton del árbol de red).
  // No se ven en el instante inicial, así que se montan cuando el navegador
  // queda ocioso; su descarga deja de competir con el héroe.
  const [deferUi, setDeferUi] = useState(false);
  // Guía rápida: se muestra una vez, tras el video de introducción.
  const [showTour, setShowTour] = useState(false);
  const [showFounder, setShowFounder] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { status: memStatus, daysLeft: memDays } = useMembership();
  // Detección automática de Miembro Fundador (reclama cupo si el usuario califica).
  useFounderAutoClaim();
  // Aviso al inicio de sesión con el % de cumplimiento de requisitos de Fundador.
  useFounderProgressNotice();
  // Captura ?ref= y atribuye la recomendación (programa Recomienda Neuromundi).
  useReferralCapture();
  // Recordatorios de cita 24 h antes (fallback del cliente para el destinatario).
  useAppointmentReminders();
  const [reportOpen, setReportOpen] = useState(false);
  const [improveOpen, setImproveOpen] = useState(false);
  // Cuenta inactiva por cuota sin cubrir: apaga el panel y explica con cordialidad.
  const { blocked, justReactivated, dismissReactivated } = useMembershipGate();
  const [gateOpen, setGateOpen] = useState(false);
  const showMemberBanner =
    isAuthenticated && !isAdmin && (memStatus === 'pending' || memStatus === 'past_due');

  const dismissVideo = () => {
    try {
      localStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* almacenamiento no disponible */
    }
    setShowVideo(false);
    // Al terminar el video, ofrecemos la guía rápida (solo la primera vez).
    try {
      if (localStorage.getItem(TOUR_KEY) == null) setShowTour(true);
    } catch { /* noop */ }
  };

  const closeTour = () => {
    try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* noop */ }
    setShowTour(false);
  };

  // Guía rápida para quien no está viendo el video: o ya lo vio en una visita
  // anterior, o entró desde móvil (donde el splash no se reproduce).
  //
  // Se APLAZA a propósito: montarla durante la carga inicial metía su DOM y su
  // trabajo en el momento más caro de la página (subió el TBT de 30 a 160 ms).
  // Esperamos a que el navegador quede ocioso; además da tiempo a que la
  // persona vea el sitio antes de que le aparezca un modal encima.
  useEffect(() => {
    if (showVideo) return;
    let cancelled = false;
    const offer = () => {
      if (cancelled) return;
      try {
        if (localStorage.getItem(TOUR_KEY) == null) setShowTour(true);
      } catch { /* noop */ }
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const id = w.requestIdleCallback
      ? w.requestIdleCallback(offer, { timeout: 4000 })
      : window.setTimeout(offer, 2500);
    return () => {
      cancelled = true;
      if (!w.requestIdleCallback) window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVideo]);

  // Monta la UI no crítica cuando el navegador queda ocioso (o, como respaldo,
  // 2 s después). Así sus chunks no viajan en la ventana del LCP.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const run = () => setDeferUi(true);
    const id = w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 3000 }) : window.setTimeout(run, 2000);
    return () => { if (!w.requestIdleCallback && typeof id === 'number') window.clearTimeout(id); };
  }, []);

  // Captura el código de afiliado (?ref=CODE) para aplicarlo en la compra.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) setRefCode(ref);
  }, []);

  // Bienvenida (1 sola vez): al volver del enlace de confirmación del correo
  // (Supabase añade `type=signup` al hash) o si quedó marcada al registrarse.
  useEffect(() => {
    const WELCOMED = 'neuromundi.welcomed';
    const PENDING = 'neuromundi.pendingWelcome';
    try {
      if (localStorage.getItem(WELCOMED) === '1') return;
      const hash = window.location.hash || '';
      const fromConfirm = /type=signup/.test(hash);
      const pending = localStorage.getItem(PENDING) === '1';
      if (fromConfirm || (pending && isAuthenticated)) {
        setShowWelcome(true);
        localStorage.setItem(WELCOMED, '1');
        localStorage.removeItem(PENDING);
      }
    } catch {
      /* almacenamiento no disponible */
    }
  }, [isAuthenticated, needsOnboarding]);

  // Popup "Miembro Fundador": para VISITANTES sin sesión, al primer scroll.
  // Si se cierra, no reaparece por 24h (localStorage).
  useEffect(() => {
    if (isAuthenticated) return;
    const KEY = 'neuro.founderPopup';
    try {
      const ts = Number(localStorage.getItem(KEY) || 0);
      if (ts && Date.now() - ts < 24 * 60 * 60 * 1000) return;
    } catch { /* noop */ }
    let shown = false;
    const onScroll = () => {
      if (shown || window.scrollY < 8) return;
      shown = true;
      window.removeEventListener('scroll', onScroll);
      setShowFounder(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isAuthenticated]);

  const closeFounder = (reason: 'cta' | 'later' | 'close') => {
    setShowFounder(false);
    try { localStorage.setItem('neuro.founderPopup', String(Date.now())); } catch { /* noop */ }
    if (reason !== 'cta') track('founder_popup_dismiss', { via: reason });
  };

  // El registro YA NO se abre solo al cargar (era intrusivo). Aparece por
  // intención (al intentar una acción que lo requiere) y, como recordatorio
  // suave, mediante un banner inferior una vez por sesión (ver SoftSignupBanner).

  // Si el usuario ya tiene sesión pero su cuota está pendiente o vencida, le
  // mostramos el modal de pago una vez por sesión (también tras iniciar sesión).
  useEffect(() => {
    if (showVideo || authView !== 'none' || isAdmin) return;
    if (memStatus !== 'pending' && memStatus !== 'past_due') return;
    try {
      if (sessionStorage.getItem('neuro.memPrompted') != null) return;
      sessionStorage.setItem('neuro.memPrompted', '1');
    } catch {
      /* noop */
    }
    setAuthView('membership');
  }, [showVideo, authView, memStatus, isAdmin]);

  // Aviso de cuenta inactiva: una vez por sesión, sin acosar al usuario.
  useEffect(() => {
    if (!blocked) return;
    try {
      if (sessionStorage.getItem('neuro.gatePrompted') != null) return;
      sessionStorage.setItem('neuro.gatePrompted', '1');
    } catch {
      /* noop */
    }
    setGateOpen(true);
  }, [blocked]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // BARRERA OBLIGATORIA: si el usuario entró por login social y aún no completó
  // su perfil, la app NO se renderiza. Solo puede completar el registro o salir.
  if (needsOnboarding) {
    return (
      <Suspense fallback={null}>
        <SocialOnboarding />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Todo lo emergente va aquí, perezoso y condicionado: nada de esto se ve
          en el primer pintado, así que tampoco tiene por qué descargarse antes.
          El fallback es `null` a propósito — un spinner de un modal que aún no
          existe sería ruido. */}
      <Suspense fallback={null}>
        {showVideo && <WelcomeVideo onDone={dismissVideo} />}
        {showWelcome && <WelcomePopup onClose={() => setShowWelcome(false)} />}
        {showTour && <GuidedTour onClose={closeTour} />}
        {showFounder && <FounderPopup onClose={closeFounder} />}
        {isAuthenticated && suspendedAt && (
          <SuspendedAccountModal
            until={suspendUntil}
            onExit={async () => { await signOut(); navigate('/'); }}
          />
        )}
        {isAuthenticated && <MembershipReminderPopup />}
        {reportOpen && <ReportModal onClose={() => setReportOpen(false)} />}
        {improveOpen && <ImproveModal onClose={() => setImproveOpen(false)} />}
        {gateOpen && blocked && (
          <AccountInactiveModal open onClose={() => setGateOpen(false)} />
        )}
        {justReactivated && (
          <AccountReactivatedModal
            open
            onClose={dismissReactivated}
            onGoToPanel={() => { dismissReactivated(); navigate('/panel'); }}
          />
        )}
        {/* Se monta solo cuando hay un modal de acceso abierto: así el chunk con
            react-hook-form + zod se descarga al pulsar "Entrar", no al llegar. */}
        {authView !== 'none' && (
          <AuthModals view={authView} onChangeView={setAuthView} onAuthenticated={() => navigate('/panel')} />
        )}
        {deferUi && <SoftSignupBanner onSignup={() => navigate('/crear-cuenta')} />}
      </Suspense>
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <NavLink to="/" className="inline-flex items-center gap-2 leading-none">
              <img
                src="/logo-header.png"
                alt=""
                width={48}
                height={48}
                decoding="async"
                className="h-11 w-11 shrink-0 object-contain"
              />
              <span className="inline-flex flex-col">
                <span className="text-[1.6875rem] font-extrabold text-[#8C6D1F]">{t('common.appName')}</span>
                <span className="mt-0.5 block w-full whitespace-nowrap text-center text-[0.66rem] font-semibold tracking-[0.04em] text-[#1e3a5f]">
                  {t('common.tagline')}
                </span>
              </span>
            </NavLink>
            <nav className="hidden items-center gap-x-2 gap-y-1.5 md:flex md:flex-wrap md:justify-end" aria-label={t('nav.directory')}>
              {/* Enlaces principales */}
              <NavPill to="/directorio" label={t('nav.directory')} colorClass="bg-brand-600" />
              <NavPill to="/inclusion-escolar" label={t('nav.school')} colorClass="bg-gradient-to-br from-amber-600 via-orange-500 to-rose-500" />
              <NavPill to="/academy" label={t('lms.tab')} colorClass="bg-gradient-to-br from-brand-600 via-brand-500 to-evs-5" />
              <NavPill to="/kit" label={t('nav.kit')} colorClass="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800" />
              <NavPill to="/blog" label={t('nav.blog')} colorClass="bg-gradient-to-br from-brand-600 via-indigo-600 to-indigo-800" />
              <NavPill to="/eventos" label={t('nav.events')} colorClass="bg-gradient-to-br from-indigo-600 via-indigo-700 to-brand-700" />
              <NavPill to="/tienda" label={t('shop.title')} colorClass="bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600" />
              {/* Secundarios agrupados para no saturar la barra */}
              <NavMoreMenu
                label={t('nav.more')}
                items={[
                  { to: '/proteccion-datos', label: t('nav.dataProtection'), icon: <ShieldCheck className="h-4 w-4" /> },
                  { to: '/pregunta-al-experto', label: t('nav.askExpert'), icon: <MessageCircleQuestion className="h-4 w-4" /> },
                ]}
              />

              {/* Separador visual entre navegación y controles de cuenta */}
              <span className="mx-1 hidden h-6 w-px bg-slate-200 lg:block" aria-hidden="true" />

              {/* Donación: botón sólido con color de acento (dorado de marca)
                  para que destaque del resto de la navegación. */}
              <NavLink
                to="/donar"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#8C6D1F] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#75591a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D1F] focus-visible:ring-offset-2"
              >
                <Heart className="h-4 w-4" aria-hidden="true" /> {t('nav.donate')}
              </NavLink>

              {isAuthenticated && <NotificationsBell />}
              <AccessibilityMenu />
              <LanguageSwitcher className="ml-1" />
              {isAuthenticated ? (
                <Button size="sm" variant="ghost" onClick={handleSignOut} leadingIcon={<LogOut className="h-4 w-4" />}>
                  {t('nav.logout')}
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate('/crear-cuenta')} leadingIcon={<LogIn className="h-4 w-4" />}>
                  {t('nav.login')}
                </Button>
              )}
            </nav>
            {/* Controles siempre visibles en móvil: accesibilidad (control visual) e idioma. */}
            <div className="flex items-center gap-1 md:hidden">
              {isAuthenticated && fullName && (
                <span className="mr-1 max-w-[6.5rem] truncate text-sm text-muted">{t('nav.greeting', { name: fullName.split(' ')[0] })}</span>
              )}
              <AccessibilityMenu />
              <LanguageSwitcher />
            </div>
          </div>

          {/* Segunda fila: panel del usuario, separada de la navegación general */}
          {isAuthenticated && (
            <nav
              className="mt-2 hidden flex-wrap items-center justify-start gap-2 border-t border-slate-100 pt-2 md:flex"
              aria-label={t('nav.myPanel')}
            >
              <NavPill to="/panel" label={t('nav.dashboard')} colorClass="bg-slate-700" disabled={blocked} onDisabledClick={() => setGateOpen(true)} />
              <NavPill to="/calendario" label={t('nav.calendar')} colorClass="bg-slate-600" disabled={blocked} onDisabledClick={() => setGateOpen(true)} />
              <NavPill to="/mensajes" label={t('nav.messages')} colorClass="bg-slate-600" disabled={blocked} onDisabledClick={() => setGateOpen(true)} />
              {/* Mi Perfil sigue accesible: ahí puede pagar y gestionar su cuenta. */}
              <NavPill to="/ajustes" label={t('nav.settings')} colorClass="bg-slate-600" />
            </nav>
          )}
        </div>
      </header>

      {showMemberBanner && (
        <div
          role="status"
          className={cn(
            'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm',
            memStatus === 'past_due' ? 'bg-evs-1/10 text-evs-1' : 'bg-warm-100 text-warm-800',
          )}
        >
          <span>
            {memStatus === 'past_due'
              ? t('membership.bannerPastDue')
              : t('membership.bannerPending', { days: memDays ?? 7 })}
          </span>
          <button
            type="button"
            onClick={() => setAuthView('membership')}
            className="font-semibold underline hover:no-underline"
          >
            {t('membership.bannerCta')}
          </button>
        </div>
      )}

      <main className="pb-20 md:pb-0">
        <Suspense
          fallback={
            <div className="mx-auto max-w-2xl p-4" aria-busy="true">
              <SkeletonCard rows={2} />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-slate-100 px-4 pt-4 pb-24 text-center text-sm text-muted md:pb-6">
        <p className="mb-3 font-semibold text-slate-700">{t('followUs.title')}</p>
        <SocialLinks className="mb-4" />
        {/* Instalar app: va JUSTO debajo de las redes, en la parte alta del pie,
            para que la barra inferior fija de móvil no lo tape (al final del pie
            sí quedaba cubierto). Devuelve null si no se puede instalar. */}
        <div className="mb-5 flex justify-center">
          <InstallAppButton />
        </div>
        <Link to="/proteccion-datos" className="hover:text-brand-700">{t('nav.dataProtection')}</Link>
        <span className="mx-2">·</span>
        <Link to="/privacidad" className="hover:text-brand-700">{t('auth.privacy')}</Link>
        <span className="mx-2">·</span>
        <Link to="/terminos" className="hover:text-brand-700">{t('auth.terms')}</Link>
        <span className="mx-2">·</span>
        <Link to="/manifiesto" className="hover:text-brand-700">{t('footer.manifesto')}</Link>
        <span className="mx-2">·</span>
        <Link to="/donar" className="font-semibold text-[#8C6D1F] hover:underline">{t('nav.donate')}</Link>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" /> {t('report.footerButton')}
          </button>
          <button
            type="button"
            onClick={() => setImproveOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-100 px-4 py-2 text-sm font-semibold text-green-800 transition-colors hover:bg-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            <Lightbulb className="h-4 w-4" aria-hidden="true" /> {t('improve.footerButton')}
          </button>
        </div>
      </footer>

      {/* Barra inferior móvil */}
      {/* Hoja "Más" (solo móvil): opciones que no caben en la barra inferior. */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-24 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">{t('nav.more')}</h2>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label={t('common.close')} className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { to: '/proteccion-datos', icon: <ShieldCheck className="h-6 w-6" />, label: t('nav.dataProtection'), color: 'bg-teal-600' },
                { to: '/pregunta-al-experto', icon: <MessageCircleQuestion className="h-6 w-6" />, label: t('nav.askExpert'), color: 'bg-cyan-600' },
                { to: '/inclusion-escolar', icon: <School className="h-6 w-6" />, label: t('school.title'), color: 'bg-gradient-to-br from-amber-600 via-orange-500 to-rose-500' },
                { to: '/academy', icon: <GraduationCap className="h-6 w-6" />, label: t('lms.tab'), color: 'bg-gradient-to-br from-brand-600 via-brand-500 to-evs-5' },
                { to: '/kit', icon: <BookOpenCheck className="h-6 w-6" />, label: t('nav.kit'), color: 'bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800' },
                { to: '/blog', icon: <BookOpen className="h-6 w-6" />, label: t('nav.blog'), color: 'bg-gradient-to-br from-brand-600 via-indigo-600 to-indigo-800' },
                { to: '/eventos', icon: <CalendarDays className="h-6 w-6" />, label: t('nav.events'), color: 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-brand-700' },
                ...(isAuthenticated ? [{ to: '/calendario', icon: <CalendarDays className="h-6 w-6" />, label: t('nav.calendar'), color: 'bg-slate-600' }] : []),
                ...(isAuthenticated ? [{ to: '/mensajes', icon: <MessageSquare className="h-6 w-6" />, label: t('nav.messages'), color: 'bg-slate-600' }] : []),
                { to: '/tienda', icon: <ShoppingBag className="h-6 w-6" />, label: t('shop.title'), color: 'bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600' },
                { to: '/donar', icon: <Heart className="h-6 w-6" />, label: t('nav.donate'), color: 'bg-[#8C6D1F]' },
              ].map((it) => (
                <button
                  key={it.to}
                  type="button"
                  onClick={() => { setMoreOpen(false); navigate(it.to); }}
                  className={`flex flex-col items-center gap-2 rounded-2xl p-4 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:brightness-110 active:scale-95 active:brightness-95 ${it.color}`}
                >
                  <span>{it.icon}</span>
                  {it.label}
                </button>
              ))}
            </div>
            {/* Instalar app: en el pie queda debajo de la barra inferior fija y
                no se alcanza en móvil. Aquí, en el menú "Más", es accesible. Solo
                se pinta si de verdad se puede instalar (el componente devuelve
                null en caso contrario), así que no ocupa espacio de más. */}
            <div className="mt-4 flex justify-center border-t border-slate-100 pt-4">
              <InstallAppButton />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <LanguageSwitcher />
              <AccessibilityMenu />
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-3 text-center text-sm font-semibold text-slate-700">{t('followUs.title')}</p>
              <SocialLinks />
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-100 bg-white md:hidden"
        aria-label={t('nav.dashboard')}
      >
        <NavItem to="/directorio" icon={<Compass className="h-5 w-5" />} label={t('nav.directory')} />
        <NavItem to="/pregunta-al-experto" icon={<MessageCircleQuestion className="h-5 w-5" />} label={t('nav.askExpert')} />
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-muted hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Grid3x3 className="h-5 w-5" />
          {t('nav.more')}
        </button>
        {isAuthenticated ? (
          <>
            <NavItem to="/panel" icon={<LayoutDashboard className="h-5 w-5" />} label={t('nav.dashboard')} />
            <NavItem to="/ajustes" icon={<Settings className="h-5 w-5" />} label={t('nav.settings')} />
          </>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/crear-cuenta')}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-muted hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <LogIn className="h-5 w-5" />
            {t('nav.login')}
          </button>
        )}
      </nav>

      {deferUi && (
        <Suspense fallback={null}>
          <SupportButton />
        </Suspense>
      )}
    </div>
  );
}
