/**
 * SoftSignupBanner — recordatorio NO intrusivo para crear cuenta. Aparece solo
 * para usuarios sin sesión, una vez por sesión, tras ~40% de scroll o ~25s, como
 * banner inferior descartable. No tapa la pantalla ni interrumpe la lectura.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const DISMISS_KEY = 'neuro.softSignupDismissed';

export function SoftSignupBanner({ onSignup }: { onSignup: () => void }) {
  const { t } = useTranslation();
  const { isAuthenticated, needsOnboarding } = useAuth();
  const { pathname } = useLocation();
  // No estorbar cuando el usuario ya está en el flujo de registro/acceso.
  const onAuthFlow = /^\/(crear-cuenta|entrar|auth)/.test(pathname);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isAuthenticated || needsOnboarding || onAuthFlow) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) != null) return;
    } catch { /* noop */ }

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setShow(true);
      window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => {
      const scrolled = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
      if (scrolled >= 0.4) reveal();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const timer = window.setTimeout(reveal, 25000);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
    };
  }, [isAuthenticated, needsOnboarding, onAuthFlow]);

  const dismiss = () => {
    setShow(false);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
  };

  if (!show || isAuthenticated || needsOnboarding || onAuthFlow) return null;

  return (
    <div
      role="region"
      aria-label={t('signup.banner.title')}
      className="fixed bottom-24 right-3 z-40 w-[calc(100%-1.5rem)] max-w-sm rounded-2xl border-2 border-sky-200 bg-sky-50 p-4 shadow-xl ring-1 ring-sky-100 md:bottom-4 md:right-4"
    >
      <span className="mb-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 shadow-sm">
        <UserPlus className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-slate-900">{t('signup.banner.title')}</p>
        <p className="text-sm text-muted">{t('signup.banner.body')}</p>
      </div>
      <div className="mt-3 flex items-center gap-2 md:mt-0">
        <button
          onClick={() => { dismiss(); onSignup(); }}
          className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {t('signup.banner.cta')}
        </button>
        <button
          onClick={dismiss}
          aria-label={t('common.close')}
          className="rounded-lg p-2 text-muted hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
