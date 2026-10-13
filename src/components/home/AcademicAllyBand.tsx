/**
 * AcademicAllyBand — franja "Aliado académico" de la portada. Declara la alianza
 * académica con el Observatorio Internacional de Neuroeducación y Neurodiversidad
 * (organismo independiente, convenio escrito). El logo oficial vive en
 * `public/observaneuro.webp` y enlaza a observaneuro.com. La nota de alcance acota
 * la afirmación: es una alianza de orientación/contenidos, no un aval clínico de
 * cada prestador del directorio.
 */
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

export function AcademicAllyBand() {
  const { t, i18n } = useTranslation();
  // El Observatorio tiene una página de la alianza en inglés y otra en español.
  // Se dirige según el idioma resuelto (selección del usuario → navegador → ubicación).
  const isEn = (i18n.language || 'es').slice(0, 2) === 'en';
  const observatoryUrl = isEn
    ? 'https://www.observaneuro.com/en/neuromundialliance'
    : 'https://www.observaneuro.com/alianzaneuromundi';
  return (
    <section
      className="my-12 flex flex-wrap items-center gap-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-6 shadow-sm sm:p-7"
      aria-labelledby="ally-title"
    >
      <div className="mx-auto flex w-36 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white p-3 sm:mx-0">
        <img
          src="/observaneuro.webp"
          alt={t('ally.logoAlt')}
          width={640}
          height={781}
          loading="lazy"
          className="h-auto w-full"
        />
      </div>
      <div className="mx-auto min-w-[260px] flex-1 text-center sm:mx-0 sm:text-left">
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#0d2545]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c6a15b]" aria-hidden="true" />
          {t('ally.badge')}
        </span>
        <h2 id="ally-title" className="mt-3 text-2xl font-extrabold text-[#0d2545]">{t('ally.title')}</h2>
        <p className="mx-auto mt-2 max-w-prose leading-relaxed text-slate-600 sm:mx-0">{t('ally.text')}</p>
        <a
          href={observatoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0d2545] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#13365f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d2545]"
        >
          {t('ally.cta')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
        <p className="mx-auto mt-3 max-w-prose text-[11px] leading-snug text-slate-400 sm:mx-0">{t('ally.note')}</p>
      </div>
    </section>
  );
}
