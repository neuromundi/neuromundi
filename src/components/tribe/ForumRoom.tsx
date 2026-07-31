/**
 * ForumRoom — sala de un club/foro: chat básico (sin presión de inmediatez: no
 * hay "visto" ni indicadores de escritura) e invitación de miembros por folio.
 * Solo escriben los miembros del foro y activos en la Tribu.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, UserPlus, ArrowLeft, Sparkles, ShieldCheck, Lock } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useTribeMessages, useTribeInvites, useTribeModerator, type TribeForum } from '@/hooks/useTribe';
import { EnergyDot } from './EnergyBadge';
import { GiveGratitudeModal } from './GiveGratitudeModal';

export function ForumRoom({ forum, canWrite, onBack, onCloseForum }: { forum: TribeForum; canWrite: boolean; onBack: () => void; onCloseForum?: (id: string) => Promise<boolean> }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { userId, isAdmin, isAdvisor } = useAuth();
  const { messages, loading, send } = useTribeMessages(forum.id);
  const { invite } = useTribeInvites();
  const { mod } = useTribeModerator();
  const [text, setText] = useState('');
  const [folio, setFolio] = useState('');
  const [inviting, setInviting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [applied, setApplied] = useState(false);
  const [thanking, setThanking] = useState<{ id: string; name: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const canApplyMod = mod?.status === 'approved' && !canClose && !applied;

  const applyMod = async () => {
    const { error } = await supabase.rpc('tribe_apply_forum_moderator', { p_forum: forum.id });
    if (error) toast.error(error.message);
    else { setApplied(true); toast.success(t('tribe.modApplied')); }
  };

  useEffect(() => {
    let alive = true;
    if (isAdmin || isAdvisor) { setCanClose(true); return; }
    void supabase.rpc('tribe_am_i_forum_moderator', { p_forum: forum.id }).then(({ data }) => { if (alive) setCanClose(data === true); });
    return () => { alive = false; };
  }, [forum.id, isAdmin, isAdvisor]);

  const onClose = async () => {
    if (!onCloseForum || !window.confirm(t('tribe.closeForumConfirm'))) return;
    const ok = await onCloseForum(forum.id);
    if (ok) { toast.success(t('tribe.forumClosed')); onBack(); }
    else toast.error(t('tribe.forumErr'));
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const onSend = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const ok = await send(text);
    setBusy(false);
    if (ok) setText('');
    else toast.error(t('tribe.sendErr'));
  };

  const onInvite = async () => {
    const n = parseInt(folio.replace(/\D/g, ''), 10);
    if (Number.isNaN(n)) { toast.error(t('tribe.invalidFolio')); return; }
    const err = await invite(forum.id, n);
    if (err) toast.error(err);
    else { toast.success(t('tribe.invited')); setFolio(''); setInviting(false); }
  };

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-slate-100 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 p-3">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-slate-900">{forum.title}</p>
          <p className="truncate text-xs text-muted">{[forum.theme, forum.city, forum.country].filter(Boolean).join(' · ')}</p>
        </div>
        {canApplyMod && (
          <button type="button" onClick={() => void applyMod()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            <ShieldCheck className="h-4 w-4" /> {t('tribe.applyModShort')}
          </button>
        )}
        {canClose && (
          <button type="button" onClick={() => void onClose()} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-sm text-evs-1 hover:bg-red-50">
            <Lock className="h-4 w-4" /> {t('tribe.closeForum')}
          </button>
        )}
        {canWrite && (
          <button type="button" onClick={() => setInviting((v) => !v)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            <UserPlus className="h-4 w-4" /> {t('tribe.invite')}
          </button>
        )}
      </div>

      {inviting && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-brand-50/40 p-3">
          <input value={folio} onChange={(e) => setFolio(e.target.value)} placeholder="NM-000123" className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" />
          <Button size="sm" onClick={() => void onInvite()}>{t('tribe.sendInvite')}</Button>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-sm text-muted">{t('tribe.loading')}</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t('tribe.noMessages')}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <EnergyDot energy={m.author_energy} /> {m.author_name}
                  {m.author_is_mod && <ShieldCheck className="h-3.5 w-3.5 text-brand-600" aria-label={t('tribe.mod.badge')} />}
                </p>
                {canWrite && m.author_id !== userId && (
                  <button type="button" onClick={() => setThanking({ id: m.author_id, name: m.author_name })} title={t('tribe.grat.give')} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-50">
                    <Sparkles className="h-3.5 w-3.5" /> {t('tribe.grat.give')}
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{m.body}</p>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {canWrite ? (
        <div className="flex items-end gap-2 border-t border-slate-100 p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            placeholder={t('tribe.messagePlaceholder')}
            className="flex-1 resize-none rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <Button onClick={() => void onSend()} loading={busy} leadingIcon={<Send className="h-4 w-4" />}>{t('tribe.send')}</Button>
        </div>
      ) : (
        <p className="border-t border-slate-100 p-3 text-center text-xs text-muted">{t('tribe.readOnly')}</p>
      )}

      {thanking && (
        <GiveGratitudeModal
          receiverId={thanking.id}
          receiverName={thanking.name}
          forumId={forum.id}
          onClose={() => setThanking(null)}
        />
      )}
    </div>
  );
}
