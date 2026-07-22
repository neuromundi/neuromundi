/**
 * InfoNeuromundi — "Conocer más sobre Neuromundi" (plantilla base).
 * Ruta pública: /conocer-mas. Enlaza al sitio oficial externo.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink, Sparkles, Users } from 'lucide-react';

const OFFICIAL_URL = 'https://www.neuromundi.com/info';

export function InfoNeuromundi() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('common.back')}
      </Link>

      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {t('legal.badge')}
      </span>

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
          <Users className="h-5 w-5 text-brand-500" aria-hidden="true" />
          {t('info.forTitle')}
        </h2>
        <p className="text-slate-700">{t('info.forBody')}</p>
      </section>

      <a
        href={OFFICIAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {t('info.visit')}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>

      <p className="mt-3 text-xs italic text-muted">{t('info.officialNote')}</p>
    </main>
  );
}
