/**
 * AdminInvitations — pantalla de invitaciones del directorio.
 *
 * Muestra el estado del ciclo de cada invitación y, en particular, el RASTREO
 * DE APERTURA del enlace (fecha de 1ª apertura, última y número de aperturas).
 * Datos por la RPC admin_directorio_invitaciones() (is_admin()).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Search, MailCheck, MailOpen, UserCheck, XCircle, Send, Download, ArrowUpDown } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAdminInvitations, type InvitationRow } from '@/hooks/useAdminInvitations';
import { formatDate, toMessage } from '@/lib/utils';

const PROVIDER_TYPES = ['service_provider', 'clinic', 'school', 'merchant', 'company', 'ngo', 'tourism'] as const;

// El registro solo incluye invitaciones REALMENTE enviadas (filtrado en la RPC).
// Estados (mutuamente excluyentes, por prioridad):
//  aceptada  = reclamó/completó su ficha (usada_en)
//  rechazada = pidió quitar su ficha (baja_en / cancelada_en)
//  abierta   = abrió el enlace pero ni aceptó ni rechazó (abierta_en)
//  recibida  = se le envió el correo pero aún no abre
type Estado = 'aceptada' | 'rechazada' | 'abierta' | 'recibida';

function estadoDe(r: InvitationRow): Estado {
  if (r.usada_en) return 'aceptada';
  if (r.baja_en || r.cancelada_en) return 'rechazada';
  if (r.abierta_en) return 'abierta';
  return 'recibida';
}

const ESTADO_CLS: Record<Estado, string> = {
  aceptada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
  abierta: 'bg-amber-100 text-amber-800',
  recibida: 'bg-sky-100 text-sky-800',
};

// Columnas ordenables ('estado' y 'rechazada_en' son sintéticas).
type SortKey =
  | 'nombre' | 'correo' | 'provider_type' | 'ciudad' | 'estado'
  | 'enviada_en' | 'abierta_en' | 'aperturas' | 'usada_en' | 'rechazada_en';

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
  const [cortesia, setCortesia] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ultimoLink, setUltimoLink] = useState<string | null>(null);
  const [ultimoPromo, setUltimoPromo] = useState<string | null>(null);

  const crear = async (enviar: boolean) => {
    if (!correo.trim()) { toast.error(t('invit.emailRequired')); return; }
    setEnviando(true);
    setUltimoLink(null);
    setUltimoPromo(null);
    const { data, error: err } = await supabase.rpc('admin_enviar_invitacion', {
      p_correo: correo.trim(),
      p_nombre: nombre.trim() || null,
      p_provider_type: tipo,
      p_fundador: fundador,
      p_cortesia: cortesia,
      p_send: enviar,
    });
    setEnviando(false);
    if (err) { toast.error(toMessage(err)); return; }
    const row = Array.isArray(data) ? data[0] : data;
    const tk = (row as { token?: string } | null)?.token;
    const pr = (row as { promo?: string | null } | null)?.promo ?? null;
    if (tk) setUltimoLink(`${window.location.origin}/reclamar/${tk}`);
    setUltimoPromo(pr);
    toast.success(enviar ? t('invit.sentOk') : t('invit.createdOk'));
    setCorreo(''); setNombre('');
    void reload();
  };

  const [sortKey, setSortKey] = useState<SortKey>('enviada_en');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        (r.nombre ?? '').toLowerCase().includes(needle) ||
        (r.correo ?? '').toLowerCase().includes(needle) ||
        (r.provider_type ?? '').toLowerCase().includes(needle) ||
        (r.ciudad ?? '').toLowerCase().includes(needle) ||
        (r.estado_geo ?? '').toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const sorted = useMemo(() => {
    const val = (r: InvitationRow): string | number => {
      switch (sortKey) {
        case 'estado': return estadoDe(r);
        case 'aperturas': return r.aperturas ?? 0;
        case 'rechazada_en': return r.baja_en ?? r.cancelada_en ?? '';
        default: return ((r as unknown as Record<string, unknown>)[sortKey] as string | null) ?? '';
      }
    };
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const stats = useMemo(() => {
    const s = { recibida: 0, abierta: 0, aceptada: 0, rechazada: 0 };
    for (const r of rows) s[estadoDe(r)]++;
    return s;
  }, [rows]);

  const fecha = (s: string | null) => (s ? formatDate(s) : '—');

  // Descarga el registro (filtrado) como CSV. BOM UTF-8 para que Excel respete acentos.
  const descargarCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      t('invit.colName'), t('invit.newEmail'), t('invit.newType'), t('invit.colLocation'), t('invit.colStatus'),
      t('invit.colSent'), t('invit.colOpened'), t('invit.colOpens'), t('invit.colClaimed'), t('invit.colRejected'),
    ];
    const lines = [headers.map(esc).join(',')];
    for (const r of sorted) {
      lines.push([
        r.nombre ?? '', r.correo ?? '', r.provider_type ?? '',
        [r.ciudad, r.estado_geo].filter(Boolean).join(', '),
        t(`invit.status.${estadoDe(r)}`),
        r.enviada_en ?? '', r.abierta_en ?? '', r.aperturas ?? 0, r.usada_en ?? '', r.baja_en ?? r.cancelada_en ?? '',
      ].map(esc).join(','));
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitaciones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('invit.title')}</h2>
          <p className="text-sm text-muted">{t('invit.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={descargarCsv} disabled={sorted.length === 0} leadingIcon={<Download className="h-4 w-4" />}>
            {t('invit.downloadCsv')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void reload()} leadingIcon={<RefreshCw className="h-4 w-4" />}>
            {t('invit.reload')}
          </Button>
        </div>
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
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={cortesia}
            onChange={(e) => setCortesia(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus-visible:ring-brand-500"
          />
          {t('invit.newCourtesy')}
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" loading={enviando} onClick={() => void crear(true)} leadingIcon={<Send className="h-4 w-4" />}>
            {t('invit.newSend')}
          </Button>
          <Button size="sm" variant="secondary" loading={enviando} onClick={() => void crear(false)}>
            {t('invit.newLinkOnly')}
          </Button>
        </div>
        {ultimoPromo && (
          <p className="mt-3 text-sm text-green-700">
            {t('invit.courtesyCodeLabel')}: <span className="font-bold">{ultimoPromo}</span>
          </p>
        )}
        {ultimoLink && (
          <p className="mt-2 break-all text-xs text-muted">
            {t('invit.newLinkLabel')}: <a href={ultimoLink} className="text-brand-700 underline" target="_blank" rel="noopener noreferrer">{ultimoLink}</a>
          </p>
        )}
      </div>

      {/* Resumen por estado (solo invitaciones enviadas) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<MailCheck className="h-5 w-5" />} label={t('invit.summaryReceived')} value={stats.recibida} />
        <StatCard icon={<MailOpen className="h-5 w-5" />} label={t('invit.summaryOpened')} value={stats.abierta} accent="amber" />
        <StatCard icon={<UserCheck className="h-5 w-5" />} label={t('invit.summaryAccepted')} value={stats.aceptada} accent="green" />
        <StatCard icon={<XCircle className="h-5 w-5" />} label={t('invit.summaryRejected')} value={stats.rechazada} accent="red" />
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
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted">{t('invit.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[900px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <SortTh label={t('invit.colName')} k="nombre" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label={t('invit.newEmail')} k="correo" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label={t('invit.newType')} k="provider_type" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label={t('invit.colLocation')} k="ciudad" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label={t('invit.colStatus')} k="estado" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label={t('invit.colSent')} k="enviada_en" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label={t('invit.colOpened')} k="abierta_en" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label={t('invit.colOpens')} k="aperturas" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label={t('invit.colClaimed')} k="usada_en" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label={t('invit.colRejected')} k="rechazada_en" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const est = estadoDe(r);
                const ubic = [r.ciudad, r.estado_geo].filter(Boolean).join(', ');
                return (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="p-3 font-semibold text-slate-900">{r.nombre || '—'}</td>
                    <td className="p-3 text-muted">{r.correo || '—'}</td>
                    <td className="p-3 text-muted">{r.provider_type ? t(`invit.type.${r.provider_type}`, { defaultValue: r.provider_type }) : '—'}</td>
                    <td className="p-3 text-muted">{ubic || '—'}</td>
                    <td className="p-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_CLS[est]}`}>
                        {t(`invit.status.${est}`)}
                      </span>
                    </td>
                    <td className="p-3 text-muted">{fecha(r.enviada_en)}</td>
                    <td className="p-3 text-muted">
                      {r.abierta_en ? fecha(r.abierta_en) : '—'}
                      {r.abierta_ultima_en && r.aperturas > 1 && (
                        <div className="text-xs text-muted">{t('invit.lastOpen')}: {fecha(r.abierta_ultima_en)}</div>
                      )}
                    </td>
                    <td className="p-3 text-muted">{r.aperturas ?? 0}</td>
                    <td className="p-3 text-muted">{fecha(r.usada_en)}</td>
                    <td className="p-3 text-muted">{fecha(r.baja_en ?? r.cancelada_en)}</td>
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

/** Cabecera de columna ordenable: clic alterna asc/desc. */
function SortTh({
  label, k, sortKey, sortDir, onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th className="p-3 text-start font-semibold">
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 ${active ? 'text-slate-900' : ''}`}
        aria-label={label}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-40'}`} aria-hidden="true" />
        {active && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
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
  accent?: 'sky' | 'amber' | 'green' | 'red' | 'slate';
}) {
  const cls =
    accent === 'amber'
      ? 'text-amber-700'
      : accent === 'green'
        ? 'text-green-700'
        : accent === 'red'
          ? 'text-red-700'
          : accent === 'slate'
            ? 'text-slate-600'
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
