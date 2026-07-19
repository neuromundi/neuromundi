/**
 * ContentManager — el prestador crea blogs (artículos en la app) o enlaces a
 * reels/redes (se abren en pestaña nueva), con palabras clave para el buscador.
 * Puede publicar/despublicar y eliminar.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Button, SkeletonCard, useToast, useConfirm, HowTo} from '@/components/ui';
import { useContent } from '@/hooks/useContent';
import { BLOG_TOPICS } from '@/data/blogTopics';
import { useCatLabel } from '@/lib/catLabel';

const input = 'w-full rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function ContentManager() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const { posts, loading, create, togglePublish, remove } = useContent();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'blog' | 'link'>('blog');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [topic, setTopic] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [cover, setCover] = useState('');
  const [busy, setBusy] = useState(false);
  const catLabel = useCatLabel();

  const reset = () => { setTitle(''); setBody(''); setUrl(''); setKeywords(''); setTopic(''); setExcerpt(''); setCover(''); setType('blog'); };

  const onCreate = async () => {
    if (!title.trim()) return toast.error(t('content.errTitle'));
    if (type === 'link' && !/^https?:\/\//i.test(url.trim())) return toast.error(t('content.errUrl'));
    setBusy(true);
    const res = await create({
      type,
      title: title.trim(),
      body: type === 'blog' ? body : undefined,
      external_url: type === 'link' ? url.trim() : undefined,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      topic: type === 'blog' ? topic : undefined,
      excerpt: type === 'blog' ? excerpt.trim() : undefined,
      cover_url: type === 'blog' ? cover.trim() : undefined,
    });
    setBusy(false);
    if (res.ok) { toast.success(t('content.created')); reset(); setOpen(false); }
    else toast.error(res.error);
  };

  if (loading) return <SkeletonCard rows={3} />;

  return (
    <div className="space-y-4">
      <HowTo stepsKey="howto.content" />
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">{t('content.title')}</h2>
        <Button size="sm" onClick={() => setOpen((o) => !o)} leadingIcon={<Plus className="h-4 w-4" />}>{t('content.new')}</Button>
      </div>

      {open && (
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            {(['blog', 'link'] as const).map((tp) => (
              <button key={tp} type="button" onClick={() => setType(tp)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${type === tp ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700'}`}>
                {t(tp === 'blog' ? 'content.typeBlog' : 'content.typeLink')}
              </button>
            ))}
          </div>
          <input className={input} placeholder={t('content.fTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          {type === 'blog' ? (
            <>
              <select className={input} value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option value="">{t('content.fTopic')}</option>
                {BLOG_TOPICS.map((tp) => (
                  <option key={tp.value} value={tp.value}>{catLabel(tp.value, tp.label)}</option>
                ))}
              </select>
              <input className={input} placeholder={t('content.fCover')} value={cover} onChange={(e) => setCover(e.target.value)} />
              <input className={input} placeholder={t('content.fExcerpt')} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
              <textarea className={input} rows={5} placeholder={t('content.fBody')} value={body} onChange={(e) => setBody(e.target.value)} />
            </>
          ) : (
            <input className={input} placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          )}
          <input className={input} placeholder={t('content.fKeywords')} value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          <Button fullWidth loading={busy} onClick={onCreate}>{t('content.publish')}</Button>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-muted">{t('content.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 text-sm shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">
                  {p.title} {p.type === 'link' && <ExternalLink className="inline h-3.5 w-3.5 text-muted" />}
                </p>
                <span className={`text-xs ${p.is_published ? 'text-evs-5' : 'text-muted'}`}>
                  {t(p.is_published ? 'content.published' : 'content.draft')}
                </span>
              </div>
              <button type="button" title={t(p.is_published ? 'content.unpublish' : 'content.publish')}
                onClick={async () => { const r = await togglePublish(p.id, !p.is_published); if (!r.ok) toast.error(r.error); }}
                className="text-slate-500 hover:text-brand-700">
                {p.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button type="button" title={t('content.delete')}
                onClick={async () => { if (!(await confirmDialog({ title: t('content.delete'), message: t('content.confirmDelete'), danger: true }))) return; const r = await remove(p.id); if (!r.ok) toast.error(r.error); }}
                className="text-evs-1 hover:opacity-80">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
