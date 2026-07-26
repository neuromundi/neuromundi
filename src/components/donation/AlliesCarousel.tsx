/**
 * AlliesCarousel — banda de logos de instituciones y empresas aliadas.
 *
 * Pensado para público neurodivergente:
 *  · Movimiento LENTO y constante (sin tirones ni parpadeos).
 *  · Se DETIENE al pasar el cursor o al enfocar con teclado, para poder leerlo.
 *  · Si el sistema pide "reducir movimiento" (prefers-reduced-motion), NO se
 *    anima: se muestra como una lista estática y desplazable. Es la regla de oro
 *    de accesibilidad para animaciones.
 *
 * La animación es un marquee CSS: se duplica la lista y se desplaza el 50%, así
 * el bucle es continuo sin salto. Los keyframes se inyectan una sola vez.
 */
import { useTranslation } from 'react-i18next';
import { useAllies } from '@/hooks/useDonorWall';

const KEYFRAMES = `
@keyframes nm-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.nm-marquee-track { animation: nm-marquee 60s linear infinite; }
.nm-marquee:hover .nm-marquee-track,
.nm-marquee:focus-within .nm-marquee-track { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .nm-marquee { overflow-x: auto; }
  .nm-marquee-track { animation: none; width: auto; }
}
`;

function Logo({ name, logo, website }: { name: string; logo: string; website: string | null }) {
  const img = (
    <img
      src={logo}
      alt={name}
      title={name}
      loading="lazy"
      decoding="async"
      width={240}
      height={96}
      className="h-24 w-auto max-w-[280px] object-contain transition hover:scale-105"
    />
  );
  return website ? (
    <a href={website} target="_blank" rel="noopener noreferrer" className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      {img}
    </a>
  ) : (
    <span className="shrink-0">{img}</span>
  );
}

export function AlliesCarousel({ showHeading = true }: { showHeading?: boolean }) {
  const { t } = useTranslation();
  const { allies, loading } = useAllies();

  if (loading || allies.length === 0) {
    // Sin aliados aún: no ocupamos espacio con una banda vacía. La leyenda, si
    // se quiere visible siempre, la pone quien monta el componente.
    return null;
  }

  return (
    <section aria-label={t('allies.title')}>
      <style>{KEYFRAMES}</style>
      {showHeading && (
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t('allies.title')}</h2>
      )}
      <div className="nm-marquee relative overflow-hidden">
        {/* Duplicamos la lista para el bucle continuo. La copia va aria-hidden
            para que un lector de pantalla no lea los logos dos veces. */}
        <div className="nm-marquee-track flex w-max items-center gap-8 py-2">
          {allies.map((a) => (
            <Logo key={a.id} name={a.name} logo={a.logo_url} website={a.website} />
          ))}
          {allies.map((a) => (
            <div key={`dup-${a.id}`} aria-hidden="true">
              <Logo name={a.name} logo={a.logo_url} website={a.website} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
