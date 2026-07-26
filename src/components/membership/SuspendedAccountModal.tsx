/**
 * SuspendedAccountModal — se muestra cuando una persona con la cuenta SUSPENDIDA
 * inicia sesión. La invita a reactivar (sin perder historial ni progreso) o a
 * salir. No se puede cerrar sin elegir: el perfil sigue oculto hasta reactivarlo.
 */
import { useTranslation } from 'react-i18next';
import { PauseCircle } from 'lucide-react';
import { Button, Modal, useToast } from '@/components/ui';
import { useAccountLifecycle } from '@/hooks/useAccountLifecycle';

export function SuspendedAccountModal({
  until,
  onExit,
}: {
  until: string | null;
  onExit: () => void;
}) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { busy, reactivate } = useAccountLifecycle();

  const untilText = until
    ? new Date(until).toLocaleDateString(i18n.language, { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const handleReactivate = async () => {
    const res = await reactivate();
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    // Recargar para que el perfil vuelva a leerse ya sin suspensión.
    window.location.reload();
  };

  return (
    <Modal open onClose={() => undefined} title={t('account.suspended.title')}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm text-amber-800">
            {until ? t('account.suspended.body', { date: untilText }) : t('account.suspended.bodyNoDate')}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="primary" fullWidth loading={busy} onClick={handleReactivate}>
            {t('account.suspended.reactivate')}
          </Button>
          <Button variant="ghost" fullWidth onClick={onExit}>
            {t('account.suspended.exit')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
