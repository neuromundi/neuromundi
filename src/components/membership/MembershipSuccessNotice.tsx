/**
 * MembershipSuccessNotice — qué ve la persona al volver del checkout de Stripe.
 *
 * DOS CAMINOS, NO UNO (26 oct 2026). Hasta hoy este componente solo atendía
 * /panel?membership=ok. El botón de volver atrás de Stripe deja al usuario en
 * /panel?membership=cancel, y ahí no había NADA: ni mensaje, ni saber si le
 * cobraron, ni por dónde reintentar. Quien no sabe si le cobraron no vuelve a
 * intentarlo: se va a revisar su banco. Por eso el texto de cancelación dice
 * primero lo único que de verdad angustia —que no se cobró nada— y después
 * ofrece el reintento.
 *
 * Limpia los parámetros de la URL al cerrar para no repetirse.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PartyPopper, Snowflake, CreditCard } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useMembership } from '@/hooks/useMembership';

export function MembershipSuccessNotice() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [modo, setModo] = useState<'ok' | 'cancel' | null>(null);
  const [annual, setAnnual] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const { startCheckout } = useMembership();

  useEffect(() => {
    const v = params.get('membership');
    if (v === 'ok') {
      setAnnual(params.get('period') === 'annual');
      setModo('ok');
    } else if (v === 'cancel') {
      setModo('cancel');
    }
  }, [params]);

  const close = () => {
    setModo(null);
    const next = new URLSearchParams(params);
    next.delete('membership');
    next.delete('period');
    setParams(next, { replace: true });
  };

  // El reintento NO cierra el aviso antes de tiempo: si la función de cobro
  // falla, la persona se quedaría otra vez ante una pantalla muda, que es
  // justo el defecto que este componente viene a corregir.
  const reintentar = async () => {
    setReintentando(true);
    const res = await startCheckout('annual');
    if (!res.ok) setReintentando(false);
  };

  if (modo === 'cancel') {
    return (
      <Modal
        open
        onClose={close}
        title={t('membership.cancelTitle')}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={close}>{t('membership.cancelClose')}</Button>
            <Button onClick={reintentar} disabled={reintentando}>{t('membership.cancelRetry')}</Button>
          </div>
        }
      >
        <div className="text-center">
          <CreditCard className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-700">{t('membership.cancelBody')}</p>
        </div>
      </Modal>
    );
  }

  if (modo !== 'ok') return null;
  return (
    <Modal open onClose={close} title={t('membership.successTitle')} footer={<Button onClick={close}>{t('membership.successCta')}</Button>}>
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
