/**
 * AdminFichasRetiradas — las fichas que se retiran del directorio al vencer el
 * plazo de verificacion, con un interruptor para republicar las que el admin
 * decida (migracion 0206).
 *
 * Por que hace falta: desde 0203 la decision de retirar la toma un predicado de
 * la vista, no una columna, asi que no habia forma de exceptuar una ficha
 * concreta sin mover el plazo para todas. La bandera publicacion_forzada da esa
 * excepcion, y aqui se administra.
 *
 * Republicar NO revive una ficha dada de baja: quien pidio salir, sale.
 */
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { etiquetaDeTipo } from '@/lib/etiquetaDeTipo';
import { RefreshCw, Search, Eye, EyeOff, Globe, Phone, Mail } from 'lucide-react';
import { Button, SkeletonCard } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

interface Retirada {
  ficha_id: string;
  nombre: string | null;
  provider_type: string | null;
  sector: string | null;
  estado: string | null;
  ciudad: string | null;
  pais: string | null;
  correo: string | null;
  sitio_web: string | null;
  telefono: string | null;
  reclamada_por: string | null;
  publicacion_forzada: boolean;
  publicacion_forzada_en: string | null;
  publicacion_forzada_nota: string | null;
}

export function AdminFichasRetiradas() {
  const { t } = useTranslation();
  const toast = useToast();
  const [rows, setRows] = useState<Retirada[]>([]);
  const [buscar, setBuscar] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase.rpc('admin_fichas_retiradas', {
      p_limit: 500,
      p_buscar: q.trim() || null,
    });
    setLoading(false);
    if (err) { setError(true); return; }
    setRows((data ?? []) as unknown as Retirada[]);
  }, []);

  useEffect(() => { void load(''); }, [load]);

  const alternar = async (f: Retirada) => {
    setOcupada(f.ficha_id);
    const { data, error: err } = await supabase.rpc('admin_republicar_ficha', {
      p_ficha: f.ficha_id,
      p_republicar: !f.publicacion_forzada,
      p_nota: null,
    });
    setOcupada(null);
    if (err || !data) { toast.error(err?.message ?? t('common.errorGeneric')); return; }
    setRows((prev) => prev.map((x) => (x.ficha_id === f.ficha_id
      ? { ...x, publicacion_forzada: !f.publicacion_forzada }
      : x)));
    toast.success(f.publicacion_forzada ? t('adminFichas.retiradaDone') : t('adminFichas.republicadaDone'));
  };

  const republicadas = rows.filter((r) => r.publicacion_forzada).length;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t('adminFichas.retiradasTitle')}</h2>
      <p className="text-sm text-muted">{t('adminFichas.retiradasHelp')}</p>

      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); void load(buscar); }}
      >
        <input
          type="text"
          value={buscar}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuscar(e.target.value)}
          placeholder={t('adminFichas.buscarPlaceholder')}
          aria-label={t('adminFichas.buscarPlaceholder')}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <Button type="submit" variant="secondary" leadingIcon={<Search className="h-4 w-4" />}>
          {t('adminFichas.buscar')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void load(buscar)}
                leadingIcon={<RefreshCw className="h-4 w-4" />}>
          {t('adminFichas.refresh')}
        </Button>
      </form>

      {loading ? <SkeletonCard rows={3} /> : error ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted">
          {t('adminFichas.unavailable')}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted">
          {t('adminFichas.retiradasEmpty')}
        </p>
      ) : (
        <>
          <p className="text-xs text-muted">
            {t('adminFichas.retiradasCount', { total: rows.length, republicadas })}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] overflow-hidden rounded-2xl border border-slate-100 bg-white text-sm shadow-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-3 py-2">{t('adminFichas.colFicha')}</th>
                  <th scope="col" className="px-3 py-2">{t('adminFichas.colUbicacion')}</th>
                  <th scope="col" className="px-3 py-2">{t('adminFichas.colContacto')}</th>
                  <th scope="col" className="px-3 py-2">{t('adminFichas.colEstado')}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t('adminFichas.colAccion')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.ficha_id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-900">{f.nombre ?? '—'}</span>
                      <span className="block text-xs text-muted">{f.provider_type ? etiquetaDeTipo(t, f.provider_type) : '—'} · {f.sector ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {[f.ciudad, f.estado, f.pais].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" aria-hidden="true" />{f.correo || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" aria-hidden="true" />{f.telefono || '—'}
                      </span>
                      {f.sitio_web ? (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" aria-hidden="true" />
                          <a href={f.sitio_web} target="_blank" rel="noopener noreferrer"
                             className="text-brand-700 hover:underline">{t('adminFichas.verSitio')}</a>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {f.publicacion_forzada ? (
                        <span className="font-semibold text-sage-700">{t('adminFichas.estadoRepublicada')}</span>
                      ) : (
                        <span className="text-muted">{t('adminFichas.estadoSeRetira')}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant={f.publicacion_forzada ? 'secondary' : 'primary'}
                        loading={ocupada === f.ficha_id}
                        onClick={() => void alternar(f)}
                        leadingIcon={f.publicacion_forzada
                          ? <EyeOff className="h-4 w-4" />
                          : <Eye className="h-4 w-4" />}
                      >
                        {f.publicacion_forzada ? t('adminFichas.volverARetirar') : t('adminFichas.republicar')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
