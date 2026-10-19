/**
 * SectionPicker — el autor dice a qué sección pertenece lo que publica.
 *
 * Por qué existe (18 oct 2026): el buscador del blog y del calendario ya
 * filtraba por neurodesarrollo, neurodivergencias y afecciones neurológicas,
 * pero sólo el administrador podía poner esas etiquetas. Un miembro que subía
 * su taller o su artículo quedaba sin clasificar, así que sólo aparecía en
 * «Todas» y se perdía para quien filtraba. Ahora lo clasifica quien mejor lo
 * conoce: su propio autor.
 *
 * Se puede marcar más de una porque hay trabajo que de verdad abarca dos (un
 * congreso sobre encefalopatías epilépticas Y del desarrollo). No marcar
 * ninguna es válido: la entrada aparece en todos los filtros, igual que antes.
 *
 * Es el MISMO vocabulario, los mismos iconos y los mismos colores del
 * directorio y del filtro de búsqueda. Nadie debería aprender dos nombres
 * para lo mismo según si está buscando o publicando.
 */
import { useTranslation } from 'react-i18next';
import { Sprout, Sparkles, Stethoscope } from 'lucide-react';
import { SECTIONS } from '@/data/sections';
import { cn } from '@/lib/utils';

const ICONOS = { Sprout, Sparkles, Stethoscope } as const;

export function SectionPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">{t('sections.pickLabel')}</p>
      <p className="mb-2 text-xs text-slate-500">{t('sections.pickHint')}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('sections.pickLabel')}>
        {SECTIONS.map((s) => {
          const Icon = ICONOS[s.icon];
          const activa = value.includes(s.value);
          return (
            <button
              key={s.value}
              type="button"
              aria-pressed={activa}
              title={t(`sections.${s.value}.desc`)}
              onClick={() => onChange(activa ? value.filter((x) => x !== s.value) : [...value, s.value])}
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
    </div>
  );
}
