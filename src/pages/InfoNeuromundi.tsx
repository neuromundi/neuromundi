/**
 * InfoNeuromundi — "Conocer más sobre Neuromundi". Página pública de
 * posicionamiento (ruta /conocer-mas): qué es, por qué es inédita, su carácter
 * inclusivo, el ecosistema de perfiles, y un CTA de registro. Textos en i18n.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Sparkles, Users, Globe, HeartHandshake, Network } from 'lucide-react';

export function InfoNeuromundi() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('common.back')}
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-slate-900">{t('info.title')}</h1>
      <p className="mt-2 text-lg text-slate-700">{t('info.tagline')}</p>

      <section className="mt-6 space-y-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Sparkles className="h-5 w-5 text-brand-500" aria-hidden="true" />
          {t('info.whatTitle')}
        </h2>
        <p className="text-slate-700">{t('info.whatBody')}</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Globe className="h-5 w-5 text-brand-500" aria-hidden="true" />
          {t('info.uniqueTitle')}
        </h2>
        <p className="text-slate-700">{t('info.uniqueBody')}</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <HeartHandshake className="h-5 w-5 text-brand-500" aria-hidden="true" />
          {t('info.inclusiveTitle')}
        </h2>
        <p className="text-slate-700">{t('info.inclusiveBody')}</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Network className="h-5 w-5 text-brand-500" aria-hidden="true" />
          {t('info.ecosystemTitle')}
        </h2>
        <p className="text-slate-700">{t('info.ecosystemBody')}</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Users className="h-5 w-5 text-brand-500" aria-hidden="true" />
          {t('info.forTitle')}
        </h2>
        <p className="text-slate-700">{t('info.forBody')}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Sparkles className="h-5 w-5 text-brand-500" aria-hidden="true" />
          {t('info.closingTitle')}
        </h2>
        <p className="mt-2 text-slate-700">{t('info.closingBody')}</p>
      </section>

      <Link
        to="/crear-cuenta"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {t('campaign.benefits.cta')}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </main>
  );
}
