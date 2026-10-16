/**
 * SolicitudesDeContacto — bandeja de solicitudes de contacto.
 *
 * La misma pantalla sirve a los dos lados: el prestador ve las que recibió y
 * puede aceptar o declinar; la familia ve las que mandó y en qué quedaron.
 * (Decisión de Enyoria, 16 oct 2026.)
 */
import { useTranslation } from 'react-i18next';
import { MessageSquarePlus, RefreshCw, Check, X } from 'lucide-react';
import { Button, SkeletonCard, AvisoDeFallo } from '@/components/ui';
import { useSolicitudesContacto } from '@/hooks/useSolicitudesContacto';
import { useAvisarResultado } from '@/hooks/useAvisarResultado';
import { formatDate } from '@/lib/utils';

export function SolicitudesDeContacto() {
  const { t } = useTranslation();
  const { items, loading, fallo, reload, responder } = useSolicitudesContacto('todas');
  const avisar = useAvisarResultado();

  if (loading) return <div className="space-y-3"><SkeletonCard rows={0} /><SkeletonCard rows={0} /></div>;
  if (fallo) return <AvisoDeFallo onRetry={() => void reload()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{t('contacto.bandeja.total', { n: items.length })}</p>
        <Button size="sm" variant="secondary" onClick={() => void reload()} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('common.refresh')}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted">
          {t('contacto.bandeja.vacia')}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className={`rounded-2xl border border-slate-100 p-4 shadow-sm ${s.estado === 'pendiente' ? 'bg-white' : 'bg-slate-50'}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {s.otro_nombre ?? t('contacto.bandeja.anon')}
                    <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {t(`contacto.estado.${s.estado}`)}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{s.mensaje}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(s.created_at)}</p>
                  {s.nota_respuesta && (
                    <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-700">{s.nota_respuesta}</p>
                  )}

                  {/* Sólo el prestador resuelve, y sólo lo que sigue pendiente. */}
                  {s.soy === 'prestador' && s.estado === 'pendiente' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" leadingIcon={<Check className="h-4 w-4" />}
                        onClick={() => void avisar(responder(s.id, true), t('contacto.aceptada'))}>
                        {t('contacto.aceptar')}
                      </Button>
                      <Button size="sm" variant="secondary" leadingIcon={<X className="h-4 w-4" />}
                        onClick={() => void avisar(responder(s.id, false))}>
                        {t('contacto.declinar')}
                      </Button>
                    </div>
                  )}

                  {s.soy === 'consumidor' && s.estado === 'aceptada' && (
                    <p className="mt-2 text-sm font-semibold text-sage-700">{t('contacto.puedeEscribir')}</p>
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
