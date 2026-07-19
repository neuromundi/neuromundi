/**
 * ParentPrescriptions — recetas que el padre recibe de sus terapeutas.
 *
 * Lista las recetas, abre el detalle (marcándola como vista) y permite comprar
 * cada producto directamente con el proveedor mediante su enlace (handoff: la
 * plataforma no procesa el pago). El padre puede marcar la receta como pedida.
 */
import { useCallback, useState } from 'react';
import { Package, ExternalLink, CheckCircle2, Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, SkeletonCard, useToast, HowTo} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { formatDate } from '@/lib/utils';
import type { Prescription, PrescriptionDetail, PrescriptionStatus } from '@/types/app';

const STATUS: Record<PrescriptionStatus, { key: string; cls: string }> = {
  draft: { key: 'rx.status.draft', cls: 'bg-slate-100 text-muted' },
  sent: { key: 'rx.status.new', cls: 'bg-brand-50 text-brand-700' },
  viewed: { key: 'rx.status.viewed', cls: 'bg-warm-50 text-warm-700' },
  ordered: { key: 'rx.status.ordered', cls: 'bg-sage-50 text-sage-700' },
  archived: { key: 'rx.status.archived', cls: 'bg-slate-100 text-muted' },
};

export function ParentPrescriptions() {
  const { userId } = useAuth();
  const { t } = useTranslation();
  const { prescriptions, loading, getDetail, markViewed, markOrdered } = usePrescriptions(
    userId,
    'parent',
  );
  const toast = useToast();

  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [opening, setOpening] = useState(false);

  const open = useCallback(
    async (p: Prescription) => {
      setOpening(true);
      const res = await getDetail(p.id);
      setOpening(false);
      if (res.ok) {
        setDetail(res.data);
        if (p.status === 'sent') void markViewed(p.id);
      } else {
        toast.error(res.error);
      }
    },
    [getDetail, markViewed, toast],
  );

  const buy = (url: string | null) => {
    if (!url) {
      toast.info(t('rx.noPurchaseLink'));
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOrdered = async () => {
    if (!detail) return;
    const res = await markOrdered(detail.id);
    if (res.ok) {
      toast.success(t('rx.markedOrdered'));
      setDetail((d) => (d ? { ...d, status: 'ordered' } : d));
    } else {
      toast.error(res.error);
    }
  };

  if (loading) return <div className="space-y-3"><SkeletonCard rows={0} /><SkeletonCard rows={0} /></div>;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 p-4">
      <HowTo stepsKey="howto.prescriptions" />
      {prescriptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('rx.parentEmpty')}
        </div>
      ) : (
        prescriptions.map((p) => {
          const badge = STATUS[p.status];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => open(p)}
              disabled={opening}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Package className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{p.title}</p>
                <p className="text-xs text-muted">{formatDate(p.sent_at ?? p.created_at)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                {t(badge.key)}
              </span>
            </button>
          );
        })
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title ?? t('rx.recipeFallback')}
        description={detail?.therapistName ? t('rx.from', { name: detail.therapistName }) : undefined}
        size="lg"
        footer={
          detail && detail.status !== 'ordered' ? (
            <Button onClick={handleOrdered} leadingIcon={<CheckCircle2 className="h-5 w-5" />}>
              {t('rx.markOrdered')}
            </Button>
          ) : detail?.status === 'ordered' ? (
            <span className="inline-flex items-center gap-2 text-sm text-sage-700">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> {t('rx.alreadyOrdered')}
            </span>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-4">
            {detail.note && (
              <p className="flex gap-2 rounded-xl bg-brand-50/60 p-3 text-sm text-slate-700">
                <Stethoscope className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
                {detail.note}
              </p>
            )}

            <ul className="space-y-3">
              {detail.items.map((item) => (
                <li key={item.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center gap-3">
                    {item.product?.image_url ? (
                      <img loading="lazy" decoding="async" src={item.product.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">
                        {item.product?.name ?? t('rx.productFallback')}
                      </p>
                      <p className="text-sm text-muted">
                        {t('rx.quantity', { n: item.quantity })}
                        {item.unit_price_snapshot != null &&
                          ` · ${t('rx.eachPrice', { price: item.unit_price_snapshot.toLocaleString() })}`}
                      </p>
                    </div>
                  </div>
                  {item.note && <p className="mt-2 text-sm text-slate-600">{item.note}</p>}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => buy(item.product?.purchase_url ?? null)}
                    leadingIcon={<ExternalLink className="h-4 w-4" />}
                    className="mt-3"
                  >
                    {t('rx.buyWithProvider')}
                  </Button>
                </li>
              ))}
            </ul>

            <p className="text-xs text-muted">
              {t('rx.purchaseNote')}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
