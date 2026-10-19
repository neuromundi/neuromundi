/**
 * AdminContenido — bandeja de los artículos que proponen los miembros.
 *
 * Por qué existe (decisión de Enyoria, 19 oct 2026): el evento esperaba su
 * revisión, pero el artículo salía al blog público en el momento. Se descubrió
 * publicando uno de prueba desde una cuenta de prestador: apareció al instante,
 * sin que nadie lo viera antes. Con 1,122 invitaciones saliendo, eso era un
 * blog público abierto de par en par.
 *
 * Calcada de AdminEventos a propósito: los mismos filtros, la misma nota por
 * renglón y los mismos dos botones, para no aprender dos mecánicas.
 *
 * Se muestra el TEXTO COMPLETO del artículo, no un resumen: aprobar sin leer no
 * es moderar.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, RefreshCw, Check, X, ExternalLink } from 'lucide-react';
import { Button, SkeletonCard, AvisoDeFallo } from '@/components/ui';
import { useContenidoEnRevision, type RevisionContenido } from '@/hooks/useContenidoEnRevision';
import { useAvisarResultado } from '@/hooks/useAvisarResultado';
import { formatDate } from '@/lib/utils';
import { safeHttpUrl } from '@/lib/safeUrl';

const FILTROS: Array<RevisionContenido | 'todas'> = ['pendiente', 'aprobado', 'rechazado', 'todas'];

export function AdminContenido() {
  const { t } = useTranslation();
  const [filtro, setFiltro] = useState<RevisionContenido | 'todas'>('pendiente');
  const { items, loading, fallo, reload, revisar } = useContenidoEnRevision(filtro);
  const avisar = useAvisarResultado();
  // La nota es lo que el autor va a leer, así que se escribe por renglón.
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
              {t(`content.admin.${f}`)}
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
          {t('content.admin.empty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {c.title}
                    <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {t(`content.rev.${c.revision}`, { defaultValue: c.revision })}
                    </span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{c.autor ?? t('content.admin.anon')}</span>
                    {c.member_no != null && <span>· {t('content.admin.socio', { n: c.member_no })}</span>}
                    <span>· {formatDate(c.created_at)}</span>
                  </p>
                  {c.sections.length > 0 && (
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {c.sections.map((sec) => (
                        <span key={sec} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {t(`sections.${sec}.name`)}
                        </span>
                      ))}
                    </p>
                  )}
                  {c.external_url && (
                    <a href={safeHttpUrl(c.external_url)} target="_blank" rel="noopener noreferrer"
                       className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> {c.external_url}
                    </a>
                  )}
                  {c.excerpt && <p className="mt-2 text-sm italic text-slate-700">{c.excerpt}</p>}
                  {/* Texto completo: aprobar sin leer no es moderar. */}
                  {c.body && (
                    <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
                      {c.body}
                    </div>
                  )}
                  {c.nota_admin && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{c.nota_admin}</p>
                  )}

                  {c.revision === 'pendiente' && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        rows={2}
                        maxLength={1000}
                        placeholder={t('content.admin.notaPlaceholder')}
                        value={notas[c.id] ?? ''}
                        onChange={(ev) => setNotas((prev) => ({ ...prev, [c.id]: ev.target.value }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" leadingIcon={<Check className="h-4 w-4" />}
                          onClick={() => void avisar(revisar(c.id, 'aprobado', notas[c.id]), t('content.admin.hecho'))}>
                          {t('content.admin.aprobar')}
                        </Button>
                        <Button size="sm" variant="secondary" leadingIcon={<X className="h-4 w-4" />}
                          onClick={() => void avisar(revisar(c.id, 'rechazado', notas[c.id]))}>
                          {t('content.admin.rechazar')}
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
