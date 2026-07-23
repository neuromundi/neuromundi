/**
 * AdminDonations — panel de donaciones para el admin.
 *  · Estadística por moneda (recaudado, nº de donativos, envíos pendientes).
 *  · Gestión del MURO: publicar/quitar, destacar, editar el nombre a mostrar,
 *    la nota y el logo. Solo se puede publicar a quien dio su consentimiento.
 *  · Datos de envío a la vista para preparar las recompensas físicas.
 *  · CRUD de ALIADOS (los logos del carrusel del home).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Star, StarOff, Eye, EyeOff, Truck, Pencil, Plus, Trash2, Save, Handshake, Banknote } from 'lucide-react';
import { Button, SkeletonCard, EmptyState, useToast, useConfirm } from '@/components/ui';
import { useAdminDonations, useAdminAllies, type AdminDonation } from '@/hooks/useAdminDonations';
import { useAdminDonationTiers, type DonationTierRow } from '@/hooks/useDonationTiers';
import type { Ally } from '@/hooks/useDonorWall';
import { formatDonation } from '@/lib/donation';
import { formatDate, cn } from '@/lib/utils';

const inputCls = 'w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

/** Fila de una donación con sus controles de muro y sus datos de envío. */
function DonationRow({ d, onWall }: { d: AdminDonation; onWall: ReturnType<typeof useAdminDonations>['setWall'] }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [publishAs, setPublishAs] = useState(d.publish_as ?? '');
  const [note, setNote] = useState(d.wall_note ?? '');
  const [logo, setLogo] = useState(d.wall_logo_url ?? '');
  const [busy, setBusy] = useState(false);

  const amount = formatDonation(
    d.currency === 'jpy' ? d.amount_cents : d.amount_cents / 100,
    d.currency,
    i18n.language,
  );
  const needsShip = d.status === 'paid' && !d.waive_physical && ['ally', 'driver', 'ambassador'].includes(d.level);

  const act = async (opts: Parameters<typeof onWall>[1]) => {
    setBusy(true);
    const r = await onWall(d.id, opts);
    setBusy(false);
    if (!r.ok) toast.error(r.error === 'no_consent' ? t('adm.don.noConsent') : t('adm.don.wallError'));
    else { toast.success(t('adm.don.wallOk')); setEditing(false); }
  };

  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            {d.is_company ? d.org_name || d.contact_name : d.contact_name}
            <span className="ml-2 text-sm font-normal text-brand-700">{amount}</span>
          </p>
          <p className="text-xs text-muted">
            {t(`donate.level.${d.level}.name`)} · {formatDate(d.created_at)} ·{' '}
            <span className={d.status === 'paid' ? 'text-sage-700' : 'text-warm-700'}>{t(`adm.don.status.${d.status}`)}</span>
            {' · '}{d.email}
          </p>
          <p className="mt-0.5 text-xs">
            {d.publish_consent ? (
              <span className="text-sage-700">{t('adm.don.consentYes')}</span>
            ) : (
              <span className="text-muted">{t('adm.don.consentNo')}</span>
            )}
            {d.wall_published && <span className="ml-2 text-brand-700">· {t('adm.don.onWall')}</span>}
            {d.wall_featured && <span className="ml-1 text-warm-700">· {t('adm.don.featured')}</span>}
          </p>
        </div>

        {/* Controles del muro: solo si el donante consintió y ya pagó. */}
        {d.publish_consent && d.status === 'paid' && (
          <div className="flex shrink-0 flex-wrap gap-1">
            {d.wall_published ? (
              <Button size="sm" variant="ghost" loading={busy} onClick={() => void act({ published: false })} leadingIcon={<EyeOff className="h-4 w-4" />}>
                {t('adm.don.unpublish')}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" loading={busy} onClick={() => void act({ published: true, featured: d.wall_featured, publishAs, note, logoUrl: logo })} leadingIcon={<Eye className="h-4 w-4" />}>
                {t('adm.don.publish')}
              </Button>
            )}
            {d.wall_published && (
              <Button
                size="sm" variant="ghost" loading={busy}
                onClick={() => void act({ published: true, featured: !d.wall_featured, publishAs, note, logoUrl: logo })}
                leadingIcon={d.wall_featured ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              >
                {d.wall_featured ? t('adm.don.unfeature') : t('adm.don.feature')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)} leadingIcon={<Pencil className="h-4 w-4" />}>
              {t('adm.don.edit')}
            </Button>
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-2 grid gap-2 rounded-xl border border-brand-200 bg-brand-50/40 p-2 sm:grid-cols-3">
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-slate-700">{t('adm.don.publishAs')}</label>
            <input value={publishAs} onChange={(e) => setPublishAs(e.target.value)} placeholder={d.is_company ? d.org_name ?? '' : d.contact_name} className={inputCls} />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-slate-700">{t('adm.don.note')}</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-slate-700">{t('adm.don.logo')}</label>
            <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" className={inputCls} />
          </div>
          <div className="sm:col-span-3">
            <Button size="sm" loading={busy} onClick={() => void act({ published: d.wall_published, featured: d.wall_featured, publishAs, note, logoUrl: logo })} leadingIcon={<Save className="h-4 w-4" />}>
              {t('adm.don.saveWall')}
            </Button>
          </div>
        </div>
      )}

      {/* Envío físico pendiente: dirección a la vista para preparar el paquete. */}
      {needsShip && (
        <div className="mt-2 flex items-start gap-2 rounded-xl bg-slate-50 p-2 text-xs text-slate-700">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <div>
            <p className="font-semibold">{d.ship_recipient || d.contact_name}</p>
            {d.ship_use_registered ? (
              <p className="text-muted">{t('adm.don.useRegistered')}</p>
            ) : (
              <p>{[d.ship_address, d.ship_city, d.ship_postal, d.ship_country].filter(Boolean).join(', ')}</p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** Editor de importes de donación por moneda. */
function TiersManager() {
  const { t } = useTranslation();
  const toast = useToast();
  const { rows, loading, save } = useAdminDonationTiers();
  // Copia editable local; se compara contra la fila original al guardar.
  const [draft, setDraft] = useState<Record<string, DonationTierRow>>({});
  const [busyCur, setBusyCur] = useState<string | null>(null);

  const rowOf = (r: DonationTierRow): DonationTierRow => draft[r.currency] ?? r;
  const setField = (cur: string, base: DonationTierRow, patch: Partial<DonationTierRow>) =>
    setDraft((d) => ({ ...d, [cur]: { ...rowOf(base), ...patch } }));

  const onSave = async (base: DonationTierRow) => {
    const r = rowOf(base);
    // Validación amable antes de mandar (la base también lo exige con un CHECK).
    if (!(r.seed_amount > 0 && r.ally_amount > r.seed_amount && r.driver_amount > r.ally_amount && r.ambassador_amount > r.driver_amount)) {
      toast.error(t('adm.tier.order'));
      return;
    }
    setBusyCur(r.currency);
    const res = await save(r);
    setBusyCur(null);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('adm.tier.saved') : t('adm.tier.error'));
  };

  const numField = (label: string, value: number, onChange: (n: number) => void) => (
    <div>
      <label className="mb-0.5 block text-[11px] font-semibold text-slate-700">{label}</label>
      <input
        type="number" min="0" step="0.01" value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      />
    </div>
  );

  return (
    <section className="rounded-2xl border border-slate-100 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <Banknote className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('adm.tier.title')}
      </h3>
      <p className="mt-1 text-xs text-muted">{t('adm.tier.hint')}</p>

      {loading ? (
        <div className="mt-3"><SkeletonCard rows={1} /></div>
      ) : (
        <div className="mt-3 space-y-3">
          {rows.map((base) => {
            const r = rowOf(base);
            return (
              <div key={base.currency} className="rounded-xl border border-slate-100 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-900">
                  {r.symbol} {base.currency}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {numField(t('donate.level.seed.name'), r.seed_amount, (n) => setField(base.currency, base, { seed_amount: n }))}
                  {numField(t('donate.level.ally.name'), r.ally_amount, (n) => setField(base.currency, base, { ally_amount: n }))}
                  {numField(t('donate.level.driver.name'), r.driver_amount, (n) => setField(base.currency, base, { driver_amount: n }))}
                  {numField(t('donate.level.ambassador.name'), r.ambassador_amount, (n) => setField(base.currency, base, { ambassador_amount: n }))}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Button size="sm" loading={busyCur === base.currency} onClick={() => void onSave(base)} leadingIcon={<Save className="h-4 w-4" />}>
                    {t('adm.tier.save')}
                  </Button>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700">
                    <input type="checkbox" checked={r.is_active} onChange={(e) => setField(base.currency, base, { is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                    {t('adm.tier.active')}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** CRUD de aliados. */
function AlliesManager() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const { allies, loading, save, remove } = useAdminAllies();
  const [draft, setDraft] = useState<Partial<Ally>>({});
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    if (!draft.name?.trim() || !draft.logo_url?.trim()) { toast.error(t('adm.ally.need')); return; }
    setBusy(true);
    const ok = await save({ ...draft, name: draft.name.trim(), logo_url: draft.logo_url.trim() });
    setBusy(false);
    if (ok) { toast.success(t('adm.ally.saved')); setDraft({}); }
    else toast.error(t('adm.ally.error'));
  };

  return (
    <section className="rounded-2xl border border-slate-100 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <Handshake className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('adm.ally.title')}
      </h3>
      <p className="mt-1 text-xs text-muted">{t('adm.ally.hint')}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input value={draft.name ?? ''} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder={t('adm.ally.name')} className={inputCls} />
        <input value={draft.logo_url ?? ''} onChange={(e) => setDraft((d) => ({ ...d, logo_url: e.target.value }))} placeholder={t('adm.ally.logoUrl')} className={inputCls} />
        <input value={draft.website ?? ''} onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))} placeholder={t('adm.ally.website')} className={inputCls} />
        <input type="number" value={draft.sort_order ?? ''} onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))} placeholder={t('adm.ally.order')} className={inputCls} />
      </div>
      <Button size="sm" className="mt-2" loading={busy} onClick={onSave} leadingIcon={draft.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>
        {draft.id ? t('adm.ally.update') : t('adm.ally.add')}
      </Button>
      {draft.id && (
        <Button size="sm" variant="ghost" className="mt-2 ml-2" onClick={() => setDraft({})}>{t('common.cancel')}</Button>
      )}

      {loading ? (
        <div className="mt-3"><SkeletonCard rows={1} /></div>
      ) : (
        <ul className="mt-3 space-y-2">
          {allies.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2">
              <img src={a.logo_url} alt={a.name} className="h-8 w-auto max-w-[80px] object-contain" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-medium', a.is_active ? 'text-slate-900' : 'text-muted line-through')}>{a.name}</p>
                <p className="text-xs text-muted">#{a.sort_order}{a.website ? ` · ${a.website}` : ''}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => void save({ ...a, is_active: !a.is_active })}>
                {a.is_active ? t('adm.ally.hide') : t('adm.ally.show')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDraft(a)} leadingIcon={<Pencil className="h-4 w-4" />}>{t('adm.ally.edit')}</Button>
              <Button
                size="sm" variant="ghost"
                onClick={async () => { if (await confirm({ title: t('adm.ally.delTitle'), message: t('adm.ally.delBody'), danger: true })) { const ok = await remove(a.id); if (ok) toast.success(t('adm.ally.deleted')); } }}
                leadingIcon={<Trash2 className="h-4 w-4" />}
              >
                {t('adm.ally.del')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminDonations() {
  const { t, i18n } = useTranslation();
  const { stats, rows, loading, setWall } = useAdminDonations();

  return (
    <div className="space-y-5">
      {/* Estadística por moneda */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
          <Coins className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('adm.don.statsTitle')}
        </h3>
        {loading ? (
          <SkeletonCard rows={1} />
        ) : stats.length === 0 ? (
          <p className="text-sm text-muted">{t('adm.don.noStats')}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <div key={s.currency} className="rounded-2xl border border-slate-100 p-3">
                <p className="text-xs text-muted">{s.currency.toUpperCase()}</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatDonation(s.currency === 'jpy' ? s.paid_cents : s.paid_cents / 100, s.currency, i18n.language)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {t('adm.don.count', { n: s.paid_count })} · {t('adm.don.shipPending', { n: s.physical_pending })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lista de donaciones */}
      <section>
        <h3 className="mb-2 font-semibold text-slate-900">{t('adm.don.listTitle')}</h3>
        {loading ? (
          <SkeletonCard rows={3} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Coins className="h-6 w-6" />} title={t('adm.don.emptyTitle')} description={t('adm.don.empty')} />
        ) : (
          <ul className="space-y-2">
            {rows.map((d) => <DonationRow key={d.id} d={d} onWall={setWall} />)}
          </ul>
        )}
      </section>

      <TiersManager />

      <AlliesManager />
    </div>
  );
}
