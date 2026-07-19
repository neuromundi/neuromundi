/**
 * ClinicalRecord — vista del expediente para un par (familia, especialista).
 * Muestra entradas (notas/reportes), tareas en casa, chat asíncrono y el
 * intercambio de archivos cifrado E2E. Las acciones se ajustan al rol.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FilePlus, CheckSquare, Square, Send, Upload, Download, Trash2, Lock } from 'lucide-react';
import { Button, SkeletonCard, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useClinicalRecord } from '@/hooks/useClinical';
import { useSecureFiles } from '@/hooks/useSecureFiles';

const input = 'w-full rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function ClinicalRecord({ patientId, providerId }: { patientId: string; providerId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { userId, isConsumer } = useAuth();
  const { entries, tasks, messages, loading, addEntry, addTask, toggleTask, sendMessage } = useClinicalRecord(patientId, providerId);
  const files = useSecureFiles(patientId);

  const recipientId = isConsumer ? providerId : patientId;

  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteKind, setNoteKind] = useState<'note' | 'report'>('note');
  const [taskTitle, setTaskTitle] = useState('');
  const [chat, setChat] = useState('');
  const [expiry, setExpiry] = useState('30');

  if (loading) return <SkeletonCard rows={4} />;

  return (
    <div className="space-y-6">
      {/* Entradas */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-900">{t('clin.entries')}</h3>
        <div className="mb-3 space-y-2">
          <div className="flex gap-2">
            {(['note', 'report'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setNoteKind(k)}
                className={`rounded-lg border px-3 py-1.5 text-xs ${noteKind === k ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700'}`}>
                {t(k === 'note' ? 'clin.note' : 'clin.report')}
              </button>
            ))}
          </div>
          <input className={input} placeholder={t('clin.entryTitle')} value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
          <textarea className={input} rows={3} placeholder={t('clin.entryBody')} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
          <Button size="sm" leadingIcon={<FilePlus className="h-4 w-4" />}
            onClick={async () => {
              if (!noteTitle.trim()) return;
              const period = noteKind === 'report' ? new Date().toISOString().slice(0, 7) : undefined;
              const r = await addEntry({ kind: noteKind, title: noteTitle.trim(), body: noteBody, period });
              if (r.ok) { setNoteTitle(''); setNoteBody(''); toast.success(t('clin.saved')); } else toast.error(r.error);
            }}>
            {t('clin.addEntry')}
          </Button>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">{t('clin.noEntries')}</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t(e.kind === 'report' ? 'clin.report' : 'clin.note')}</span>
                  <span className="font-medium text-slate-900">{e.title}</span>
                  {e.period && <span className="text-xs text-muted">· {e.period}</span>}
                </div>
                {e.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{e.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tareas en casa */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-900">{t('clin.tasks')}</h3>
        {!isConsumer && (
          <div className="mb-3 flex gap-2">
            <input className={input} placeholder={t('clin.taskTitle')} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            <Button size="sm" onClick={async () => {
              if (!taskTitle.trim()) return;
              const r = await addTask({ title: taskTitle.trim() });
              if (r.ok) { setTaskTitle(''); } else toast.error(r.error);
            }}>{t('clin.addTask')}</Button>
          </div>
        )}
        {tasks.length === 0 ? (
          <p className="text-sm text-muted">{t('clin.noTasks')}</p>
        ) : (
          <ul className="space-y-1">
            {tasks.map((tk) => (
              <li key={tk.id}>
                <button type="button" onClick={async () => { const r = await toggleTask(tk.id, !tk.completed); if (!r.ok) toast.error(r.error); }}
                  className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-slate-50">
                  {tk.completed ? <CheckSquare className="h-4 w-4 text-evs-5" /> : <Square className="h-4 w-4 text-slate-400" />}
                  <span className={tk.completed ? 'text-muted line-through' : 'text-slate-800'}>{tk.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Chat asíncrono */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-900">{t('clin.chat')}</h3>
        <div className="mb-3 max-h-64 space-y-2 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-muted">{t('clin.noMessages')}</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === userId ? 'ml-auto bg-brand-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {m.body}
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input className={input} placeholder={t('clin.chatPlaceholder')} value={chat} onChange={(e) => setChat(e.target.value)} />
          <Button onClick={async () => { if (!chat.trim()) return; const r = await sendMessage(chat.trim()); if (r.ok) setChat(''); else toast.error(r.error); }} leadingIcon={<Send className="h-4 w-4" />}>
            {t('clin.send')}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">{t('clin.asyncNote')}</p>
      </section>

      {/* Archivos cifrados E2E */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-slate-900"><Lock className="h-4 w-4 text-evs-5" /> {t('clin.files')}</h3>
        <p className="mb-3 text-xs text-muted">{t('clin.filesNote')}</p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            <Upload className="mr-1 inline h-4 w-4" /> {t('clin.choose')}
            <input type="file" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = await files.upload(f, [recipientId], expiry === '0' ? undefined : Number(expiry));
              toast[r.ok ? 'success' : 'error'](r.ok ? t('clin.uploaded') : r.error);
              e.currentTarget.value = '';
            }} />
          </label>
          <select className={`${input} w-auto`} value={expiry} onChange={(e) => setExpiry(e.target.value)} title={t('clin.expiry')}>
            <option value="7">7 d</option>
            <option value="30">30 d</option>
            <option value="90">90 d</option>
            <option value="0">{t('clin.noExpiry')}</option>
          </select>
        </div>
        {files.files.length === 0 ? (
          <p className="text-sm text-muted">{t('clin.noFiles')}</p>
        ) : (
          <ul className="space-y-2">
            {files.files.map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-800">{f.filename}</span>
                <button type="button" title={t('clin.download')} onClick={async () => { const r = await files.download(f); if (!r.ok) toast.error(r.error); }} className="text-brand-700 hover:opacity-80"><Download className="h-4 w-4" /></button>
                {f.owner_id === userId && (
                  <button type="button" title={t('clin.delete')} onClick={async () => { const r = await files.remove(f); if (!r.ok) toast.error(r.error); }} className="text-evs-1 hover:opacity-80"><Trash2 className="h-4 w-4" /></button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
