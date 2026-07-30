/**
 * MentorThread — hilo 1:1 de mentoría, ASÍNCRONO: sin "visto" ni presión de
 * respuesta inmediata. Cada quien escribe a su ritmo.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, ArrowLeft } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMentorThread, type Mentorship } from '@/hooks/useTribeMentorship';

export function MentorThread({ mentorship, onBack }: { mentorship: Mentorship; onBack: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { userId } = useAuth();
  const { messages, loading, send } = useMentorThread(mentorship.id);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const onSend = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const ok = await send(text);
    setBusy(false);
    if (ok) setText(''); else toast.error(t('tribe.sendErr'));
  };

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-slate-100 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 p-3">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{mentorship.counterpart_name}</p>
          <p className="text-xs text-muted">{t(`tribe.mentor.track.${mentorship.track}`)} · {t('tribe.mentor.async')}</p>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-sm text-muted">{t('tribe.loading')}</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t('tribe.mentor.noMessages')}</p>
        ) : (
          messages.map((m) => {
            const mine = m.author_id === userId;
            return (
              <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${mine ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {!mine && <p className="mb-0.5 text-xs font-semibold opacity-70">{m.author_name}</p>}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2 border-t border-slate-100 p-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder={t('tribe.messagePlaceholder')}
          className="flex-1 resize-none rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" />
        <Button onClick={() => void onSend()} loading={busy} leadingIcon={<Send className="h-4 w-4" />}>{t('tribe.send')}</Button>
      </div>
    </div>
  );
}
