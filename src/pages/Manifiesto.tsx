/**
 * Manifiesto — Manifiesto de la Comunidad Neuromundi (/manifiesto). Página React
 * multilingüe: el texto se toma de legalContent según el idioma activo, por lo
 * que cambia con el navegador y con el selector de idioma.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, HeartHandshake } from 'lucide-react';
import { legalContent } from '@/data/legalContent';

export function Manifiesto() {
  const { t, i18n } = useTranslation();
  const m = legalContent(i18n.language).manifesto;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('common.back')}
      </Link>

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-700 p-8 text-white shadow-lg">
        <HeartHandshake className="h-10 w-10 opacity-90" aria-hidden="true" />
        <h1 className="mt-3 text-3xl font-extrabold">{t('footer.manifesto')}</h1>
        <p className="mt-2 font-semibold text-white/90">{m.tagline}</p>
      </section>

      <article className="mt-6 space-y-5 text-slate-700">
        <p className="text-lg text-slate-800">{m.lead}</p>
        {m.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}

        {m.principles.map((pr, i) => (
          <section key={i} className="space-y-1">
            <h2 className="text-lg font-semibold text-brand-800">{pr.h}</h2>
            <p>{pr.p}</p>
          </section>
        ))}

        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <h2 className="text-lg font-semibold text-brand-800">{m.pledgeH}</h2>
          {m.pledge.map((p, i) => (
            <p key={i} className={i === 0 ? 'mt-2' : 'mt-2 font-semibold text-slate-900'}>{p}</p>
          ))}
        </div>
      </article>

      <footer className="mt-8 border-t border-slate-100 pt-4 text-sm text-muted">
        <Link to="/terminos" className="hover:text-brand-700">{t('auth.terms')}</Link>
        <span className="mx-2">·</span>
        <Link to="/privacidad" className="hover:text-brand-700">{t('auth.privacy')}</Link>
      </footer>
    </main>
  );
}
