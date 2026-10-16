/**
 * AdminPreguntasExperto — bandeja de "Pregunta al experto".
 * Auditoría 15 oct 2026, hallazgo M-15.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircleQuestion, RefreshCw, Check, X } from 'lucide-react';
import { Button, SkeletonCard, AvisoDeFallo } from '@/components/ui';
import { usePreguntasExperto, type EstadoPregunta } from '@/hooks/usePreguntasExperto';
import { useAvisarResultado } from '@/hooks/useAvisarResultado';
import { formatDate } from '@/lib/utils';

const FILTROS: Array<EstadoPregunta | 'todas'> = ['pendiente', 'respondida', 'descartada', 'todas'];

export function AdminPreguntasExperto() {
  const { t } = useTranslation();
  const [filtro, setFiltro] = useState<EstadoPregunta | 'todas'>('pendiente');
  const { items, loading, fallo, reload, resolver } = usePreguntasExperto(filtro);
  const avisar = useAvisarResultado();

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
              {t(`expert.admin.${f}`)}
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
          {t('expert.admin.empty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <li key={q.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{q.pregunta}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{q.nombre ?? t('expert.admin.anon')}</span>
                    {q.correo && <span>· {q.correo}</span>}
                    {q.pais && <span>· {q.pais}</span>}
                    {q.categoria && <span>· {q.categoria}</span>}
                    <span>· {formatDate(q.created_at)}</span>
                    {q.es_miembro && <span>· {t('expert.admin.member')}</span>}
                  </p>
                  {q.nota_admin && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{q.nota_admin}</p>
                  )}
                  {q.estado === 'pendiente' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        leadingIcon={<Check className="h-4 w-4" />}
                        onClick={() => void avisar(resolver(q.id, 'respondida'))}
                      >
                        {t('expert.admin.markAnswered')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        leadingIcon={<X className="h-4 w-4" />}
                        onClick={() => void avisar(resolver(q.id, 'descartada'))}
                      >
                        {t('expert.admin.discard')}
                      </Button>
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
