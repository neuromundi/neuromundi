/**
 * Messages — mensajería directa (/mensajes, protegida).
 *
 * Lista de conversaciones + hilo + redactor. El especialista puede iniciar una
 * conversación por folio (NM-000123) y enviar enlaces de video-sesión de
 * cualquier plataforma (Zoom, Meet, Teams…) o crear una sala Jitsi al vuelo.
 * Los enlaces en los mensajes se muestran como enlaces clicables.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, Video, ArrowLeft, Plus } from 'lucide-react';
import { Button, useToast, EmptyState, Avatar, SkeletonCard } from '@/components/ui';
import { useMessages, type Message, type Thread } from '@/hooks/useMessages';
import { jitsiRoomUrl } from '@/lib/meet';
import { formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const URL_RE = /(https?:\/\/[^\s]+)/g;

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all underline">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function folioToNumber(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function Messages() {
  const { t } = useTranslation();
  const toast = useToast();
  const { userId, threads, loading, reloadThreads, fetchThread, markThreadRead, send } = useMessages();

  const [active, setActive] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [folio, setFolio] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const openThread = useCallback(async (th: Thread) => {
    setActive(th);
    setNewOpen(false);
    const list = await fetchThread(th.other_id);
    setMsgs(list);
    if (th.unread > 0) { await markThreadRead(th.other_id); void reloadThreads(); }
  }, [fetchThread, markThreadRead, reloadThreads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const doSend = async (memberNo: number) => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const r = await send(memberNo, body);
    setBusy(false);
    if (!r.ok) {
      toast.error(t(`msg.err.${r.error}`, t('msg.err.generic')));
      return;
    }
    setText('');
    await reloadThreads();
    if (active) {
      setMsgs(await fetchThread(active.other_id));
    } else {
      // Conversación nueva: localizar el hilo recién creado y abrirlo.
      const { data } = await supabase.rpc('message_threads');
      const th = ((data as Thread[]) ?? []).find((x) => x.other_member_no === memberNo) ?? null;
      setNewOpen(false);
      setFolio('');
      if (th) { setActive(th); setMsgs(await fetchThread(th.other_id)); }
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active?.other_member_no != null) { void doSend(active.other_member_no); return; }
    const n = folioToNumber(folio);
    if (n == null) { toast.error(t('msg.badFolio')); return; }
    void doSend(n);
  };

  const insertRoom = () => {
    const url = jitsiRoomUrl(active?.other_id || undefined);
    setText((v) => (v ? `${v}\n${url}` : `${t('msg.roomPrefix')} ${url}`));
  };

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-900">
        <MessageSquare className="h-6 w-6 text-brand-600" /> {t('msg.title')}
      </h1>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Lista de conversaciones */}
        <aside className={active || newOpen ? 'hidden md:block' : 'block'}>
          <Button fullWidth variant="secondary" onClick={() => { setNewOpen(true); setActive(null); setMsgs([]); }} leadingIcon={<Plus className="h-4 w-4" />}>
            {t('msg.new')}
          </Button>
          <div className="mt-3 space-y-1">
            {loading ? (
              <SkeletonCard rows={3} />
            ) : threads.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted">{t('msg.emptyThreads')}</p>
            ) : (
              threads.map((th) => (
                <button
                  key={th.other_id}
                  type="button"
                  onClick={() => void openThread(th)}
                  className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50 ${active?.other_id === th.other_id ? 'bg-brand-50' : ''}`}
                >
                  <Avatar name={th.other_name ?? '—'} src={th.other_avatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{th.other_name ?? t('msg.someone')}</span>
                      {th.unread > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-evs-1 px-1 text-[10px] font-bold text-white">{th.unread}</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted">{th.last_body}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Hilo / redactor */}
        <section className={!active && !newOpen ? 'hidden md:block' : 'block'}>
          {!active && !newOpen ? (
            <EmptyState icon={<MessageSquare className="h-6 w-6" />} title={t('msg.pickTitle')} description={t('msg.pickDesc')} />
          ) : (
            <div className="flex h-[70vh] flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
              <header className="flex items-center gap-2 border-b border-slate-100 p-3">
                <button type="button" className="md:hidden" onClick={() => { setActive(null); setNewOpen(false); }} aria-label={t('common.back')}>
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
                </button>
                {active ? (
                  <>
                    <Avatar name={active.other_name ?? '—'} src={active.other_avatar} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{active.other_name ?? t('msg.someone')}</p>
                      {active.other_member_no != null && (
                        <p className="font-mono text-xs text-muted">NM-{String(active.other_member_no).padStart(6, '0')}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-700">{t('msg.toFolio')}</label>
                    <input
                      value={folio}
                      onChange={(e) => setFolio(e.target.value)}
                      placeholder="NM-000123"
                      className="mt-1 w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    />
                  </div>
                )}
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {active && msgs.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">{t('msg.threadEmpty')}</p>
                ) : (
                  msgs.map((m) => {
                    const mine = m.sender_id === userId;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-900'}`}>
                          <Linkified text={m.body} />
                          <div className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>{formatDate(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <form onSubmit={onSubmit} className="border-t border-slate-100 p-3">
                <div className="flex items-end gap-2">
                  <button type="button" onClick={insertRoom} title={t('msg.room')} className="rounded-full p-2 text-brand-600 hover:bg-brand-50">
                    <Video className="h-5 w-5" />
                  </button>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={2}
                    placeholder={t('msg.placeholder')}
                    className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                  <Button type="submit" loading={busy} disabled={!text.trim()} leadingIcon={<Send className="h-4 w-4" />}>
                    {t('msg.send')}
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-muted">{t('msg.hint')}</p>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
