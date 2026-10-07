/**
 * HomeCounters — "Neuromundi en cifras". Ocupa la columna derecha del héroe (en
 * lugar del antiguo carrusel). Muestra: países/territorios del plan de expansión
 * 2026–2027, la población objetivo mundial por cada sección, y la amplitud del
 * catálogo. Los números suben (count-up) al entrar en viewport.
 *
 * Fuentes de población: GBD 2021 (Lancet Neurology) para afecciones neurológicas
 * (~3,400 M, 43% de la población) y trastornos del neurodesarrollo (~240 M);
 * estimación de neurodivergencia del 15–20% (~1,300 M). Son estimaciones.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe2, Sprout, Sparkles, Stethoscope, GraduationCap, Compass, ShoppingBag } from 'lucide-react';
import { COUNTRIES } from '@/data/countries';
import { PROFESSIONS, SPECIALTIES, INTERVENTION_AREAS } from '@/data/specialistCatalog';
import { NEURO_CONDITIONS } from '@/data/neuroConditionsCatalog';
import { STORE_CATEGORIES } from '@/data/storeCatalog';
import { useInView } from '@/hooks/useInView';

const N_COUNTRIES = COUNTRIES.length;
const N_SPECIALTIES = PROFESSIONS.length + SPECIALTIES.length;
const N_AREAS = INTERVENTION_AREAS.length;
const N_CONDITIONS = NEURO_CONDITIONS.length;
// Categorías + subcategorías de productos y servicios (distintas de las
// especialidades): se deriva del catálogo para que el número no se desactualice.
const N_STORE_CATS = STORE_CATEGORIES.length + STORE_CATEGORIES.reduce((a, c) => a + (c.sub?.length ?? 0), 0);

function useCountUp(target: number, run: boolean, ms = 1300): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) { setN(0); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return n;
}

function Stat({ value, run, suffix, label, sub, icon, accent }: {
  value: number; run: boolean; suffix?: string; label: string; sub?: string; icon: React.ReactNode; accent: string;
}) {
  const n = useCountUp(value, run);
  return (
    <div className="flex min-h-[120px] min-w-0 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-2.5 text-center shadow-sm sm:min-h-[140px] sm:p-4">
      <span className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>{icon}</span>
      <p className="text-xl font-extrabold text-slate-900 sm:text-2xl">
        {n.toLocaleString()}{suffix ? <span className="text-sm font-bold text-slate-500 sm:text-base"> {suffix}</span> : null}
      </p>
      <p className="mt-1 hyphens-auto break-words text-[11px] font-semibold leading-snug text-slate-800 sm:text-xs">{label}</p>
      {sub && <p className="mt-0.5 hyphens-auto break-words text-[10px] leading-snug text-muted sm:text-[11px]">{sub}</p>}
    </div>
  );
}

export function HomeCounters() {
  const { t } = useTranslation();
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div ref={ref} className="flex flex-col gap-3">
      {/* Expansión: la cifra ancla, a todo el ancho de la columna */}
      <Stat
        run={inView}
        value={N_COUNTRIES}
        label={t('counters.countries')}
        icon={<Globe2 className="h-5 w-5 text-white" />}
        accent="bg-gradient-to-br from-brand-600 to-evs-5"
      />

      {/* Población objetivo por sección */}
      <h3 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{t('counters.popTitle')}</h3>
      <div className="grid grid-cols-3 gap-2.5">
        <Stat run={inView} value={240} suffix={t('counters.millions')} label={t('sections.neurodesarrollo.name')} sub={t('counters.ndSub')}
          icon={<Sprout className="h-5 w-5 text-white" />} accent="bg-emerald-500" />
        <Stat run={inView} value={1300} suffix={t('counters.millions')} label={t('sections.neurodivergencias.name')} sub={t('counters.perSix')}
          icon={<Sparkles className="h-5 w-5 text-white" />} accent="bg-indigo-500" />
        <Stat run={inView} value={3400} suffix={t('counters.millions')} label={t('sections.afecciones.name')} sub={t('counters.perThree')}
          icon={<Stethoscope className="h-5 w-5 text-white" />} accent="bg-violet-500" />
      </div>

      {/* Catálogo: especialidades + productos y servicios en una sola fila de 4. */}
      <h3 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{t('counters.catTitle')}</h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat run={inView} value={N_SPECIALTIES} label={t('counters.professions')}
          icon={<GraduationCap className="h-5 w-5 text-white" />} accent="bg-brand-600" />
        <Stat run={inView} value={N_AREAS} label={t('counters.areas')}
          icon={<Compass className="h-5 w-5 text-white" />} accent="bg-sky-600" />
        <Stat run={inView} value={N_CONDITIONS} label={t('counters.conditions')}
          icon={<Stethoscope className="h-5 w-5 text-white" />} accent="bg-violet-600" />
        <Stat run={inView} value={N_STORE_CATS} label={t('counters.storeCats')}
          icon={<ShoppingBag className="h-5 w-5 text-white" />} accent="bg-amber-500" />
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-muted">{t('counters.source')}</p>
    </div>
  );
}
