/**
 * AdminCapturaTelefonica — captura de correos conseguidos por telefono.
 *
 * Por que existe (14 oct 2026): de las 415 fichas publicadas sin correo, 287
 * tienen telefono. Rastrear sus sitios web rindio 2 correos de cada 20, asi que
 * el telefono es el canal real. Esta pantalla permite anotar el correo en
 * cuanto cuelga y dejar la ficha lista para la siguiente tanda, sin tocar la
 * base a mano.
 *
 * El trabajo pesado lo hace admin_alta_correo_ficha (migracion 0207), que en una
 * sola operacion graba el correo, crea o reutiliza la invitacion con una fecha
 * de vencimiento posterior al plazo prometido, y mete la ficha al plan.
 */
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { etiquetaDeTipo } from '@/lib/etiquetaDeTipo';
import { RefreshCw, Search, Phone, Globe, Check } from 'lucide-react';
import { Button, SkeletonCard } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

interface SinCorreo {
  ficha_id: string;
  nombre: string | null;
  provider_type: string | null;
  sector: string | null;
  estado: string | null;
  ciudad: string | null;
  pais: string | null;
  telefono: string | null;
  sitio_web: string | null;
  especializacion: string | null;
}

const TANDA_TELEFONO = 9;

export function AdminCapturaTelefonica() {
  const { t } = useTranslation();
  const toast = useToast();
  const [rows, setRows] = useState<SinCorreo[]>([]);
  const [buscar, setBuscar] = useState('');
  const [correos, setCorreos] = useState<Record<string, string>>({});
  const [tanda, setTanda] = useState<number>(TANDA_TELEFONO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase.rpc('admin_fichas_sin_correo', {
      p_limit: 300,
      p_buscar: q.trim() || null,
    });
    setLoading(false);
    if (err) { setError(true); return; }
    setRows((data ?? []) as unknown as SinCorreo[]);
  }, []);

  useEffect(() => { void load(''); }, [load]);

  const guardar = async (f: SinCorreo) => {
    const correo = (correos[f.ficha_id] ?? '').trim();
    if (!correo) return;
    setOcupada(f.ficha_id);
    const { data, error: err } = await supabase.rpc('admin_alta_correo_ficha', {
      p_ficha: f.ficha_id,
      p_correo: correo,
      p_tanda: tanda,
      p_nota: null,
    });
    setOcupada(null);
    if (err || !data) { toast.error(err?.message ?? t('common.errorGeneric')); return; }
    toast.success(t('adminFichas.altaDone', { tanda }));
    // Sale de la lista: ya tiene correo.
    setRows((prev) => prev.filter((x) => x.ficha_id !== f.ficha_id));
    setCorreos((prev) => { const n = { ...prev }; delete n[f.ficha_id]; return n; });
  };

  const conTelefono = rows.filter((r) => (r.telefono ?? '').trim() !== '').length;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t('adminFichas.capturaTitle')}</h2>
      <p className="text-sm text-muted">{t('adminFichas.capturaHelp')}</p>

      <div className="flex flex-wrap items-end gap-2">
        <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void load(buscar); }}>
          <input
            type="text"
            value={buscar}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuscar(e.target.value)}
            placeholder={t('adminFichas.buscarTelPlaceholder')}
            aria-label={t('adminFichas.buscarTelPlaceholder')}
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
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">{t('adminFichas.tandaDestino')}</span>
          <input
            type="number"
            min={1}
            max={99}
            value={tanda}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTanda(Number(e.target.value) || TANDA_TELEFONO)}
            className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            aria-label={t('adminFichas.tandaDestino')}
          />
        </label>
      </div>

      {loading ? <SkeletonCard rows={3} /> : error ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted">
          {t('adminFichas.unavailable')}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted">
          {t('adminFichas.capturaEmpty')}
        </p>
      ) : (
        <>
          <p className="text-xs text-muted">
            {t('adminFichas.capturaCount', { total: rows.length, conTelefono })}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] overflow-hidden rounded-2xl border border-slate-100 bg-white text-sm shadow-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-3 py-2">{t('adminFichas.colFicha')}</th>
                  <th scope="col" className="px-3 py-2">{t('adminFichas.colUbicacion')}</th>
                  <th scope="col" className="px-3 py-2">{t('adminFichas.colTelefono')}</th>
                  <th scope="col" className="px-3 py-2">{t('adminFichas.colCorreoNuevo')}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t('adminFichas.colAccion')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.ficha_id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-900">{f.nombre ?? '—'}</span>
                      <span className="block text-xs text-muted">{f.provider_type ? etiquetaDeTipo(t, f.provider_type) : '—'} · {f.sector ?? '—'}</span>
                      {f.sitio_web ? (
                        <a href={f.sitio_web} target="_blank" rel="noopener noreferrer"
                           className="mt-0.5 flex items-center gap-1 text-xs text-brand-700 hover:underline">
                          <Globe className="h-3 w-3" aria-hidden="true" />{t('adminFichas.verSitio')}
                        </a>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {[f.ciudad, f.estado, f.pais].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {f.telefono ? (
                        <a href={`tel:${f.telefono.replace(/\s+/g, '')}`}
                           className="flex items-center gap-1 font-medium text-brand-700 hover:underline">
                          <Phone className="h-3 w-3" aria-hidden="true" />{f.telefono}
                        </a>
                      ) : <span className="text-muted">{t('adminFichas.sinTelefono')}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        value={correos[f.ficha_id] ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCorreos((prev) => ({ ...prev, [f.ficha_id]: e.target.value }))}
                        placeholder="correo@ejemplo.com"
                        aria-label={t('adminFichas.colCorreoNuevo')}
                        className="w-full min-w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        loading={ocupada === f.ficha_id}
                        disabled={!(correos[f.ficha_id] ?? '').trim()}
                        onClick={() => void guardar(f)}
                        leadingIcon={<Check className="h-4 w-4" />}
                      >
                        {t('adminFichas.guardarYEncolar')}
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
