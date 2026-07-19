/**
 * WelcomePopup — se muestra UNA sola vez, cuando el usuario vuelve tras confirmar
 * su correo. Celebra el registro con una lluvia de estrellas doradas.
 * El disparo y el "una sola vez" los controla AppLayout (flag en localStorage).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useA11y } from '@/stores/a11yStore';

export function WelcomePopup({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  // Respeta la preferencia de "reducir movimiento" (sensibilidad sensorial):
  // si está activa, no se genera la lluvia de estrellas animada.
  const reduceMotion =
    (typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ||
    useA11y.getState().reduceMotion;

  // Genera estrellas con posición/tiempo aleatorios (estable durante el montaje).
  const stars = useMemo(
    () =>
      reduceMotion
        ? []
        : Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 2.5,
            duration: 2.5 + Math.random() * 2.5,
            size: 10 + Math.random() * 16,
            opacity: 0.6 + Math.random() * 0.4,
          })),
    [reduceMotion],
  );

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
      <style>{`
        @keyframes nm-starfall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(220deg); opacity: 0; }
        }
        @keyframes nm-pop {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Lluvia de estrellas (no captura clics) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {stars.map((s) => (
          <span
            key={s.id}
            className="absolute top-0"
            style={{
              left: `${s.left}%`,
              fontSize: `${s.size}px`,
              opacity: s.opacity,
              color: '#FFD23F',
              animation: `nm-starfall ${s.duration}s linear ${s.delay}s infinite`,
              textShadow: '0 0 6px rgba(255,210,63,0.8)',
            }}
          >
            ★
          </span>
        ))}
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl"
        style={{ animation: reduceMotion ? undefined : 'nm-pop 300ms ease-out' }}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-evs-5 text-white">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 id="welcome-title" className="text-2xl font-extrabold text-slate-900">{t('welcome.title')}</h2>
        <p className="mt-2 text-slate-600">{t('welcome.body')}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white shadow-lg hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t('welcome.cta')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
