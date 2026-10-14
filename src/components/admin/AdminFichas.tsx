/**
 * AdminFichas — control y estadistica de las fichas del directorio.
 *
 * Por que existe (14 oct 2026): el panel no tenia NADA sobre fichas rechazadas
 * ni sobre invitaciones vencidas sin reclamar.
 *   · `baja_motivo` se guardaba desde la migracion 0091 y no se habia leido nunca.
 *   · `expira_en` viajaba en la RPC de invitaciones pero no se pintaba ni se
 *     contaba: una invitacion caducada se veia igual que una viva.
 *   · los contadores de AdminInvitations se calculan en el navegador sobre un
 *     `limit 2000`, asi que por encima de esa cifra mienten.
 *
 * Aqui los numeros los calcula la base (RPC admin_directorio_resumen, migracion
 * 0205), sin tope de filas y acotada a admin.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, FileText, Eye, FilePen, UserMinus, UserCheck, MailX,
  MailWarning, Send, MailOpen, CheckCircle2, Ban, Clock, AlertTriangle,
} from 'lucide-react';
import { Button, SkeletonCard } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { AdminFichasRetiradas } from './AdminFichasRetiradas';
import { AdminCapturaTelefonica } from './AdminCapturaTelefonica';

interface Resumen {
  fichas: {
    total: number; publicadas: number; borrador: number; dadas_de_baja: number;
    reclamadas: number; correo_rebotado: number; sin_correo: number;
  };
  retiro_proyectado: { fecha: string | null; sobreviven: number; se_retirarian: number };
  bajas_por_motivo: { motivo: string; fichas: number }[];
  invitaciones: {
    total: number; nunca_enviadas: number; enviadas: number; abiertas: number;
    reclamadas: number; baja: number; canceladas: number;
    vencidas_sin_reclamar: number; vencen_en_30_dias: number; vivas: number;
  };
  tasas: { enviadas: number; apertura: number | null; reclamo: number | null; rechazo: number | null };
  generado_en: string;
}

const fecha = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso)) : '—';

function Tarjeta({ icon: Icon, label, value, tone = 'text-slate-900' }: {
  icon: typeof FileText; label: string; value: number | string; tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
      <p className={`mt-2 text-2xl font-extrabold ${tone}`}>
        {typeof value === 'number' ? value.toLocaleString('es-MX') : value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export function AdminFichas() {
  const { t } = useTranslation();
  const [r, setR] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase.rpc('admin_directorio_resumen');
    setLoading(false);
    if (err || !data) { setError(true); return; }
    setR(data as unknown as Resumen);
  };

  useEffect(() => { void load(); }, []);

  if (loading) return <div className="grid gap-3 sm:grid-cols-2"><SkeletonCard rows={0} /><SkeletonCard rows={0} /></div>;
  if (error || !r) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-muted">
        {t('adminFichas.unavailable')}
      </div>
    );
  }

  const alerta = (n: number) => (n > 0 ? 'text-red-600' : 'text-slate-900');
  const aviso = (n: number) => (n > 0 ? 'text-warm-700' : 'text-slate-900');
  const pct = (v: number | null) => (v === null ? '—' : `${v}%`);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">{t('adminFichas.generatedAt')}: {fecha(r.generado_en)}</p>
        <Button size="sm" variant="secondary" onClick={load} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('adminFichas.refresh')}
        </Button>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{t('adminFichas.fichasTitle')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tarjeta icon={FileText} label={t('adminFichas.total')} value={r.fichas.total} />
          <Tarjeta icon={Eye} label={t('adminFichas.publicadas')} value={r.fichas.publicadas} />
          <Tarjeta icon={FilePen} label={t('adminFichas.borrador')} value={r.fichas.borrador} />
          <Tarjeta icon={UserCheck} label={t('adminFichas.reclamadas')} value={r.fichas.reclamadas} tone="text-sage-700" />
          <Tarjeta icon={UserMinus} label={t('adminFichas.dadasDeBaja')} value={r.fichas.dadas_de_baja} tone={aviso(r.fichas.dadas_de_baja)} />
          <Tarjeta icon={MailX} label={t('adminFichas.sinCorreo')} value={r.fichas.sin_correo} tone={aviso(r.fichas.sin_correo)} />
          <Tarjeta icon={MailWarning} label={t('adminFichas.correoRebotado')} value={r.fichas.correo_rebotado} tone={aviso(r.fichas.correo_rebotado)} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          {t('adminFichas.retiroTitle', { fecha: fecha(r.retiro_proyectado.fecha) })}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Tarjeta icon={CheckCircle2} label={t('adminFichas.sobreviven')} value={r.retiro_proyectado.sobreviven} tone="text-sage-700" />
          <Tarjeta icon={AlertTriangle} label={t('adminFichas.seRetirarian')} value={r.retiro_proyectado.se_retirarian} tone={alerta(r.retiro_proyectado.se_retirarian)} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{t('adminFichas.bajasTitle')}</h2>
        {r.bajas_por_motivo.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted">
            {t('adminFichas.bajasEmpty')}
          </p>
        ) : (
          <table className="w-full overflow-hidden rounded-2xl border border-slate-100 bg-white text-sm shadow-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-4 py-2">{t('adminFichas.motivo')}</th>
                <th scope="col" className="px-4 py-2 text-right">{t('adminFichas.fichas')}</th>
              </tr>
            </thead>
            <tbody>
              {r.bajas_por_motivo.map((b) => (
                <tr key={b.motivo} className="border-t border-slate-100">
                  <td className="px-4 py-2">{b.motivo}</td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">{b.fichas.toLocaleString('es-MX')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{t('adminFichas.invTitle')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tarjeta icon={FileText} label={t('adminFichas.invTotal')} value={r.invitaciones.total} />
          <Tarjeta icon={Clock} label={t('adminFichas.nuncaEnviadas')} value={r.invitaciones.nunca_enviadas} />
          <Tarjeta icon={Send} label={t('adminFichas.enviadas')} value={r.invitaciones.enviadas} tone="text-brand-700" />
          <Tarjeta icon={MailOpen} label={t('adminFichas.abiertas')} value={r.invitaciones.abiertas} tone="text-brand-700" />
          <Tarjeta icon={CheckCircle2} label={t('adminFichas.reclamadasInv')} value={r.invitaciones.reclamadas} tone="text-sage-700" />
          <Tarjeta icon={UserMinus} label={t('adminFichas.bajaInv')} value={r.invitaciones.baja} tone={aviso(r.invitaciones.baja)} />
          <Tarjeta icon={Ban} label={t('adminFichas.canceladas')} value={r.invitaciones.canceladas} />
          <Tarjeta icon={AlertTriangle} label={t('adminFichas.vencidasSinReclamar')} value={r.invitaciones.vencidas_sin_reclamar} tone={alerta(r.invitaciones.vencidas_sin_reclamar)} />
          <Tarjeta icon={Clock} label={t('adminFichas.vencen30')} value={r.invitaciones.vencen_en_30_dias} tone={aviso(r.invitaciones.vencen_en_30_dias)} />
        </div>
      </section>

      <AdminCapturaTelefonica />

      <AdminFichasRetiradas />

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          {t('adminFichas.tasasTitle', { enviadas: r.tasas.enviadas.toLocaleString('es-MX') })}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <Tarjeta icon={MailOpen} label={t('adminFichas.apertura')} value={pct(r.tasas.apertura)} tone="text-brand-700" />
          <Tarjeta icon={CheckCircle2} label={t('adminFichas.reclamo')} value={pct(r.tasas.reclamo)} tone="text-sage-700" />
          <Tarjeta icon={UserMinus} label={t('adminFichas.rechazo')} value={pct(r.tasas.rechazo)} tone="text-warm-700" />
        </div>
      </section>
    </div>
  );
}
