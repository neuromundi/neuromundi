/**
 * AdminEventos — bandeja de los eventos que proponen los prestadores
 * (migración 0249). Aprobar es publicar.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, RefreshCw, Check, X, Globe2, MapPin } from 'lucide-react';
import { Button, SkeletonCard, AvisoDeFallo } from '@/components/ui';
import { useEventosEnRevision } from '@/hooks/useEventosEnRevision';
import type { RevisionEvento } from '@/hooks/useEventosPropios';
import { useAvisarResultado } from '@/hooks/useAvisarResultado';
import { formatDate } from '@/lib/utils';

const FILTROS: Array<RevisionEvento | 'todas'> = ['pendiente', 'aprobado', 'rechazado', 'todas'];

export function AdminEventos() {
  const { t } = useTranslation();
  const [filtro, setFiltro] = useState<RevisionEvento | 'todas'>('pendiente');
  const { items, loading, fallo, reload, revisar } = useEventosEnRevision(filtro);
  const avisar = useAvisarResultado();
  // La nota es lo que el prestador va a leer, así que se escribe por renglón.
  const [notas, setNotas] = useState<Record<string, string>>({});

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
              {t(`events.admin.${f}`)}
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
          {t('events.admin.empty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li key={e.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {e.title}
                    <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {t(`events.rev.${e.revision}`)}
                    </span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{e.prestador ?? t('events.admin.anon')}</span>
                    {e.member_no != null && <span>· {t('events.admin.socio', { n: e.member_no })}</span>}
                    {e.category && <span>· {t(`events.cat.${e.category}`)}</span>}
                    <span>· {formatDate(e.starts_at)}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    {e.is_online ? (
                      <><Globe2 className="h-3.5 w-3.5" aria-hidden="true" /> {e.online_url}</>
                    ) : (
                      <><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {[e.venue, e.city, e.country].filter(Boolean).join(', ')}</>
                    )}
                  </p>
                  {e.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{e.description}</p>
                  )}
                  {e.nota_admin && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{e.nota_admin}</p>
                  )}

                  {e.revision === 'pendiente' && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        rows={2}
                        maxLength={1000}
                        placeholder={t('events.admin.notaPlaceholder')}
                        value={notas[e.id] ?? ''}
                        onChange={(ev) => setNotas((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" leadingIcon={<Check className="h-4 w-4" />}
                          onClick={() => void avisar(revisar(e.id, 'aprobado', notas[e.id]), t('events.admin.hecho'))}>
                          {t('events.admin.aprobar')}
                        </Button>
                        <Button size="sm" variant="secondary" leadingIcon={<X className="h-4 w-4" />}
                          onClick={() => void avisar(revisar(e.id, 'rechazado', notas[e.id]))}>
                          {t('events.admin.rechazar')}
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
