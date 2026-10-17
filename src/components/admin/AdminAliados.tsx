/**
 * AdminAliados — bandeja de las organizaciones que piden aparecer en el muro
 * de Aliados (migración 0255). Aprobar es publicar.
 *
 * El logotipo se puede pegar aquí mismo, porque la base se niega a aprobar sin
 * él: el muro pinta logotipos y un hueco en la cuadrícula se nota.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Handshake, RefreshCw, Check, X, Globe2 } from 'lucide-react';
import { Button, SkeletonCard, AvisoDeFallo } from '@/components/ui';
import { useAliadosPropuestos } from '@/hooks/useAliadosPropuestos';
import type { EstadoAliado } from '@/hooks/useAliado';
import { useAvisarResultado } from '@/hooks/useAvisarResultado';
import { formatDate } from '@/lib/utils';

const FILTROS: Array<EstadoAliado | 'todas'> = ['propuesto', 'aprobado', 'rechazado', 'todas'];

export function AdminAliados() {
  const { t } = useTranslation();
  const [filtro, setFiltro] = useState<EstadoAliado | 'todas'>('propuesto');
  const { items, loading, fallo, reload, resolver, ponerLogo } = useAliadosPropuestos(filtro);
  const avisar = useAvisarResultado();
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [logos, setLogos] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {FILTROS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filtro === f ? 'bg-white text-slate-900 shadow-sm' : 'text-muted'}`}
            >
              {t(`aliados.admin.${f}`)}
            </button>
          ))}
        </div>
        <Button size="sm" variant="secondary" onClick={() => void reload()} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('common.refresh')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3"><SkeletonCard rows={0} /><SkeletonCard rows={0} /></div>
      ) : fallo ? (
        <AvisoDeFallo onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('aliados.admin.empty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {a.logo_url ? (
                  <img src={a.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-contain" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <Handshake className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {a.name}
                    <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {t(`aliados.estado.${a.estado}`)}
                    </span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{a.proponente ?? t('aliados.admin.anon')}</span>
                    {a.ficha && <span>· {a.ficha}</span>}
                    {a.propuesta_en && <span>· {formatDate(a.propuesta_en)}</span>}
                  </p>
                  {a.website && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <Globe2 className="h-3.5 w-3.5" aria-hidden="true" /> {a.website}
                    </p>
                  )}
                  {a.nota_admin && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{a.nota_admin}</p>
                  )}

                  {a.estado === 'propuesto' && (
                    <div className="mt-3 space-y-2">
                      {!a.logo_url && (
                        <div className="flex flex-wrap gap-2">
                          <input
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            placeholder={t('aliados.admin.logoPlaceholder')}
                            value={logos[a.id] ?? ''}
                            onChange={(e) => setLogos((p) => ({ ...p, [a.id]: e.target.value }))}
                          />
                          <Button size="sm" variant="secondary"
                            onClick={() => void avisar(ponerLogo(a.id, logos[a.id] ?? ''), t('aliados.admin.logoGuardado'))}>
                            {t('aliados.admin.guardarLogo')}
                          </Button>
                        </div>
                      )}
                      <textarea
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        rows={2}
                        maxLength={1000}
                        placeholder={t('aliados.admin.notaPlaceholder')}
                        value={notas[a.id] ?? ''}
                        onChange={(e) => setNotas((p) => ({ ...p, [a.id]: e.target.value }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" leadingIcon={<Check className="h-4 w-4" />}
                          onClick={() => void avisar(resolver(a.id, 'aprobado', notas[a.id], (c) => t(c)), t('aliados.admin.hecho'))}>
                          {t('aliados.admin.aprobar')}
                        </Button>
                        <Button size="sm" variant="secondary" leadingIcon={<X className="h-4 w-4" />}
                          onClick={() => void avisar(resolver(a.id, 'rechazado', notas[a.id], (c) => t(c)))}>
                          {t('aliados.admin.rechazar')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
