/**
 * HeroArt — ilustración del héroe: comunidad diversa de familias, personas
 * neurodivergentes y especialistas en neurodesarrollo.
 *
 * Es el elemento LCP de la portada. Decisiones deliberadas:
 *  - Las imágenes viven en `public/hero/` con nombre estable (versionado -v1)
 *    en vez de importarse como asset de Vite. Así su URL se conoce ANTES de
 *    descargar y ejecutar el bundle, lo que permite precargarlas desde el
 *    `index.html` y elimina el "retraso en la carga de recursos" del LCP.
 *  - `srcSet` con cinco escalones para no enviar píxeles de más: 450 cubre el
 *    escritorio (se muestra a 448px) y 700 el móvil típico.
 *  - `fetchPriority="high"` y nunca `loading="lazy"`.
 *
 * Si cambias la imagen, sube el sufijo de versión (-v3) en los cinco archivos,
 * aquí y en el script de precarga del index.html.
 *
 * Esa precarga está condicionada a `location.pathname === '/'`: al ser una SPA,
 * el mismo index.html se sirve en todas las rutas y el héroe solo existe en la
 * portada. Si mueves este componente a otra página, ajusta también esa condición
 * o la imagen llegará tarde ahí.
 */
import { useTranslation } from 'react-i18next';

/** Debe coincidir con `imagesizes` del preload en index.html. */
export const HERO_SIZES = '(max-width: 640px) 92vw, (max-width: 1024px) 60vw, 448px';

/** Debe coincidir con `imagesrcset` del preload en index.html. */
export const HERO_SRCSET =
  '/hero/hero-450-v4.webp 450w, /hero/hero-550-v4.webp 550w, /hero/hero-700-v4.webp 700w, /hero/hero-900-v4.webp 900w, /hero/hero-1100-v4.webp 1100w';

export function HeroArt({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <img
      src="/hero/hero-550-v4.webp"
      srcSet={HERO_SRCSET}
      sizes={HERO_SIZES}
      className={className}
      alt={t('home.heroAlt')}
      loading="eager"
      fetchPriority="high"
      decoding="async"
      width={1100}
      height={1100}
      // Reserva la caja aunque el CSS controle el ancho: evita que el resto
      // de la página salte cuando la imagen termina de cargar.
      style={{ aspectRatio: "1 / 1" }}
    />
  );
}
