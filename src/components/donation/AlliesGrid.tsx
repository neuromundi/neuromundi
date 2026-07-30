/**
 * AlliesGrid — cuadrícula de logos de instituciones y empresas aliadas.
 *
 * Sustituye al antiguo carrusel (marquee). Ventajas para público neurodivergente:
 *  · SIN movimiento: los logos están quietos, se leen sin esfuerzo (no hay que
 *    perseguir una banda que se desplaza ni depende de "reducir movimiento").
 *  · Altura ACOTADA: admite hasta 30 logos, pero el bloque nunca crece más allá
 *    de un máximo; si hubiera más de los que caben, el interior se desplaza. Así
 *    la sección de redes y enlaces legales del pie no se va al fondo del sitio.
 *
 * Filtra por país igual que antes (useAllies): muestra los aliados globales
 * (sin países fijados) más los del país seleccionado.
 */
import { useTranslation } from 'react-i18next';
import { useAllies } from '@/hooks/useDonorWall';
import { useCountry } from '@/stores/countryStore';

/** Máximo de logos que admite el grid, por diseño. */
const MAX_LOGOS = 30;

function Logo({ name, logo, website }: { name: string; logo: string; website: string | null }) {
  const img = (
    <img
      src={logo}
      alt={name}
      title={name}
      loading="lazy"
      decoding="async"
      width={160}
      height={64}
      className="max-h-12 w-auto max-w-full object-contain transition group-hover:scale-105"
    />
  );
  const cellCls =
    'group flex h-20 items-center justify-center rounded-xl border border-slate-100 bg-white p-3 shadow-sm';
  return website ? (
    <a
      href={website}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cellCls} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
    >
      {img}
    </a>
  ) : (
    <span className={cellCls}>{img}</span>
  );
}

export function AlliesGrid() {
  const { t } = useTranslation();
  const { country } = useCountry();
  const { allies, loading } = useAllies(country);

  if (loading || allies.length === 0) {
    // Sin aliados aún: no ocupamos espacio con una cuadrícula vacía. La leyenda,
    // si se quiere visible siempre, la pone quien monta el componente.
    return null;
  }

  const shown = allies.slice(0, MAX_LOGOS);

  return (
    <section aria-label={t('allies.title')}>
      {/* Banda a todo el ancho: el grid se estira horizontalmente (hasta 8 logos
          por fila en escritorio), así 30 aliados caben en pocas filas y el pie no
          se empuja hacia abajo. */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {shown.map((a) => (
          <Logo key={a.id} name={a.name} logo={a.logo_url} website={a.website} />
        ))}
      </div>
    </section>
  );
}
