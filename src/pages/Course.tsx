/**
 * Course — aula virtual de un curso (/academy/:id). Muestra módulos y lecciones,
 * el video de cada lección, y permite marcar el avance. Requiere inscripción para
 * ver el contenido.
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Circle, Play, ExternalLink, BookOpen } from 'lucide-react';
import { Button, SkeletonCard, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCourse } from '@/hooks/useAcademy';

/** Convierte URLs de YouTube/Vimeo a su forma embebible. */
function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export function Course() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const { course, modules, enrolled, completed, progress, totalLessons, loading, enroll, toggleLesson } = useCourse(id);
  const [openLesson, setOpenLesson] = useState<string | null>(null);

  if (loading) return <div className="mx-auto max-w-3xl p-4"><SkeletonCard rows={5} /></div>;
  if (!course) return <p className="mx-auto max-w-3xl p-8 text-center text-muted">{t('lms.notFound')}</p>;

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/academy')} leadingIcon={<ArrowLeft className="h-4 w-4" />}>{t('lms.back')}</Button>

      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-evs-5 p-6 text-white">
        <h1 className="text-2xl font-extrabold">{course.title}</h1>
        {course.description && <p className="mt-1 text-white/90">{course.description}</p>}
        <p className="mt-2 text-sm text-white/80">{totalLessons} {t('lms.lessons')}</p>
      </header>

      {!enrolled ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <BookOpen className="mx-auto h-8 w-8 text-brand-500" />
          <p className="mt-2 text-slate-700">{t('lms.enrollToView')}</p>
          <div className="mt-3">
            <Button onClick={async () => {
              if (!isAuthenticated) { toast.error('Inicia sesión para inscribirte.'); return; }
              const r = await enroll(); if (!r.ok) toast.error(r.error);
            }}>{t('lms.enroll')}</Button>
          </div>
        </div>
      ) : (
        <>
          {/* Progreso */}
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted">{t('lms.progress')}</span>
              <span className="font-semibold text-slate-900">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-evs-5 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {modules.length === 0 ? (
            <p className="text-sm text-muted">{t('lms.noModules')}</p>
          ) : (
            <div className="space-y-4">
              {modules.map((m) => (
                <section key={m.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-2 font-bold text-slate-900">{m.title}</h2>
                  <ul className="space-y-1">
                    {m.lessons.map((l) => {
                      const done = completed.has(l.id);
                      const isOpen = openLesson === l.id;
                      const embed = l.video_url ? embedUrl(l.video_url) : null;
                      return (
                        <li key={l.id} className="rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 p-2">
                            <button type="button" onClick={async () => { const r = await toggleLesson(l.id, !done); if (!r.ok) toast.error(r.error); }}
                              title={done ? t('lms.markIncomplete') : t('lms.markComplete')}>
                              {done ? <CheckCircle2 className="h-5 w-5 text-evs-5" /> : <Circle className="h-5 w-5 text-slate-300" />}
                            </button>
                            <button type="button" className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-800 hover:text-brand-700"
                              onClick={() => setOpenLesson(isOpen ? null : l.id)}>
                              {l.title}
                            </button>
                            {l.video_url && <Play className="h-4 w-4 text-brand-500" />}
                          </div>
                          {isOpen && (
                            <div className="space-y-3 border-t border-slate-100 p-3">
                              {l.content && <p className="whitespace-pre-wrap text-sm text-slate-700">{l.content}</p>}
                              {l.video_url && (
                                embed ? (
                                  <div className="aspect-video w-full overflow-hidden rounded-lg">
                                    <iframe src={embed} title={l.title} className="h-full w-full" allowFullScreen loading="lazy" />
                                  </div>
                                ) : (
                                  <a href={l.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline">
                                    <ExternalLink className="h-4 w-4" /> {t('lms.openVideo')}
                                  </a>
                                )
                              )}
                              <Button size="sm" variant={done ? 'ghost' : 'secondary'} onClick={async () => { const r = await toggleLesson(l.id, !done); if (!r.ok) toast.error(r.error); }}>
                                {done ? t('lms.markIncomplete') : t('lms.markComplete')}
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
