/**
 * AdminAdvisors — designación del perfil ASESOR (explorador + moderador de Tribu).
 * El admin busca a la persona por folio/nombre y la marca (o desmarca) como asesor.
 * El asesor puede navegar todas las secciones sin el portero de cuota y moderar
 * Tribu, pero NO tiene acciones financieras ni administrativas.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ShieldPlus, Trash2, UserCog } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, SkeletonCard, EmptyState, useToast } from '@/components/ui';

interface Advisor { user_id: string; name: string; email: string; member_no: number | null }
interface Match { member_no: number; full_name: string; business_name: string | null; role: string }

const folio = (n: number | null) => (n != null ? `NM-${String(n).padStart(6, '0')}` : '—');

export function AdminAdvisors() {
  const { t } = useTranslation();
  const toast = useToast();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_list_advisors');
    setAdvisors((data as Advisor[] | null) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const search = async () => {
    if (q.trim().length < 2) { toast.error(t('admin.adv.searchShort')); return; }
    setSearching(true);
    const { data, error } = await supabase.rpc('search_members', { p_query: q.trim() });
    setSearching(false);
    if (error) { toast.error(error.message); return; }
    setMatches((data as Match[] | null) ?? []);
  };

  const setAdvisor = async (member_no: number, on: boolean) => {
    const { error } = await supabase.rpc('admin_set_advisor', { p_member_no: member_no, p_on: on });
    if (error) { toast.error(error.message); return; }
    toast.success(on ? t('admin.adv.added') : t('admin.adv.removed'));
    await load();
    if (!on) return;
    setMatches((m) => m.filter((x) => x.member_no !== member_no));
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900"><UserCog className="h-5 w-5 text-brand-600" /> {t('admin.adv.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('admin.adv.intro')}</p>

        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void search(); }}
              placeholder={t('admin.adv.searchPh')}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
          <Button size="sm" onClick={() => void search()} loading={searching}>{t('admin.adv.search')}</Button>
        </div>

        {matches.length > 0 && (
          <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            {matches.map((m) => (
              <li key={m.member_no} className="flex items-center gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-slate-900">{m.business_name || m.full_name}</span>
                  <span className="ml-2 text-xs text-muted">{folio(m.member_no)} · {m.role}</span>
                </div>
                <Button size="sm" variant="secondary" onClick={() => void setAdvisor(m.member_no, true)} leadingIcon={<ShieldPlus className="h-4 w-4" />}>{t('admin.adv.make')}</Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-900">{t('admin.adv.current')}</h3>
        {loading ? (
          <SkeletonCard rows={2} />
        ) : advisors.length === 0 ? (
          <EmptyState icon={<UserCog className="h-6 w-6" />} title={t('admin.adv.emptyTitle')} description={t('admin.adv.empty')} />
        ) : (
          <ul className="space-y-2">
            {advisors.map((a) => (
              <li key={a.user_id} className="flex items-center gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-slate-900">{a.name}</span>
                  <span className="ml-2 text-xs text-muted">{folio(a.member_no)} · {a.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => a.member_no != null && void setAdvisor(a.member_no, false)}
                  aria-label={t('admin.adv.remove')}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
