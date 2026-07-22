/**
 * WelcomeVideo — splash de bienvenida que reproduce /neuromundi.mp4 a pantalla
 * completa. Arranca SOLO, sin que el visitante haga nada: intenta reproducir con
 * sonido y, si el navegador bloquea el autoplay con audio, lo silencia y arranca
 * igual. La única acción disponible es "Saltar". Si el archivo no existe o falla,
 * se cierra solo (no bloquea la app). Coloca el archivo en `public/neuromundi.mp4`.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SkipForward } from 'lucide-react';

export function WelcomeVideo({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [done, setDone] = useState(false);

  const finish = () => {
    if (done) return;
    setDone(true);
    onDone();
  };

  // Reproducción automática robusta: primero con sonido; si el navegador la
  // bloquea (política de autoplay), se silencia y se reintenta para que el video
  // empiece sin ninguna interacción del visitante.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    const attempt = v.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        v.muted = true;
        v.play().catch(() => {
          /* si ni en silencio puede arrancar, dejamos el botón de saltar */
        });
      });
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        autoPlay
        playsInline
        muted
        preload="metadata"
        onEnded={finish}
        onError={finish}
      >
        {/* WebM primero (más ligero); MP4 como respaldo para Safari antiguo.
            El sufijo -v2 es cache busting: el archivo anterior (5.2 MB) quedó
            cacheado un mes en el CDN bajo el nombre viejo. */}
        <source src="/neuromundi-v2.webm" type="video/webm" />
        <source src="/neuromundi-v2.mp4" type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 right-6 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {t('intro.skip')}
        <SkipForward className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
