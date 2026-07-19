/**
 * CourseManager — el instructor crea cursos, les agrega módulos y lecciones (con
 * video para el aula virtual) y los publica. Pensado para la pestaña Academy del
 * panel del prestador.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Eye, EyeOff, Trash2, FolderPlus, FilePlus } from 'lucide-react';
import { Button, SkeletonCard, useToast, useConfirm, HowTo} from '@/components/ui';
import { useCourseAuthor } from '@/hooks/useAcademy';

const input = 'w-full rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const AUDIENCES = ['', 'families', 'specialists', 'educators'] as const;

export function CourseManager() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const { courses, loading, createCourse, updateCourse, togglePublish, remove, addModule, addLesson } = useCourseAuthor();

  const levelOptions = t('lms.levels', { returnObjects: true }) as string[];

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [level, setLevel] = useState('');
  const [audience, setAudience] = useState('');
  const [cover, setCover] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  if (loading) return <SkeletonCard rows={3} />;

  return (
    <div className="space-y-4">
      <HowTo stepsKey="howto.courses" />
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">{t('lms.manage')}</h2>
        <Button size="sm" onClick={() => setOpen((o) => !o)} leadingIcon={<Plus className="h-4 w-4" />}>{t('lms.newCourse')}</Button>
      </div>

      {open && (
        <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <input className={input} placeholder={t('lms.courseTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={input} rows={2} placeholder={t('lms.courseDesc')} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-slate-600">
              {t('lms.audience')}
              <select className={`${input} mt-1`} value={audience} onChange={(e) => setAudience(e.target.value)}>
                {AUDIENCES.map((a) => <option key={a || 'all'} value={a}>{t(`lms.aud.${a || 'general'}`)}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              {t('lms.courseLevel')}
              <select className={`${input} mt-1`} value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">{t('lms.levelNone')}</option>
                {levelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
          </div>
          <input className={input} placeholder={t('lms.coverUrl')} value={cover} onChange={(e) => setCover(e.target.value)} />
          <Button fullWidth onClick={async () => {
            if (!title.trim()) return;
            const r = await createCourse({ title: title.trim(), description: desc, level: level || undefined, audience: audience || null, cover_url: cover || undefined });
            if (r.ok) { setTitle(''); setDesc(''); setLevel(''); setAudience(''); setCover(''); setOpen(false); toast.success(t('lms.created')); } else toast.error(r.error);
          }}>{t('lms.create')}</Button>
        </div>
      )}

      {courses.length === 0 ? (
        <p className="text-sm text-muted">{t('lms.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {courses.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{c.title}</p>
                  <span className={`text-xs ${c.is_published ? 'text-evs-5' : 'text-muted'}`}>{t(c.is_published ? 'lms.published' : 'lms.draft')}</span>
                </div>
                <button type="button" onClick={() => setEditing(editing === c.id ? null : c.id)} title={t('lms.addModule')} className="text-slate-500 hover:text-brand-700"><FolderPlus className="h-4 w-4" /></button>
                <button type="button" onClick={async () => { const r = await togglePublish(c.id, !c.is_published); if (!r.ok) toast.error(r.error); }} title={t(c.is_published ? 'lms.unpublish' : 'lms.publish')} className="text-slate-500 hover:text-brand-700">
                  {c.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button type="button" onClick={async () => { if (!(await confirmDialog({ title: t('lms.delete'), message: t('lms.confirmDelete'), danger: true }))) return; const r = await remove(c.id); if (!r.ok) toast.error(r.error); }} className="text-evs-1 hover:opacity-80"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  className={input}
                  aria-label={t('lms.audience')}
                  value={c.audience ?? ''}
                  onChange={async (e) => { const r = await updateCourse(c.id, { audience: e.target.value || null }); if (r.ok) toast.success(t('lms.saved')); else toast.error(r.error); }}
                >
                  {AUDIENCES.map((a) => <option key={a || 'all'} value={a}>{t(`lms.aud.${a || 'general'}`)}</option>)}
                </select>
                <select
                  className={input}
                  aria-label={t('lms.courseLevel')}
                  value={c.level ?? ''}
                  onChange={async (e) => { const r = await updateCourse(c.id, { level: e.target.value || null }); if (r.ok) toast.success(t('lms.saved')); else toast.error(r.error); }}
                >
                  <option value="">{t('lms.levelNone')}</option>
                  {levelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              {editing === c.id && <CourseBuilder courseId={c.id} addModule={addModule} addLesson={addLesson} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CourseBuilder({
  courseId,
  addModule,
  addLesson,
}: {
  courseId: string;
  addModule: (courseId: string, title: string, position: number) => Promise<{ ok: boolean; data?: string; error?: string }>;
  addLesson: (moduleId: string, l: { title: string; content?: string; video_url?: string; position: number }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [modules, setModules] = useState<{ id: string; title: string }[]>([]);
  const [modTitle, setModTitle] = useState('');
  const [lessonByMod, setLessonByMod] = useState<Record<string, { title: string; video: string }>>({});

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      <div className="flex gap-2">
        <input className={input} placeholder={t('lms.moduleTitle')} value={modTitle} onChange={(e) => setModTitle(e.target.value)} />
        <Button size="sm" leadingIcon={<FolderPlus className="h-4 w-4" />} onClick={async () => {
          if (!modTitle.trim()) return;
          const r = await addModule(courseId, modTitle.trim(), modules.length);
          if (r.ok && r.data) { setModules((p) => [...p, { id: r.data!, title: modTitle.trim() }]); setModTitle(''); toast.success(t('lms.moduleAdded')); } else toast.error(r.error || '');
        }}>{t('lms.addModule')}</Button>
      </div>

      {modules.map((m, idx) => {
        const draft = lessonByMod[m.id] ?? { title: '', video: '' };
        return (
          <div key={m.id} className="rounded-lg border border-slate-100 p-2">
            <p className="mb-1 text-sm font-semibold text-slate-800">{idx + 1}. {m.title}</p>
            <div className="space-y-1">
              <input className={input} placeholder={t('lms.lessonTitle')} value={draft.title} onChange={(e) => setLessonByMod((p) => ({ ...p, [m.id]: { ...draft, title: e.target.value } }))} />
              <input className={input} placeholder={t('lms.lessonVideo')} value={draft.video} onChange={(e) => setLessonByMod((p) => ({ ...p, [m.id]: { ...draft, video: e.target.value } }))} />
              <Button size="sm" variant="secondary" leadingIcon={<FilePlus className="h-4 w-4" />} onClick={async () => {
                if (!draft.title.trim()) return;
                const r = await addLesson(m.id, { title: draft.title.trim(), video_url: draft.video || undefined, position: 0 });
                if (r.ok) { setLessonByMod((p) => ({ ...p, [m.id]: { title: '', video: '' } })); toast.success(t('lms.lessonAdded')); } else toast.error(r.error || '');
              }}>{t('lms.addLesson')}</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
