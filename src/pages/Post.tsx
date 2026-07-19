/**
 * Post — lector de un blog (/contenido/:id). Registra la vista, permite valorar
 * con estrellas (la valoración se muestra a partir de un promedio de 3) y
 * comentar. Las publicaciones de tipo enlace abren externo, no llegan aquí.
 */
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send } from 'lucide-react';
import { Button, SkeletonCard, useToast } from '@/components/ui';
import { usePost } from '@/hooks/useContent';
import { Stars } from '@/components/content/Stars';

const input = 'w-full rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function Post() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const { post, rating, myStars, comments, loading, rate, comment } = usePost(id);
  const [text, setText] = useState('');

  if (loading) return <div className="mx-auto max-w-2xl p-4"><SkeletonCard rows={4} /></div>;
  if (!post) return <p className="mx-auto max-w-2xl p-8 text-center text-muted">{t('content.notFound')}</p>;

  const showStars = rating && rating.avg_stars >= 3;

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leadingIcon={<ArrowLeft className="h-4 w-4" />}>
        {t('common.back')}
      </Button>

      <header>
        <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
        {post.author_id && (
          <Link to={`/autor/${post.author_id}`} className="mt-1 inline-block text-sm font-semibold text-brand-700 hover:underline">
            {t('author.byLink')}
          </Link>
        )}
        {showStars && (
          <div className="mt-2 flex items-center gap-2">
            <Stars value={rating!.avg_stars} />
            <span className="text-sm text-muted">{rating!.avg_stars} · {rating!.rating_count}</span>
          </div>
        )}
        {post.keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.keywords.map((k) => (
              <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{k}</span>
            ))}
          </div>
        )}
      </header>

      <article className="whitespace-pre-wrap text-slate-700">{post.body}</article>

      {/* Valorar */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-900">{t('content.rate')}</p>
        <Stars value={myStars ?? 0} onRate={async (s) => { const r = await rate(s); if (!r.ok) toast.error(r.error); }} size={26} />
        {!showStars && <p className="mt-2 text-xs text-muted">{t('content.ratingHidden')}</p>}
      </section>

      {/* Comentarios */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">{t('content.comments')}</h2>
        <div className="flex gap-2">
          <input className={input} placeholder={t('content.addComment')} value={text} onChange={(e) => setText(e.target.value)} />
          <Button
            onClick={async () => {
              if (!text.trim()) return;
              const r = await comment(text.trim());
              if (r.ok) setText(''); else toast.error(r.error);
            }}
            leadingIcon={<Send className="h-4 w-4" />}
          >
            {t('content.send')}
          </Button>
        </div>
        {comments.length === 0 ? (
          <p className="text-sm text-muted">{t('content.noComments')}</p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-700 shadow-sm">
                {c.body}
                <span className="mt-1 block text-xs text-muted">{new Date(c.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
