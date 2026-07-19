/**
 * FounderProgressCard — recuadro bajo "Así se verá tu perfil" en el registro.
 * Recuerda beneficios y requisitos para ser Miembro Fundador según el grupo del
 * usuario. Ya NO muestra los lugares disponibles: el porcentaje de cumplimiento
 * de los requisitos se calcula y actualiza en el área de cuenta del usuario
 * (ver FounderRequirements) a medida que cumple cada requisito.
 *
 * Cuando el país alcanza la meta (500 familias / 100 profesionales o prestadores)
 * el espacio se deshabilita y en su lugar aparece un mensaje de meta cumplida que
 * motiva a registrarse igualmente por los beneficios propios del perfil.
 */
import { useTranslation } from 'react-i18next';
import { Award, Check, Sparkles, Info } from 'lucide-react';
import { FounderBadge } from '@/components/ui';
import { useFounderCapacity, type FounderKind } from '@/hooks/useFounder';

export function FounderProgressCard({ kind, country }: { kind: FounderKind; country: string | null }) {
  const { t } = useTranslation();
  const { reached } = useFounderCapacity(kind, country);

  if (reached) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-slate-800">
          <Award className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <h3 className="font-bold">{t('founderCard.reachedTitle')}</h3>
        </div>
        <p className="mt-2 text-sm text-slate-700">{t('founderCard.reachedBody', { country })}</p>
        <p className="mt-2 text-sm text-slate-700">{t('founderCard.reachedMotivate')}</p>
      </div>
    );
  }

  const benefits = t(`founder.groups.${kind}.benefits`, { returnObjects: true }) as string[];
  const reqs = t(`founder.groups.${kind}.reqs`, { returnObjects: true }) as string[];

  return (
    <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-4">
      <div className="flex items-center gap-3">
        <FounderBadge isFounder size="sm" />
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t('founderCard.kicker')}
          </p>
          <h3 className="font-bold text-slate-900">{t('founderCard.title')}</h3>
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <Award className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('founder.benefitsTitle')}
        </p>
        <ul className="space-y-1">
          {benefits.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" aria-hidden="true" /> {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-sm font-bold text-slate-900">{t('founder.reqsTitle')}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {reqs.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-white/70 p-2 text-xs text-brand-800">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {t('founderCard.progressNote')}
      </p>
    </div>
  );
}
