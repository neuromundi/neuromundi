/**
 * AdminCoreMetrics — "Bucle central": las 5 métricas que deciden si el
 * marketplace está vivo (oferta activa, demanda, descubrimiento→contacto,
 * contacto→agenda, cierre). Lee la RPC admin_core_metrics (solo admin).
 * Datos compartibles con terceros (inversores/aliados).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { SkeletonCard } from '@/components/ui';
import { Store, Users, MousePointerClick, CalendarCheck, Star } from 'lucide-react';

interface Core {
  providers_published: number; providers_paying: number;
  families_total: number; families_new_30d: number;
  views_30d: number; contact_requests_total: number; contact_requests_30d: number; contact_accepted_30d: number;
  appts_30d: number; reviews_30d: number; directory_seeded: number; directory_claimed: number;
}

function Tile({ icon, big, label, sub, accent }: { icon: React.ReactNode; big: React.ReactNode; label: string; sub?: string; accent: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>{icon}</span>
      <p className="text-2xl font-extrabold text-slate-900">{big}</p>
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-snug text-muted">{sub}</p>}
    </div>
  );
}

export function AdminCoreMetrics() {
  const { t } = useTranslation();
  const [m, setM] = useState<Core | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc('admin_core_metrics');
      if (!alive) return;
      if (error || !data) { setErr(true); return; }
      setM(data as unknown as Core);
    })();
    return () => { alive = false; };
  }, []);

  if (err) return null;
  if (!m) return <SkeletonCard rows={2} />;

  const pct = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-slate-900">{t('core.title')}</h2>
        <span className="text-xs text-muted">{t('core.last30')}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile icon={<Store className="h-5 w-5 text-white" />} accent="bg-brand-600"
          big={m.providers_published} label={t('core.supply')}
          sub={t('core.paying', { n: m.providers_paying })} />
        <Tile icon={<Users className="h-5 w-5 text-white" />} accent="bg-emerald-500"
          big={m.families_total} label={t('core.demand')}
          sub={t('core.new', { n: m.families_new_30d })} />
        <Tile icon={<MousePointerClick className="h-5 w-5 text-white" />} accent="bg-sky-600"
          big={m.contact_requests_30d} label={t('core.contacts')}
          sub={t('core.views', { n: m.views_30d, pct: pct(m.contact_requests_30d, m.views_30d) })} />
        <Tile icon={<CalendarCheck className="h-5 w-5 text-white" />} accent="bg-violet-600"
          big={m.appts_30d} label={t('core.appts')}
          sub={t('core.ofContacts', { n: m.contact_requests_30d })} />
        <Tile icon={<Star className="h-5 w-5 text-white" />} accent="bg-amber-500"
          big={m.reviews_30d} label={t('core.reviews')}
          sub={t('core.accepted', { n: m.contact_accepted_30d })} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {t('core.directory', { claimed: m.directory_claimed, seeded: m.directory_seeded })}
      </p>
    </section>
  );
}
