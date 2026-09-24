/**
 * AdminInvitations — pantalla de invitaciones del directorio.
 *
 * Muestra el estado del ciclo de cada invitación y, en particular, el RASTREO
 * DE APERTURA del enlace (fecha de 1ª apertura, última y número de aperturas).
 * Datos por la RPC admin_directorio_invitaciones() (is_admin()).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Search, MailCheck, MailOpen, UserCheck, AlertTriangle, Send } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAdminInvitations, type InvitationRow } from '@/hooks/useAdminInvitations';
import { formatDate, toMessage } from '@/lib/utils';

const PROVIDER_TYPES = ['service_provider', 'clinic', 'school', 'merchant', 'company', 'ngo', 'tourism'] as const;

type Estado = 'cancelada' | 'baja' | 'reclamada' | 'rebotado' | 'abierta' | 'enviada' | 'pendiente';

function estadoDe(r: InvitationRow): Estado {
  if (r.cancelada_en) return 'cancelada';
  if (r.baja_en) return 'baja';
  if (r.usada_en) return 'reclamada';
  if (r.rebotado) return 'rebotado';
  if (r.abierta_en) return 'abierta';
  if (r.enviada_en) return 'enviada';
  return 'pendiente';
}

const ESTADO_CLS: Record<Estado, string> = {
  cancelada: 'bg-slate-100 text-slate-600',
  baja: 'bg-slate-100 text-slate-600',
  reclamada: 'bg-green-100 text-green-800',
  rebotado: 'bg-red-100 text-red-800',
  abierta: 'bg-amber-100 text-amber-800',
  enviada: 'bg-sky-100 text-sky-800',
  pendiente: 'bg-slate-100 text-slate-600',
};

export function AdminInvitations() {
  const { t } = useTranslation();
  const toast = useToast();
  const { rows, loading, error, reload } = useAdminInvitations();
  const [q, setQ] = useState('');

  // Formulario de envío/creación individual.
  const [correo, setCorreo] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<string>('service_provider');
  const [fundador, setFundador] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [ultimoLink, setUltimoLink] = useState<string | null>(null);

  const crear = async (enviar: boolean) => {
    if (!correo.trim()) { toast.error(t('invit.emailRequired')); return; }
    setEnviando(true);
    setUltimoLink(null);
    const { data, error: err } = await supabase.rpc('admin_enviar_invitacion', {
      p_correo: correo.trim(),
      p_nombre: nombre.trim() || null,
      p_provider_type: tipo,
      p_fundador: fundador,
      p_send: enviar,
    });
    setEnviando(false);
    if (err) { toast.error(toMessage(err)); return; }
    const row = Array.isArray(data) ? data[0] : data;
    const tk = (row as { token?: string } | null)?.token;
    if (tk) setUltimoLink(`${window.location.origin}/reclamar/${tk}`);
    toast.success(enviar ? t('invit.sentOk') : t('invit.createdOk'));
    setCorreo(''); setNombre('');
    void reload();
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        (r.nombre ?? '').toLowerCase().includes(needle) ||
        (r.correo ?? '').toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    let sent = 0, opened = 0, claimed = 0, bounced = 0;
    for (const r of rows) {
      if (r.enviada_en) sent++;
      if (r.abierta_en) opened++;
      if (r.usada_en) claimed++;
      if (r.rebotado) bounced++;
    }
    return { sent, opened, claimed, bounced };
  }, [rows]);

  const fecha = (s: string | null) => (s ? formatDate(s) : '—');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('invit.title')}</h2>
          <p className="text-sm text-muted">{t('invit.subtitle')}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void reload()} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('invit.reload')}
        </Button>
      </div>

      {/* Envío individual */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <h3 className="mb-3 font-semibold text-slate-900">{t('invit.newTitle')}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="inv-correo" className="mb-1 block text-xs font-semibold text-muted">{t('invit.newEmail')}</label>
            <input
              id="inv-correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="inv-nombre" className="mb-1 block text-xs font-semibold text-muted">{t('invit.newName')}</label>
            <input
              id="inv-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={t('invit.newNamePh')}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="inv-tipo" className="mb-1 block text-xs font-semibold text-muted">{t('invit.newType')}</label>
            <select
              id="inv-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {PROVIDER_TYPES.map((v) => (
                <option key={v} value={v}>{t(`invit.type.${v}`)}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={fundador}
            onChange={(e) => setFundador(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus-visible:ring-brand-500"
          />
          {t('invit.newFounder')}
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" loading={enviando} onClick={() => void crear(true)} leadingIcon={<Send className="h-4 w-4" />}>
            {t('invit.newSend')}
          </Button>
          <Button size="sm" variant="secondary" loading={enviando} onClick={() => void crear(false)}>
            {t('invit.newLinkOnly')}
          </Button>
        </div>
        {ultimoLink && (
          <p className="mt-3 break-all text-xs text-muted">
            {t('invit.newLinkLabel')}: <a href={ultimoLink} className="text-brand-700 underline" target="_blank" rel="noopener noreferrer">{ultimoLink}</a>
          </p>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<MailCheck className="h-5 w-5" />} label={t('invit.summarySent')} value={stats.sent} />
        <StatCard icon={<MailOpen className="h-5 w-5" />} label={t('invit.summaryOpened')} value={stats.opened} accent="amber" />
        <StatCard icon={<UserCheck className="h-5 w-5" />} label={t('invit.summaryClaimed')} value={stats.claimed} accent="green" />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} label={t('invit.summaryBounced')} value={stats.bounced} accent="red" />
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('invit.search')}
          aria-label={t('invit.search')}
          className="w-full rounded-xl border border-slate-200 py-2 ps-9 pe-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted">{t('invit.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted">{t('invit.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[720px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="p-3 text-start font-semibold">{t('invit.colName')}</th>
                <th className="p-3 text-start font-semibold">{t('invit.colStatus')}</th>
                <th className="p-3 text-start font-semibold">{t('invit.colSent')}</th>
                <th className="p-3 text-start font-semibold">{t('invit.colOpened')}</th>
                <th className="p-3 text-start font-semibold">{t('invit.colClaimed')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const est = estadoDe(r);
                return (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{r.nombre || '—'}</div>
                      <div className="text-xs text-muted">{r.correo || '—'}</div>
                      {(r.ciudad || r.estado_geo) && (
                        <div className="text-xs text-muted">{[r.ciudad, r.estado_geo].filter(Boolean).join(', ')}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_CLS[est]}`}>
                        {t(`invit.status.${est}`)}
                      </span>
                    </td>
                    <td className="p-3 text-muted">{fecha(r.enviada_en)}</td>
                    <td className="p-3">
                      {r.abierta_en ? (
                        <div>
                          <div className="text-slate-900">{fecha(r.abierta_en)}</div>
                          <div className="text-xs text-muted">
                            {t('invit.opens', { count: r.aperturas })}
                            {r.abierta_ultima_en && r.aperturas > 1 && ` · ${t('invit.lastOpen')}: ${fecha(r.abierta_ultima_en)}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="p-3 text-muted">{fecha(r.usada_en)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = 'sky',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: 'sky' | 'amber' | 'green' | 'red';
}) {
  const cls =
    accent === 'amber'
      ? 'text-amber-700'
      : accent === 'green'
        ? 'text-green-700'
        : accent === 'red'
          ? 'text-red-700'
          : 'text-sky-700';
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className={`flex items-center gap-2 ${cls}`}>
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}
