/**
 * WelcomeVideo — splash de bienvenida que reproduce /neuromundi.mp4 a pantalla
 * completa. Arranca SOLO en SILENCIO (autoplay muteado, que todos los navegadores
 * permiten sin glitches) y ofrece un botón para activar el sonido con un gesto del
 * usuario —así el navegador NO lo bloquea ni reinicia el video—. La otra acción es
 * "Saltar". Si el archivo no existe o falla, se cierra solo (no bloquea la app).
 *
 * Nota: la versión anterior intentaba autoplay CON sonido y, al ser bloqueado,
 * hacía pausa→mutear→reproducir de nuevo; eso se veía como "el video se reinicia".
 * Coloca el archivo en `public/neuromundi-v2.{webm,mp4}`.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SkipForward } from 'lucide-react';

export function WelcomeVideo({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);

  const finish = () => {
    if (done) return;
    setDone(true);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <video
        className="h-full w-full object-contain"
        autoPlay
        playsInline
        muted
        preload="metadata"
        onEnded={finish}
        onError={finish}
      >
        {/* WebM primero (más ligero); MP4 como respaldo para Safari antiguo. */}
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
