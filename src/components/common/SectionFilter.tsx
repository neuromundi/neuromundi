/**
 * SectionFilter — las tres secciones de Neuromundi como filtro.
 *
 * El directorio ya se ordenaba por neurodesarrollo, neurodivergencias y
 * afecciones neurológicas; el blog y los eventos no, así que quien entraba
 * buscando lo suyo tenía que leerlo todo. Se usa el MISMO vocabulario y los
 * MISMOS colores que el directorio: una persona no debería tener que aprender
 * dos nombres para lo mismo según la pestaña en la que esté.
 *
 * Una entrada sin clasificar (lista vacía) aparece siempre, para que un filtro
 * nuevo no esconda lo que todavía no se ha etiquetado.
 */
import { useTranslation } from 'react-i18next';
import { Sprout, Sparkles, Stethoscope } from 'lucide-react';
import { SECTIONS, type SectionValue } from '@/data/sections';
import { cn } from '@/lib/utils';

const ICONOS = { Sprout, Sparkles, Stethoscope } as const;

export function perteneceASeccion(secciones: string[] | null | undefined, sel: SectionValue | null): boolean {
  if (!sel) return true;
  const s = secciones ?? [];
  return s.length === 0 || s.includes(sel);
}

export function SectionFilter({
  value,
  onChange,
}: {
  value: SectionValue | null;
  onChange: (v: SectionValue | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('directory.sectionLabel')}>
      <button
        type="button"
        aria-pressed={!value}
        onClick={() => onChange(null)}
        className={cn(
          'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
          !value
            ? 'border-transparent bg-slate-800 text-white shadow-sm'
            : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200',
        )}
      >
        {t('directory.sectionAll')}
      </button>
      {SECTIONS.map((s) => {
        const Icon = ICONOS[s.icon];
        const activa = value === s.value;
        return (
          <button
            key={s.value}
            type="button"
            aria-pressed={activa}
            title={t(`sections.${s.value}.desc`)}
            onClick={() => onChange(activa ? null : s.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              activa ? `border-transparent bg-gradient-to-br text-white shadow-sm ${s.gradient}` : s.softInactive,
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {t(`sections.${s.value}.name`)}
          </button>
        );
      })}
    </div>
  );
}
