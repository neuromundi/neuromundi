/**
 * MilestoneGuide — guía orientativa de hitos por edad. Ayuda a la familia a
 * saber qué observar y, con un toque, a registrar un hito en su rastreador
 * (local-first). Es orientación, NO diagnóstico: se muestra un aviso cálido y
 * se recuerda que cada niña o niño tiene su ritmo.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Info, Plus, Check } from 'lucide-react';
import { useToast } from '@/components/ui';
import { useTracker } from '@/hooks/useTracker';
import { MILESTONE_BANDS, MILESTONE_AREAS, milestoneLang, type MilestoneArea } from '@/data/milestonesGuide';
import { cn } from '@/lib/utils';

const AREA_KEY: Record<MilestoneArea, string> = {
  motor: 'guide.area.motor',
  lenguaje: 'guide.area.lenguaje',
  social: 'guide.area.social',
  cognitivo: 'guide.area.cognitivo',
};

export function MilestoneGuide() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { add } = useTracker();
  const [bandId, setBandId] = useState(MILESTONE_BANDS[0].id);
  const [logged, setLogged] = useState<Set<string>>(new Set());

  // Español si la app está en español; inglés en cualquier otro idioma.
  const lang = milestoneLang(i18n.language);
  const band = useMemo(() => MILESTONE_BANDS.find((b) => b.id === bandId) ?? MILESTONE_BANDS[0], [bandId]);

  /** Etiqueta traducida del rango: meses hasta 24, luego años. */
  const bandLabel = (from: number, to: number) =>
    to <= 24
      ? t('guide.rangeMonths', { from, to })
      : t('guide.rangeYears', { from: Math.round(from / 12), to: Math.round(to / 12) });

  const logMilestone = async (area: MilestoneArea, text: string) => {
    await add({ date: new Date().toISOString().slice(0, 10), area: t(AREA_KEY[area]), text });
    setLogged((s) => new Set(s).add(text));
    toast.success(t('guide.logged'));
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
        <h3 className="font-semibold text-slate-900">{t('guide.title')}</h3>
      </div>
      <p className="mb-3 text-xs text-muted">{t('guide.help')}</p>

      {/* Aviso: orientación, no diagnóstico. */}
      <div className="mb-3 flex items-start gap-2 rounded-xl bg-brand-50/60 p-3 text-xs text-slate-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <span>{t('guide.disclaimer')}</span>
      </div>

      {/* Selector de franja de edad */}
      <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label={t('guide.ageBand')}>
        {MILESTONE_BANDS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={b.id === bandId}
            onClick={() => setBandId(b.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium',
              b.id === bandId ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50',
            )}
          >
            {bandLabel(b.from, b.to)}
          </button>
        ))}
      </div>

      {/* Hitos por área */}
      <div className="space-y-4">
        {MILESTONE_AREAS.map((area) => (
          <div key={area}>
            <h4 className="mb-1.5 text-sm font-semibold text-slate-900">{t(AREA_KEY[area])}</h4>
            <ul className="space-y-1.5">
              {band.items[area][lang].map((text) => {
                const done = logged.has(text);
                return (
                  <li key={text} className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 p-2">
                    <span className="min-w-0 flex-1 text-sm text-slate-700">{text}</span>
                    <button
                      type="button"
                      disabled={done}
                      onClick={() => void logMilestone(area, text)}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                        done ? 'bg-sage-50 text-sage-700' : 'bg-brand-50 text-brand-700 hover:bg-brand-100',
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {done ? t('guide.loggedShort') : t('guide.log')}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
