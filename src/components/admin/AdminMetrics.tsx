/**
 * AdminMetrics — tablero de métricas de la plataforma (lanzamiento).
 * Lee la RPC admin_metrics() (acotada a admin). Muestra tarjetas con los
 * indicadores clave. Degrada con aviso si la migración 0018 no está aplicada.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, ShieldCheck, Eye, Crown, ShoppingBag, ShieldAlert, Share2, TrendingUp, RefreshCw, UserX } from 'lucide-react';
import { Button, SkeletonCard } from '@/components/ui';
import { supabase } from '@/lib/supabase';

interface Metrics {
  members_total: number;
  providers_total: number;
  providers_verified: number;
  providers_published: number;
  founders_total: number;
  products_active: number;
  reports_open: number;
  referrals_total: number;
  incomplete_registrations: number;
  new_7d: number;
  new_30d: number;
}

export function AdminMetrics() {
  const { t } = useTranslation();
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase.rpc('admin_metrics' as never);
    setLoading(false);
    if (err || !data) { setError(true); return; }
    setM(data as unknown as Metrics);
  };

  useEffect(() => { void load(); }, []);

  if (loading) return <div className="grid gap-3 sm:grid-cols-2"><SkeletonCard rows={0} /><SkeletonCard rows={0} /></div>;
  if (error || !m) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-muted">
        {t('metrics.unavailable')}
      </div>
    );
  }

  const cards: { icon: typeof Users; label: string; value: number; tone: string }[] = [
    { icon: TrendingUp, label: 'metrics.new7d', value: m.new_7d, tone: 'text-brand-700' },
    { icon: TrendingUp, label: 'metrics.new30d', value: m.new_30d, tone: 'text-brand-700' },
    { icon: Users, label: 'metrics.members', value: m.members_total, tone: 'text-slate-900' },
    { icon: ShieldCheck, label: 'metrics.verified', value: m.providers_verified, tone: 'text-sage-700' },
    { icon: Eye, label: 'metrics.published', value: m.providers_published, tone: 'text-slate-900' },
    { icon: Crown, label: 'metrics.founders', value: m.founders_total, tone: 'text-warm-700' },
    { icon: ShoppingBag, label: 'metrics.products', value: m.products_active, tone: 'text-slate-900' },
    { icon: Share2, label: 'metrics.referrals', value: m.referrals_total, tone: 'text-brand-700' },
    { icon: ShieldAlert, label: 'metrics.reportsOpen', value: m.reports_open, tone: m.reports_open > 0 ? 'text-red-600' : 'text-slate-900' },
    { icon: UserX, label: 'metrics.incomplete', value: m.incomplete_registrations ?? 0, tone: (m.incomplete_registrations ?? 0) > 0 ? 'text-warm-700' : 'text-slate-900' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={load} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('metrics.refresh')}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <Icon className={`h-5 w-5 ${c.tone}`} aria-hidden="true" />
              <p className={`mt-2 text-2xl font-extrabold ${c.tone}`}>{c.value.toLocaleString()}</p>
              <p className="text-xs text-muted">{t(c.label)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
