/**
 * AdminFounders — curación del muro de Miembros Fundadores por país.
 *
 * El sistema autodetecta a los fundadores; aquí el admin decide cuáles se
 * muestran en el muro público (/fundadores), su orden y cuáles destacar. Filtro
 * por país para trabajar cómodo cuando hay muchos.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Eye, EyeOff, Star, StarOff, Globe } from 'lucide-react';
import { SkeletonCard, EmptyState, useToast } from '@/components/ui';
import { useAdminFounders, type AdminFounder } from '@/hooks/useAdminFounders';

const KIND_KEY: Record<AdminFounder['kind'], string> = {
  families: 'foundersWall.kind.families',
  professionals: 'foundersWall.kind.professionals',
  providers: 'foundersWall.kind.providers',
};

const inputCls = 'w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

function Row({ f, onWall }: { f: AdminFounder; onWall: ReturnType<typeof useAdminFounders>['setWall'] }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [order, setOrder] = useState(String(f.wall_order));
  const [busy, setBusy] = useState(false);

  const act = async (patch: Parameters<typeof onWall>[1]) => {
    setBusy(true);
    const ok = await onWall(f.user_id, patch);
    setBusy(false);
    if (!ok) toast.error(t('adm.founders.saveErr'));
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{f.display_name}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {f.member_no != null && <span className="font-mono text-brand-700">NM-{String(f.member_no).padStart(6, '0')}</span>}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{t(KIND_KEY[f.kind])}</span>
          {f.country && <span className="text-slate-500">{f.country}</span>}
        </p>
      </div>

      {/* Orden */}
      <label className="flex items-center gap-1 text-xs text-muted">
        {t('adm.founders.order')}
        <input
          type="number"
          className={inputCls}
          value={order}
          disabled={busy}
          onChange={(e) => setOrder(e.target.value)}
          onBlur={() => {
            const n = parseInt(order, 10);
            if (!Number.isNaN(n) && n !== f.wall_order) void act({ order: n });
          }}
        />
      </label>

      {/* Destacar */}
      <button
        type="button"
        disabled={busy || !f.wall_published}
        title={f.wall_published ? t('adm.founders.feature') : t('adm.founders.publishFirst')}
        onClick={() => void act({ featured: !f.wall_featured })}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        {f.wall_featured ? <Star className="h-4 w-4 text-warm-500" /> : <StarOff className="h-4 w-4" />}
      </button>

      {/* Publicar / quitar */}
      <button
        type="button"
        disabled={busy}
        onClick={() => void act({ published: !f.wall_published })}
        className={
          f.wall_published
            ? 'inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-40'
            : 'inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40'
        }
      >
        {f.wall_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        {f.wall_published ? t('adm.founders.published') : t('adm.founders.hidden')}
      </button>
    </div>
  );
}

export function AdminFounders() {
  const { t } = useTranslation();
  const { rows, loading, setWall } = useAdminFounders();
  const [country, setCountry] = useState('');

  const countries = useMemo(
    () => Array.from(new Set(rows.map((r) => r.country).filter((c): c is string => !!c))).sort(),
    [rows],
  );
  const shown = useMemo(() => (country ? rows.filter((r) => r.country === country) : rows), [rows, country]);
  const publishedCount = useMemo(() => rows.filter((r) => r.wall_published).length, [rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Award className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('adm.founders.title')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('adm.founders.subtitle', { published: publishedCount, total: rows.length })}</p>
        </div>

        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <Globe className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-transparent font-medium text-slate-800 focus:outline-none">
            <option value="">{t('adm.founders.allCountries')}</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonCard rows={4} />
      ) : shown.length === 0 ? (
        <EmptyState icon={<Award className="h-6 w-6" />} title={t('adm.founders.emptyTitle')} description={t('adm.founders.empty')} />
      ) : (
        <div className="space-y-2">
          {shown.map((f) => <Row key={f.user_id} f={f} onWall={setWall} />)}
        </div>
      )}
    </div>
  );
}
