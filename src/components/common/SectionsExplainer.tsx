/**
 * SectionsExplainer — botón "¿Qué significan?" que abre una explicación en
 * lenguaje llano de las TRES áreas de Neuromundi (neurodesarrollo, neurodivergencias,
 * afecciones neurológicas). Se usa junto a los chips de sección en el perfil y en
 * el selector del directorio, para que el usuario entienda las leyendas.
 *
 * Las definiciones viven en i18n (`sections.<value>.desc`), fuente única.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Sprout, Sparkles, Stethoscope, type LucideIcon } from 'lucide-react';
import { Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import { SECTIONS } from '@/data/sections';

const ICONS: Record<string, LucideIcon> = { Sprout, Sparkles, Stethoscope };

export function SectionsExplainer({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1 rounded-full text-xs font-medium text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          className,
        )}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" /> {t('sections.whatAreThey')}
      </button>

      {open && (
        <Modal open onClose={() => setOpen(false)} title={t('sections.explainTitle')}>
          <p className="mb-4 text-sm text-slate-600">{t('sections.explainIntro')}</p>
          <ul className="space-y-4">
            {SECTIONS.map((s) => {
              const Icon = ICONS[s.icon] ?? Info;
              return (
                <li key={s.value} className="flex gap-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', s.chip)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{t(`sections.${s.value}.name`)}</p>
                    <p className="text-sm text-muted">{t(`sections.${s.value}.desc`)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
    </>
  );
}
