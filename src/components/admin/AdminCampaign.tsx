/**
 * AdminCampaign — configuración de la campaña de pre-registro (sin recompilar):
 * interruptor maestro, fecha de inicio del bloqueo, duración por defecto y por
 * país, y activación del popup de bienvenida por continente. Guarda con
 * `admin_campaign_set`.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Save, Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, SkeletonCard, useToast } from '@/components/ui';
import { useCountryLabel } from '@/lib/countryLabel';
import { COUNTRIES } from '@/data/countries';
import { CONTINENTS } from '@/data/continents';

const inputCls = 'w-full rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

// ISO (UTC) ⇄ valor de <input type="datetime-local"> (hora local del admin).
function isoToLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
function localToIso(local: string): string | null {
  return local ? new Date(local).toISOString() : null;
}

export function AdminCampaign() {
  const { t } = useTranslation();
  const toast = useToast();
  const countryLabel = useCountryLabel();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [startLocal, setStartLocal] = useState('');
  const [defaultDays, setDefaultDays] = useState(90);
  const [countryDays, setCountryDays] = useState<{ country: string; days: number }[]>([]);
  const [popupActive, setPopupActive] = useState(false);
  const [popupContinents, setPopupContinents] = useState<Record<string, boolean>>({});
  const [stages, setStages] = useState<{ days: number; pct: number }[]>([]);
  const [community, setCommunity] = useState('');
  const [drawCount, setDrawCount] = useState(1);
  const [drawRole, setDrawRole] = useState('');
  const [winners, setWinners] = useState<{ name: string; member_no: number | null; email: string; tickets: number }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('campaign_status');
    const c = data as {
      active: boolean; start_at: string | null; default_block_days: number;
      block_days_by_country: Record<string, number>; popup_active: boolean; popup_continents: Record<string, boolean>;
      founder_discount: { days: number; pct: number }[]; community_url: string | null;
    } | null;
    if (c) {
      setCommunity(c.community_url ?? '');
      setActive(c.active);
      setStartLocal(isoToLocal(c.start_at));
      setDefaultDays(c.default_block_days);
      setCountryDays(Object.entries(c.block_days_by_country ?? {}).map(([country, days]) => ({ country, days: Number(days) })));
      setPopupActive(c.popup_active);
      setPopupContinents(c.popup_continents ?? {});
      setStages(Array.isArray(c.founder_discount) ? c.founder_discount.map((s) => ({ days: Number(s.days), pct: Number(s.pct) })) : []);
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setBusy(true);
    const daysMap: Record<string, number> = {};
    for (const r of countryDays) if (r.country && r.days > 0) daysMap[r.country] = r.days;
    const { error } = await supabase.rpc('admin_campaign_set', {
      p_active: active,
      p_start_at: localToIso(startLocal),
      p_default_days: defaultDays,
      p_days_by_country: daysMap,
      p_popup_active: popupActive,
      p_popup_continents: popupContinents,
      p_founder_discount: stages.filter((s) => s.days > 0 && s.pct >= 0).sort((a, b) => a.days - b.days),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success(t('admin.camp.saved'));
  };

  const saveCommunity = async () => {
    const { error } = await supabase.rpc('admin_set_campaign_community', { p_url: community });
    toast[error ? 'error' : 'success'](error ? error.message : t('admin.camp.saved'));
  };

  const draw = async () => {
    const { data, error } = await supabase.rpc('admin_raffle_draw', { p_count: drawCount, p_role: drawRole || null, p_batch: drawRole || 'all' });
    if (error) { toast.error(error.message); return; }
    setWinners((data as { name: string; member_no: number | null; email: string; tickets: number }[]) ?? []);
    toast.success(t('admin.camp.drawDone'));
  };

  const downloadWinners = async () => {
    const { data, error } = await supabase.rpc('admin_raffle_winners');
    if (error) { toast.error(error.message); return; }
    const rows = (data as { name: string; member_no: number | null; email: string; batch: string | null; drawn_at: string }[]) ?? [];
    const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
    const csv = ['Folio,Nombre,Correo,Sorteo,Fecha', ...rows.map((r) => [r.member_no ?? '', esc(r.name), esc(r.email), r.batch ?? '', r.drawn_at].join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'ganadores-neuromundi.csv';
    a.click();
  };

  const downloadRaffle = async () => {
    const { data, error } = await supabase.rpc('admin_raffle_entries');
    if (error) { toast.error(error.message); return; }
    const rows = (data as { name: string; member_no: number | null; email: string; role: string; tickets: number }[]) ?? [];
    const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
    const csv = ['Folio,Nombre,Correo,Perfil,Boletos', ...rows.map((r) => [r.member_no ?? '', esc(r.name), esc(r.email), r.role, r.tickets].join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'sorteo-neuromundi.csv';
    a.click();
  };

  if (loading) return <SkeletonCard rows={4} />;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-1 font-semibold text-slate-900">{t('admin.camp.title')}</h2>
        <p className="mb-3 text-sm text-muted">{t('admin.camp.intro')}</p>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-brand-500" />
          {t('admin.camp.active')}
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800">{t('admin.camp.startAt')}</label>
            <input type="datetime-local" className={inputCls} value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800">{t('admin.camp.defaultDays')}</label>
            <input type="number" min="1" className={inputCls} value={defaultDays} onChange={(e) => setDefaultDays(Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Duración por país (override) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-slate-900">{t('admin.camp.countryDays')}</h3>
        <div className="space-y-2">
          {countryDays.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <select className={inputCls} value={r.country} onChange={(e) => setCountryDays((rows) => rows.map((x, j) => (j === i ? { ...x, country: e.target.value } : x)))}>
                <option value="">{t('admin.camp.pickCountry')}</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>)}
              </select>
              <input type="number" min="1" className={`${inputCls} w-24`} value={r.days} onChange={(e) => setCountryDays((rows) => rows.map((x, j) => (j === i ? { ...x, days: Number(e.target.value) } : x)))} />
              <button type="button" onClick={() => setCountryDays((rows) => rows.filter((_, j) => j !== i))} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="ghost" className="mt-2" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCountryDays((r) => [...r, { country: '', days: 30 }])}>{t('admin.camp.addCountry')}</Button>
      </div>

      {/* Popup por continente */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
          <input type="checkbox" checked={popupActive} onChange={(e) => setPopupActive(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-brand-500" />
          {t('admin.camp.popupActive')}
        </label>
        <p className="mb-2 mt-1 text-xs text-muted">{t('admin.camp.popupHint')}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CONTINENTS.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={popupContinents[c] === true} onChange={(e) => setPopupContinents((p) => ({ ...p, [c]: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-brand-500" />
              {c}
            </label>
          ))}
        </div>
      </div>

      {/* Descuento de fundador por etapa (solo membresía anual) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-1 font-semibold text-slate-900">{t('admin.camp.discTitle')}</h3>
        <p className="mb-2 text-xs text-muted">{t('admin.camp.discHint')}</p>
        <div className="space-y-2">
          {stages.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-muted">{t('admin.camp.discUntilDay')}</span>
              <input type="number" min="1" className={`${inputCls} w-20`} value={s.days} onChange={(e) => setStages((rows) => rows.map((x, j) => (j === i ? { ...x, days: Number(e.target.value) } : x)))} />
              <span className="text-muted">→</span>
              <input type="number" min="0" max="100" className={`${inputCls} w-20`} value={s.pct} onChange={(e) => setStages((rows) => rows.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))} />
              <span className="text-muted">%</span>
              <button type="button" onClick={() => setStages((rows) => rows.filter((_, j) => j !== i))} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="ghost" className="mt-2" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setStages((r) => [...r, { days: 30, pct: 25 }])}>{t('admin.camp.addStage')}</Button>
      </div>

      {/* Grupo privado (Discord/WhatsApp) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-1 font-semibold text-slate-900">{t('admin.camp.communityTitle')}</h3>
        <p className="mb-2 text-xs text-muted">{t('admin.camp.communityHint')}</p>
        <div className="flex gap-2">
          <input className={inputCls} type="url" placeholder="https://discord.gg/… o https://chat.whatsapp.com/…" value={community} onChange={(e) => setCommunity(e.target.value)} />
          <Button size="sm" onClick={() => void saveCommunity()}>{t('admin.camp.save')}</Button>
        </div>
      </div>

      {/* Sorteo: exportar participantes, realizar el sorteo y ver ganadores */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-slate-900"><Ticket className="h-5 w-5 text-amber-600" /> {t('admin.camp.raffleTitle')}</h3>
        <p className="mb-2 text-xs text-muted">{t('admin.camp.raffleHint')}</p>
        <Button size="sm" variant="secondary" leadingIcon={<Ticket className="h-4 w-4" />} onClick={() => void downloadRaffle()}>{t('admin.camp.raffleCsv')}</Button>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <h4 className="mb-2 text-sm font-bold text-slate-900">{t('admin.camp.drawTitle')}</h4>
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${inputCls} w-auto`} value={drawRole} onChange={(e) => setDrawRole(e.target.value)}>
              <option value="">{t('admin.camp.drawAll')}</option>
              <option value="consumer">{t('admin.camp.drawConsumer')}</option>
              <option value="paying">{t('admin.camp.drawPaying')}</option>
            </select>
            <input type="number" min="1" className={`${inputCls} w-24`} value={drawCount} onChange={(e) => setDrawCount(Number(e.target.value))} />
            <Button size="sm" onClick={() => void draw()}>{t('admin.camp.drawCta')}</Button>
            <Button size="sm" variant="ghost" onClick={() => void downloadWinners()}>{t('admin.camp.winnersCsv')}</Button>
          </div>
          {winners.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {winners.map((w, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-1.5">
                  <span className="font-medium text-slate-900">{w.name} <span className="font-mono text-xs text-brand-700">NM-{String(w.member_no ?? 0).padStart(6, '0')}</span></span>
                  <span className="text-xs text-muted">{w.email} · {t('recommend.raffleTickets', { count: w.tickets })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Button onClick={save} loading={busy} leadingIcon={<Save className="h-4 w-4" />}>{t('admin.camp.save')}</Button>
    </section>
  );
}
