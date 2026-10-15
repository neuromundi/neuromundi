/**
 * AdminSolicitudesFundador — bandeja de quienes piden la cuota de Miembro
 * Fundador cuando el cupo de su país ya se agotó o el plazo venció.
 *
 * POR QUÉ EXISTE (14 oct 2026). Alguien invitado expresamente a la cuota de
 * fundador puede quedarse fuera por días o por minutos. Hasta ahora sólo veía
 * el precio ordinario, al doble, sin explicación ni salida: la peor primera
 * impresión posible para justo el perfil que más interesa captar.
 *
 * CONCEDER NO AMPLÍA EL CUPO. Subir el tope del país abriría un lugar que
 * tomaría cualquiera —el siguiente en pagar, no la persona a quien se le quiso
 * dar—. Aquí se autoriza a esa persona en concreto: el cupo general no se
 * mueve y queda constancia de quién autorizó y cuándo (migración 0218).
 *
 * La columna "usados / cupo" se muestra para decidir con el dato a la vista:
 * no es lo mismo conceder con el cupo recién agotado que con treinta
 * solicitudes encima.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Crown, Check, X } from 'lucide-react';
import { Button, SkeletonCard } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

interface Fila {
  user_id: string;
  nombre: string | null;
  correo: string | null;
  pais: string | null;
  kind: string | null;
  affiliate_type: string | null;
  nota_usuario: string | null;
  status: string;
  solicitada_en: string;
  nota_admin: string | null;
  usados: number | null;
  cupo: number | null;
}

const ESTADOS = ['pendiente', 'aprobada', 'rechazada', 'todas'] as const;

const fecha = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso)) : '—';

export function AdminSolicitudesFundador() {
  const { t } = useTranslation();
  const toast = useToast();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>('pendiente');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setFilas(null); setError(false);
    const { data, error: err } = await supabase.rpc('admin_solicitudes_fundador', { p_status: estado });
    if (err) { setError(true); setFilas([]); return; }
    setFilas((data ?? []) as Fila[]);
  }, [estado]);

  useEffect(() => { void cargar(); }, [cargar]);

  const resolver = async (f: Fila, conceder: boolean) => {
    setOcupado(f.user_id);
    const { error: err } = await supabase.rpc('admin_resolver_solicitud_fundador', {
      p_user: f.user_id, p_conceder: conceder, p_nota: null,
    });
    setOcupado(null);
    if (err) { toast.error(t('solFund.errResolver')); return; }
    toast.success(conceder ? t('solFund.okConcedida') : t('solFund.okRechazada'));
    void cargar();
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Crown className="h-5 w-5 text-amber-500" aria-hidden="true" /> {t('solFund.title')}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('solFund.help')}</p>
        </div>
        <Button variant="secondary" onClick={() => void cargar()} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('solFund.refresh')}
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {ESTADOS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEstado(e)}
            aria-pressed={estado === e}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              estado === e ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t(`solFund.estados.${e}`)}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{t('solFund.unavailable')}</p>}
      {filas === null ? (
        <SkeletonCard />
      ) : filas.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted">{t('solFund.vacio')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="p-3">{t('solFund.colQuien')}</th>
                <th className="p-3">{t('solFund.colPais')}</th>
                <th className="p-3 text-right tabular-nums">{t('solFund.colCupo')}</th>
                <th className="p-3">{t('solFund.colPedida')}</th>
                <th className="p-3">{t('solFund.colNota')}</th>
                <th className="p-3 text-right">{t('solFund.colAccion')}</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const lleno = f.usados != null && f.cupo != null && f.usados >= f.cupo;
                return (
                  <tr key={f.user_id} className="border-t border-slate-100 align-top">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{f.nombre || '—'}</div>
                      <div className="text-xs text-muted">{f.correo || '—'}</div>
                      <div className="text-xs text-muted">{f.affiliate_type || f.kind || '—'}</div>
                    </td>
                    <td className="p-3 text-slate-700">{f.pais || '—'}</td>
                    <td className="p-3 text-right tabular-nums">
                      <span className={lleno ? 'font-bold text-amber-700' : 'text-slate-700'}>
                        {f.usados ?? '—'} / {f.cupo ?? '—'}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted">{fecha(f.solicitada_en)}</td>
                    <td className="p-3 max-w-xs text-xs text-slate-700">{f.nota_usuario || '—'}</td>
                    <td className="p-3 text-right">
                      {f.status === 'pendiente' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => void resolver(f, true)}
                            loading={ocupado === f.user_id}
                            leadingIcon={<Check className="h-4 w-4" />}
                          >
                            {t('solFund.conceder')}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => void resolver(f, false)}
                            loading={ocupado === f.user_id}
                            leadingIcon={<X className="h-4 w-4" />}
                          >
                            {t('solFund.rechazar')}
                          </Button>
                        </div>
                      ) : (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                          f.status === 'aprobada' ? 'bg-sage-100 text-sage-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t(`solFund.estados.${f.status}`)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
