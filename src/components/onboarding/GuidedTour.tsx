/**
 * GuidedTour — guía rápida de bienvenida (baja carga cognitiva).
 *
 * Presenta en pocos pasos las áreas principales de Neuromundi con lenguaje
 * literal y claro. Los pasos se ADAPTAN AL ROL: quien atiende (prestador) ve su
 * agenda, mensajería y métricas; una familia/paciente ve el kit, la formación y
 * los eventos. Se muestra una sola vez (el disparo lo controla quien lo monta) y
 * puede reabrirse desde Ajustes. Respeta "reducir movimiento" y es accesible por
 * teclado.
 */
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Compass, CalendarDays, BookOpenCheck, GraduationCap, ShieldAlert, Smartphone, Accessibility, CalendarClock, MessageSquare, BarChart3, X } from 'lucide-react';
import { useA11y } from '@/stores/a11yStore';
import { useAuth } from '@/hooks/useAuth';

// Pasos por rol. La familia/paciente descubre lo que consume; el prestador, lo
// que gestiona. Los pasos comunes (directorio, seguridad, app) van en ambos.
const FAMILY_STEPS = [
  { icon: Compass, key: 'directory' },
  { icon: BookOpenCheck, key: 'kit' },
  { icon: GraduationCap, key: 'academy' },
  { icon: CalendarDays, key: 'events' },
  { icon: ShieldAlert, key: 'safety' },
  { icon: Smartphone, key: 'app' },
] as const;

const PROVIDER_STEPS = [
  { icon: Compass, key: 'directory' },
  { icon: CalendarClock, key: 'agenda' },
  { icon: MessageSquare, key: 'messages' },
  { icon: BarChart3, key: 'metrics' },
  { icon: ShieldAlert, key: 'safety' },
  { icon: Smartphone, key: 'app' },
] as const;

export function GuidedTour({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { isProvider } = useAuth();
  const reduceMotion = useA11y((s) => s.reduceMotion);
  const [step, setStep] = useState(0);
  const STEPS = useMemo(() => (isProvider ? PROVIDER_STEPS : FAMILY_STEPS), [isProvider]);
  const last = STEPS.length - 1;
  const safeStep = Math.min(step, last);
  const Icon = STEPS[safeStep].icon;
  const k = STEPS[safeStep].key;

  const next = () => (safeStep < last ? setStep(safeStep + 1) : onClose());
  const prev = () => setStep(Math.max(0, safeStep - 1));

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        style={{ animation: reduceMotion ? undefined : 'nm-pop 260ms ease-out' }}
      >
        <style>{`@keyframes nm-pop { 0% { transform: scale(0.94); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>

        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 id="tour-title" className="text-center text-xl font-extrabold text-slate-900">
          {t(`tour.${k}.title`)}
        </h2>
        <p className="mt-2 text-center text-slate-600">{t(`tour.${k}.body`)}</p>

        {/* Indicador de progreso */}
        <div className="mt-5 flex justify-center gap-2" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`h-2 rounded-full transition-all ${i === safeStep ? 'w-6 bg-brand-500' : 'w-2 bg-slate-200'}`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-muted hover:text-slate-700"
          >
            {t('tour.skip')}
          </button>
          <div className="flex gap-2">
            {safeStep > 0 && (
              <button
                type="button"
                onClick={prev}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('tour.prev')}
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {safeStep === last ? t('tour.done') : t('tour.next')}
            </button>
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Accessibility className="h-3.5 w-3.5" aria-hidden="true" /> {t('tour.a11yNote')}
        </p>
      </div>
    </div>,
    document.body,
  );
}
