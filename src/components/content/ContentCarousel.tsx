/**
 * ContentCarousel — carrusel horizontal de publicaciones publicadas para Home.
 * Blog → lector interno (/contenido/:id). Enlace → se abre en pestaña nueva.
 * La valoración por estrellas solo se muestra si el promedio es ≥ 3.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, FileText } from 'lucide-react';
import { useContentFeed } from '@/hooks/useContent';
import { Stars } from './Stars';

export function ContentCarousel() {
  const { t } = useTranslation();
  const { items, loading } = useContentFeed();

  if (loading || items.length === 0) return null;

  return (
    <section className="mt-14 space-y-3">
      <h2 className="text-lg font-bold text-slate-900">{t('content.carouselTitle')}</h2>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {items.map((p) => {
          const showStars = p.rating && p.rating.avg_stars >= 3;
          const card = (
            <article className="flex h-full w-64 shrink-0 snap-start flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-brand-600">
                {p.type === 'link' ? <ExternalLink className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                <span className="text-xs uppercase tracking-wide text-muted">{t('content.by')}</span>
              </div>
              <h3 className="line-clamp-2 font-semibold text-slate-900">{p.title}</h3>
              {p.type === 'blog' && p.body && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{p.body}</p>}
              <div className="mt-auto pt-3">
                {showStars && (
                  <div className="mb-2 flex items-center gap-1">
                    <Stars value={p.rating!.avg_stars} size={14} />
                    <span className="text-xs text-muted">{p.rating!.avg_stars}</span>
                  </div>
                )}
                <span className="text-sm font-semibold text-brand-700">
                  {p.type === 'link' ? t('content.openLink') : t('content.readMore')}
                </span>
              </div>
            </article>
          );
          return p.type === 'link' ? (
            <a key={p.id} href={p.external_url ?? '#'} target="_blank" rel="noopener noreferrer" className="h-auto">
              {card}
            </a>
          ) : (
            <Link key={p.id} to={`/contenido/${p.id}`} className="h-auto">
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
