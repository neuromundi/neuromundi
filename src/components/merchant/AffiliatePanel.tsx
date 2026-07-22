/**
 * AffiliatePanel — el especialista crea su código de afiliado, copia su enlace y
 * administra las comisiones de quienes promueven sus productos.
 *
 * El pago del dinero ocurre FUERA de la app (la plataforma no retiene nada); lo
 * que vive aquí es el libro: quién le debe a quién y qué se ha liquidado. Esa
 * parte está en CommissionsPanel.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Copy, Check } from 'lucide-react';
import { Button, SkeletonCard, useToast, HowTo} from '@/components/ui';
import { useAffiliate } from '@/hooks/useShop';
import { CommissionsPanel } from './CommissionsPanel';

const input = 'rounded-lg border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function AffiliatePanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const { code, earnings, loading, createCode } = useAffiliate();
  const [desired, setDesired] = useState('');
  const [pct, setPct] = useState('10');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (code) { setDesired(code.code); setPct(String(code.commission_pct)); }
  }, [code]);

  if (loading) return <SkeletonCard rows={3} />;

  const link = code ? `${window.location.origin}/tienda?ref=${code.code}` : '';

  return (
    <div className="space-y-6">
      <HowTo stepsKey="howto.affiliate" />
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-1 font-semibold text-slate-900">{t('affil.title')}</h3>
        <p className="mb-3 text-sm text-muted">{t('affil.help')}</p>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">{t('affil.code')}</label>
            <input className={`${input} uppercase`} value={desired} onChange={(e) => setDesired(e.target.value)} placeholder="MICODIGO" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">{t('affil.commission')}</label>
            <input type="number" min={0} max={100} step="0.5" className={`${input} w-24`} value={pct} onChange={(e) => setPct(e.target.value)} />
          </div>
          <Button size="sm" onClick={async () => { const r = await createCode(desired, Number(pct)); toast[r.ok ? 'success' : 'error'](r.ok ? t('affil.created') : r.error); }}>
            {t('affil.create')}
          </Button>
        </div>

        {code ? (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-slate-700">{t('affil.yourLink')}</label>
            <div className="flex items-center gap-2">
              <input readOnly className={`${input} flex-1`} value={link} />
              <Button size="sm" variant="secondary" leadingIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? t('affil.copied') : t('affil.copy')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">{t('affil.noCode')}</p>
        )}
      </section>

      {/* Resumen histórico rápido; el detalle y la liquidación van abajo. */}
      {earnings.length > 0 && (
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-brand-600" />
            <h3 className="font-semibold text-slate-900">{t('affil.earned')}</h3>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {earnings.map((e, i) => (
              <li key={i} className="flex justify-between">
                <span className="text-muted">{t('affil.sales')}: {e.sales}</span>
                <span className="font-semibold text-slate-900">{(e.commission_cents_total / 100).toLocaleString()} {e.currency.toUpperCase()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Libro de comisiones: lo que me deben y lo que debo. */}
      <CommissionsPanel />
    </div>
  );
}
