/**
 * ToolkitNav — navegación por pestañas entre los módulos del Kit.
 *
 * Accesible: patrón WAI-ARIA "tabs" con roving tabindex y flechas. Cada pestaña
 * tiene un color pastel distintivo y muestra la palabra "Módulo" + su letra. El
 * estado leído se marca con un check. Scroll horizontal en móvil.
 */
import { useRef, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ToolkitModule } from '@/data/toolkit';
import { MODULE_ICONS, MODULE_ACCENTS } from './meta';

export interface ToolkitNavProps {
  modules: ToolkitModule[];
  activeId: string;
  onSelect: (id: string) => void;
  isRead: (id: string) => boolean;
}

export function ToolkitNav({ modules, activeId, onSelect, isRead }: ToolkitNavProps) {
  const { t } = useTranslation();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % modules.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + modules.length) % modules.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = modules.length - 1;
    else return;
    e.preventDefault();
    onSelect(modules[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t('kit.modulesNav')}
      className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
    >
      {modules.map((m, i) => {
        const accent = MODULE_ACCENTS[m.id];
        const Icon = MODULE_ICONS[m.icon];
        const active = m.id === activeId;
        const read = isRead(m.id);
        return (
          <button
            key={m.id}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            id={`tab-${m.id}`}
            aria-selected={active}
            aria-controls={`panel-${m.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(m.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'group flex min-w-[9.5rem] flex-1 items-center gap-2 rounded-t-xl border-b-2 px-3 py-2.5 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              accent.text,
              active
                ? cn(accent.tabBg, accent.border, 'font-bold')
                : cn(accent.soft, 'border-transparent hover:opacity-90'),
            )}
          >
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', active ? 'bg-white' : accent.tabBg)}>
              {read ? <Check className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', accent.dot)} aria-hidden="true" />
                <span className="text-[0.7rem] font-semibold uppercase tracking-wide">{t('kit.moduleWord')} {m.id}</span>
              </span>
              <span className="block truncate text-sm">{m.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
