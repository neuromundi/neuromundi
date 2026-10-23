/**
 * AdminHomeClicks — "Monitor del home": qué opciones de la portada se pulsan,
 * con cuánta frecuencia y desde qué país. Lee la RPC `admin_home_clicks` (un
 * solo JSON: ranking por opción, desglose por país y tendencia de 30 días).
 *
 * Las etiquetas de cada opción son INTERNAS (las usa el admin, que trabaja en
 * español), así que viven en un mapa local y no en i18n: traducir ~20 claves a
 * 11 idiomas sería desproporcionado. Una opción sin etiqueta cae a su clave
 * cruda, así que añadir un `data-home-track` nuevo no rompe este panel.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Button, SkeletonCard } from '@/components/ui';
import { RefreshCw, MousePointerClick, Globe2 } from 'lucide-react';

interface OptionRow { option: string; total: number; total_30d: number }
interface CountryRow { country: string; total: number }
interface TrendRow { day: string; total: number }
interface Report {
  by_option: OptionRow[];
  by_country: CountryRow[];
  trend_30d: TrendRow[];
  total: number;
  total_30d: number;
}

/** Etiqueta legible por opción. Fallback: la clave cruda. */
const LABELS: Record<string, string> = {
  'selector-pais': 'Selector de país',
  'cta-directorio': 'Explorar directorio',
  'acceso-crear-cuenta': 'Crear cuenta (acceso rápido)',
  'acceso-experto': 'Pregunta al experto (acceso rápido)',
  'acceso-kit': 'Herramientas (acceso rápido)',
  'cta-fundador': '¿Cómo ser fundador?',
  'cta-conocer-mas': 'Conocer más',
  'cta-kit-seccion': 'Herramientas (sección Kit)',
  'cta-muro-fundadores': 'Muro de fundadores',
  'cta-muro-aliados': 'Muro de aliados',
  'blog-ver-todo': 'Blog — ver todo',
  'eventos-ver-todo': 'Eventos — ver todo',
  'blog-item': 'Blog — artículo',
  'evento-item': 'Eventos — evento',
  'aliado-academico': 'Aliado académico (Observatorio)',
  'video-bienvenida': 'Video de bienvenida',
  'cta-verificados': 'Distintivos / Verificados',
  'waitlist-lanzamiento': 'Lista de espera (próximamente)',
};

function label(option: string): string {
  return LABELS[option] ?? option;
}

export function AdminHomeClicks() {
  const { t, i18n } = useTranslation();
  const [r, setR] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase.rpc('admin_home_clicks');
    setLoading(false);
    if (err || !data) { setError(true); return; }
    setR(data as unknown as Report);
  };

  useEffect(() => { void load(); }, []);

  if (loading) return <SkeletonCard rows={4} />;
  if (error || !r) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-muted">
        {t('admin.homeclicks.unavailable')}
      </div>
    );
  }

  const maxOption = Math.max(1, ...r.by_option.map((o) => o.total));
  const maxTrend = Math.max(1, ...r.trend_30d.map((d) => d.total));
  const nf = new Intl.NumberFormat(i18n.language);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <MousePointerClick className="h-5 w-5 text-brand-600" />
            {t('admin.homeclicks.title')}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{t('admin.homeclicks.subtitle')}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void load()} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('admin.homeclicks.refresh')}
        </Button>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-2xl font-extrabold text-slate-900">{nf.format(r.total)}</p>
          <p className="text-xs font-semibold text-slate-700">{t('admin.homeclicks.total')}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-2xl font-extrabold text-slate-900">{nf.format(r.total_30d)}</p>
          <p className="text-xs font-semibold text-slate-700">{t('admin.homeclicks.last30')}</p>
        </div>
      </div>

      {r.total === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-muted">
          {t('admin.homeclicks.empty')}
        </div>
      ) : (
        <>
          {/* Ranking por opción */}
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-900">{t('admin.homeclicks.byOption')}</h3>
            <div className="space-y-2">
              {r.by_option.map((o) => (
                <div key={o.option} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">{label(o.option)}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {nf.format(o.total)} · <span className="text-brand-700">{nf.format(o.total_30d)}</span> {t('admin.homeclicks.in30')}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round((o.total / maxOption) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tendencia 30 días */}
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-900">{t('admin.homeclicks.trend')}</h3>
            {r.trend_30d.length === 0 ? (
              <p className="text-sm text-muted">{t('admin.homeclicks.empty')}</p>
            ) : (
              <div className="flex h-24 items-end gap-0.5">
                {r.trend_30d.map((d) => (
                  <div
                    key={d.day}
                    className="flex-1 rounded-t bg-brand-400"
                    style={{ height: `${Math.max(4, Math.round((d.total / maxTrend) * 100))}%` }}
                    title={`${new Date(d.day).toLocaleDateString(i18n.language)}: ${nf.format(d.total)}`}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Desglose por país */}
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Globe2 className="h-4 w-4 text-brand-600" /> {t('admin.homeclicks.byCountry')}
            </h3>
            <div className="divide-y divide-slate-100">
              {r.by_country.map((c) => (
                <div key={c.country} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-slate-800">{c.country === 'sin país' ? t('admin.homeclicks.noCountry') : c.country}</span>
                  <span className="font-semibold text-slate-900">{nf.format(c.total)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
