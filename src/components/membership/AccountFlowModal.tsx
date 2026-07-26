/**
 * AccountFlowModal — flujo guiado de baja de cuenta (eliminar o suspender).
 *
 * Pasos:
 *  1. intro     → advierte la pérdida de historial/progreso e INVITA a suspender.
 *  2. reason    → si insiste en eliminar, pide el motivo (lista + "otro").
 *  3. winback   → motivo 'costo': mensaje de propuesta en 24 h (no se borra).
 *  4. suspended → confirmación de suspensión por 6 meses.
 *
 * La eliminación dura la ejecuta `onHardDelete` (Edge Function delete-account),
 * solo para motivos distintos de 'costo'. `onFinished` cierra sesión y navega.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, PauseCircle } from 'lucide-react';
import { Button, Modal, useToast } from '@/components/ui';
import { useAccountLifecycle, CANCEL_REASONS } from '@/hooks/useAccountLifecycle';

type Step = 'intro' | 'reason' | 'winback' | 'suspended';

export function AccountFlowModal({
  open,
  isPaid,
  onClose,
  onHardDelete,
  onFinished,
}: {
  open: boolean;
  isPaid: boolean;
  onClose: () => void;
  onHardDelete: () => Promise<{ ok: boolean; error?: string }>;
  onFinished: () => void;
}) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { busy, suspend, cancel } = useAccountLifecycle();
  const [step, setStep] = useState<Step>('intro');
  const [reason, setReason] = useState<string>('');
  const [detail, setDetail] = useState('');
  const [until, setUntil] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reasons = useMemo(
    () => CANCEL_REASONS.filter((r) => !r.paidOnly || isPaid),
    [isPaid],
  );

  const reset = () => {
    setStep('intro');
    setReason('');
    setDetail('');
    setUntil(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSuspend = async () => {
    const res = await suspend();
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setUntil(res.until);
    setStep('suspended');
  };

  const handleConfirmDelete = async () => {
    if (!reason) return;
    if (reason === 'otro' && detail.trim().length === 0) return;
    const res = await cancel(reason, reason === 'otro' ? detail.trim() : null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (res.outcome.winback) {
      setStep('winback');
      return;
    }
    // Motivo distinto de 'costo': borrado duro.
    setDeleting(true);
    const del = await onHardDelete();
    setDeleting(false);
    if (!del.ok) {
      toast.error(del.error ?? t('common.errorGeneric'));
      return;
    }
    onFinished();
  };

  const untilText = until
    ? new Date(until).toLocaleDateString(i18n.language, { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  return (
    <Modal open={open} onClose={close} title={t('account.flow.title')}>
      {step === 'intro' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-900">{t('account.flow.introTitle')}</p>
              <p className="mt-1 text-sm text-amber-800">{t('account.flow.introBody')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3">
            <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <p className="text-sm text-brand-800">{t('account.flow.introSuggest')}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="primary" fullWidth loading={busy} onClick={handleSuspend} leadingIcon={<PauseCircle className="h-5 w-5" />}>
              {t('account.flow.chooseSuspend')}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setStep('reason')}>
              {t('account.flow.chooseDelete')}
            </Button>
            <Button variant="ghost" fullWidth onClick={close}>
              {t('account.flow.keep')}
            </Button>
          </div>
        </div>
      )}

      {step === 'reason' && (
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-slate-900">{t('account.flow.reasonTitle')}</p>
            <p className="mt-0.5 text-sm text-muted">{t('account.flow.reasonHelp')}</p>
          </div>
          <div className="space-y-2">
            {reasons.map((r) => (
              <label key={r.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="radio"
                  name="cancel-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="h-5 w-5 text-brand-500"
                />
                <span className="text-sm text-slate-800">{t(r.labelKey)}</span>
              </label>
            ))}
          </div>
          {reason === 'otro' && (
            <textarea
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={t('account.flow.otherPlaceholder')}
              className="w-full rounded-xl border border-slate-200 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          )}
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep('intro')}>{t('account.flow.back')}</Button>
            <Button
              variant="danger"
              loading={busy || deleting}
              disabled={!reason || (reason === 'otro' && detail.trim().length === 0)}
              onClick={handleConfirmDelete}
            >
              {t('account.flow.confirmDelete')}
            </Button>
          </div>
        </div>
      )}

      {step === 'winback' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="font-semibold text-brand-900">{t('account.flow.costoTitle')}</p>
            <p className="mt-1 text-sm text-brand-800">{t('account.flow.costoBody')}</p>
          </div>
          <Button variant="primary" fullWidth onClick={onFinished}>{t('account.flow.gotIt')}</Button>
        </div>
      )}

      {step === 'suspended' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="font-semibold text-brand-900">{t('account.flow.suspendTitle')}</p>
            <p className="mt-1 text-sm text-brand-800">{t('account.flow.suspendBody', { date: untilText })}</p>
          </div>
          <Button variant="primary" fullWidth onClick={onFinished}>{t('account.flow.gotIt')}</Button>
        </div>
      )}
    </Modal>
  );
}
