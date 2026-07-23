/**
 * Donate — página pública de donación (/donar). Cualquiera puede donar, tenga o
 * no cuenta. Envuelve DonationSection y muestra el aviso de retorno de Stripe.
 */
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui';
import { DonationSection } from '@/components/donation/DonationSection';

export function Donate() {
  const { t } = useTranslation();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  // Stripe regresa a /donar?estado=ok|cancelado tras el checkout.
  useEffect(() => {
    const estado = params.get('estado');
    if (estado === 'ok') toast.success(t('donate.result.ok'));
    else if (estado === 'cancelado') toast.info(t('donate.result.cancel'));
    if (estado) {
      params.delete('estado');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <DonationSection />
    </div>
  );
}
