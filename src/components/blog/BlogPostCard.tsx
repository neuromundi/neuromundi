/**
 * BlogPostCard — tarjeta de una publicación del Blog Neuromundi. Se usa en el
 * feed (/blog) y en el perfil de autor (/autor/:id). Enlaza al lector interno
 * (/contenido/:id) o al enlace externo. El autor enlaza a su perfil público.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Star, Eye, ExternalLink } from 'lucide-react';
import type { BlogPost } from '@/hooks/useBlog';

export function BlogPostCard({
  p,
  catLabel,
  showAuthor = true,
}: {
  p: BlogPost;
  catLabel: (v: string, f: string) => string;
  showAuthor?: boolean;
}) {
  const { t } = useTranslation();
  const isLink = p.type === 'link' && !!p.external_url;
  const author = p.author_business || p.author_name;

  const inner = (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      {p.cover_url ? (
        <img loading="lazy" decoding="async" src={p.cover_url} alt="" className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 text-brand-300">
          <BookOpen className="h-10 w-10" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        {p.topic && <p className="mb-1 text-xs font-semibold text-brand-700">{catLabel(p.topic, p.topic)}</p>}
        <h3 className="font-semibold text-slate-900">{p.title}</h3>
        {p.excerpt && <p className="mt-1 line-clamp-3 text-sm text-muted">{p.excerpt}</p>}
        <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted">
          {showAuthor && author ? <span className="truncate">{author}</span> : null}
          {p.avg_stars >= 3 && (
            <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warm-400 text-warm-400" /> {p.avg_stars}</span>
          )}
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {p.views_count}</span>
          {isLink && <ExternalLink className="ml-auto h-3.5 w-3.5" aria-label={t('content.external')} />}
        </div>
      </div>
    </article>
  );

  return isLink ? (
    <a href={p.external_url!} target="_blank" rel="noopener noreferrer" className="block h-full">{inner}</a>
  ) : (
    <Link to={`/contenido/${p.id}`} className="block h-full">{inner}</Link>
  );
}
