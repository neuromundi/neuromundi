/**
 * SectionsField — campo compartido de los formularios de registro de PRESTADORES
 * (especialistas, comercios, escuelas, clínicas, wellness, ONG…). Permite elegir
 * 1 a 3 secciones de la plataforma (Neurodesarrollo / Neurodivergencias /
 * Afecciones neurológicas). Si se marca "Afecciones", aparece la selección de
 * afecciones neurológicas que atiende.
 *
 * NO se usa para pacientes/familias/tutores ni para empresas que ofertan empleo.
 *
 * El estado lo administra el formulario anfitrión (patrón `useToggleList`), igual
 * que las especialidades y áreas.
 */
import { useTranslation } from 'react-i18next';
import { Sprout, Sparkles, Stethoscope } from 'lucide-react';
import { SECTIONS } from '@/data/sections';
import { NEURO_CONDITIONS } from '@/data/neuroConditionsCatalog';
import { useCatLabel } from '@/lib/catLabel';
import { cn } from '@/lib/utils';

const ICONS = { Sprout, Sparkles, Stethoscope } as const;

export interface SectionsFieldProps {
  sections: string[];
  onToggleSection: (value: string) => void;
  neuroConditions: string[];
  onToggleCondition: (value: string) => void;
}

export function SectionsField({ sections, onToggleSection, neuroConditions, onToggleCondition }: SectionsFieldProps) {
  const { t } = useTranslation();
  const catLabel = useCatLabel();
  const showConditions = sections.includes('afecciones');

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-800">{t('sectionsField.label')}</label>
      <p className="mb-2 text-xs text-muted">{t('sectionsField.hint')}</p>
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => {
          const Icon = ICONS[s.icon];
          const active = sections.includes(s.value);
          return (
            <button
              key={s.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleSection(s.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                active ? `border-transparent bg-gradient-to-br text-white ${s.gradient}` : 'border-slate-200 text-slate-700 hover:bg-slate-50',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {t(`sections.${s.value}.name`)}
            </button>
          );
        })}
      </div>

      {showConditions && (
        <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
          <label className="mb-1 block text-sm font-semibold text-sky-900">{t('sectionsField.conditionsLabel')}</label>
          <p className="mb-2 text-xs text-sky-800/80">{t('sectionsField.conditionsHint')}</p>
          <div className="flex flex-wrap gap-2">
            {NEURO_CONDITIONS.map((c) => {
              const active = neuroConditions.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleCondition(c.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                    active ? 'border-sky-600 bg-sky-600 text-white' : 'border-sky-200 bg-white text-sky-800 hover:bg-sky-100',
                  )}
                >
                  {catLabel(c.value, c.label)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
