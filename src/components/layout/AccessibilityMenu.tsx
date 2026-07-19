/**
 * AccessibilityMenu — control de accesibilidad: escala de tamaño de texto y
 * conmutadores para público neurodivergente (reducir movimiento, modo calma,
 * fuente para dislexia y alto contraste). Todos los controles cumplen un
 * objetivo de toque ≥ 44px.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Accessibility, Check, Sun, Moon, Monitor, Palette, Type, Contrast } from 'lucide-react';
import { useA11y, type FontScale } from '@/stores/a11yStore';
import { useTheme, type Theme } from '@/stores/themeStore';

const SIZES: { id: FontScale; sample: string }[] = [
  { id: 'sm', sample: 'A' },
  { id: 'normal', sample: 'A' },
  { id: 'lg', sample: 'A' },
  { id: 'xl', sample: 'A' },
];
const SAMPLE_PX: Record<FontScale, string> = { sm: '13px', normal: '16px', lg: '19px', xl: '22px' };

export function AccessibilityMenu({ className }: { className?: string }) {
  const { t } = useTranslation();
  const {
    fontScale,
    reduceMotion,
    calm,
    dyslexia,
    highContrast,
    setFontScale,
    toggleReduceMotion,
    toggleCalm,
    toggleDyslexia,
    toggleHighContrast,
  } = useA11y();
  const { theme, setTheme } = useTheme();
  const THEMES: { id: Theme; icon: typeof Sun; key: string }[] = [
    { id: 'light', icon: Sun, key: 'a11y.themeLight' },
    { id: 'dark', icon: Moon, key: 'a11y.themeDark' },
    { id: 'system', icon: Monitor, key: 'a11y.themeSystem' },
  ];
  const TOGGLES: { icon: typeof Palette; label: string; on: boolean; toggle: () => void }[] = [
    { icon: Accessibility, label: 'a11y.reduceMotion', on: reduceMotion, toggle: toggleReduceMotion },
    { icon: Palette, label: 'a11y.calm', on: calm, toggle: toggleCalm },
    { icon: Type, label: 'a11y.dyslexia', on: dyslexia, toggle: toggleDyslexia },
    { icon: Contrast, label: 'a11y.contrast', on: highContrast, toggle: toggleHighContrast },
  ];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('a11y.title')}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Accessibility className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('a11y.title')}
          className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl"
        >
          <p className="mb-2 text-sm font-semibold text-slate-900">{t('a11y.theme')}</p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {THEMES.map((th) => {
              const Icon = th.icon;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id)}
                  aria-pressed={theme === th.id}
                  className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] ${
                    theme === th.id ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(th.key)}
                </button>
              );
            })}
          </div>

          <p className="mb-2 text-sm font-semibold text-slate-900">{t('a11y.textSize')}</p>
          <div className="grid grid-cols-4 gap-2">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setFontScale(s.id)}
                aria-pressed={fontScale === s.id}
                aria-label={t(`a11y.size_${s.id}`)}
                className={`flex h-11 items-center justify-center rounded-lg border leading-none ${
                  fontScale === s.id ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700'
                }`}
                style={{ fontSize: SAMPLE_PX[s.id] }}
              >
                {s.sample}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {TOGGLES.map((tg) => {
              const Icon = tg.icon;
              return (
                <div key={tg.label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    {t(tg.label)}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tg.on}
                    aria-label={t(tg.label)}
                    onClick={tg.toggle}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${tg.on ? 'bg-brand-500' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-all ${tg.on ? 'left-[22px]' : 'left-0.5'}`}
                    >
                      {tg.on && <Check className="h-3.5 w-3.5 text-brand-600" />}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">{t('a11y.hint')}</p>
        </div>
      )}
    </div>
  );
}
