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
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Sparkles, X, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui';

export function CampaignWelcomePopup({ onClose, onSeeBenefits }: { onClose: () => void; onSeeBenefits: () => void }) {
  const { t, i18n } = useTranslation();
  const [playing, setPlaying] = useState(false);
  // Video por IDIOMA con respaldo a español. Se prueba en orden:
  //   welcome-neuromundi-<lang>.{webm,mp4}  →  welcome-neuromundi.{webm,mp4}
  // Solo se muestra "Ver video" si alguno existe (a prueba de fallos: sin archivo,
  // el popup enseña únicamente los beneficios a todo el ancho).
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const lang = (i18n.language || 'es').slice(0, 2);
    const candidates: string[] = [];
    if (lang !== 'es') candidates.push(`/welcome-neuromundi-${lang}.webm`, `/welcome-neuromundi-${lang}.mp4`);
    candidates.push('/welcome-neuromundi.webm', '/welcome-neuromundi.mp4');
    (async () => {
      for (const url of candidates) {
        try {
          const r = await fetch(url, { method: 'HEAD' });
          if (r.ok && (r.headers.get('content-type') ?? '').startsWith('video')) {
            if (alive) setVideoUrl(url);
            return;
          }
        } catch { /* 404/sin red: siguiente candidato */ }
      }
    })();
    return () => { alive = false; };
  }, [i18n.language]);

  if (playing && videoUrl) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black">
        <video className="h-full w-full object-contain" autoPlay playsInline controls preload="metadata" onEnded={() => setPlaying(false)} onError={() => setPlaying(false)}>
          <source src={videoUrl} />
        </video>
        <button type="button" onClick={() => setPlaying(false)} className="absolute bottom-6 right-6 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur hover:bg-white">
          {t('intro.skip')} <SkipForward className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="absolute right-3 top-3 rtl:right-auto rtl:left-3 z-20 rounded-full bg-white/80 p-1.5 text-slate-500 hover:bg-white hover:text-slate-800">
          <X className="h-5 w-5" />
        </button>

        <div className={videoUrl ? 'grid sm:grid-cols-2' : 'grid'}>
          {/* Izquierda: VISTAZO del video en silencio (autoplay muted loop) como
              gancho. Al pulsar, se reproduce a pantalla completa con sonido. */}
          {videoUrl && (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={t('campaign.welcome.watch')}
              className="group relative flex min-h-[260px] items-center justify-center overflow-hidden bg-black sm:min-h-[420px]"
            >
              <video
                className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
              >
                <source src={videoUrl} />
              </video>
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
              <span className="relative z-10 flex flex-col items-center gap-2 text-white">
                <PlayCircle className="h-20 w-20 drop-shadow-lg transition group-hover:scale-105" aria-hidden="true" />
                <span className="text-lg font-bold drop-shadow">{t('campaign.welcome.watch')}</span>
                <span className="text-sm text-white/85 drop-shadow">{t('campaign.welcome.watchSub')}</span>
              </span>
            </button>
          )}

          {/* Derecha: conocer beneficios */}
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-6 text-center sm:min-h-[420px] sm:p-8">
            <Sparkles className="h-12 w-12 text-amber-500" aria-hidden="true" />
            <h2 className="text-xl font-bold text-slate-900">{t('campaign.welcome.benefitsTitle')}</h2>
            <p className="text-sm text-muted">{t('campaign.welcome.benefitsSub')}</p>
            <Button size="lg" className="mt-1" onClick={onSeeBenefits}>{t('campaign.welcome.benefitsCta')}</Button>
          </div>
        </div>

        <div className="border-t border-slate-100 p-3 text-center">
          <button type="button" onClick={onClose} className="text-sm text-muted hover:underline">{t('campaign.welcome.later')}</button>
        </div>
      </div>
    </div>
  );
}
