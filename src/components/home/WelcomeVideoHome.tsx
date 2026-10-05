/**
 * WelcomeVideoHome — sección del video de bienvenida en la portada. Se monta al
 * acercarse al viewport (useInView) y el video usa preload="none" para no pesar
 * en la carga inicial; se descarga solo cuando la persona le da play. El archivo
 * se resuelve por idioma: welcome-neuromundi-<lang>.{webm,mp4} → base. Si no
 * existe ninguno, no renderiza nada (a prueba de fallos).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayCircle } from 'lucide-react';
import { useInView } from '@/hooks/useInView';

export function WelcomeVideoHome() {
  const { t, i18n } = useTranslation();
  const [ref, inView] = useInView<HTMLElement>();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!inView) return;
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
  }, [inView, i18n.language]);

  return (
    <section ref={ref} className="mt-16">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm">
          <PlayCircle className="h-4 w-4" aria-hidden="true" /> {t('home.video.badge')}
        </span>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">{t('home.video.title')}</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">{t('home.video.subtitle')}</p>
      </div>
      {videoUrl && (
        <div className="mx-auto mt-5 max-w-xs overflow-hidden rounded-3xl border border-slate-100 bg-black shadow-sm">
          <video
            className="aspect-[9/16] h-auto w-full object-contain"
            controls
            playsInline
            preload="none"
            aria-label={t('home.video.title')}
          >
            <source src={videoUrl} />
          </video>
        </div>
      )}
    </section>
  );
}
