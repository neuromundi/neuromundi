/**
 * AdminSurvey — resultados AGREGADOS de la Primera Encuesta Internacional.
 * Lee `survey_results()` (RPC solo-admin, conteos agregados) y ofrece descargar
 * las respuestas en CSV (SELECT permitido a admin por RLS). No expone PII: las
 * respuestas son anónimas por diseño.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Agg = {
  total: number;
  by_role: Record<string, number>;
  by_country: Record<string, number>;
  by_section: Record<string, number>;
};

// La tabla/RPC son nuevas y no están en los tipos generados: cliente casteado.
const db = supabase as unknown as {
  rpc: (fn: string) => Promise<{ data: unknown; error: unknown }>;
  from: (t: string) => { select: (c: string) => Promise<{ data: unknown; error: unknown }> };
};

function Bars({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map((e) => e[1]));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-sm font-bold text-slate-800">{title}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Sin datos aún.</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(([k, n]) => (
            <div key={k} className="flex items-center gap-2 text-sm">
              <span className="w-40 shrink-0 truncate text-slate-600">{k}</span>
              <span className="h-3 rounded bg-brand-400" style={{ width: `${(n / max) * 55}%` }} />
              <span className="font-semibold text-slate-800">{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSurvey() {
  const [agg, setAgg] = useState<Agg | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await db.rpc('survey_results');
      if (error) { setErr('No se pudieron cargar los resultados.'); return; }
      setAgg(data as Agg);
    })();
  }, []);

  async function exportCsv() {
    setBusy(true);
    const { data, error } = await db.from('survey_responses').select('*');
    setBusy(false);
    if (error || !Array.isArray(data)) { setErr('No se pudo exportar.'); return; }
    const rows = data as Record<string, unknown>[];
    if (rows.length === 0) { setErr('Aún no hay respuestas.'); return; }
    const cols = ['created_at', 'lang', 'role', 'country', 'sections', 'consent', 'answers'];
    const esc = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const csv = [cols.join(',')]
      .concat(rows.map((r) => cols.map((c) => esc(typeof r[c] === 'object' ? JSON.stringify(r[c]) : r[c])).join(',')))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `encuesta-neuromundi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (err) return <p className="text-sm font-semibold text-red-600">{err}</p>;
  if (!agg) return <p className="text-sm text-muted">Cargando resultados…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <p className="text-sm text-brand-800">Respuestas totales</p>
        <p className="text-3xl font-extrabold text-brand-800">{agg.total}</p>
      </div>
      <Bars title="Por rol" data={agg.by_role} />
      <Bars title="Por sección" data={agg.by_section} />
      <Bars title="Por país" data={agg.by_country} />
      <button
        type="button"
        onClick={exportCsv}
        disabled={busy}
        className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? 'Exportando…' : 'Descargar respuestas (CSV)'}
      </button>
    </div>
  );
}
