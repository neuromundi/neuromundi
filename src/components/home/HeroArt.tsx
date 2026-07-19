/**
 * HeroArt — ilustración del héroe: comunidad diversa de familias, personas
 * neurodivergentes y especialistas en neurodesarrollo. Imagen optimizada a WebP.
 */
import { useTranslation } from 'react-i18next';
import heroImg from '@/assets/hero-neuromundi.webp';

export function HeroArt({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <img
      src={heroImg}
      className={className}
      alt={t('home.heroAlt')}
      loading="eager"
      decoding="async"
      width={1100}
      height={1100}
    />
  );
}
