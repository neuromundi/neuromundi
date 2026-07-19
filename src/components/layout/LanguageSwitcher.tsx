/**
 * LanguageSwitcher — selector de idioma (8 idiomas).
 *
 * Cambia el idioma de la app y recuerda la elección. Accesible: es un <select>
 * nativo con etiqueta para lectores de pantalla.
 */
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, changeLanguage, type LanguageCode } from '@/i18n';
import { isLikelyMexico } from '@/lib/geo';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.slice(0, 2) as LanguageCode) ?? 'en';

  // Para usuarios en México, el español usa la bandera de México.
  const flag = current === 'es' && isLikelyMexico() ? 'mx' : current;

  return (
    <label className={cn('inline-flex items-center gap-2 text-sm text-slate-700', className)}>
      <img
        src={`/flags/${flag}.webp`}
        alt=""
        aria-hidden="true"
        className="h-4 w-6 shrink-0 rounded-sm object-cover shadow-sm ring-1 ring-slate-200"
      />
      <span className="sr-only">{t('lang.label')}</span>
      <select
        value={current}
        onChange={(e) => changeLanguage(e.target.value as LanguageCode)}
        aria-label={t('lang.label')}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
