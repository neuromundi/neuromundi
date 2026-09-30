/**
 * AdminMembers — tabla de control de miembros.
 *
 * Una fila por cuenta, con filtros por estado y búsqueda por nombre, razón
 * social, correo o número de socio. Acciones por fila: suspender, reactivar,
 * exentar de cuota, prorrogar la vigencia y confirmar la ficha del directorio.
 *
 * NO hay baja definitiva. Borrar una cuenta destruye datos que no vuelven, así
 * que sigue siendo un camino aparte y deliberado, no un botón más en una tabla
 * donde se hacen diez cosas rutinarias.
 *
 * Todo pasa por RPC acotadas a `is_admin()` (migración 0155): la pantalla no
 * escribe en `profiles` directamente.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ShieldOff, ShieldCheck, Gift, CalendarPlus, BadgeCheck, Download } from 'lucide-react';
import { Button, SkeletonCard, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useAdminMembers, type AdminMember, type EstadoFiltro, type FundadorFiltro, type SiNo } from '@/hooks/useAdminMembers';
import { descargarCsv } from '@/lib/csv';
import { SECTIONS } from '@/data/sections';
import { formatDate } from '@/lib/utils';

const FILTROS: EstadoFiltro[] = ['todos', 'activo', 'pendiente', 'exento', 'vencido', 'suspendido'];

const selectCls =
  'w-full rounded-xl border border-slate-200 bg-white p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

/** Estado visible: la suspensión manda sobre la cuota. */
function estadoDe(m: AdminMember): { clave: string; cls: string } {
  if (m.suspended_at) return { clave: 'suspendido', cls: 'bg-amber-50 text-amber-700' };
  switch (m.membership_status) {
    case 'active':   return { clave: 'activo',    cls: 'bg-sage-50 text-sage-700' };
    case 'exempt':   return { clave: 'exento',    cls: 'bg-brand-50 text-brand-700' };
    case 'past_due': return { clave: 'vencido',   cls: 'bg-red-50 text-red-700' };
    default:         return { clave: 'pendiente', cls: 'bg-slate-100 text-slate-600' };
  }
}

export function AdminMembers() {
  const { t } = useTranslation();
  const toast = useToast();
  const m = useAdminMembers();
  const [ocupado, setOcupado] = useState<string | null>(null);

  /** Ejecuta una acción mostrando el resultado; nunca deja la fila trabada. */
  async function correr(id: string, fn: () => Promise<void>) {
    setOcupado(id);
    try {
      await fn();
      toast.success(t('adm.members.done'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('adm.members.failed'));
    } finally {
      setOcupado(null);
    }
  }

  /** Exporta las filas visibles, con los filtros tal como están aplicados. */
  function exportar() {
    const hoy = new Date().toISOString().slice(0, 10);
    descargarCsv(
      `miembros neuromundi ${hoy}.csv`,
      ['Socio', 'Nombre', 'Razon social', 'Correo', 'Pais', 'Tipo', 'Secciones',
       'Estado', 'Periodo', 'Vigencia', 'Fundador', 'Publicado', 'Ficha reclamada',
       'Ficha verificada', 'Ha pagado', 'Suspendido desde', 'Alta'],
      m.items.map((x) => [
        x.member_no, x.full_name, x.business_name, x.email, x.country,
        x.affiliate_type ?? x.provider_type ?? x.role,
        (x.sections ?? []).join(' | '),
        estadoDe(x).clave, x.membership_period, x.membership_paid_until,
        x.es_fundador ? 'si' : 'no',
        x.is_published ? 'si' : 'no',
        x.ficha_id ? 'si' : 'no',
        x.ficha_id ? (x.ficha_verificada ? 'si' : 'no') : '',
        x.ha_pagado ? 'si' : 'no',
        x.suspended_at, x.created_at,
      ]),
    );
  }

  function pedirNota(): string | undefined {
    const n = window.prompt(t('adm.members.notePrompt'));
    return n === null ? undefined : (n || undefined);
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
        {t('adm.members.hint')}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => m.setEstado(f)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                m.estado === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t(`adm.members.f.${f}`)}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            placeholder={t('adm.members.search')}
            aria-label={t('adm.members.search')}
            value={m.q}
            onChange={(e) => m.setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Segunda fila de filtros: se componen entre sí y con el estado y la
          búsqueda de arriba. Los desplegables sólo ofrecen valores que existen. */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select aria-label={t('adm.members.fCountry')} value={m.pais}
          onChange={(e) => m.setPais(e.target.value)} className={selectCls}>
          <option value="">{t('adm.members.fCountry')}</option>
          {m.facetas.paises.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select aria-label={t('adm.members.fSection')} value={m.seccion}
          onChange={(e) => m.setSeccion(e.target.value)} className={selectCls}>
          <option value="">{t('adm.members.fSection')}</option>
          {SECTIONS.map((sec) => <option key={sec.value} value={sec.value}>{sec.label}</option>)}
        </select>
        <select aria-label={t('adm.members.fFounder')} value={m.fundador}
          onChange={(e) => m.setFundador(e.target.value as FundadorFiltro)} className={selectCls}>
          <option value="todos">{t('adm.members.fFounder')}</option>
          <option value="si">{t('adm.members.fFounderYes')}</option>
          <option value="no">{t('adm.members.fFounderNo')}</option>
        </select>
        <select aria-label={t('adm.members.fType')} value={m.tipo}
          onChange={(e) => m.setTipo(e.target.value)} className={selectCls}>
          <option value="">{t('adm.members.fType')}</option>
          {m.facetas.tipos.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="grid flex-1 gap-2 sm:grid-cols-3">
          <select aria-label={t('adm.members.fPub')} value={m.publicado}
            onChange={(e) => m.setPublicado(e.target.value as SiNo)} className={selectCls}>
            <option value="todos">{t('adm.members.fPub')}</option>
            <option value="si">{t('adm.members.fPubYes')}</option>
            <option value="no">{t('adm.members.fPubNo')}</option>
          </select>
          <select aria-label={t('adm.members.fClaim')} value={m.reclamado}
            onChange={(e) => m.setReclamado(e.target.value as SiNo)} className={selectCls}>
            <option value="todos">{t('adm.members.fClaim')}</option>
            <option value="si">{t('adm.members.fClaimYes')}</option>
            <option value="no">{t('adm.members.fClaimNo')}</option>
          </select>
          <select aria-label={t('adm.members.fPaid')} value={m.pagado}
            onChange={(e) => m.setPagado(e.target.value as SiNo)} className={selectCls}>
            <option value="todos">{t('adm.members.fPaid')}</option>
            <option value="si">{t('adm.members.fPaidYes')}</option>
            <option value="no">{t('adm.members.fPaidNo')}</option>
          </select>
        </div>
        {/* Descarga lo que se está viendo, con los filtros aplicados: un
            respaldo de «todos» y un recorte de trabajo se piden igual. */}
        <Button variant="secondary" onClick={exportar} disabled={m.items.length === 0}>
          <Download className="mr-1 h-4 w-4" />{t('adm.members.csv')}
        </Button>
      </div>

      {m.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{m.error}</p>
      )}

      {m.loading ? (
        <SkeletonCard rows={4} />
      ) : m.items.length === 0 ? (
        <EmptyState title={t('adm.members.empty')} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[54rem] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">{t('adm.members.c.member')}</th>
                <th className="p-3">{t('adm.members.c.type')}</th>
                <th className="p-3">{t('adm.members.c.state')}</th>
                <th className="p-3">{t('adm.members.c.until')}</th>
                <th className="p-3">{t('adm.members.c.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {m.items.map((x) => {
                const e = estadoDe(x);
                const trabajando = ocupado === x.id;
                return (
                  <tr key={x.id} className="border-t border-slate-100 align-top">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">
                        {x.business_name || x.full_name || '—'}
                        {x.es_fundador && (
                          <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                            {t('adm.members.founder')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">{x.email ?? '—'}</div>
                      <div className="text-xs text-muted">
                        {x.member_no ? `#${x.member_no}` : '—'}{x.country ? ` · ${x.country}` : ''}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      <div>{x.affiliate_type ?? x.provider_type ?? x.role ?? '—'}</div>
                      {x.membership_period && <div className="text-muted">{t(`adm.members.p.${x.membership_period}`)}</div>}
                      {x.ficha_id && (
                        <div className={x.ficha_verificada ? 'text-sage-700' : 'text-amber-700'}>
                          {t(x.ficha_verificada ? 'adm.members.fichaOk' : 'adm.members.fichaPend')}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${e.cls}`}>
                        {t(`adm.members.f.${e.clave}`)}
                      </span>
                      {x.suspend_until && (
                        <div className="mt-1 text-xs text-muted">{formatDate(x.suspend_until)}</div>
                      )}
                      {/* Sin este dato, suspender a quien nunca publicó su perfil
                          parece no hacer nada: no estaba en el directorio. */}
                      <div className={`mt-1 text-xs ${x.is_published ? 'text-sage-700' : 'text-slate-400'}`}>
                        {t(x.is_published ? 'adm.members.pub' : 'adm.members.unpub')}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      {x.membership_paid_until ? formatDate(x.membership_paid_until) : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {x.suspended_at ? (
                          <Button size="sm" variant="secondary" disabled={trabajando}
                            onClick={() => void correr(x.id, () => m.reactivar(x.id, pedirNota()))}>
                            <ShieldCheck className="mr-1 h-4 w-4" />{t('adm.members.a.reactivate')}
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" disabled={trabajando}
                            onClick={() => {
                              if (!window.confirm(t('adm.members.confirmSuspend'))) return;
                              void correr(x.id, () => m.suspender(x.id, 6, pedirNota()));
                            }}>
                            <ShieldOff className="mr-1 h-4 w-4" />{t('adm.members.a.suspend')}
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" disabled={trabajando}
                          onClick={() => void correr(x.id, () => m.exentar(x.id, x.membership_status !== 'exempt', pedirNota()))}>
                          <Gift className="mr-1 h-4 w-4" />
                          {t(x.membership_status === 'exempt' ? 'adm.members.a.unexempt' : 'adm.members.a.exempt')}
                        </Button>
                        <Button size="sm" variant="secondary" disabled={trabajando}
                          onClick={() => {
                            const d = window.prompt(t('adm.members.daysPrompt'), '30');
                            const n = Number(d);
                            if (!d || !Number.isFinite(n) || n === 0) return;
                            void correr(x.id, () => m.prorrogar(x.id, Math.trunc(n), pedirNota()));
                          }}>
                          <CalendarPlus className="mr-1 h-4 w-4" />{t('adm.members.a.extend')}
                        </Button>
                        {x.ficha_id && !x.ficha_verificada && (
                          <Button size="sm" variant="secondary" disabled={trabajando}
                            onClick={() => void correr(x.id, () => m.verificarFicha(x.ficha_id as string, true))}>
                            <BadgeCheck className="mr-1 h-4 w-4" />{t('adm.members.a.verify')}
                          </Button>
                        )}
                      </div>
                    </td>
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
