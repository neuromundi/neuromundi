/**
 * Toolkit — "Kit de Herramientas" de Neuromundi.
 *
 * Contenedor principal: navegación por módulos (A–E), lector de contenido,
 * progreso de lectura (Supabase si hay sesión, si no localStorage) y un CTA de
 * especialistas al final de cada módulo. Diseño calmado, alto contraste y
 * mobile-first, con transiciones solo de opacidad.
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, BookOpenCheck, Info } from 'lucide-react';
import { Button, ProgressBar } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToolkitProgress } from '@/hooks/useToolkitProgress';
import { getModules, getModule } from '@/data/toolkit';
import { ContentRenderer, SpecialistMatcher, ToolkitNav, MODULE_ACCENTS, MODULE_ICONS } from '@/components/toolkit';
import { DonateCallout } from '@/components/donation/DonateCallout';

export function Toolkit() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { isRead, markRead, ready } = useToolkitProgress();
  const [params, setParams] = useSearchParams();
  const modules = useMemo(() => getModules(i18n.language), [i18n.language]);

  const activeId = useMemo(() => {
    const m = params.get('m');
    return m && getModule(i18n.language, m) ? m : modules[0].id;
  }, [params, i18n.language, modules]);

  const activeModule = getModule(i18n.language, activeId) ?? modules[0];
  const accent = MODULE_ACCENTS[activeModule.id];
  const Icon = MODULE_ICONS[activeModule.icon];
  const readCount = modules.filter((m) => isRead(m.id)).length;
  const total = modules.length;
  const activeRead = isRead(activeModule.id);

  const selectModule = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('m', id);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Encabezado */}
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" /> {t('kit.badge')}
        </span>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900">{t('kit.title')}</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">{t('kit.intro')}</p>
      </header>

      {/* Progreso */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <ProgressBar
          value={readCount}
          max={total}
          color="#0284c7"
          label={t('kit.progressLabel')}
          valueText={`${readCount}/${total}`}
        />
        <p className="mt-2 flex items-start gap-2 text-sm text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{isAuthenticated ? t('kit.note.auth') : t('kit.note.guest')}</span>
        </p>
      </div>

      {/* Navegación por módulos */}
      <div className="mt-8 border-b border-slate-100">
        <ToolkitNav modules={modules} activeId={activeId} onSelect={selectModule} isRead={isRead} />
      </div>

      {/* Panel del módulo activo */}
      <section
        role="tabpanel"
        id={`panel-${activeModule.id}`}
        aria-labelledby={`tab-${activeModule.id}`}
        tabIndex={0}
        className="mt-8 animate-fade focus-visible:outline-none"
      >
        <div className="flex items-start gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent.soft} ${accent.text}`}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{activeModule.title}</h2>
            <p className="mt-1 leading-relaxed text-muted">{activeModule.summary}</p>
          </div>
        </div>

        <div className="mt-8 space-y-12">
          {activeModule.sections.map((section) => (
            <article key={section.id} aria-labelledby={`sec-${section.id}`}>
              <h3 id={`sec-${section.id}`} className={`border-l-4 pl-3 text-xl font-bold ${accent.border} text-slate-900`}>
                {section.title}
              </h3>
              <div className="mt-5">
                <ContentRenderer blocks={section.blocks} accent={accent} />
              </div>
            </article>
          ))}
        </div>

        {/* Marcar como leído */}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {activeRead ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-sage-50 px-4 py-2 font-semibold text-sage-700">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> {t('kit.readDone')}
            </span>
          ) : (
            <Button
              onClick={() => markRead(activeModule.id)}
              disabled={!ready}
              leadingIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              {t('kit.markRead')}
            </Button>
          )}
        </div>

        {/* CTA de especialistas */}
        <div className="mt-8">
          <SpecialistMatcher module={activeModule} accent={accent} />
        </div>

        {/* Gratitud contextual: al final de la guía. */}
        <div className="mt-6">
          <DonateCallout variant="toolkit" />
        </div>
      </section>
    </div>
  );
}
