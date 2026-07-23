/**
 * DonateCallout — caja empática de invitación a donar, reutilizable en varios
 * contextos (directorio, Toolkit, panel del usuario, especialista).
 *
 * La idea es pedir apoyo en el momento de GRATITUD: justo después de que la
 * persona encontró valor (halló un especialista, terminó una guía…). Por eso el
 * mensaje cambia según dónde se muestre.
 *
 * Accesible y discreto: no es un modal ni interrumpe; es una tarjeta al pie del
 * contenido. La variante "specialist" puede cerrarse y recuerda que se cerró.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui';

export type CalloutVariant = 'directory' | 'toolkit' | 'dashboard' | 'specialist';

export function DonateCallout({
  variant,
  onDismiss,
}: {
  variant: CalloutVariant;
  onDismiss?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isSpecialist = variant === 'specialist';

  return (
    <div className="relative rounded-2xl border border-[#e6d8ad] bg-gradient-to-br from-[#faf5e6] to-white p-4">
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('common.close')}
          className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8C6D1F]/10 text-[#8C6D1F]">
          {isSpecialist ? <Sparkles className="h-5 w-5" aria-hidden="true" /> : <Heart className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{t(`callout.${variant}.title`)}</p>
          <p className="mt-0.5 text-sm text-slate-700">{t(`callout.${variant}.body`)}</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => navigate('/donar')}
            leadingIcon={isSpecialist ? <Sparkles className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
          >
            {t(isSpecialist ? 'callout.specialist.cta' : 'home.donors.donateCta')}
          </Button>
        </div>
      </div>
    </div>
  );
}
