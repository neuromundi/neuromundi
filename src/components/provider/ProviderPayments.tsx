/**
 * ProviderPayments — Fase 3:
 *  - Conectar Stripe (Connect) y ver el estado.
 *  - Definir si acepta pagos y el precio por consulta.
 *  - Reporte diario con el RFC de los pagadores (exportable a CSV).
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, CheckCircle2, Download } from 'lucide-react';
import { Button, SkeletonCard, useToast, HowTo} from '@/components/ui';
import { useProviderPayments, type BillingRow } from '@/hooks/usePayments';

const input = 'rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

function toCsv(rows: BillingRow[]): string {
  const head = ['Pagador', 'RFC', 'Importe', 'Moneda', 'Tipo', 'Fecha'];
  const body = rows.map((r) => [r.payer_name, r.payer_rfc, r.amount, r.currency, r.kind, r.paid_at]);
  return [head, ...body].map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function ProviderPayments() {
  const { t } = useTranslation();
  const toast = useToast();
  const { settings, report, loading, startConnect, saveSettings } = useProviderPayments();

  const [accepts, setAccepts] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('MXN');

  useEffect(() => {
    if (settings) {
      setAccepts(settings.accepts_payments);
      setAmount(settings.consultation_amount != null ? String(settings.consultation_amount) : '');
      setCurrency(settings.consultation_currency ?? 'MXN');
    }
  }, [settings]);

  if (loading || !settings) return <SkeletonCard rows={4} />;

  const ready = settings.stripe_charges_enabled && !!settings.stripe_connect_id;

  const onSave = async () => {
    const res = await saveSettings({
      accepts_payments: accepts,
      consultation_amount: amount === '' ? null : Number(amount),
      consultation_currency: currency.trim().toUpperCase() || null,
    });
    toast[res.ok ? 'success' : 'error'](res.ok ? t('pay.saved') : res.error);
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(report)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facturacion-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <HowTo stepsKey="howto.payments" />
      {/* Conexión Stripe */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-900">{t('pay.settingsTitle')}</h2>
        <p className="mb-3 text-sm text-muted">{t('pay.connectHelp')}</p>
        {ready ? (
          <p className="flex items-center gap-2 text-sm font-medium text-evs-5">
            <CheckCircle2 className="h-5 w-5" /> {t('pay.connected')}
          </p>
        ) : (
          <Button onClick={async () => { const r = await startConnect(); if (!r.ok) toast.error(r.error); }} leadingIcon={<CreditCard className="h-4 w-4" />}>
            {settings.stripe_connect_id ? t('pay.pending') : t('pay.connect')}
          </Button>
        )}
      </section>

      {/* Ajustes de cobro */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={accepts} onChange={(e) => setAccepts(e.target.checked)} />
          {t('pay.accepts')}
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-900">{t('pay.price')}</label>
            <input type="number" min={0} step="0.01" className={`${input} w-full`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-900">{t('pay.currency')}</label>
            <input className={`${input} w-full`} value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
        </div>
        {!ready && <p className="mt-2 text-xs text-warm-800">{t('pay.notReady')}</p>}
        <div className="mt-3">
          <Button size="sm" onClick={onSave}>{t('pay.save')}</Button>
        </div>
      </section>

      {/* Reporte diario con RFC */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-900">{t('pay.reportTitle')}</h2>
        {report.length === 0 ? (
          <p className="text-sm text-muted">{t('pay.reportEmpty')}</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-700">{t('pay.reportSummary', { count: report.length })}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-muted">
                    <th className="py-1 pr-3">{t('pay.colPayer')}</th>
                    <th className="py-1 pr-3">{t('pay.colRfc')}</th>
                    <th className="py-1 pr-3">{t('pay.colAmount')}</th>
                    <th className="py-1">{t('pay.colKind')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1.5 pr-3">{r.payer_name}</td>
                      <td className="py-1.5 pr-3 font-mono text-xs">{r.payer_rfc || '—'}</td>
                      <td className="py-1.5 pr-3">{r.amount} {r.currency}</td>
                      <td className="py-1.5">{t(r.kind === 'therapy' ? 'pay.kindTherapy' : 'pay.kindConsultation')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <Button size="sm" variant="secondary" onClick={exportCsv} leadingIcon={<Download className="h-4 w-4" />}>
                {t('pay.exportCsv')}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
