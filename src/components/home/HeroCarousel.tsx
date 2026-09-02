/**
 * HeroCarousel — carrusel de la portada (15 escenas de la Red Neuromundi).
 *
 * Orden (imágenes en `public/hero/slides/{n}-{500,800}-v3.webp`, n=1..15):
 *   1 logo Neuromundi (sin frase) · 2 dibujo de comunidad (sin frase) ·
 *   3–15 escenas con su frase localizada (`home.slides`, array de 15; los índices
 *   0 y 1 van vacíos). El texto de cada frase está en HTML (localizable), no
 *   quemado en la imagen.
 *
 * Animación (suave, sin movimientos bruscos): fundido cruzado entre imágenes; el
 * TEXTO entra ~1 s DESPUÉS de la imagen, con un leve ascenso + fundido. Auto-inicia
 * y se repite en bucle. NO responde al mouse ni a clicks (sin pausa ni controles).
 * Respeta `prefers-reduced-motion` (no auto-avanza; muestra el dibujo fijo).
 *
 * Rendimiento LCP: solo se montan la imagen actual y la siguiente; la 1.ª carga
 * `eager` + `fetchPriority=high` y está precargada desde index.html; el resto `lazy`.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const COUNT = 15;
const INTERVAL = 4600; // imagen (~1.1s fundido) + texto a 1s + lectura ~2.5s
const SIZES = '(max-width: 640px) 92vw, (max-width: 1024px) 60vw, 448px';

const KEYFRAMES = `
.nm-hero-slide { opacity: 0; transition: opacity 1100ms ease-in-out; }
.nm-hero-slide[data-active="true"] { opacity: 1; }
.nm-hero-cap { opacity: 0; transform: translateY(10px); transition: opacity 800ms ease, transform 800ms ease; }
.nm-hero-slide[data-active="true"] .nm-hero-cap { opacity: 1; transform: none; transition-delay: 1000ms; }
@media (prefers-reduced-motion: reduce) {
  .nm-hero-slide, .nm-hero-cap { transition: none; }
  .nm-hero-slide[data-active="true"] .nm-hero-cap { transition-delay: 0ms; }
}
`;

function srcset(n: number) {
  // 700w cubre el hueco típico de móvil (~665 px mostrados) sin bajar a la de
  // 800w, que Lighthouse marcaba como sobredimensionada.
  return `/hero/slides/${n}-500-v3.webp 500w, /hero/slides/${n}-700-v3.webp 700w, /hero/slides/${n}-800-v3.webp 800w`;
}

export function HeroCarousel({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const reduce = useRef(false);
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0, 1]));

  const slidesRaw = t('home.slides', { returnObjects: true }) as unknown;
  const phrases: string[] = Array.isArray(slidesRaw) ? (slidesRaw as string[]) : [];

  useEffect(() => {
    const r = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    reduce.current = !!r;
    if (r) setI(1); // héroe estático accesible = dibujo de comunidad (no el logo)
  }, []);

  // Auto-avance continuo (bucle). Sin pausa por mouse/foco. Se detiene solo si el
  // sistema pide reducir movimiento.
  useEffect(() => {
    if (reduce.current) return;
    const id = window.setInterval(() => setI((p) => (p + 1) % COUNT), INTERVAL);
    return () => window.clearInterval(id);
  }, []);

  // Monta la imagen actual y la siguiente (para un fundido ya precargado).
  useEffect(() => {
    setMounted((prev) => {
      const next = (i + 1) % COUNT;
      if (prev.has(i) && prev.has(next)) return prev;
      const s = new Set(prev);
      s.add(i);
      s.add(next);
      return s;
    });
  }, [i]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-slate-50 shadow-md ring-1 ring-slate-100',
        'aspect-[4/5]',
        className,
      )}
      aria-roledescription="carousel"
      aria-label={t('home.heroAlt')}
    >
      <style>{KEYFRAMES}</style>

      {Array.from({ length: COUNT }, (_, idx) => {
        const n = idx + 1; // archivo 1..15
        const active = idx === i;
        const caption = phrases[idx] ?? '';
        if (!mounted.has(idx)) return null;
        return (
          <figure key={n} className="nm-hero-slide absolute inset-0 m-0" data-active={active} aria-hidden={!active}>
            <img
              src={`/hero/slides/${n}-800-v3.webp`}
              srcSet={srcset(n)}
              sizes={SIZES}
              alt={caption || t('home.heroAlt')}
              className="h-full w-full object-cover"
              width={800}
              height={1000}
              loading={idx === 0 ? 'eager' : 'lazy'}
              // @ts-expect-error fetchpriority es válido en HTML aunque el tipo lo omita
              fetchpriority={idx === 0 ? 'high' : undefined}
              decoding="async"
            />
            {caption && (
              <figcaption className="nm-hero-cap absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-4 pt-10">
                <p className="text-base font-semibold leading-snug text-white drop-shadow sm:text-lg">{caption}</p>
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
