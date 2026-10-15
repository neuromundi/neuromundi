/**
 * MisPagos — todo el dinero de una persona en un solo lugar: su cuota de
 * membresía, sus donativos y las comisiones que ha ganado por recomendar.
 *
 * Por qué existe (15 oct 2026): tras el primer pago real, no había en ninguna
 * parte de la plataforma la constancia de lo que una persona había pagado. Cada
 * cosa vivía en una tabla distinta y ninguna se mostraba.
 *
 * Lee de mis_pagos() (migración 0228), que une los tres orígenes.
 */
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Receipt, Heart, Gift, CheckCircle2, RotateCcw, Clock } from 'lucide-react';
import { Button, SkeletonCard, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Tipo = 'cuota' | 'donativo' | 'comision';

interface Movimiento {
  tipo: Tipo;
  concepto: string | null;
  monto_cents: number;
  currency: string | null;
  fecha: string | null;
  estado: string | null;
  referencia: string | null;
}

const money = (cents: number, cur?: string | null) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: (cur || 'mxn').toUpperCase(), maximumFractionDigits: 2,
  }).format((cents ?? 0) / 100);

const fecha = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date(iso))
    : '—';

const ICONO: Record<Tipo, React.ReactNode> = {
  cuota: <Receipt className="h-5 w-5" aria-hidden="true" />,
  donativo: <Heart className="h-5 w-5" aria-hidden="true" />,
  comision: <Gift className="h-5 w-5" aria-hidden="true" />,
};

// Cada tipo con su color propio, para distinguirlos de un vistazo.
const TONO: Record<Tipo, string> = {
  cuota: 'border-brand-200 bg-brand-50 text-brand-800',
  donativo: 'border-warm-200 bg-warm-50 text-warm-800',
  comision: 'border-sage-200 bg-sage-50 text-sage-800',
};

export function MisPagos() {
  const { t } = useTranslation();
  const [filas, setFilas] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [falla, setFalla] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase.rpc('mis_pagos');
    setFalla(!!error);
    setFilas(error ? [] : ((data as Movimiento[] | null) ?? []));
    setCargando(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  // Totales por tipo, solo de lo vigente: lo devuelto o revertido no suma.
  const vigente = (f: Movimiento) => f.estado !== 'refunded' && f.estado !== 'revertida';
  const totalDe = (tipo: Tipo) =>
    filas.filter((f) => f.tipo === tipo && vigente(f))
         .reduce((n, f) => n + (f.monto_cents ?? 0), 0);
  const monedaDe = (tipo: Tipo) => filas.find((f) => f.tipo === tipo)?.currency ?? 'mxn';

  const etiquetaEstado = (f: Movimiento) => {
    if (f.estado === 'refunded') return t('mispagos.devuelto');
    if (f.estado === 'revertida') return t('mispagos.revertida');
    if (f.estado === 'devengada') return t('mispagos.porCobrar');
    if (f.estado === 'pagada') return t('mispagos.cobrada');
    return t('mispagos.pagado');
  };

  const estadoIcono = (f: Movimiento) => {
    if (f.estado === 'refunded' || f.estado === 'revertida') {
      return <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />;
    }
    if (f.estado === 'devengada') return <Clock className="h-3.5 w-3.5" aria-hidden="true" />;
    return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />;
  };

  if (cargando) return <SkeletonCard />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">{t('mispagos.title')}</h2>
        <Button size="sm" variant="secondary" onClick={() => void cargar()}
                leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('mispagos.refresh')}
        </Button>
      </div>

      <p className="text-sm text-muted">{t('mispagos.help')}</p>

      {falla ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted">
          {t('mispagos.unavailable')}
        </p>
      ) : filas.length === 0 ? (
        <EmptyState icon={<Receipt className="h-6 w-6" />}
                    title={t('mispagos.vacioTitle')}
                    description={t('mispagos.vacio')} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['cuota', 'donativo', 'comision'] as Tipo[]).map((tipo) => (
              <div key={tipo} className={`rounded-2xl border p-4 ${TONO[tipo]}`}>
                {ICONO[tipo]}
                <p className="mt-2 text-xl font-extrabold tabular-nums">
                  {money(totalDe(tipo), monedaDe(tipo))}
                </p>
                <p className="text-xs opacity-80">{t(`mispagos.total.${tipo}`)}</p>
              </div>
            ))}
          </div>

          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm">
            {filas.map((f, i) => (
              <li key={`${f.referencia ?? 'x'}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${TONO[f.tipo]}`}>
                    {ICONO[f.tipo]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {t(`mispagos.tipo.${f.tipo}`)}
                      {f.concepto ? <span className="font-normal text-muted"> · {f.concepto}</span> : null}
                    </p>
                    <p className="text-xs text-muted">{fecha(f.fecha)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold tabular-nums ${
                    f.estado === 'refunded' || f.estado === 'revertida'
                      ? 'text-slate-400 line-through'
                      : 'text-slate-900'
                  }`}>
                    {money(f.monto_cents, f.currency)}
                  </p>
                  <p className="flex items-center justify-end gap-1 text-xs text-muted">
                    {estadoIcono(f)}{etiquetaEstado(f)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted">{t('mispagos.nota')}</p>
        </>
      )}
    </div>
  );
}
