/**
 * Author — perfil público de autor del Blog (/autor/:id). Muestra la cabecera
 * del autor (avatar, nombre/negocio) y sus publicaciones publicadas. Los datos
 * del autor se derivan de la vista pública blog_feed (sin exponer profiles).
 * Si el autor es además proveedor, ofrece un enlace a su ficha del directorio.
 */
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react';
import { Avatar, EmptyState, SkeletonCard } from '@/components/ui';
import { useAuthorPosts } from '@/hooks/useBlog';
import { useCatLabel } from '@/lib/catLabel';
import { BlogPostCard } from '@/components/blog/BlogPostCard';

export function Author() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const catLabel = useCatLabel();
  const { posts, author, loading } = useAuthorPosts(id);

  if (loading) return <div className="mx-auto max-w-5xl p-4"><SkeletonCard rows={4} /></div>;

  const name = author?.author_business || author?.author_name || t('author.unknown');

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> {t('common.back')}
      </button>

      <section className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <Avatar name={name} src={author?.author_avatar ?? null} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold text-slate-900">{name}</h1>
          <p className="mt-1 text-sm text-muted">{t('author.postCount', { count: posts.length })}</p>
          <Link to={`/proveedor/${id}`} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> {t('author.viewProfile')}
          </Link>
        </div>
      </section>

      {posts.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t('author.emptyTitle')} description={t('author.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <BlogPostCard key={p.id} p={p} catLabel={catLabel} showAuthor={false} />
          ))}
        </div>
      )}
    </main>
  );
}
