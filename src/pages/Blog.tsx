/**
 * Blog — Blog Neuromundi (/blog). Feed público de publicaciones con taxonomía de
 * neurodiversidad, buscador, recomendaciones personalizadas por intereses del
 * usuario y un onboarding ligero para elegir esos intereses. Las tarjetas
 * abren el lector existente en /contenido/:id (o el enlace externo).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, Sparkles, Check } from 'lucide-react';
import { Button, useToast, EmptyState, SkeletonCard } from '@/components/ui';
import { useBlogFeed, useBlogRecommendations, useInterests } from '@/hooks/useBlog';
import { useAuth } from '@/hooks/useAuth';
import { useCatLabel } from '@/lib/catLabel';
import { BLOG_TOPICS } from '@/data/blogTopics';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { cn } from '@/lib/utils';

function InterestsOnboarding({ catLabel }: { catLabel: (v: string, f: string) => string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { interests, save } = useInterests();
  const [sel, setSel] = useState<string[]>(interests);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return null;

  const toggle = (v: string) => setSel((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand-700" aria-hidden="true" />
        <h2 className="font-bold text-slate-900">{t('blog.onboardTitle')}</h2>
      </div>
      <p className="mt-1 text-sm text-slate-700">{t('blog.onboardBody')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {BLOG_TOPICS.map((topicItem) => (
          <button
            key={topicItem.value}
            type="button"
            onClick={() => toggle(topicItem.value)}
            aria-pressed={sel.includes(topicItem.value)}
            className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', sel.includes(topicItem.value) ? 'border-brand-500 bg-brand-500 text-white' : 'border-brand-200 bg-white text-slate-700 hover:bg-brand-100')}
          >
            {catLabel(topicItem.value, topicItem.label)}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Button
          loading={busy}
          disabled={sel.length === 0}
          leadingIcon={<Check className="h-4 w-4" />}
          onClick={async () => {
            setBusy(true);
            const r = await save(sel);
            setBusy(false);
            if (r.ok) { toast.success(t('blog.onboardSaved')); setDone(true); }
            else toast.error(r.error);
          }}
        >
          {t('blog.onboardSave')}
        </Button>
      </div>
    </section>
  );
}

export function Blog() {
  const { t } = useTranslation();
  const catLabel = useCatLabel();
  const { userId } = useAuth();
  const { hasInterests } = useInterests();
  const { posts, loading, topic, setTopic, q, setQ } = useBlogFeed();
  const recs = useBlogRecommendations(6);

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-700 p-8 text-white shadow-lg">
        <BookOpen className="h-10 w-10 opacity-90" />
        <h1 className="mt-3 text-3xl font-extrabold">{t('blog.title')}</h1>
        <p className="mt-2 max-w-xl text-white/90">{t('blog.subtitle')}</p>
      </section>

      {userId && !hasInterests && <InterestsOnboarding catLabel={catLabel} />}

      {userId && hasInterests && recs.posts.length > 0 && !topic && !q && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Sparkles className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('blog.forYou')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recs.posts.map((p) => <BlogPostCard key={`rec-${p.id}`} p={p} catLabel={catLabel} />)}
          </div>
        </section>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('blog.searchPlaceholder')}
            aria-label={t('blog.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('blog.topics')}>
          <button
            type="button"
            onClick={() => setTopic('')}
            aria-pressed={topic === ''}
            className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', topic === '' ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}
          >
            {t('blog.allTopics')}
          </button>
          {BLOG_TOPICS.map((topicItem) => (
            <button
              key={topicItem.value}
              type="button"
              onClick={() => setTopic(topic === topicItem.value ? '' : topicItem.value)}
              aria-pressed={topic === topicItem.value}
              className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', topic === topicItem.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}
            >
              {catLabel(topicItem.value, topicItem.label)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t('blog.emptyTitle')} description={t('blog.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => <BlogPostCard key={p.id} p={p} catLabel={catLabel} />)}
        </div>
      )}
    </main>
  );
}
