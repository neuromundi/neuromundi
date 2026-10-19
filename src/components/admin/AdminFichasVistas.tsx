/**
 * AdminFichasVistas — qué fichas CURADAS del directorio se están abriendo.
 *
 * Las fichas curadas se ven en la misma página que los perfiles de miembro,
 * pero viven en otra tabla y hasta ahora sus visitas no se contaban en ninguna
 * parte. Esto es lo que permite saber si una tanda de invitaciones movió algo:
 * cuántas fichas se abrieron, cuántas de esas visitas venían de alguien con
 * sesión iniciada y cuántos contactos salieron de ahí.
 *
 * Los perfiles de miembros NO salen aquí: tienen su propia medición.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, RefreshCw } from 'lucide-react';
import { Button, SkeletonCard } from '@/components/ui';
import { supabase } from '@/lib/supabase';

interface Resumen {
  fichas_vistas: number;
  visitas: number;
  visitas_con_sesion: number;
  contactos: number;
}

interface Fila {
  ficha_id: string;
  nombre: string;
  ciudad: string | null;
  estado: string | null;
  pais: string | null;
  reclamada: boolean;
  vistas: number;
  vistas_con_sesion: number;
  contactos: number;
  ultima: string | null;
}

const PERIODOS = [7, 30] as const;

export function AdminFichasVistas() {
  const { t, i18n } = useTranslation();
  const [dias, setDias] = useState<number>(7);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async (d: number) => {
    setCargando(true);
    setError(false);
    const [res, lista] = await Promise.all([
      supabase.rpc('admin_resumen_de_fichas', { p_dias: d }),
      supabase.rpc('admin_fichas_mas_vistas', { p_dias: d, p_limite: 50 }),
    ]);
    setCargando(false);
    if (res.error || lista.error) { setError(true); return; }
    const r = (res.data as unknown as Resumen[])?.[0] ?? null;
    setResumen(r);
    setFilas((lista.data as unknown as Fila[]) ?? []);
  }, []);

  useEffect(() => { void cargar(dias); }, [cargar, dias]);

  const lugar = (f: Fila) => [f.ciudad, f.estado, f.pais].filter(Boolean).join(', ');
  const fecha = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' }) : '—';

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Eye className="h-5 w-5 text-brand-700" aria-hidden="true" />
          {t('fichasVistas.title')}
        </h3>
        <div className="flex items-center gap-2">
          {PERIODOS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDias(d)}
              aria-pressed={dias === d}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                dias === d ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700'
              }`}
            >
              {t('fichasVistas.dias', { count: d })}
            </button>
          ))}
          <Button size="sm" variant="secondary" onClick={() => void cargar(dias)} leadingIcon={<RefreshCw className="h-4 w-4" />}>
            {t('metrics.refresh')}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted">{t('fichasVistas.hint')}</p>

      {cargando ? (
        <SkeletonCard rows={3} />
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-muted">
          {t('fichasVistas.error')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['fichasVistas.totFichas', resumen?.fichas_vistas ?? 0],
              ['fichasVistas.totVisitas', resumen?.visitas ?? 0],
              ['fichasVistas.totSesion', resumen?.visitas_con_sesion ?? 0],
              ['fichasVistas.totContactos', resumen?.contactos ?? 0],
            ].map(([clave, valor]) => (
              <div key={clave as string} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-2xl font-extrabold text-slate-900">{(valor as number).toLocaleString()}</p>
                <p className="text-xs text-muted">{t(clave as string)}</p>
              </div>
            ))}
          </div>

          {filas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-muted">
              {t('fichasVistas.vacio')}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-muted">
                    <th className="p-3">{t('fichasVistas.colFicha')}</th>
                    <th className="p-3">{t('fichasVistas.colLugar')}</th>
                    <th className="p-3 text-right">{t('fichasVistas.colVisitas')}</th>
                    <th className="p-3 text-right">{t('fichasVistas.colSesion')}</th>
                    <th className="p-3 text-right">{t('fichasVistas.colContactos')}</th>
                    <th className="p-3 text-right">{t('fichasVistas.colUltima')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.ficha_id} className="border-b border-slate-50 last:border-0">
                      <td className="p-3">
                        <span className="font-semibold text-slate-900">{f.nombre}</span>
                        {f.reclamada && (
                          <span className="ml-2 rounded-full bg-sage-50 px-2 py-0.5 text-xs font-semibold text-sage-700">
                            {t('fichasVistas.reclamada')}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{lugar(f) || '—'}</td>
                      <td className="p-3 text-right font-semibold tabular-nums">{f.vistas.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums text-slate-600">{f.vistas_con_sesion.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums text-slate-600">{f.contactos.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-600">{fecha(f.ultima)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
