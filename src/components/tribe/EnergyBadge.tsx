/**
 * EnergyBadge / EnergyPicker — "semáforo de energía social" de la Tribu.
 * Verde = abierto a charlar · Amarillo = solo si me hablan · Rojo = baja energía,
 * hoy solo escucho/observo. Sin presión: es una etiqueta de estado, no un juicio.
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { TribeEnergy } from '@/hooks/useTribe';

const DOT: Record<TribeEnergy, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-rose-500',
};
const RING: Record<TribeEnergy, string> = {
  green: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  yellow: 'border-amber-400 bg-amber-50 text-amber-700',
  red: 'border-rose-500 bg-rose-50 text-rose-700',
};
const ORDER: TribeEnergy[] = ['green', 'yellow', 'red'];

export function EnergyDot({ energy, className }: { energy: TribeEnergy; className?: string }) {
  return <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', DOT[energy], className)} aria-hidden="true" />;
}

export function EnergyPicker({ value, onChange }: { value: TribeEnergy; onChange: (e: TribeEnergy) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      {ORDER.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          aria-pressed={value === e}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm',
            value === e ? RING[e] : 'border-slate-200 text-slate-700 hover:bg-slate-50',
          )}
        >
          <EnergyDot energy={e} />
          <span className="font-semibold">{t(`tribe.energy.${e}.label`)}</span>
          <span className="text-xs text-muted">— {t(`tribe.energy.${e}.desc`)}</span>
        </button>
      ))}
    </div>
  );
}
