/**
 * AdminExemptions — bandeja de exenciones de cuota.
 *
 * Trae lo que exige decisión: solicitudes sin resolver y exenciones que vencen
 * dentro de 60 días o que ya vencieron. Aprobar renueva por doce meses; para
 * una entidad pública o una empresa inclusiva la exención no caduca.
 *
 * El criterio no lo pone el administrador a ojo: la organización acredita su
 * condición con el padrón de donatarias del SAT o con su CLUNI, y el documento
 * cargado se abre desde aquí con un enlace firmado de cinco minutos.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, FileText, X } from 'lucide-react';
import { Button, EmptyState, SkeletonCard, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Fila = {
  id: string; email: string | null; nombre: string | null;
  sector: string | null; provider_type: string | null;
  tipo: string | null; folio: string | null; documento: string | null;
  solicitada_en: string | null; aprobada_en: string | null;
  vigente_hasta: string | null; dias: number | null;
  estado: string; rechazo: string | null;
};

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

const COLOR: Record<string, string> = {
  pendiente: 'bg-sky-100 text-sky-800',
  vencida: 'bg-red-100 text-red-800',
  'por vencer': 'bg-amber-100 text-amber-900',
  vigente: 'bg-emerald-100 text-emerald-800',
};

export function AdminExemptions() {
  const { t } = useTranslation();
  const toast = useToast();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [todas, setTodas] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setFilas(null);
    const { data, error } = await (supabase as unknown as Rpc)
      .rpc('admin_exenciones', { p_estado: todas ? 'todas' : 'pendientes' });
    if (error) { toast.error(error.message); setFilas([]); return; }
    setFilas((data as Fila[]) ?? []);
  }, [todas, toast]);

  useEffect(() => { void cargar(); }, [cargar]);

  async function resolver(f: Fila, aprobar: boolean) {
    const nota = aprobar
      ? window.prompt(t('adm.exe.noteApprove'), '') ?? ''
      : window.prompt(t('adm.exe.noteReject'), '');
    if (!aprobar && nota === null) return;
    setOcupado(f.id);
    const { error } = await (supabase as unknown as Rpc).rpc('admin_exencion_resolver', {
      p_user: f.id, p_aprobar: aprobar, p_nota: nota, p_meses: 12,
    });
    setOcupado(null);
    if (error) { toast.error(error.message); return; }
    toast.success(aprobar ? t('adm.exe.approved') : t('adm.exe.rejectedOk'));
    void cargar();
  }

  async function abrirDoc(path: string) {
    const { data } = await supabase.storage.from('verification').createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
    else toast.error(t('adm.exe.docError'));
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t('adm.exe.title')}</h2>
          <p className="text-sm text-muted">{t('adm.exe.desc')}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)}
                 className="h-4 w-4 rounded border-slate-300" />
          {t('adm.exe.showAll')}
        </label>
      </div>

      {filas === null ? (
        <SkeletonCard rows={3} />
      ) : filas.length === 0 ? (
        <EmptyState title={t('adm.exe.empty')} description={t('adm.exe.emptyDesc')} />
      ) : (
        <ul className="space-y-3">
          {filas.map((f) => (
            <li key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{f.nombre ?? f.email ?? f.id}</p>
                  <p className="text-sm text-muted">{f.email}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {t('adm.exe.line', {
                      tipo: f.tipo ?? '—',
                      folio: f.folio ?? '—',
                      sector: f.sector ?? '—',
                    })}
                  </p>
                  {f.vigente_hasta && (
                    <p className="text-sm text-slate-700">
                      {t('adm.exe.until', {
                        fecha: new Date(f.vigente_hasta).toLocaleDateString(),
                        dias: f.dias ?? 0,
                      })}
                    </p>
                  )}
                  {f.rechazo && <p className="text-sm text-red-700">{f.rechazo}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COLOR[f.estado] ?? 'bg-slate-100 text-slate-700'}`}>
                  {f.estado}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {f.documento && (
                  <Button size="sm" variant="secondary"
                          leadingIcon={<FileText className="h-4 w-4" aria-hidden="true" />}
                          onClick={() => void abrirDoc(f.documento!)}>
                    {t('adm.exe.openDoc')}
                  </Button>
                )}
                <Button size="sm" loading={ocupado === f.id}
                        leadingIcon={<Check className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => void resolver(f, true)}>
                  {t('adm.exe.approve')}
                </Button>
                <Button size="sm" variant="danger" loading={ocupado === f.id}
                        leadingIcon={<X className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => void resolver(f, false)}>
                  {t('adm.exe.reject')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
