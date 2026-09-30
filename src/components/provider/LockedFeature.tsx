/**
 * LockedFeature — contenido de una pestaña reservada a miembros con la cuota
 * cubierta.
 *
 * El modelo del directorio tiene dos niveles: con la cuenta creada se usa la
 * plataforma en lo que da valor al usuario final (contenido, foros, red,
 * Academy, vacantes, calificaciones); lo que genera negocio al prestador
 * —ofertas, agenda, métricas, tienda, pacientes, afiliados— exige cuota
 * cubierta. La pestaña no se esconde: se muestra bajo llave, para que el
 * miembro sepa qué está dejando sobre la mesa y pueda pagar desde aquí.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useMembership } from '@/hooks/useMembership';

export function LockedFeature({ nombre }: { nombre: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { startCheckout } = useMembership();
  const [ocupado, setOcupado] = useState(false);

  async function pagar() {
    setOcupado(true);
    const res = await startCheckout('annual');
    if (!res.ok) { toast.error(t('membership.payError')); setOcupado(false); }
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
        <Lock className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="font-bold text-slate-900">{t('gate.lockedTitle', { nombre })}</p>
        <p className="mt-1 max-w-prose text-sm text-slate-700">{t('gate.lockedBody')}</p>
      </div>
      <Button loading={ocupado} onClick={() => void pagar()}>{t('gate.lockedCta')}</Button>
    </div>
  );
}
