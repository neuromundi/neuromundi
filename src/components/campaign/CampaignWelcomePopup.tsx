/**
 * CampaignWelcomePopup — popup de bienvenida de la campaña, dividido en 2 secciones:
 *   · Izquierda: reproduce un 2.º video de bienvenida ("Ver video"). Al terminar,
 *     vuelve a mostrar el popup con las 2 secciones.
 *   · Derecha: "Conocer beneficios" → abre /beneficios.
 * Se muestra tras el video de intro, solo si el admin activó el popup para el
 * continente del visitante (ver AppLayout). El 2.º video vive en
 * `public/welcome-neuromundi.{webm,mp4}` (lo sube el equipo; si falta, el reproductor
 * se cierra solo sin romper nada).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Sparkles, X, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui';

export function CampaignWelcomePopup({ onClose, onSeeBenefits }: { onClose: () => void; onSeeBenefits: () => void }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black">
        <video className="h-full w-full object-contain" autoPlay playsInline controls preload="metadata" onEnded={() => setPlaying(false)} onError={() => setPlaying(false)}>
          <source src="/welcome-neuromundi.webm" type="video/webm" />
          <source src="/welcome-neuromundi.mp4" type="video/mp4" />
        </video>
        <button type="button" onClick={() => setPlaying(false)} className="absolute bottom-6 right-6 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur hover:bg-white">
          {t('intro.skip')} <SkipForward className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1.5 text-slate-500 hover:bg-white hover:text-slate-800">
          <X className="h-5 w-5" />
        </button>

        <div className="grid sm:grid-cols-2">
          {/* Izquierda: ver video */}
          <button type="button" onClick={() => setPlaying(true)} className="group flex min-h-[240px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-600 to-indigo-700 p-6 text-center text-white transition hover:brightness-110">
            <PlayCircle className="h-16 w-16 opacity-90 transition group-hover:scale-105" aria-hidden="true" />
            <span className="text-lg font-bold">{t('campaign.welcome.watch')}</span>
            <span className="text-sm text-white/80">{t('campaign.welcome.watchSub')}</span>
          </button>

          {/* Derecha: conocer beneficios */}
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center">
            <Sparkles className="h-12 w-12 text-amber-500" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">{t('campaign.welcome.benefitsTitle')}</h2>
            <p className="text-sm text-muted">{t('campaign.welcome.benefitsSub')}</p>
            <Button className="mt-1" onClick={onSeeBenefits}>{t('campaign.welcome.benefitsCta')}</Button>
          </div>
        </div>

        <div className="border-t border-slate-100 p-3 text-center">
          <button type="button" onClick={onClose} className="text-sm text-muted hover:underline">{t('campaign.welcome.later')}</button>
        </div>
      </div>
    </div>
  );
}
