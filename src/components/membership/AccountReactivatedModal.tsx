/**
 * AccountReactivatedModal — confirmación de perfil reactivado tras el pago.
 * Aparece solo cuando la plataforma detecta que la cuota quedó cubierta.
 * Agradece y motiva, sin trámites adicionales.
 */
import { useTranslation } from 'react-i18next';
import { PartyPopper, ArrowRight } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

export function AccountReactivatedModal({
  open,
  onClose,
  onGoToPanel,
}: {
  open: boolean;
  onClose: () => void;
  onGoToPanel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onClose} title={t('reactivated.title')}>
      <div className="space-y-4 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage-50 text-sage-700">
          <PartyPopper className="h-8 w-8" aria-hidden="true" />
        </span>

        <p className="text-sm text-slate-700">{t('reactivated.thanks')}</p>
        <p className="text-sm font-semibold text-slate-900">{t('reactivated.motivation')}</p>

        <Button fullWidth onClick={onGoToPanel} leadingIcon={<ArrowRight className="h-5 w-5" />}>
          {t('reactivated.cta')}
        </Button>
      </div>
    </Modal>
  );
}
