/**
 * ProviderDashboard — panel del proveedor.
 *
 * Pestañas: Mis Ofertas · Escanear QR · Historial · Mis Calificaciones.
 * Toda la lógica de datos vive en hooks (useOffers, useTransactions,
 * useProviderRatings); este componente solo orquesta UI y estados de vista.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  Tag,
  ScanLine,
  History,
  Star,
  Plus,
  Pencil,
  Trash2,
  Play,
  Pause,
  Download,
  Stethoscope,
  Boxes,
  Users,
  CalendarClock,
  BarChart3,
  CreditCard,
  FileText,
  FolderHeart,
  Link2,
  GraduationCap,
  Store,
  Gift,
  Megaphone,
  Briefcase,
} from 'lucide-react';
import {
  Tabs,
  Modal,
  Button,
  ProgressBar,
  EVSBadge,
  SkeletonCard,
  useToast,
  FounderBadge,
  HowTo,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ProviderAgenda } from './ProviderAgenda';
import { ProviderPayments } from './ProviderPayments';
import { ContentManager } from '@/components/content/ContentManager';
import { ProviderClinicalPanel } from '@/components/clinical/ProviderClinicalPanel';
import { AffiliatePanel } from '@/components/merchant/AffiliatePanel';
import { CourseManager } from '@/components/academy/CourseManager';
import { useOffers } from '@/hooks/useOffers';
import { useTransactions, type TransactionFilters } from '@/hooks/useTransactions';
import { useProviderRatings, type ProviderComment } from '@/hooks/useProviderRatings';
import { useMyBadge } from '@/hooks/useMyBadge';
import { BadgeProgress } from './BadgeProgress';
import { AliadoCertificateCard } from './AliadoCertificateCard';
import { GlobalMemberBadge } from './GlobalMemberBadge';
import { ProviderMetricsPanel } from './ProviderMetricsPanel';
import { SchoolInclusionPanel } from './SchoolInclusionPanel';
import { JobsPanel } from './JobsPanel';
import { MemberBadgesCard } from './MemberBadgesCard';
import { NeuromundiIdOptIn } from './NeuromundiIdOptIn';
import { SealsCard } from './SealsCard';
import { OfferForm } from './OfferForm';
import { QRScanner } from './QRScanner';
import { PrescriptionBuilder } from './PrescriptionBuilder';
import { NetworkPanel } from './NetworkPanel';
import { BookingWidgetPanel } from './BookingWidgetPanel';
import { WaitlistPanel } from './WaitlistPanel';
import { CampaignsPanel } from './CampaignsPanel';
import { ProductManager } from '@/components/merchant/ProductManager';
import { useFounderStatus } from '@/hooks/useFounder';
import { FounderRequirements } from '@/components/founder/FounderRequirements';
import { DonateCallout } from '@/components/donation/DonateCallout';
import { RecommendPanel } from '@/components/referral/RecommendPanel';
import { defaultOfferValues, type OfferFormValues } from '@/lib/schemas';
import { formatDate, formatDateTime, exportToCsv } from '@/lib/utils';
import type { Offer, OfferStatus, OfferInsert, ProviderType, TransactionStatus } from '@/types/app';
import { DIMENSION_LABEL_KEY } from '@/types/app';
import { ProfileCompletion } from './ProfileCompletion';

// ── Helpers de presentación ──────────────────────────────────────────────────

const OFFER_CHIP: Record<OfferStatus, { key: string; cls: string }> = {
  draft: { key: 'provider.offers.status.draft', cls: 'bg-slate-100 text-muted' },
  active: { key: 'provider.offers.status.active', cls: 'bg-sage-50 text-sage-700' },
  paused: { key: 'provider.offers.status.paused', cls: 'bg-warm-50 text-warm-700' },
  expired: { key: 'provider.offers.status.expired', cls: 'bg-slate-100 text-muted' },
};

const TX_CHIP: Record<TransactionStatus, { key: string; cls: string }> = {
  pending: { key: 'provider.tx.pending', cls: 'bg-warm-50 text-warm-700' },
  completed: { key: 'provider.tx.completed', cls: 'bg-sage-50 text-sage-700' },
  expired: { key: 'provider.tx.expired', cls: 'bg-slate-100 text-muted' },
  disputed: { key: 'provider.tx.disputed', cls: 'bg-brand-50 text-brand-700' },
};

const PAGE_SIZE = 10;

function offerToFormValues(offer: Offer): OfferFormValues {
  const toLocal = (iso: string | null) => (iso ? iso.slice(0, 16) : '');
  return {
    title: offer.title,
    description: offer.description ?? '',
    discount_type: offer.discount_type,
    discount_value: offer.discount_value,
    terms: offer.terms ?? '',
    valid_from: toLocal(offer.valid_from),
    valid_until: toLocal(offer.valid_until),
    max_redemptions: offer.max_redemptions,
    status: offer.status === 'expired' ? 'paused' : offer.status,
  };
}

function toOfferInsert(values: OfferFormValues): Omit<OfferInsert, 'provider_id'> {
  const orNull = (s?: string) => (s && s.trim() ? s : null);
  return {
    title: values.title.trim(),
    description: orNull(values.description),
    discount_type: values.discount_type,
    discount_value: values.discount_type === 'freebie' ? null : values.discount_value,
    terms: orNull(values.terms),
    valid_from: values.valid_from ? new Date(values.valid_from).toISOString() : null,
    valid_until: values.valid_until ? new Date(values.valid_until).toISOString() : null,
    max_redemptions: values.max_redemptions,
    status: values.status,
  };
}

// ── Pestaña: Ofertas ─────────────────────────────────────────────────────────

function OffersTab({ providerId }: { providerId: string }) {
  const { offers, loading, createOffer, updateOffer, toggleStatus, deleteOffer } =
    useOffers(providerId);
  const toast = useToast();
  const { t } = useTranslation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (offer: Offer) => {
    setEditing(offer);
    setFormOpen(true);
  };

  const handleSubmit = async (values: OfferFormValues) => {
    setSaving(true);
    const payload = toOfferInsert(values);
    const res = editing
      ? await updateOffer(editing.id, payload)
      : await createOffer(payload);
    setSaving(false);
    if (res.ok) {
      toast.success(editing ? t('provider.offers.updated') : t('provider.offers.created'));
      setFormOpen(false);
      setEditing(null);
    } else {
      toast.error(res.error);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await deleteOffer(deleting.id);
    setDeleting(null);
    toast[res.ok ? 'success' : 'error'](res.ok ? t('provider.offers.removed') : res.error);
  };

  if (loading) return <div className="space-y-3"><SkeletonCard rows={1} /><SkeletonCard rows={1} /></div>;

  return (
    <div className="space-y-4">
      <ProfileCompletion />
      <HowTo stepsKey="howto.offers" />
      <Button onClick={openNew} leadingIcon={<Plus className="h-5 w-5" />} fullWidth>
        {t('provider.offers.new')}
      </Button>

      {offers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('provider.offers.empty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {offers.map((offer) => {
            const chip = OFFER_CHIP[offer.status];
            const isActive = offer.status === 'active';
            return (
              <li
                key={offer.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900">{offer.title}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${chip.cls}`}>
                    {t(chip.key)}
                  </span>
                </div>

                <div className="mt-3">
                  {offer.max_redemptions != null ? (
                    <ProgressBar
                      label={t('provider.offers.redemptions')}
                      value={offer.redemptions_count}
                      max={offer.max_redemptions}
                      valueText={t('provider.offers.usesOf', { count: offer.redemptions_count, max: offer.max_redemptions })}
                      color="#0ea5e9"
                      size="sm"
                    />
                  ) : (
                    <p className="text-sm text-muted">{t('provider.offers.usesUnlimited', { count: offer.redemptions_count })}</p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleStatus(offer.id, isActive ? 'paused' : 'active')}
                    leadingIcon={isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  >
                    {isActive ? t('provider.offers.pause') : t('provider.offers.activate')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(offer)} leadingIcon={<Pencil className="h-4 w-4" />}>
                    {t('provider.offers.edit')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(offer)} leadingIcon={<Trash2 className="h-4 w-4" />}>
                    {t('provider.offers.delete')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('provider.offers.editTitle') : t('provider.offers.newTitle')}
        size="lg"
      >
        <OfferForm
          initial={editing ? offerToFormValues(editing) : defaultOfferValues()}
          submitting={saving}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={t('provider.offers.deleteTitle')}
        description={deleting?.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('common.betterNot')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('settings.deleteConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">{t('provider.offers.deleteBody')}</p>
      </Modal>
    </div>
  );
}

// ── Pestaña: Historial ───────────────────────────────────────────────────────

function HistoryTab({ providerId, offers }: { providerId: string; offers: Offer[] }) {
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [page, setPage] = useState(0);
  const { transactions, loading } = useTransactions(providerId, 'provider', filters);
  const { t } = useTranslation();

  const offerTitle = useMemo(
    () => new Map(offers.map((o) => [o.id, o.title])),
    [offers],
  );

  const pageCount = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const pageRows = transactions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleExport = () => {
    exportToCsv(
      'historial-canjes',
      [t('provider.history.colDate'), t('provider.history.colOffer'), t('provider.history.colStatus')],
      transactions.map((tx) => [
        formatDateTime(tx.created_at),
        offerTitle.get(tx.offer_id) ?? '—',
        t(TX_CHIP[tx.status].key),
      ]),
    );
  };

  const update = (patch: Partial<TransactionFilters>) => {
    setPage(0);
    setFilters((f) => ({ ...f, ...patch }));
  };

  return (
    <div className="space-y-4">
      <HowTo stepsKey="howto.history" />
      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label={t('provider.history.filterStatus')}
          className="rounded-xl border border-slate-200 p-2.5 text-sm"
          value={filters.status ?? ''}
          onChange={(e) => update({ status: (e.target.value || undefined) as TransactionStatus | undefined })}
        >
          <option value="">{t('provider.history.allStatuses')}</option>
          <option value="pending">{t('provider.tx.pending')}</option>
          <option value="completed">{t('provider.tx.completed')}</option>
          <option value="expired">{t('provider.tx.expired')}</option>
        </select>
        <select
          aria-label={t('provider.history.filterOffer')}
          className="rounded-xl border border-slate-200 p-2.5 text-sm"
          value={filters.offerId ?? ''}
          onChange={(e) => update({ offerId: e.target.value || undefined })}
        >
          <option value="">{t('provider.history.allOffers')}</option>
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleExport}
        disabled={transactions.length === 0}
        leadingIcon={<Download className="h-4 w-4" />}
      >
        {t('provider.history.exportCsv')}
      </Button>

      {loading ? (
        <SkeletonCard rows={2} />
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('provider.history.empty')}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-muted">
                <tr>
                  <th scope="col" className="p-3 font-semibold">{t('provider.history.colDate')}</th>
                  <th scope="col" className="p-3 font-semibold">{t('provider.history.colOffer')}</th>
                  <th scope="col" className="p-3 font-semibold">{t('provider.history.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((tx) => (
                  <tr key={tx.id} className="border-t border-slate-100">
                    <td className="p-3 text-slate-700">{formatDate(tx.created_at)}</td>
                    <td className="p-3 text-slate-700">{offerTitle.get(tx.offer_id) ?? '—'}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TX_CHIP[tx.status].cls}`}>
                        {t(TX_CHIP[tx.status].key)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between">
              <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                {t('provider.history.prev')}
              </Button>
              <span className="text-sm text-muted">
                {t('provider.history.page', { page: page + 1, total: pageCount })}
              </span>
              <Button size="sm" variant="ghost" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
                {t('provider.history.next')}
              </Button>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted">
        {t('provider.history.privacy')}
      </p>
    </div>
  );
}

// ── Pestaña: Calificaciones ──────────────────────────────────────────────────

function ReviewItem({ c, onRespond }: { c: ProviderComment; onRespond: (id: string, text: string) => Promise<boolean> }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.provider_response ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const ok = await onRespond(c.id, text);
    setBusy(false);
    if (ok) { toast.success(t('provider.ratings.replySaved')); setEditing(false); }
    else toast.error(t('provider.ratings.replyError'));
  };

  return (
    <li className="rounded-xl border border-slate-100 bg-white p-3">
      <p className="text-sm text-slate-700">{c.comments}</p>
      <p className="mt-1 text-xs text-muted">{formatDate(c.created_at)}</p>

      {c.provider_response && !editing && (
        <div className="mt-2 rounded-lg bg-brand-50/60 p-2">
          <p className="text-xs font-semibold text-brand-800">{t('provider.ratings.yourReply')}</p>
          <p className="mt-0.5 text-sm text-slate-700">{c.provider_response}</p>
        </div>
      )}

      {editing ? (
        <div className="mt-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder={t('provider.ratings.replyPlaceholder')}
            className="w-full resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <div className="mt-1 flex gap-2">
            <Button size="sm" loading={busy} onClick={() => void save()}>{t('provider.ratings.replySave')}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setText(c.provider_response ?? ''); setEditing(false); }}>{t('common.cancel')}</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
        >
          {c.provider_response ? t('provider.ratings.replyEdit') : t('provider.ratings.reply')}
        </button>
      )}
    </li>
  );
}

function RatingsTab({
  providerId,
  providerType,
}: {
  providerId: string;
  providerType: ProviderType | null;
}) {
  const { loading, rating, radar, categoryAverageEvs, comments, commentsUnavailable, respond } =
    useProviderRatings(providerId, providerType);
  const { t } = useTranslation();
  const { badge: myBadge, inputs: myInputs } = useMyBadge();
  const radarData = radar.map((d) => ({ label: t(DIMENSION_LABEL_KEY[d.key]), value: d.value }));

  if (loading) return <SkeletonCard rows={3} />;

  if (!rating || rating.total_reviews === 0) {
    return (
      <div className="space-y-6">
        <BadgeProgress badge={myBadge} inputs={myInputs} />
        <GlobalMemberBadge />
        <AliadoCertificateCard badge={myBadge} />
        <MemberBadgesCard memberType={providerType} />
        <NeuromundiIdOptIn />
        <SealsCard />
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('provider.ratings.empty')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BadgeProgress badge={myBadge} inputs={myInputs} />
      <AliadoCertificateCard badge={myBadge} />
      <MemberBadgesCard memberType={providerType} />
      <NeuromundiIdOptIn />
      <SealsCard />
      <div className="flex flex-col items-center gap-2">
        <EVSBadge score={rating.evs_score} totalReviews={rating.total_reviews} size="lg" />
        <p className="text-sm text-muted">{t('card.reviews', { count: rating.total_reviews ?? 0 })}</p>
      </div>

      {categoryAverageEvs != null && rating.evs_score != null && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center text-sm">
          <span className="font-semibold text-slate-900">{rating.evs_score.toFixed(1)}</span>
          <span className="text-muted"> {t('provider.ratings.you')} · {t('provider.ratings.vs')} · </span>
          <span className="font-semibold text-slate-900">{categoryAverageEvs.toFixed(1)}</span>
          <span className="text-muted"> {t('provider.ratings.categoryAvg')}</span>
        </div>
      )}

      {radarData.length >= 3 && (
        <div className="h-72 w-full" aria-label={t('profile.dimensions')}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid />
              <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
              <Radar dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <h3 className="mb-2 font-semibold text-slate-900">{t('provider.ratings.comments')}</h3>
        {commentsUnavailable ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-muted">
            {t('provider.ratings.commentsUnavailable')}
          </p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted">{t('provider.ratings.noComments')}</p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => (
              <ReviewItem key={c.id} c={c} onRespond={respond} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

const SOLIDARIO_KEY = 'nm-solidario-dismissed';

export function ProviderDashboard() {
  const { userId, providerType } = useAuth();
  const { isFounder } = useFounderStatus(userId);
  const { t } = useTranslation();
  const [tab, setTab] = useState('offers');
  // Invitación "Especialista Solidario": se muestra una vez (al llegar al panel
  // tras el alta) y puede cerrarse. No compite con el pago de la cuota porque no
  // es un modal: es una tarjeta que se descarta.
  const [showSolidario, setShowSolidario] = useState(() => {
    try { return localStorage.getItem(SOLIDARIO_KEY) == null; } catch { return false; }
  });
  const dismissSolidario = () => {
    try { localStorage.setItem(SOLIDARIO_KEY, '1'); } catch { /* noop */ }
    setShowSolidario(false);
  };
  // Ofertas a nivel dashboard para compartir con escaneo e historial.
  const { offers } = useOffers(userId);
  const activeOffers = offers.filter((o) => o.status === 'active');

  if (!userId) return <SkeletonCard rows={2} />;

  const baseTabs = [
    {
      id: 'offers',
      label: t('provider.tabs.offers'),
      icon: <Tag className="h-4 w-4" aria-hidden="true" />,
      content: <OffersTab providerId={userId} />,
    },
    {
      id: 'scan',
      label: t('provider.tabs.scan'),
      icon: <ScanLine className="h-4 w-4" aria-hidden="true" />,
      content: <QRScanner providerId={userId} activeOffers={activeOffers} />,
    },
    {
      id: 'history',
      label: t('provider.tabs.history'),
      icon: <History className="h-4 w-4" aria-hidden="true" />,
      content: <HistoryTab providerId={userId} offers={offers} />,
    },
    {
      id: 'ratings',
      label: t('provider.tabs.ratings'),
      icon: <Star className="h-4 w-4" aria-hidden="true" />,
      content: <RatingsTab providerId={userId} providerType={providerType} />,
    },
    {
      id: 'widget',
      label: t('provider.tabs.widget'),
      icon: <Link2 className="h-4 w-4" aria-hidden="true" />,
      content: <BookingWidgetPanel />,
    },
    {
      id: 'waitlist',
      label: t('provider.tabs.waitlist'),
      icon: <Users className="h-4 w-4" aria-hidden="true" />,
      content: <WaitlistPanel />,
    },
    {
      id: 'campaigns',
      label: t('provider.tabs.campaigns'),
      icon: <Megaphone className="h-4 w-4" aria-hidden="true" />,
      content: <CampaignsPanel />,
    },
  ];

  // Pestaña según el tipo de proveedor: prestador de servicios receta, proveedor de productos los gestiona.
  const featureTab =
    providerType === 'service_provider'
      ? {
          id: 'prescribe',
          label: t('provider.tabs.prescribe'),
          icon: <Stethoscope className="h-4 w-4" aria-hidden="true" />,
          content: <PrescriptionBuilder />,
        }
      : providerType === 'merchant'
        ? {
            id: 'products',
            label: t('provider.tabs.products'),
            icon: <Boxes className="h-4 w-4" aria-hidden="true" />,
            content: <ProductManager vendorId={userId} />,
          }
        : null;

  // Mi Tienda: disponible para TODO perfil de proveedor. El 'merchant' ya tiene su
  // pestaña dedicada de productos, así que evitamos duplicarla.
  const storeTab =
    providerType !== 'merchant'
      ? {
          id: 'store',
          label: t('shop.myStore'),
          icon: <Store className="h-4 w-4" aria-hidden="true" />,
          content: <ProductManager vendorId={userId} />,
        }
      : null;

  const networkTab = {
    id: 'network',
    label: t('network.tab'),
    icon: <Users className="h-4 w-4" aria-hidden="true" />,
    content: <NetworkPanel />,
  };

  const recommendTab = {
    id: 'recommend',
    label: t('recommend.tab'),
    icon: <Gift className="h-4 w-4" aria-hidden="true" />,
    content: <RecommendPanel />,
  };

  const agendaTab = {
    id: 'agenda',
    label: t('agenda.tab'),
    icon: <CalendarClock className="h-4 w-4" aria-hidden="true" />,
    content: <ProviderAgenda />,
  };

  const metricsTab = {
    id: 'metrics',
    label: t('metrics.tab'),
    icon: <BarChart3 className="h-4 w-4" aria-hidden="true" />,
    content: <ProviderMetricsPanel />,
  };

  // Programa de inclusión: solo para escuelas y clínicas.
  const inclusionTab =
    providerType === 'school' || providerType === 'clinic'
      ? {
          id: 'inclusion',
          label: t('incl.tab'),
          icon: <GraduationCap className="h-4 w-4" aria-hidden="true" />,
          content: <SchoolInclusionPanel />,
        }
      : null;

  // Oportunidades (empleo / voluntariado / servicio social): Empresas y ONG.
  const jobsTab =
    providerType === 'company' || providerType === 'ngo'
      ? {
          id: 'jobs',
          label: t('jobs.tab'),
          icon: <Briefcase className="h-4 w-4" aria-hidden="true" />,
          content: <JobsPanel companyId={userId} />,
        }
      : null;

  const paymentsTab = {
    id: 'payments',
    label: t('pay.tab'),
    icon: <CreditCard className="h-4 w-4" aria-hidden="true" />,
    content: <ProviderPayments />,
  };

  const contentTab = {
    id: 'content',
    label: t('content.tab'),
    icon: <FileText className="h-4 w-4" aria-hidden="true" />,
    content: <ContentManager />,
  };

  const clinicalTab = {
    id: 'clinical',
    label: t('clin.tabProvider'),
    icon: <FolderHeart className="h-4 w-4" aria-hidden="true" />,
    content: <ProviderClinicalPanel />,
  };

  const affiliateTab = {
    id: 'affiliate',
    label: t('affil.tab'),
    icon: <Link2 className="h-4 w-4" aria-hidden="true" />,
    content: <AffiliatePanel />,
  };

  const academyTab = {
    id: 'academy',
    label: t('lms.tab'),
    icon: <GraduationCap className="h-4 w-4" aria-hidden="true" />,
    content: <CourseManager />,
  };

  // "Mis Afiliados" va inmediatamente después de "Mi tienda": primero el
  // catálogo propio y enseguida quién puede promoverlo y ganar comisión.
  const tabs = [
    ...baseTabs,
    ...(inclusionTab ? [inclusionTab] : []),
    ...(jobsTab ? [jobsTab] : []),
    metricsTab,
    agendaTab,
    paymentsTab,
    contentTab,
    clinicalTab,
    academyTab,
    ...(featureTab ? [featureTab] : []),
    ...(storeTab ? [storeTab] : []),
    affiliateTab,
    networkTab,
    recommendTab,
  ];

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      {isFounder && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3">
          <FounderBadge isFounder size="md" />
          <div>
            <p className="font-bold text-brand-800">{t('founderBadge.youAre')}</p>
            <p className="text-sm text-brand-700">{t('founderBadge.youAreDesc')}</p>
          </div>
        </div>
      )}
      <div className="mb-4">
        <FounderRequirements />
      </div>
      {showSolidario && (
        <div className="mb-4">
          <DonateCallout variant="specialist" onDismiss={dismissSolidario} />
        </div>
      )}
      <Tabs value={tab} onValueChange={setTab} tabs={tabs} />
    </div>
  );
}
