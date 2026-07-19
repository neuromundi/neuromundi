/**
 * FounderPopup — modal global de conversión a "Miembro Fundador".
 *
 * Disparo: primer scroll de un visitante sin sesión (lo controla AppLayout).
 * Frecuencia: si se cierra, no reaparece por 24h (localStorage, en AppLayout).
 * Diseño de marca, responsive, con 3 grupos (Familias, Profesionales,
 * Prestadores) y sus beneficios/requisitos en pestañas para no sobrecargar.
 * CTA con evento de tracking para medir conversión.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Award, Check, Sparkles, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui';
import { track } from '@/lib/track';

type Group = 'families' | 'professionals' | 'providers';
const GROUPS: Group[] = ['families', 'professionals', 'providers'];

export function FounderPopup({ onClose }: { onClose: (reason: 'cta' | 'later' | 'close') => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group>('families');
  const [imgOk, setImgOk] = useState(true);

  const benefits = t(`founder.groups.${group}.benefits`, { returnObjects: true }) as string[];
  const reqs = t(`founder.groups.${group}.reqs`, { returnObjects: true }) as string[];

  const onCta = () => {
    track('founder_popup_cta_click', { group });
    onClose('cta');
    navigate('/crear-cuenta');
  };

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
        {/* Cierre rápido */}
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

          {/* Pestañas por grupo */}
          <div role="tablist" aria-label={t('founder.chooseProfile')} className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={group === g}
                onClick={() => setGroup(g)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  group === g ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t(`founder.tabs.${g}`)}
              </button>
            ))}
          </div>

          {/* Beneficios y requisitos (columnas en escritorio, apiladas en móvil) */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <section>
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
            <section>
              <h3 className="mb-2 font-bold text-slate-900">{t('founder.reqsTitle')}</h3>
              <ul className="space-y-1.5">
                {reqs.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-snug text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden="true" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
          <Button variant="ghost" onClick={() => onClose('later')}>{t('founder.later')}</Button>
          <Button size="lg" onClick={onCta} leadingIcon={<UserPlus className="h-5 w-5" />}>
            {t('founder.cta')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
