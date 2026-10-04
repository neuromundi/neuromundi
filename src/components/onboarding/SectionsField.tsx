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
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sprout, Sparkles, Stethoscope, Wand2 } from 'lucide-react';
import { SECTIONS } from '@/data/sections';
import { NEURO_CONDITIONS } from '@/data/neuroConditionsCatalog';
import { suggestedSections } from '@/lib/suggestedSections';
import { useCatLabel } from '@/lib/catLabel';
import { cn } from '@/lib/utils';

const ICONS = { Sprout, Sparkles, Stethoscope } as const;

export interface SectionsFieldProps {
  sections: string[];
  onToggleSection: (value: string) => void;
  neuroConditions: string[];
  onToggleCondition: (value: string) => void;
  /**
   * Profesión declarada (si el formulario la tiene). Se usa SOLO para
   * preseleccionar las secciones más probables; el usuario puede cambiarlas.
   */
  suggestFor?: string | null;
}

export function SectionsField({ sections, onToggleSection, neuroConditions, onToggleCondition, suggestFor }: SectionsFieldProps) {
  const { t } = useTranslation();
  const catLabel = useCatLabel();
  const showConditions = sections.includes('afecciones');

  // Preselección SUAVE: marca las secciones sugeridas por la profesión mientras
  // el usuario no haya tocado el campo. Solo AÑADE (nunca quita) y se desactiva
  // en cuanto el usuario interactúa, para no pisar su elección.
  const userTouched = useRef(false);
  const applied = useRef<string>('');
  const initChecked = useRef(false);
  useEffect(() => {
    // Si el campo ya trae secciones al montar (p. ej. modo "completar" de alta
    // social, donde el perfil existente ya las tenía), se respeta esa elección y
    // no se preselecciona nada.
    if (!initChecked.current) {
      initChecked.current = true;
      if (sections.length > 0) { userTouched.current = true; return; }
    }
    if (userTouched.current) return;
    const key = suggestFor ?? '';
    if (applied.current === key) return;
    applied.current = key;
    for (const v of suggestedSections(suggestFor)) {
      if (!sections.includes(v)) onToggleSection(v);
    }
    // Se omite `sections`/`onToggleSection` de las deps a propósito: solo debe
    // reaccionar al cambio de profesión, no a cada toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestFor]);

  const handleToggleSection = (value: string) => {
    userTouched.current = true;
    onToggleSection(value);
  };
  const suggested = suggestedSections(suggestFor);

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
              onClick={() => handleToggleSection(s.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                active ? `border-transparent bg-gradient-to-br text-white shadow-sm ${s.gradient}` : s.softInactive,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {t(`sections.${s.value}.name`)}
            </button>
          );
        })}
      </div>

      {/* Pista de preselección: solo mientras el usuario no haya tocado el campo y
          la selección coincida con la sugerencia por profesión. */}
      {!userTouched.current && suggested.length > 0 && suggested.every((v) => sections.includes(v)) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-700">
          <Wand2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {t('sectionsField.suggestedHint')}
        </p>
      )}

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
                    active ? 'border-sky-600 bg-sky-600 text-white' : 'border-sky-100 bg-sky-50 text-sky-800 hover:bg-sky-100',
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
