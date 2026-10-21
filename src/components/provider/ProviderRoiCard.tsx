/**
 * ProviderRoiCard — "Lo que te dio Neuromundi": el instrumento de ROI del
 * prestador. Hace visible y atribuible lo que recibió por su cuota (vistas,
 * solicitudes de contacto, citas, reseñas, ventas) para sostener la renovación.
 * Lee la RPC my_provider_roi (datos propios). Para TODOS los prestadores.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { SkeletonCard } from '@/components/ui';
import { Eye, Handshake, CalendarCheck, Star, ShoppingBag } from 'lucide-react';

interface Roi {
  views_total: number; views_30d: number;
  requests_total: number; requests_30d: number; requests_accepted: number;
  appts_total: number; appts_30d: number;
  reviews_total: number; reviews_30d: number;
  orders_paid_30d: number;
}

function Tile({ icon, big, label, sub }: { icon: React.ReactNode; big: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">{icon}</span>
      <p className="text-2xl font-extrabold text-slate-900">{big}</p>
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-snug text-muted">{sub}</p>}
    </div>
  );
}

export function ProviderRoiCard() {
  const { t } = useTranslation();
  const [r, setR] = useState<Roi | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc('my_provider_roi');
      if (!alive) return;
      if (error || !data) { setErr(true); return; }
      setR(data as unknown as Roi);
    })();
    return () => { alive = false; };
  }, []);

  if (err) return null;
  if (!r) return <div className="mb-4"><SkeletonCard rows={2} /></div>;

  return (
    <section className="mb-4 rounded-3xl border border-brand-100 bg-gradient-to-br from-white to-brand-50/40 p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-bold text-slate-900">{t('roi.title')}</h2>
        <span className="text-xs text-muted">{t('core.last30')}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile icon={<Eye className="h-5 w-5 text-white" />} big={r.views_30d} label={t('roi.views')}
          sub={t('roi.total', { n: r.views_total })} />
        <Tile icon={<Handshake className="h-5 w-5 text-white" />} big={r.requests_30d} label={t('roi.requests')}
          sub={t('roi.accepted', { n: r.requests_accepted })} />
        <Tile icon={<CalendarCheck className="h-5 w-5 text-white" />} big={r.appts_30d} label={t('roi.appts')}
          sub={t('roi.total', { n: r.appts_total })} />
        <Tile icon={<Star className="h-5 w-5 text-white" />} big={r.reviews_30d} label={t('roi.reviews')}
          sub={t('roi.total', { n: r.reviews_total })} />
        <Tile icon={<ShoppingBag className="h-5 w-5 text-white" />} big={r.orders_paid_30d} label={t('roi.sales')} />
      </div>
    </section>
  );
}
