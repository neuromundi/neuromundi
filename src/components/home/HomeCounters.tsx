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
import { Globe2, Sprout, Sparkles, Stethoscope, GraduationCap, Compass } from 'lucide-react';
import { COUNTRIES } from '@/data/countries';
import { PROFESSIONS, SPECIALTIES, INTERVENTION_AREAS } from '@/data/specialistCatalog';
import { NEURO_CONDITIONS } from '@/data/neuroConditionsCatalog';
import { useInView } from '@/hooks/useInView';

const N_COUNTRIES = COUNTRIES.length;
const N_SPECIALTIES = PROFESSIONS.length + SPECIALTIES.length;
const N_AREAS = INTERVENTION_AREAS.length;
const N_CONDITIONS = NEURO_CONDITIONS.length;

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
    <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
      <span className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>{icon}</span>
      <p className="text-2xl font-extrabold text-slate-900">
        {n.toLocaleString()}{suffix ? <span className="text-base font-bold text-slate-500"> {suffix}</span> : null}
      </p>
      <p className="mt-1 text-xs font-semibold leading-snug text-slate-800">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-snug text-muted">{sub}</p>}
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
        sub={t('counters.countriesSub')}
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

      {/* Catálogo */}
      <h3 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{t('counters.catTitle')}</h3>
      <div className="grid grid-cols-3 gap-2.5">
        <Stat run={inView} value={N_SPECIALTIES} label={t('counters.professions')}
          icon={<GraduationCap className="h-5 w-5 text-white" />} accent="bg-brand-600" />
        <Stat run={inView} value={N_AREAS} label={t('counters.areas')}
          icon={<Compass className="h-5 w-5 text-white" />} accent="bg-sky-600" />
        <Stat run={inView} value={N_CONDITIONS} label={t('counters.conditions')}
          icon={<Stethoscope className="h-5 w-5 text-white" />} accent="bg-violet-600" />
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-muted">{t('counters.source')}</p>
    </div>
  );
}
