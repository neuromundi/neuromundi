/**
 * FounderPopup — modal global de invitación a "Miembro Fundador".
 *
 * Disparo: primer scroll de un visitante sin sesión (lo controla AppLayout).
 * Frecuencia: si se cierra, no reaparece por 24h (localStorage, en AppLayout).
 *
 * Diseño: una ÚNICA lista de beneficios (cada uno indica entre paréntesis a quién
 * aplica) y un recuadro que remite a consultar los requisitos específicos de cada
 * perfil en el formulario de registro. No hay pestañas por tipo ni botones de
 * acción: el usuario cierra con la X. La adhesión al programa se hace luego desde
 * el recuadro "Programa Fundador" del propio formulario de registro.
 */
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { tList } from '@/lib/tList';
import { X, Award, Check, Sparkles, ClipboardList } from 'lucide-react';
import { useState } from 'react';

export function FounderPopup({ onClose }: { onClose: (reason: 'cta' | 'later' | 'close') => void }) {
  const { t } = useTranslation();
  const [imgOk, setImgOk] = useState(true);

  const benefits = tList(t, 'founder.allBenefits');

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 motion-safe:animate-fade"
      role="dialog"
      aria-modal="true"
      aria-labelledby="founder-title"
      onClick={() => onClose('close')}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cierre (única acción) */}
        <button
          type="button"
          onClick={() => onClose('close')}
          aria-label={t('founder.close')}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Encabezado con degradado de marca */}
        <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 px-6 py-6 text-white sm:px-8">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white/40">
              {imgOk ? (
                <img
                  src="/badges/soy-fundador-neuromundi.jpg"
                  alt=""
                  className="h-16 w-16 object-cover"
                  onError={() => setImgOk(false)}
                />
              ) : (
                <Award className="h-8 w-8" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white/80">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('founder.kicker')}
              </p>
              <h2 id="founder-title" className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">
                {t('founder.title')}
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/90">{t('founder.intro')}</p>
        </div>

        {/* Cuerpo desplazable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8">
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">{t('founder.persuasive')}</p>

          {/* Lista única de beneficios (cada uno indica a quién aplica). */}
          <section className="mt-4">
            <h3 className="mb-2 flex items-center gap-1.5 font-bold text-slate-900">
              <Award className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('founder.benefitsTitle')}
            </h3>
            <ul className="space-y-1.5">
              {benefits.map((b, i) => (
                <li key={i} className="flex gap-2 text-sm leading-snug text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Recuadro: los requisitos se consultan al registrarse. */}
          <div className="mt-4 flex gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900">{t('founder.reqsBoxTitle')}</p>
              <p className="mt-1 text-sm text-slate-700">{t('founder.reqsBox')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
