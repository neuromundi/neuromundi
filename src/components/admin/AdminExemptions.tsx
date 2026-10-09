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

type OrgDoc = {
  id: string; nombre: string | null; provider_type: string | null; member_no: string | null;
  org_doc_kind: string | null; org_doc_url: string | null; org_doc_submitted_at: string | null;
};

export function AdminExemptions() {
  const { t } = useTranslation();
  const toast = useToast();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [todas, setTodas] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [orgDocs, setOrgDocs] = useState<OrgDoc[] | null>(null);
  const [ocupadoDoc, setOcupadoDoc] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setFilas(null);
    const { data, error } = await (supabase as unknown as Rpc)
      .rpc('admin_exenciones', { p_estado: todas ? 'todas' : 'pendientes' });
    if (error) { toast.error(error.message); setFilas([]); return; }
    setFilas((data as Fila[]) ?? []);
  }, [todas, toast]);

  const cargarDocs = useCallback(async () => {
    setOrgDocs(null);
    const { data, error } = await (supabase as unknown as Rpc).rpc('admin_pending_org_docs');
    if (error) { setOrgDocs([]); return; }
    setOrgDocs((data as OrgDoc[]) ?? []);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { void cargarDocs(); }, [cargarDocs]);

  async function resolverDoc(d: OrgDoc, aprobar: boolean) {
    const nota = aprobar ? '' : (window.prompt(t('adm.orgdoc.noteReject'), '') ?? null);
    if (!aprobar && nota === null) return;
    setOcupadoDoc(d.id);
    const { error } = await (supabase as unknown as Rpc).rpc('admin_set_org_doc', {
      p_user: d.id, p_approve: aprobar, p_note: nota,
    });
    setOcupadoDoc(null);
    if (error) { toast.error(error.message); return; }
    toast.success(aprobar ? t('adm.orgdoc.approved') : t('adm.orgdoc.rejectedOk'));
    void cargarDocs();
  }

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

      {/* Cola de verificación documental de organizaciones (acta / carta). */}
      <div className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold text-slate-900">{t('adm.orgdoc.title')}</h2>
        <p className="text-sm text-muted">{t('adm.orgdoc.desc')}</p>

        {orgDocs === null ? (
          <div className="mt-4"><SkeletonCard rows={2} /></div>
        ) : orgDocs.length === 0 ? (
          <div className="mt-4"><EmptyState title={t('adm.orgdoc.empty')} description={t('adm.orgdoc.emptyDesc')} /></div>
        ) : (
          <ul className="mt-4 space-y-3">
            {orgDocs.map((d) => (
              <li key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{d.nombre ?? d.id}</p>
                    <p className="text-sm text-muted">
                      {(d.member_no ? `NM-${d.member_no} · ` : '')}{d.provider_type ?? '—'} · {t(d.org_doc_kind === 'acta' ? 'orgdoc.kindActa' : 'orgdoc.kindCarta')}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
                    {t('orgdoc.pending')}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.org_doc_url && (
                    <Button size="sm" variant="secondary"
                            leadingIcon={<FileText className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => void abrirDoc(d.org_doc_url!)}>
                      {t('adm.exe.openDoc')}
                    </Button>
                  )}
                  <Button size="sm" loading={ocupadoDoc === d.id}
                          leadingIcon={<Check className="h-4 w-4" aria-hidden="true" />}
                          onClick={() => void resolverDoc(d, true)}>
                    {t('adm.exe.approve')}
                  </Button>
                  <Button size="sm" variant="danger" loading={ocupadoDoc === d.id}
                          leadingIcon={<X className="h-4 w-4" aria-hidden="true" />}
                          onClick={() => void resolverDoc(d, false)}>
                    {t('adm.exe.reject')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
