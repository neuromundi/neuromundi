/**
 * HowTo — guía breve de "cómo usar" una herramienta, en pasos numerados.
 * Pensado para usuarios poco familiarizados con la plataforma. Es plegable
 * (<details>) y viene abierto por defecto; los pasos se toman de i18n.
 */
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';

export function HowTo({ stepsKey, titleKey = 'howto.title' }: { stepsKey: string; titleKey?: string }) {
  const { t } = useTranslation();
  const steps = t(stepsKey, { returnObjects: true });
  if (!Array.isArray(steps) || steps.length === 0) return null;
  return (
    <details className="rounded-2xl border border-brand-100 bg-brand-50 p-3" open>
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-brand-800">
        <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {t(titleKey)}
      </summary>
      <ol className="mt-2 list-decimal space-y-1 pl-6 text-sm text-slate-700">
        {(steps as string[]).map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </details>
  );
}
