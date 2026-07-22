/**
 * FeesCsvPanel — descarga y carga masiva de las cuotas por país en CSV.
 *
 * Flujo pensado para no equivocarse con dinero:
 *  1. Descargas el CSV con lo que hay hoy (o la plantilla si aún no hay nada).
 *  2. Lo editas en Excel o Google Sheets.
 *  3. Lo subes: primero se VALIDA y se muestra un resumen con los errores por
 *     número de línea. Nada se guarda hasta que confirmas.
 *  4. Eliges si quieres mezclar (agregar/actualizar) o reemplazar todo.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import {
  parseCsv,
  toCsv,
  templateCsv,
  FEE_CSV_HEADERS,
  type FeeCsvRow,
  type FeeCsvError,
} from '@/lib/feesCsv';
import { cn } from '@/lib/utils';

interface ExportRow {
  country_label: string;
  affiliate_type: string;
  member_class: string;
  currency: string;
  monthly_amount: number | null;
  annual_amount: number | null;
  annual_list_amount: number | null;
  zero_decimal: boolean;
}

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

export function FeesCsvPanel({ onImported }: { onImported: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<FeeCsvRow[] | null>(null);
  const [errors, setErrors] = useState<FeeCsvError[]>([]);
  const [replace, setReplace] = useState(false);

  const onExport = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_export_membership_prices');
    setBusy(false);
    if (error) { toast.error(t('csv.exportError')); return; }
    const rows = (data as ExportRow[]) ?? [];
    if (rows.length === 0) {
      descargar('neuromundi-cuotas-plantilla.csv', templateCsv());
      toast.success(t('csv.templateDownloaded'));
      return;
    }
    const csv = toCsv(
      rows.map((r) => ({
        pais: r.country_label,
        tipo: r.affiliate_type as FeeCsvRow['tipo'],
        clase: r.member_class as FeeCsvRow['clase'],
        moneda: r.currency,
        mensual: Number(r.monthly_amount ?? 0),
        anual: Number(r.annual_amount ?? 0),
        anual_referencia: Number(r.annual_list_amount ?? 0),
        sin_centavos: r.zero_decimal,
      })),
    );
    const hoy = new Date().toISOString().slice(0, 10);
    descargar(`neuromundi-cuotas-${hoy}.csv`, csv);
    toast.success(t('csv.exported', { count: rows.length }));
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { rows, errors: errs } = parseCsv(text);
    setPending(rows);
    setErrors(errs);
    e.target.value = '';
    if (rows.length === 0 && errs.length > 0) toast.error(t('csv.allInvalid'));
  };

  const onConfirm = async () => {
    if (!pending || pending.length === 0) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_import_membership_prices', {
      p_rows: pending as unknown as never,
      p_replace: replace,
    });
    setBusy(false);
    if (error) { toast.error(t('csv.importError')); return; }
    const r = data as { ok?: boolean; inserted?: number; updated?: number; deleted?: number };
    if (!r?.ok) { toast.error(t('csv.importError')); return; }
    toast.success(
      t('csv.imported', {
        inserted: r.inserted ?? 0,
        updated: r.updated ?? 0,
        deleted: r.deleted ?? 0,
      }),
    );
    setPending(null);
    setErrors([]);
    onImported();
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-100 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <FileSpreadsheet className="h-4 w-4 text-brand-600" aria-hidden="true" /> {t('csv.title')}
      </h3>
      <p className="text-xs text-muted">{t('csv.hint')}</p>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" loading={busy} onClick={onExport} leadingIcon={<Download className="h-4 w-4" />}>
          {t('csv.download')}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} leadingIcon={<Upload className="h-4 w-4" />}>
          {t('csv.upload')}
        </Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onPick} className="hidden" />
      </div>

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-700">
          {t('csv.formatTitle')}
        </summary>
        <p className="mt-2 text-xs text-slate-600">{t('csv.formatBody')}</p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-2 text-[11px] text-slate-700">
{FEE_CSV_HEADERS.join(';')}
{'\n'}México;medical_specialist;founder;MXN;1000;10000;12000;no
{'\n'}México;medical_specialist;ordinary;MXN;1500;15000;18000;no
        </pre>
        <p className="mt-2 text-xs text-muted">{t('csv.formatNote')}</p>
      </details>

      {/* Vista previa antes de guardar */}
      {(pending !== null || errors.length > 0) && (
        <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">
              {t('csv.previewTitle', { count: pending?.length ?? 0 })}
            </p>
            <button
              type="button"
              onClick={() => { setPending(null); setErrors([]); }}
              aria-label={t('common.cancel')}
              className="text-slate-500 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg border border-warm-300 bg-warm-50 p-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-warm-800">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {t('csv.errorsTitle', { count: errors.length })}
              </p>
              <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-xs text-warm-900">
                {errors.slice(0, 30).map((e, i) => (
                  <li key={i}>
                    {t('csv.line')} {e.linea}: {e.motivo}
                  </li>
                ))}
                {errors.length > 30 && <li className="text-muted">…</li>}
              </ul>
              <p className="mt-1 text-[11px] text-warm-800">{t('csv.errorsNote')}</p>
            </div>
          )}

          {pending && pending.length > 0 && (
            <>
              <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-1.5">{t('fees.country')}</th>
                      <th className="p-1.5">{t('csv.colType')}</th>
                      <th className="p-1.5">{t('csv.colClass')}</th>
                      <th className="p-1.5 text-right">{t('fees.monthly')}</th>
                      <th className="p-1.5 text-right">{t('fees.annual')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="p-1.5 capitalize">{r.pais}</td>
                        <td className="p-1.5">{r.tipo}</td>
                        <td className="p-1.5">{r.clase}</td>
                        <td className="p-1.5 text-right">{r.mensual.toLocaleString()} {r.moneda}</td>
                        <td className="p-1.5 text-right">{r.anual.toLocaleString()} {r.moneda}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={replace}
                  onChange={(e) => setReplace(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className={cn('font-semibold', replace && 'text-evs-1')}>{t('csv.replaceLabel')}</span>
                  <span className="block text-muted">{t('csv.replaceHint')}</span>
                </span>
              </label>

              <Button size="sm" loading={busy} onClick={onConfirm} leadingIcon={<CheckCircle2 className="h-4 w-4" />}>
                {t('csv.confirm', { count: pending.length })}
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
