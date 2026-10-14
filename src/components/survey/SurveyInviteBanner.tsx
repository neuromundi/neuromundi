/**
 * SurveyInviteBanner — invitación NO intrusiva a la Primera Encuesta Internacional.
 * Aparece como banner inferior descartable, UNA VEZ POR SESIÓN, solo para usuarios
 * CON SESIÓN y PERFIL COMPLETO (`!needsOnboarding`), tras ~40% de scroll o ~20 s.
 *
 * Apagado: la encuesta es anónima (no sabemos server-side quién respondió), así que
 * al ENVIARLA se marca `neuro.surveyInvite.answered` en localStorage (lo hace
 * Encuesta.tsx) y este banner ya no vuelve a mostrarse en ese dispositivo. El
 * descarte ("Ahora no"/×) solo lo silencia la sesión en curso (una vez por sesión).
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, ClipboardList } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const SURVEY_ANSWERED_KEY = 'neuro.surveyInvite.answered';
const SESSION_KEY = 'neuro.surveyInvite.session';

export function SurveyInviteBanner({ onRespond }: { onRespond: () => void }) {
  const { t } = useTranslation();
  const { isAuthenticated, needsOnboarding } = useAuth();
  const { pathname } = useLocation();
  // No estorbar en la propia encuesta ni en el flujo de registro/acceso.
  const onSurveyOrAuth = /^\/(encuesta|crear-cuenta|entrar|auth)/.test(pathname);
  const eligible = isAuthenticated && !needsOnboarding && !onSurveyOrAuth;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    try {
      if (localStorage.getItem(SURVEY_ANSWERED_KEY) != null) return; // ya respondió: apagado permanente
      if (sessionStorage.getItem(SESSION_KEY) != null) return;        // ya se mostró esta sesión
    } catch { /* noop */ }

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* noop */ }
      setShow(true);
      window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => {
      const scrolled = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
      if (scrolled >= 0.4) reveal();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const timer = window.setTimeout(reveal, 20000);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
    };
  }, [eligible]);

  const dismiss = () => setShow(false);
  const respond = () => { setShow(false); onRespond(); };

  if (!show || !eligible) return null;

  return (
    <div
      role="region"
      aria-label={t('survey.invite.title')}
      className="fixed bottom-24 right-3 z-40 w-[calc(100%-1.5rem)] max-w-sm rounded-2xl border-2 border-brand-200 bg-brand-50 p-4 shadow-xl ring-1 ring-brand-100 md:bottom-4 md:right-4"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('common.close')}
        className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
      <span className="mb-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 shadow-sm">
        <ClipboardList className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-bold text-slate-900">{t('survey.invite.title')}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">{t('survey.invite.body')}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={respond}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
        >
          {t('survey.invite.cta')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          {t('survey.invite.later')}
        </button>
      </div>
    </div>
  );
}
