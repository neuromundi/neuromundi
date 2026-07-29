/**
 * RoleFeaturesPanel — panel "esto incluye tu cuenta" según el tipo de registro.
 * El contenido vive en i18n (`roleFeatures.<tipo>.title` y `.features` como
 * arreglo), así se traduce a los 8 idiomas. Si el tipo no tiene lista, no
 * renderiza nada.
 */
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';

export function RoleFeaturesPanel({ type }: { type: string }) {
  const { t } = useTranslation();
  const title = t(`roleFeatures.${type}.title`, { defaultValue: '' });
  const raw = t(`roleFeatures.${type}.features`, { returnObjects: true, defaultValue: [] });
  const features = Array.isArray(raw) ? (raw as string[]) : [];
  if (!title || features.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4">
      <p className="mb-2 font-semibold text-slate-900">{title}</p>
      <ul className="space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
