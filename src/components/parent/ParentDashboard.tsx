/**
 * ParentDashboard — panel del padre/tutor.
 *
 * Pestañas: Mi QR · Mis Descuentos · Historial. Mantiene SIEMPRE activo el
 * listener de Realtime: cuando llega una transacción 'pending' abre la encuesta.
 * Al montar también recupera pendientes que hayan llegado mientras no estaba, y
 * las procesa en cola, una por una.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { QrCode, Tag, History, Package, ListChecks, CalendarClock, FolderHeart, Store, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tabs, SkeletonCard } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useParentPendingTransactions } from '@/hooks/useRealtime';
import { useTransactions } from '@/hooks/useTransactions';
import { useParentDiscounts, type ParentDiscount } from '@/hooks/useParentDiscounts';
import { QRGenerator } from './QRGenerator';
import { SurveyModal } from './SurveyModal';
import { ParentPrescriptions } from './ParentPrescriptions';
import { MyAppointments } from '@/components/booking/MyAppointments';
import { FamilyClinicalPanel } from '@/components/clinical/FamilyClinicalPanel';
import { ParentLists } from './ParentLists';
import { ProductManager } from '@/components/merchant/ProductManager';
import { FounderBadge } from '@/components/ui';
import { useFounderStatus } from '@/hooks/useFounder';
import { FounderRequirements } from '@/components/founder/FounderRequirements';
import { RecommendPanel } from '@/components/referral/RecommendPanel';
import { formatDate } from '@/lib/utils';
import type { Transaction, TransactionStatus } from '@/types/app';

const STATUS_BADGE: Record<TransactionStatus, { key: string; cls: string }> = {
  completed: { key: 'parent.status.completed', cls: 'bg-sage-50 text-sage-700' },
  pending: { key: 'parent.status.pending', cls: 'bg-warm-50 text-warm-700' },
  expired: { key: 'parent.status.expired', cls: 'bg-slate-100 text-muted' },
  disputed: { key: 'parent.status.disputed', cls: 'bg-brand-50 text-brand-700' },
};

function DiscountCard({ discount }: { discount: ParentDiscount }) {
  const { t } = useTranslation();
  const { transaction, offerTitle, discountText, providerName, providerAvatar } = discount;
  const badge = STATUS_BADGE[transaction.status];
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      {providerAvatar ? (
        <img loading="lazy" decoding="async"
          src={providerAvatar}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Tag className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">
          {providerName ?? t('parent.providerFallback')}
        </p>
        <p className="truncate text-sm text-muted">
          {offerTitle ?? discountText ?? t('parent.discountFallback')}
        </p>
        <p className="text-xs text-muted">{formatDate(transaction.created_at)}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
        {t(badge.key)}
      </span>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
      {message}
    </div>
  );
}

export function ParentDashboard() {
  const { userId } = useAuth();
  const { isFounder } = useFounderStatus(userId);
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const [tab, setTab] = useState('qr');

  // Cola de encuestas pendientes.
  const [queue, setQueue] = useState<Transaction[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  const enqueue = useCallback((tx: Transaction) => {
    if (seenIds.current.has(tx.id)) return;
    if (new Date(tx.expires_at).getTime() <= Date.now()) return;
    seenIds.current.add(tx.id);
    setQueue((prev) => [...prev, tx]);
  }, []);

  // Listener en tiempo real (siempre activo, con cleanup en el hook).
  useParentPendingTransactions(userId, enqueue);

  // Pendientes acumuladas al entrar.
  const { transactions: pendings } = useTransactions(userId, 'parent', {
    status: 'pending',
  });
  useEffect(() => {
    pendings.forEach(enqueue);
  }, [pendings, enqueue]);

  // Historial enriquecido.
  const { discounts, loading, refetch } = useParentDiscounts(userId);

  const dequeue = useCallback(() => {
    setQueue((prev) => prev.slice(1));
    void refetch();
  }, [refetch]);

  const current = queue[0];

  const activeDiscounts = discounts.filter((d) => d.transaction.status !== 'expired');

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
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          {
            id: 'qr',
            label: t('parent.tabs.qr'),
            icon: <QrCode className="h-4 w-4" aria-hidden="true" />,
            content: profile ? (
              <QRGenerator profile={profile} />
            ) : (
              <SkeletonCard rows={0} />
            ),
          },
          {
            id: 'appointments',
            label: t('agenda.myAppointments'),
            icon: <CalendarClock className="h-4 w-4" aria-hidden="true" />,
            content: <MyAppointments />,
          },
          {
            id: 'clinical',
            label: t('clin.tab'),
            icon: <FolderHeart className="h-4 w-4" aria-hidden="true" />,
            content: <FamilyClinicalPanel />,
          },
          {
            id: 'discounts',
            label: t('parent.tabs.discounts'),
            icon: <Tag className="h-4 w-4" aria-hidden="true" />,
            content: loading ? (
              <div className="space-y-3">
                <SkeletonCard rows={0} />
                <SkeletonCard rows={0} />
              </div>
            ) : activeDiscounts.length === 0 ? (
              <EmptyState message={t('parent.emptyDiscounts')} />
            ) : (
              <div className="space-y-3">
                {activeDiscounts.map((d) => (
                  <DiscountCard key={d.transaction.id} discount={d} />
                ))}
              </div>
            ),
          },
          {
            id: 'history',
            label: t('parent.tabs.history'),
            icon: <History className="h-4 w-4" aria-hidden="true" />,
            content: loading ? (
              <SkeletonCard rows={0} />
            ) : discounts.length === 0 ? (
              <EmptyState message={t('parent.emptyHistory')} />
            ) : (
              <div className="space-y-3">
                {discounts.map((d) => (
                  <DiscountCard key={d.transaction.id} discount={d} />
                ))}
              </div>
            ),
          },
          {
            id: 'prescriptions',
            label: t('parent.tabs.prescriptions'),
            icon: <Package className="h-4 w-4" aria-hidden="true" />,
            content: <ParentPrescriptions />,
          },
          {
            id: 'lists',
            label: t('lists.tab'),
            icon: <ListChecks className="h-4 w-4" aria-hidden="true" />,
            content: <ParentLists />,
          },
          {
            id: 'store',
            label: t('shop.myStore'),
            icon: <Store className="h-4 w-4" aria-hidden="true" />,
            content: userId ? <ProductManager vendorId={userId} /> : <SkeletonCard rows={2} />,
          },
          {
            id: 'recommend',
            label: t('recommend.tab'),
            icon: <Gift className="h-4 w-4" aria-hidden="true" />,
            content: <RecommendPanel />,
          },
        ]}
      />

      {current && (
        <SurveyModal
          key={current.id}
          transaction={current}
          onClose={dequeue}
          onCompleted={refetch}
        />
      )}
    </div>
  );
}
