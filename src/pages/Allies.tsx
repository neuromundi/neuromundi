/**
 * Allies — página pública /aliados: presenta las instituciones y empresas
 * aliadas de Neuromundi (cuadrícula de logos, reusa AlliesGrid). Es el destino de
 * la ficha "Conoce a nuestros aliados" de la portada. Incluye el selector de país
 * para segmentar (AlliesGrid ya filtra por el país del store).
 */
import { useTranslation } from 'react-i18next';
import { HeartHandshake } from 'lucide-react';
import { AlliesGrid } from '@/components/donation/AlliesGrid';
import { CountryFilter } from '@/components/common/CountryFilter';

export function Allies() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4 py-10">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-evs-5 p-8 text-white shadow-lg">
        <HeartHandshake className="h-10 w-10 opacity-90" aria-hidden="true" />
        <h1 className="mt-3 text-3xl font-extrabold">{t('alliesPage.title')}</h1>
        <p className="mt-2 max-w-xl text-white/90">{t('alliesPage.subtitle')}</p>
      </section>

      <div className="flex justify-center"><CountryFilter /></div>

      <AlliesGrid />
    </main>
  );
}
