/**
 * SealsCard — tarjeta con los dos sellos digitales de la Red Neuromundi para que
 * el prestador los descargue y los coloque en su web, redes o consultorio.
 */
import { useTranslation } from 'react-i18next';
import { BadgeCheck } from 'lucide-react';
import { NeuromundiSeal } from './NeuromundiSeal';

export function SealsCard() {
  const { t } = useTranslation();
  return (
    <section className="rounded-2xl border border-slate-100 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <BadgeCheck className="h-5 w-5 text-brand-600" aria-hidden="true" /> {t('nid.seal.title')}
      </h3>
      <p className="mt-1 text-sm text-muted">{t('nid.seal.desc')}</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <NeuromundiSeal variant="accepts" />
        <NeuromundiSeal variant="ally" />
      </div>
    </section>
  );
}
