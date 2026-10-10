/**
 * WelcomeVideoHome — tarjeta del video de bienvenida para la columna CENTRAL de
 * la sección "¿Qué es Neuromundi?/Kit" en la portada. Muestra una vista previa
 * (reproducción automática silenciada en bucle) que llena la altura de la
 * columna sin estirarse (object-cover). Al pulsarla, abre el video en una ventana
 * modal centrada —sobre la portada, sin abarcarla toda— con sonido y controles.
 *
 * El archivo se resuelve por idioma: welcome-neuromundi-<lang>.{webm,mp4} → base.
 * Si no existe ninguno, no renderiza nada (a prueba de fallos). La vista previa
 * solo se descarga al entrar en viewport (useInView) y con preload="metadata".
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayCircle, X } from 'lucide-react';
import { useInView } from '@/hooks/useInView';

export function WelcomeVideoHome() {
  const { t, i18n } = useTranslation();
  const [ref, inView] = useInView<HTMLDivElement>();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let alive = true;
    const lang = (i18n.language || 'es').slice(0, 2);
    const candidates: string[] = [];
    // Video por idioma (incluido español, que tiene su propio -es). Respaldo final
    // al archivo base, que NO se toca (sirve de inglés / idiomas sin versión propia).
    candidates.push(`/welcome-neuromundi-${lang}.webm`, `/welcome-neuromundi-${lang}.mp4`);
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
  }, [inView, i18n.language]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={ref} className="flex flex-col">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm">
          <PlayCircle className="h-4 w-4" aria-hidden="true" /> {t('home.video.badge')}
        </span>
        <h2 className="mt-2 text-xl font-bold text-slate-900">{t('home.video.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('home.video.subtitle')}</p>
      </div>

      {/* El contenedor del video SIEMPRE se renderiza con altura reservada, aunque
          el archivo aún no se haya detectado: así no "aparece" después de cargar
          empujando el contenido de abajo (evita CLS). El video se inserta dentro
          cuando está disponible. */}
      <button
        type="button"
        onClick={() => { if (videoUrl) setOpen(true); }}
        aria-label={t('home.video.title')}
        disabled={!videoUrl}
        className="group relative mt-3 min-h-[280px] flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-black shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {videoUrl && (
          <video className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:opacity-100" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
            <source src={videoUrl} />
          </video>
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <PlayCircle className="h-16 w-16 text-white/95 drop-shadow-lg transition group-hover:scale-105" aria-hidden="true" />
        </span>
      </button>

      {/* Modal centrado: ventana sobre la portada, sin abarcarla toda. */}
      {open && videoUrl && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('home.video.title')}
          onClick={() => setOpen(false)}
        >
          <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('common.close')}
              className="absolute -top-3 -right-3 z-10 rounded-full bg-white p-1.5 text-slate-600 shadow-lg hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
            <video
              className="aspect-[9/16] w-full rounded-2xl bg-black shadow-2xl"
              controls
              autoPlay
              playsInline
              aria-label={t('home.video.title')}
            >
              <source src={videoUrl} />
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
