/**
 * MembershipSuccessNotice — al volver del checkout de Stripe (/panel?membership=ok)
 * felicita al nuevo Miembro Fundador y, si pagó la ANUAL (&period=annual), muestra
 * el aviso de "cuota congelada de por vida" (gratificación instantánea de la
 * campaña). Limpia los parámetros de la URL al cerrar para no repetirse.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PartyPopper, Snowflake } from 'lucide-react';
import { Modal, Button } from '@/components/ui';

export function MembershipSuccessNotice() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    if (params.get('membership') === 'ok') {
      setAnnual(params.get('period') === 'annual');
      setOpen(true);
    }
  }, [params]);

  const close = () => {
    setOpen(false);
    const next = new URLSearchParams(params);
    next.delete('membership');
    next.delete('period');
    setParams(next, { replace: true });
  };

  if (!open) return null;
  return (
    <Modal open={open} onClose={close} title={t('membership.successTitle')} footer={<Button onClick={close}>{t('membership.successCta')}</Button>}>
      <div className="text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
        <p className="mt-3 text-sm text-slate-700">{t('membership.successBody')}</p>
        {annual && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-left text-sm font-medium text-sky-900">
            <Snowflake className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" aria-hidden="true" />
            {t('membership.freezeNotice')}
          </p>
        )}
      </div>
    </Modal>
  );
}
