/**
 * AdminComisiones — libro de comisiones por referido sobre pagos de membresía.
 *
 * Por qué existe (14 oct 2026): el programa anterior daba descuento sobre la
 * cuota propia, lo que deja fuera a los perfiles gratuitos — ofrecerle 5% de
 * descuento a quien paga cero es ofrecerle cero. Ahora se devenga dinero por
 * cada pago de un referido (migraciones 0210 y 0210b).
 *
 * Esta pantalla NO paga: muestra lo que se debe y permite dejar constancia de
 * que ya se pagó. La dispersión automática queda para cuando haya volumen que
 * la justifique; hoy hay 0 perfiles con cuenta de cobro configurada.
 */
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Banknote, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, CalendarCheck } from 'lucide-react';
import { Button, SkeletonCard } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { montoLegible } from '@/lib/commissions';

interface Fila {
  referrer_id: string;
  referidor: string | null;
  correo: string | null;
  referidor_vigente: boolean;
  cuenta_de_cobro: boolean;
  metodo_cobro: string | null;
  cuenta_titular: string | null;
  cuenta_contacto: string | null;
  comisiones: number;
  referidos: number;
  monto_cents: number;
  currency: string | null;
  umbral_cents: number | null;
  alcanza_umbral: boolean | null;
  primera: string | null;
  ultima: string | null;
}

interface Detalle {
  id: string;
  referido: string | null;
  es_primer_pago: boolean;
  base_cents: number;
  comision_pct: number;
  amount_cents: number;
  currency: string;
  status: string;
  creada_en: string;
  pagada_en: string | null;
  pagada_nota: string | null;
}

const ESTADOS = ['devengada', 'pagada', 'revertida', 'todas'] as const;

// Las monedas sin decimales se dividian entre 100 igual que el resto.
const money = montoLegible;

// Nombre legible del método de cobro declarado por el referidor.
const metodoLabel = (m: string | null, t: (k: string) => string) => {
  switch (m) {
    case 'stripe': return t('recommend.payout.mStripe');
    case 'transferencia': return t('recommend.payout.mTransfer');
    case 'paypal': return t('recommend.payout.mPaypal');
    case 'otro': return t('recommend.payout.mOther');
    default: return t('comisiones.conCuenta');
  }
};

const fecha = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(iso)) : '—';

export function AdminComisiones() {
  const { t } = useTranslation();
  const toast = useToast();
  const [estado, setEstado] = useState<string>('devengada');
  const [rows, setRows] = useState<Fila[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Detalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [falloDetalle, setFalloDetalle] = useState(false);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const load = useCallback(async (e: string) => {
    setLoading(true); setError(false); setAbierta(null);
    const { data, error: err } = await supabase.rpc('admin_comisiones_membresia', { p_estado: e });
    setLoading(false);
    if (err) { setError(true); return; }
    setRows((data ?? []) as unknown as Fila[]);
  }, []);

  useEffect(() => { void load(estado); }, [load, estado]);

  const abrir = async (id: string) => {
    if (abierta === id) { setAbierta(null); return; }
    setAbierta(id);
    setFalloDetalle(false);
    const { data, error: err } = await supabase.rpc('admin_comisiones_detalle', { p_referrer: id });
    // El desglose en blanco se leia como «esta comision no tiene renglones», y
    // sobre ese desglose se LIQUIDA dinero. (Repaso adversario, 20 oct 2026.)
    if (err) { setFalloDetalle(true); setDetalle([]); return; }
    setDetalle((data ?? []) as unknown as Detalle[]);
  };

  const liquidar = async (f: Fila) => {
    const nota = window.prompt(t('comisiones.notaPrompt'), '');
    if (nota === null) return;
    setOcupada(f.referrer_id);
    // Se liquida POR MONEDA, y por debajo del minimo hay que confirmarlo: la
    // funcion lanza excepcion salvo que se fuerce. (Hallazgo A-9.)
    const forzar = f.alcanza_umbral === true
      ? false
      : window.confirm(t('comisiones.confirmarBajoUmbral'));
    if (f.alcanza_umbral !== true && !forzar) { setOcupada(null); return; }
    const { error: err } = await supabase.rpc('admin_liquidar_comisiones', {
      p_referrer: f.referrer_id, p_nota: nota || null,
      p_currency: f.currency ?? null, p_forzar: forzar,
    });
    setOcupada(null);
    // Devuelve cuantas filas liquido; 0 es un resultado valido, no un fallo.
    if (err) { toast.error(err.message ?? t('common.errorGeneric')); return; }
    toast.success(t('comisiones.liquidadas'));
    void load(estado);
  };

  // NO SE SUMAN MONEDAS DISTINTAS. Antes se sumaban todos los montos y el
  // resultado se rotulaba con la moneda de la primera fila: ocho pesos mas
  // diecinueve dolares daban "27" en pesos. Ahora un total por moneda.
  const totalesPorMoneda = rows.reduce<Record<string, number>>((acc, r) => {
    const m = (r.currency ?? 'mxn').toLowerCase();
    acc[m] = (acc[m] ?? 0) + (r.monto_cents ?? 0);
    return acc;
  }, {});

  if (loading) return <SkeletonCard rows={3} />;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t('comisiones.title')}</h2>
        <div className="flex items-center gap-2">
          <select
            value={estado}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEstado(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            aria-label={t('comisiones.estado')}
          >
            {ESTADOS.map((e) => <option key={e} value={e}>{t(`comisiones.estados.${e}`)}</option>)}
          </select>
          <Button size="sm" variant="secondary" onClick={() => void load(estado)}
                  leadingIcon={<RefreshCw className="h-4 w-4" />}>
            {t('comisiones.refresh')}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted">{t('comisiones.help')}</p>
      <p className="flex items-center gap-2 text-sm font-medium text-warm-800">
        <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('comisiones.regla')}
      </p>

      {error ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted">
          {t('comisiones.unavailable')}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted">
          {t('comisiones.vacio')}
        </p>
      ) : (
        <>
          {estado === 'devengada' ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <Banknote className="h-5 w-5 text-warm-700" aria-hidden="true" />
              {Object.entries(totalesPorMoneda).map(([m, total]) => (
                <p key={m} className="mt-2 text-2xl font-extrabold text-warm-700 tabular-nums">{money(total, m)}</p>
              ))}
              <p className="text-xs text-muted">{t('comisiones.porPagar', { referidores: rows.length })}</p>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] overflow-hidden rounded-2xl border border-slate-100 bg-white text-sm shadow-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-3 py-2">{t('comisiones.colReferidor')}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t('comisiones.colReferidos')}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t('comisiones.colMonto')}</th>
                  <th scope="col" className="px-3 py-2">{t('comisiones.colSituacion')}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t('comisiones.colAccion')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <>
                    <tr key={f.referrer_id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => void abrir(f.referrer_id)}
                                className="flex items-center gap-1 text-left font-medium text-slate-900 hover:underline">
                          {abierta === f.referrer_id
                            ? <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                          {f.referidor ?? '—'}
                        </button>
                        <span className="block pl-5 text-xs text-muted">{f.correo ?? '—'}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.referidos}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">
                        {money(f.monto_cents, f.currency)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {f.referidor_vigente ? (
                          <span className="flex items-center gap-1 text-sage-700">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />{t('comisiones.vigente')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />{t('comisiones.noVigente')}
                          </span>
                        )}
                        <span className="block text-muted">
                          {f.cuenta_de_cobro
                            ? t('comisiones.cobraPor', { metodo: metodoLabel(f.metodo_cobro, t) })
                            : t('comisiones.sinCuenta')}
                        </span>
                        {f.cuenta_de_cobro && f.cuenta_contacto ? (
                          <>
                            <span className="block text-[11px] text-muted">
                              {f.cuenta_titular ? `${f.cuenta_titular} · ` : ''}{f.cuenta_contacto}
                            </span>
                            {f.metodo_cobro !== 'stripe' ? (
                              <span className="block text-[11px] text-muted">{t('comisiones.pedirDatos')}</span>
                            ) : null}
                          </>
                        ) : null}
                        {f.alcanza_umbral === null ? (
                          <span className="block text-amber-700">
                            {t('comisiones.umbralSinTc', { moneda: f.currency ?? '—' })}
                          </span>
                        ) : f.alcanza_umbral ? (
                          <span className="block text-sage-700">{t('comisiones.umbralOk')}</span>
                        ) : (
                          <span className="block text-amber-700">
                            {t('comisiones.umbralNo', { monto: money(f.umbral_cents ?? 0, f.currency) })}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {estado === 'devengada' ? (
                          <Button size="sm" loading={ocupada === f.referrer_id}
                                  onClick={() => void liquidar(f)}
                                  leadingIcon={<Banknote className="h-4 w-4" />}>
                            {t('comisiones.liquidar')}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                    {abierta === f.referrer_id ? (
                      <tr key={`${f.referrer_id}-d`} className="border-t border-slate-100 bg-slate-50">
                        <td colSpan={5} className="px-3 py-2">
                          <ul className="space-y-1 text-xs text-muted">
                            {falloDetalle && (
                              <li className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900">
                                {t('common.loadFailed')}
                              </li>
                            )}
                            {detalle.map((d) => (
                              <li key={d.id} className="flex flex-wrap justify-between gap-2">
                                <span className="text-slate-900">{d.referido}</span>
                                <span>
                                  {money(d.base_cents, d.currency)} × {d.comision_pct}% ={' '}
                                  <b className="text-slate-900">{money(d.amount_cents, d.currency)}</b>
                                  {' · '}{d.es_primer_pago ? t('comisiones.primerPago') : t('comisiones.renovacion')}
                                  {' · '}{fecha(d.creada_en)}
                                  {d.pagada_en ? ` · ${t('comisiones.pagadaEl')} ${fecha(d.pagada_en)}` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
