/**
 * AdminTribe — moderación de Tribu Neuromundi. Tres áreas: Foros (aprobar/rechazar),
 * Moderadores (aprobar/rechazar postulaciones) y Miembros (suspensión total o
 * parcial: escribir / evaluar / reseñar).
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Check, X, RotateCcw, ShieldCheck, UserCog, Search, MessagesSquare, Trash2, ArrowLeft, Megaphone, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SkeletonCard, EmptyState, Button, useToast } from '@/components/ui';

type Area = 'forums' | 'moderators' | 'members' | 'messages' | 'forummods';
const STATUS_TABS = ['pending', 'approved', 'rejected'] as const;

interface AdminForum { id: string; title: string; description: string | null; theme: string | null; country: string | null; language: string | null; creator_name: string; status: string; created_at: string }
interface AdminMod { user_id: string; name: string; member_no: number | null; status: string; points: number; justification: string | null; created_at: string }
interface MemberLookup { user_id: string; name: string; status: string; can_write: boolean; can_evaluate: boolean; can_review: boolean }

function ForumsArea() {
  const { t } = useTranslation();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('pending');
  const [rows, setRows] = useState<AdminForum[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const { data } = await supabase.rpc('admin_tribe_forums', { p_status: tab }); setRows((data as AdminForum[] | null) ?? []); setLoading(false); }, [tab]);
  useEffect(() => { void load(); }, [load]);
  const setStatus = async (id: string, status: string) => { const { error } = await supabase.rpc('admin_set_forum_status', { p_forum: id, p_status: status }); if (error) toast.error(error.message); else { toast.success(t('adm.tribe.done')); await load(); } };
  const callMods = async (id: string) => { const { error } = await supabase.rpc('tribe_forum_call_moderators', { p_forum: id }); if (error) toast.error(error.message); else toast.success(t('adm.tribe.called')); };

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {STATUS_TABS.map((s) => <button key={s} type="button" onClick={() => setTab(s)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === s ? 'bg-white text-slate-900 shadow-sm' : 'text-muted'}`}>{t(`adm.tribe.${s}`)}</button>)}
      </div>
      {loading ? <SkeletonCard rows={3} /> : rows.length === 0 ? <EmptyState icon={<Users className="h-6 w-6" />} title={t('adm.tribe.emptyTitle')} description={t('adm.tribe.empty')} /> : (
        <div className="space-y-2">{rows.map((f) => (
          <div key={f.id} className="rounded-xl border border-slate-100 bg-white p-3">
            <p className="font-semibold text-slate-900">{f.title}</p>
            <p className="flex flex-wrap gap-x-2 text-xs text-muted">{f.theme && <span>{f.theme}</span>}{f.language && <span>{f.language}</span>}{f.country && <span>{f.country}</span>}<span>· {f.creator_name}</span></p>
            {f.description && <p className="mt-1 text-sm text-slate-600">{f.description}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {f.status !== 'approved' && <button type="button" onClick={() => void setStatus(f.id, 'approved')} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700"><Check className="h-4 w-4" /> {t('adm.tribe.approve')}</button>}
              {f.status !== 'rejected' && f.status !== 'closed' && <button type="button" onClick={() => void setStatus(f.id, 'rejected')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> {t('adm.tribe.reject')}</button>}
              {f.status !== 'pending' && <button type="button" onClick={() => void setStatus(f.id, 'pending')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4" /> {t('adm.tribe.reset')}</button>}
              {f.status === 'approved' && <button type="button" onClick={() => void callMods(f.id)} className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"><Megaphone className="h-4 w-4" /> {t('adm.tribe.callMods')}</button>}
              {f.status === 'approved' && <button type="button" onClick={() => void setStatus(f.id, 'closed')} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-sm font-medium text-evs-1 hover:bg-red-50"><Lock className="h-4 w-4" /> {t('adm.tribe.closeForum')}</button>}
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

// Postulaciones de moderador por foro (aprobar/rechazar).
interface ForumModApp { id: string; forum_title: string; user_id: string; name: string; member_no: number | null; status: string }
function ForumModsArea() {
  const { t } = useTranslation();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('pending');
  const [rows, setRows] = useState<ForumModApp[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const { data } = await supabase.rpc('admin_forum_moderators', { p_forum: null, p_status: tab }); setRows((data as ForumModApp[] | null) ?? []); setLoading(false); }, [tab]);
  useEffect(() => { void load(); }, [load]);
  const setStatus = async (id: string, status: string) => { const { error } = await supabase.rpc('admin_set_forum_moderator', { p_id: id, p_status: status }); if (error) toast.error(error.message); else { toast.success(t('adm.tribe.done')); await load(); } };

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {STATUS_TABS.map((s) => <button key={s} type="button" onClick={() => setTab(s)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === s ? 'bg-white text-slate-900 shadow-sm' : 'text-muted'}`}>{t(`adm.tribe.${s}`)}</button>)}
      </div>
      {loading ? <SkeletonCard rows={3} /> : rows.length === 0 ? <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title={t('adm.tribe.modEmptyTitle')} description={t('adm.tribe.modEmpty')} /> : (
        <div className="space-y-2">{rows.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-100 bg-white p-3">
            <p className="font-semibold text-slate-900">{m.name} {m.member_no != null && <span className="font-mono text-xs text-brand-700">NM-{String(m.member_no).padStart(6, '0')}</span>}</p>
            <p className="text-xs text-muted">{t('adm.tribe.forumLabel')}: {m.forum_title}</p>
            <div className="mt-2 flex gap-2">
              {m.status !== 'approved' && <button type="button" onClick={() => void setStatus(m.id, 'approved')} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700"><Check className="h-4 w-4" /> {t('adm.tribe.approve')}</button>}
              {m.status !== 'rejected' && <button type="button" onClick={() => void setStatus(m.id, 'rejected')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> {t('adm.tribe.reject')}</button>}
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

function ModeratorsArea() {
  const { t } = useTranslation();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('pending');
  const [rows, setRows] = useState<AdminMod[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const { data } = await supabase.rpc('admin_tribe_moderators', { p_status: tab }); setRows((data as AdminMod[] | null) ?? []); setLoading(false); }, [tab]);
  useEffect(() => { void load(); }, [load]);
  const setStatus = async (uid: string, status: string) => { const { error } = await supabase.rpc('admin_set_moderator_status', { p_user: uid, p_status: status }); if (error) toast.error(error.message); else { toast.success(t('adm.tribe.done')); await load(); } };

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {STATUS_TABS.map((s) => <button key={s} type="button" onClick={() => setTab(s)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === s ? 'bg-white text-slate-900 shadow-sm' : 'text-muted'}`}>{t(`adm.tribe.${s}`)}</button>)}
      </div>
      {loading ? <SkeletonCard rows={3} /> : rows.length === 0 ? <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title={t('adm.tribe.modEmptyTitle')} description={t('adm.tribe.modEmpty')} /> : (
        <div className="space-y-2">{rows.map((m) => (
          <div key={m.user_id} className="rounded-xl border border-slate-100 bg-white p-3">
            <p className="font-semibold text-slate-900">{m.name} {m.member_no != null && <span className="font-mono text-xs text-brand-700">NM-{String(m.member_no).padStart(6, '0')}</span>}</p>
            {m.justification && <p className="mt-1 text-sm text-slate-600">{m.justification}</p>}
            <div className="mt-2 flex gap-2">
              {m.status !== 'approved' && <button type="button" onClick={() => void setStatus(m.user_id, 'approved')} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700"><Check className="h-4 w-4" /> {t('adm.tribe.approve')}</button>}
              {m.status !== 'rejected' && <button type="button" onClick={() => void setStatus(m.user_id, 'rejected')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> {t('adm.tribe.reject')}</button>}
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

function MembersArea() {
  const { t } = useTranslation();
  const toast = useToast();
  const [folio, setFolio] = useState('');
  const [member, setMember] = useState<MemberLookup | null>(null);
  const [notFound, setNotFound] = useState(false);

  const lookup = async () => {
    const n = parseInt(folio.replace(/\D/g, ''), 10);
    if (Number.isNaN(n)) { toast.error(t('tribe.invalidFolio')); return; }
    const { data } = await supabase.rpc('admin_tribe_member_lookup', { p_member_no: n });
    const row = (data as MemberLookup[] | null)?.[0] ?? null;
    setMember(row); setNotFound(!row);
  };

  const save = async (patch: Partial<MemberLookup>) => {
    if (!member) return;
    const next = { ...member, ...patch };
    const { error } = await supabase.rpc('admin_set_tribe_member', {
      p_user: member.user_id, p_status: next.status, p_can_write: next.can_write, p_can_evaluate: next.can_evaluate, p_can_review: next.can_review,
    });
    if (error) toast.error(error.message);
    else { setMember(next); toast.success(t('adm.tribe.memberSaved')); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input value={folio} onChange={(e) => setFolio(e.target.value)} placeholder="NM-000123" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" />
        </div>
        <Button size="sm" onClick={() => void lookup()}>{t('adm.tribe.lookup')}</Button>
      </div>
      {notFound && <p className="text-sm text-muted">{t('adm.tribe.memberNotFound')}</p>}
      {member && (
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="font-semibold text-slate-900">{member.name}</p>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-semibold text-slate-800">{t('adm.tribe.status')}</label>
            <select value={member.status} onChange={(e) => void save({ status: e.target.value })} className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm">
              <option value="active">{t('adm.tribe.st.active')}</option>
              <option value="muted">{t('adm.tribe.st.muted')}</option>
              <option value="suspended">{t('adm.tribe.st.suspended')}</option>
            </select>
          </div>
          <div className="mt-3 space-y-2">
            {(['can_write', 'can_evaluate', 'can_review'] as const).map((k) => (
              <label key={k} className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" checked={member[k]} onChange={(e) => void save({ [k]: e.target.checked } as Partial<MemberLookup>)} className="h-5 w-5 rounded border-slate-300 text-brand-500" />
                <span>{t(`adm.tribe.perm.${k}`)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AdminMsg { id: string; author_id: string; author_name: string; body: string; created_at: string }

// Moderación de mensajes: elige un foro aprobado y revisa/elimina sus mensajes.
function MessagesArea() {
  const { t } = useTranslation();
  const toast = useToast();
  const [forums, setForums] = useState<AdminForum[]>([]);
  const [loadingForums, setLoadingForums] = useState(true);
  const [open, setOpen] = useState<AdminForum | null>(null);
  const [msgs, setMsgs] = useState<AdminMsg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const loadForums = useCallback(async () => {
    setLoadingForums(true);
    const { data } = await supabase.rpc('admin_tribe_forums', { p_status: 'approved' });
    setForums((data as AdminForum[] | null) ?? []);
    setLoadingForums(false);
  }, []);
  useEffect(() => { void loadForums(); }, [loadForums]);

  const loadMsgs = useCallback(async (forumId: string) => {
    setLoadingMsgs(true);
    const { data } = await supabase.rpc('tribe_forum_messages', { p_forum: forumId });
    setMsgs((data as AdminMsg[] | null) ?? []);
    setLoadingMsgs(false);
  }, []);

  const openForum = (f: AdminForum) => { setOpen(f); void loadMsgs(f.id); };

  const del = async (id: string) => {
    const { error } = await supabase.rpc('tribe_delete_message', { p_msg: id });
    if (error) { toast.error(error.message); return; }
    toast.success(t('adm.tribe.msgDeleted'));
    setMsgs((m) => m.filter((x) => x.id !== id));
  };

  if (open) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => setOpen(null)} className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" /> {t('adm.tribe.backForums')}</button>
        <p className="font-bold text-slate-900">{open.title}</p>
        {loadingMsgs ? <SkeletonCard rows={3} /> : msgs.length === 0 ? (
          <EmptyState icon={<MessagesSquare className="h-6 w-6" />} title={t('adm.tribe.noMsgsTitle')} description={t('adm.tribe.noMsgs')} />
        ) : (
          <div className="space-y-2">{msgs.map((m) => (
            <div key={m.id} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700">{m.author_name}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">{m.body}</p>
              </div>
              <button type="button" onClick={() => void del(m.id)} aria-label={t('adm.tribe.msgDelete')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-evs-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t('adm.tribe.msgPick')}</p>
      {loadingForums ? <SkeletonCard rows={3} /> : forums.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title={t('adm.tribe.emptyTitle')} description={t('adm.tribe.empty')} />
      ) : (
        <div className="space-y-2">{forums.map((f) => (
          <button key={f.id} type="button" onClick={() => openForum(f)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white p-3 text-left hover:bg-slate-50">
            <span className="min-w-0"><span className="font-semibold text-slate-900">{f.title}</span> <span className="text-xs text-muted">· {f.creator_name}</span></span>
            <MessagesSquare className="h-4 w-4 shrink-0 text-brand-600" />
          </button>
        ))}</div>
      )}
    </div>
  );
}

export function AdminTribe() {
  const { t } = useTranslation();
  const [area, setArea] = useState<Area>('forums');
  const AREAS: { key: Area; icon: typeof Users }[] = [
    { key: 'forums', icon: Users }, { key: 'moderators', icon: ShieldCheck }, { key: 'forummods', icon: ShieldCheck }, { key: 'members', icon: UserCog }, { key: 'messages', icon: MessagesSquare },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Users className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('adm.tribe.title')}</h2>
        <p className="text-sm text-muted">{t('adm.tribe.subtitle')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {AREAS.map(({ key, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setArea(key)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${area === key ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <Icon className="h-4 w-4" /> {t(`adm.tribe.area.${key}`)}
          </button>
        ))}
      </div>
      {area === 'forums' ? <ForumsArea /> : area === 'moderators' ? <ModeratorsArea /> : area === 'forummods' ? <ForumModsArea /> : area === 'members' ? <MembersArea /> : <MessagesArea />}
    </div>
  );
}
