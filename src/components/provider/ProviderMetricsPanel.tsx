/**
 * ProviderMetricsPanel — resumen de alcance del perfil para el prestador:
 * vistas de perfil y clics a contacto (total y últimos 30 días), más la tasa de
 * conversión (contactos ÷ vistas). Solo ve sus propios datos.
 */
import { useTranslation } from 'react-i18next';
import { Eye, MousePointerClick, TrendingUp } from 'lucide-react';
import { SkeletonCard } from '@/components/ui';
import { useProviderMetrics } from '@/hooks/useProviderMetrics';

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center gap-2 text-brand-600">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}

export function ProviderMetricsPanel() {
  const { t } = useTranslation();
  const { metrics, loading } = useProviderMetrics();

  if (loading) return <SkeletonCard rows={2} />;

  const conversion =
    metrics.views_total > 0 ? Math.round((metrics.contacts_total / metrics.views_total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">{t('metrics.title')}</h3>
        <p className="text-sm text-muted">{t('metrics.help')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<Eye className="h-4 w-4" aria-hidden="true" />}
          label={t('metrics.views')}
          value={metrics.views_total.toLocaleString()}
          sub={t('metrics.last30', { n: metrics.views_30d })}
        />
        <Stat
          icon={<MousePointerClick className="h-4 w-4" aria-hidden="true" />}
          label={t('metrics.contacts')}
          value={metrics.contacts_total.toLocaleString()}
          sub={t('metrics.last30', { n: metrics.contacts_30d })}
        />
        <Stat
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          label={t('metrics.conversion')}
          value={`${conversion}%`}
          sub={t('metrics.conversionHelp')}
        />
      </div>

      {metrics.views_total === 0 && (
        <p className="rounded-xl bg-slate-50 p-3 text-center text-sm text-muted">{t('metrics.empty')}</p>
      )}
    </div>
  );
}
