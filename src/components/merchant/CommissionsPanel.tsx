/**
 * CommissionsPanel — administración de las comisiones de promoción.
 *
 * Dos pestañas, porque el mismo miembro suele estar en los dos lados:
 *  · "Me deben"  → lo que ha ganado promoviendo productos de otros.
 *  · "Yo debo"   → lo que debe a quienes promueven los suyos, con el botón para
 *                  marcar la liquidación.
 *
 * La plataforma NO mueve el dinero. El vendedor le paga al promotor por el medio
 * que quiera y aquí registra que lo hizo; el promotor recibe el aviso en su
 * campana. Por eso el botón dice "registrar pago" y no "pagar": prometer un pago
 * que la app no ejecuta sería mentirle al usuario.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HandCoins, Download, Check, AlertTriangle, Wallet } from 'lucide-react';
import { Button, SkeletonCard, EmptyState, useToast } from '@/components/ui';
import { useCommissions, type CommissionSide } from '@/hooks/useCommissions';
import {
  summarize,
  groupByCounterpart,
  formatAmount,
  folio,
  commissionsCsv,
  type CommissionRow,
} from '@/lib/commissions';
import { formatDate, cn } from '@/lib/utils';

function descargar(nombre: string, contenido: string) {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const CHIP: Record<CommissionRow['status'], string> = {
  payable: 'bg-warm-50 text-warm-800',
  paid: 'bg-sage-50 text-sage-700',
  reversed: 'bg-slate-100 text-muted',
};

/** Detalle de una comisión suelta. */
function RowLine({ r }: { r: CommissionRow }) {
  const { t, i18n } = useTranslation();
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-1.5 text-xs">
      <span className="min-w-0 flex-1 truncate text-slate-700">
        {formatDate(r.created_at)} · {r.product_name ?? '—'}
      </span>
      <span className="font-semibold text-slate-900">
        {formatAmount(r.amount_cents, r.currency, i18n.language)}
      </span>
      <span className={cn('rounded-full px-2 py-0.5 font-medium', CHIP[r.status])}>
        {t(`comm.status.${r.status}`)}
      </span>
      {r.refund_after_payment && (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          {t('comm.refundAfterPaid')}
        </span>
      )}
    </li>
  );
}

function Side({ side }: { side: CommissionSide }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { rows, loading, markPaid } = useCommissions(side);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => summarize(rows), [rows]);
  const groups = useMemo(() => groupByCounterpart(rows), [rows]);

  if (loading) return <SkeletonCard rows={3} />;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<HandCoins className="h-6 w-6" />}
        title={t(side === 'earned' ? 'comm.emptyEarnedTitle' : 'comm.emptyOwedTitle')}
        description={t(side === 'earned' ? 'comm.emptyEarned' : 'comm.emptyOwed')}
      />
    );
  }

  const onPay = async (ids: string[]) => {
    setBusy(true);
    const r = await markPaid(ids, note);
    setBusy(false);
    if (r.ok) {
      toast.success(t('comm.marked', { count: r.updated }));
      setOpen(null);
      setNote('');
    } else {
      toast.error(t('comm.markError'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Totales por moneda: sumar monedas distintas daría un número sin sentido. */}
      <div className="grid gap-2 sm:grid-cols-2">
        {totals.map((tt) => (
          <div key={tt.currency} className="rounded-2xl border border-slate-100 p-3">
            <p className="text-xs text-muted">
              {t(side === 'earned' ? 'comm.pendingToReceive' : 'comm.pendingToPay')} ·{' '}
              {tt.currency.toUpperCase()}
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {formatAmount(tt.payableCents, tt.currency, i18n.language)}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {t('comm.alreadySettled')}: {formatAmount(tt.paidCents, tt.currency, i18n.language)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={<Download className="h-4 w-4" />}
          onClick={() => {
            const hoy = new Date().toISOString().slice(0, 10);
            descargar(`neuromundi-comisiones-${side}-${hoy}.csv`, commissionsCsv(rows));
          }}
        >
          {t('comm.download')}
        </Button>
      </div>

      <ul className="space-y-2">
        {groups.map((g) => (
          <li key={`${g.id}-${g.currency}`} className="rounded-2xl border border-slate-100 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {g.name} <span className="font-mono text-xs font-normal text-muted">{folio(g.memberNo)}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {t('comm.pending')}:{' '}
                  <span className="font-semibold text-slate-900">
                    {formatAmount(g.payableCents, g.currency, i18n.language)}
                  </span>
                  {' · '}
                  {t('comm.settled')}: {formatAmount(g.paidCents, g.currency, i18n.language)}
                </p>
              </div>

              {side === 'owed' && g.payableIds.length > 0 && (
                <Button
                  size="sm"
                  leadingIcon={<Check className="h-4 w-4" />}
                  onClick={() => setOpen(open === `${g.id}-${g.currency}` ? null : `${g.id}-${g.currency}`)}
                >
                  {t('comm.registerPayment')}
                </Button>
              )}
            </div>

            {/* Confirmación con nota: el número de transferencia o el medio de
                pago es lo que después permite aclarar una discrepancia. */}
            {open === `${g.id}-${g.currency}` && (
              <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
                <p className="text-xs text-slate-700">
                  {t('comm.confirmBody', {
                    amount: formatAmount(g.payableCents, g.currency, i18n.language),
                    name: g.name,
                  })}
                </p>
                <label className="mt-2 block text-[11px] font-semibold text-slate-700">
                  {t('comm.noteLabel')}
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('comm.notePlaceholder')}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" loading={busy} onClick={() => void onPay(g.payableIds)}>
                    {t('comm.confirm')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}

            <ul className="mt-2">
              {g.rows.map((r) => (
                <RowLine key={r.id} r={r} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CommissionsPanel() {
  const { t } = useTranslation();
  const [side, setSide] = useState<CommissionSide>('earned');

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <Wallet className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('comm.title')}
      </h3>
      <p className="mt-1 text-sm text-muted">{t('comm.help')}</p>

      <div className="mt-3 flex gap-1" role="tablist">
        {(['earned', 'owed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={side === s}
            onClick={() => setSide(s)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium',
              side === s
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50',
            )}
          >
            {t(s === 'earned' ? 'comm.tabEarned' : 'comm.tabOwed')}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Side key={side} side={side} />
      </div>
    </section>
  );
}
