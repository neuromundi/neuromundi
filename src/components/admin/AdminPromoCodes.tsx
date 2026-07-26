/**
 * AdminPromoCodes — creación y gestión de códigos promocionales.
 * Extraído de la antigua sección "Facturación" para vivir dentro de "Cuotas"
 * (única sección de cuotas del panel). Reutiliza `useAdminBilling` para el CRUD.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button, SkeletonCard, useToast } from '@/components/ui';
import { useAdminBilling } from '@/hooks/useAdminBilling';

const inputCls =
  'w-full rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function AdminPromoCodes() {
  const { t } = useTranslation();
  const toast = useToast();
  const { promos, loading, createPromo, togglePromo, deletePromo } = useAdminBilling();
  const [newPromo, setNewPromo] = useState({ code: '', kind: 'personal', scope: 'all', max_uses: '', note: '' });

  const onCreatePromo = async () => {
    if (!newPromo.code.trim()) {
      toast.error(t('admin.errCode'));
      return;
    }
    const res = await createPromo({
      code: newPromo.code,
      kind: newPromo.kind,
      scope: newPromo.scope,
      max_uses: newPromo.max_uses === '' ? null : Number(newPromo.max_uses),
      note: newPromo.note || null,
    });
    if (res.ok) {
      toast.success(t('admin.created'));
      setNewPromo({ code: '', kind: 'personal', scope: 'all', max_uses: '', note: '' });
    } else toast.error(res.error);
  };

  if (loading) return <SkeletonCard rows={2} />;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-900">{t('admin.promoTitle')}</h2>
      <ul className="space-y-2">
        {promos.map((c) => (
          <li key={c.code} className="flex items-center gap-2 text-sm">
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-slate-900">{c.code}</span>
              <span className="ml-2 text-xs text-muted">
                {t(c.kind === 'universal' ? 'admin.kindUniversal' : 'admin.kindPersonal')} ·{' '}
                {c.scope === 'consumer'
                  ? t('admin.scopeConsumer')
                  : c.scope === 'provider'
                    ? t('admin.scopeProvider')
                    : t('admin.scopeAll')}{' '}
                · {c.used_count}/{c.max_uses ?? '∞'}
              </span>
            </div>
            <label className="flex items-center gap-1 text-xs text-muted">
              <input type="checkbox" checked={c.is_active} onChange={(e) => void togglePromo(c.code, e.target.checked)} />
              {t('admin.activeCol')}
            </label>
            <button
              type="button"
              onClick={async () => {
                const res = await deletePromo(c.code);
                toast[res.ok ? 'success' : 'error'](res.ok ? t('admin.deleted') : res.error);
              }}
              aria-label={t('admin.del')}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
        <input
          className={inputCls}
          placeholder={t('admin.code')}
          value={newPromo.code}
          onChange={(e) => setNewPromo((c) => ({ ...c, code: e.target.value }))}
        />
        <select className={inputCls} value={newPromo.scope} onChange={(e) => setNewPromo((c) => ({ ...c, scope: e.target.value }))}>
          <option value="all">{t('admin.scopeAll')}</option>
          <option value="consumer">{t('admin.scopeConsumer')}</option>
          <option value="provider">{t('admin.scopeProvider')}</option>
        </select>
        <select className={inputCls} value={newPromo.kind} onChange={(e) => setNewPromo((c) => ({ ...c, kind: e.target.value }))}>
          <option value="personal">{t('admin.kindPersonal')}</option>
          <option value="universal">{t('admin.kindUniversal')}</option>
        </select>
        <input
          className={inputCls}
          type="number"
          min="1"
          placeholder={t('admin.maxUses')}
          value={newPromo.max_uses}
          onChange={(e) => setNewPromo((c) => ({ ...c, max_uses: e.target.value }))}
        />
        <input
          className={`${inputCls} col-span-2`}
          placeholder={t('admin.note')}
          value={newPromo.note}
          onChange={(e) => setNewPromo((c) => ({ ...c, note: e.target.value }))}
        />
        <Button size="sm" onClick={onCreatePromo} leadingIcon={<Plus className="h-4 w-4" />} className="col-span-2">
          {t('admin.createCode')}
        </Button>
      </div>
    </section>
  );
}
