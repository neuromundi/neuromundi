/**
 * ExemptionCard — expediente de exención de cuota del miembro.
 *
 * Quedan exentas las entidades públicas y las organizaciones del sector social;
 * ser asociación civil no basta por sí solo. Lo que acredita a una organización
 * social es un registro público y verificable: estar en el padrón de donatarias
 * autorizadas del SAT o tener CLUNI vigente del Registro Federal de OSC.
 *
 * La exención de una entidad pública o de una empresa inclusiva no caduca. La
 * del sector social dura un año: al renovarse hay que volver a comprobar que la
 * donataria o la CLUNI siguen vigentes (migración 0168).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, CalendarClock, FileUp, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';

const MAX_MB = 10;

type Estado = {
  aplica: boolean;
  sector: string | null;
  tipo: 'publico' | 'donataria' | 'cluni' | 'empresa' | null;
  folio: string | null;
  documento: string | null;
  solicitada: string | null;
  aprobada: string | null;
  vence: string | null;
  vencida: boolean;
  permanente: boolean;
  rechazo: string | null;
  dias: number | null;
};

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

export function ExemptionCard({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<'donataria' | 'cluni' | 'publico'>('donataria');
  const [folio, setFolio] = useState('');
  const [ruta, setRuta] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const leer = useCallback(async () => {
    const { data, error } = await (supabase as unknown as Rpc).rpc('estado_exencion', { p_id: userId });
    if (error) { setEstado(null); return; }
    setEstado(data as Estado);
  }, [userId]);

  useEffect(() => { void leer(); }, [leer]);

  if (!estado) return null;
  // Sin exención vigente ni en trámite y sin sector que la justifique: nada que
  // mostrar salvo la puerta de entrada para quien crea tener derecho.
  const enTramite = !!estado.solicitada && !estado.aprobada;
  const vigente = !!estado.aprobada && !estado.vencida;

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(t('exe.tooBig', { mb: MAX_MB })); e.target.value = ''; return; }
    setSubiendo(true);
    const safe = f.name.replace(/[^\w.\-]/g, '_');
    const path = `${userId}/exencion-${Date.now()}-${safe}`;
    const up = await supabase.storage.from('verification').upload(path, f, { contentType: f.type || 'application/octet-stream' });
    setSubiendo(false);
    if (up.error) { toast.error(t('exe.uploadError')); return; }
    setRuta(path);
    toast.success(t('exe.uploaded'));
  }

  async function enviar() {
    if (!folio.trim()) { toast.error(t('exe.needFolio')); return; }
    setEnviando(true);
    const { error } = await (supabase as unknown as Rpc).rpc('solicitar_exencion', {
      p_tipo: tipo, p_folio: folio.trim(), p_documento: ruta,
    });
    setEnviando(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('exe.sent'));
    setAbierto(false); setFolio(''); setRuta(null);
    void leer();
  }

  const marco = estado.vencida ? 'border-red-300 bg-red-50'
    : vigente ? 'border-emerald-300 bg-emerald-50'
    : enTramite ? 'border-sky-300 bg-sky-50'
    : 'border-slate-200 bg-white';

  return (
    <section className={`mb-4 rounded-2xl border p-4 ${marco}`} aria-labelledby="exe-title">
      <div className="flex items-start gap-3">
        {estado.vencida ? <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-700" aria-hidden="true" />
          : vigente ? <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
          : <BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-slate-500" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <h2 id="exe-title" className="font-bold text-slate-900">{t('exe.title')}</h2>

          {estado.permanente && vigente && (
            <p className="text-sm text-slate-700">{t('exe.permanent')}</p>
          )}

          {vigente && !estado.permanente && (
            <p className="text-sm text-slate-700">
              <CalendarClock className="mr-1 inline h-4 w-4 align-[-3px]" aria-hidden="true" />
              {t('exe.validUntil', {
                fecha: estado.vence ? new Date(estado.vence).toLocaleDateString() : '',
                dias: estado.dias ?? 0,
              })}
            </p>
          )}

          {estado.vencida && <p className="text-sm text-red-800">{t('exe.expired')}</p>}
          {enTramite && <p className="text-sm text-sky-800">{t('exe.pending')}</p>}
          {estado.rechazo && <p className="mt-1 text-sm text-red-800">{t('exe.rejected', { motivo: estado.rechazo })}</p>}
          {!vigente && !enTramite && !estado.vencida && (
            <p className="text-sm text-slate-700">{t('exe.who')}</p>
          )}

          {!abierto && !enTramite && (
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => setAbierto(true)}>
              {estado.vencida || vigente ? t('exe.renew') : t('exe.request')}
            </Button>
          )}

          {abierto && (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <label htmlFor="exe-tipo" className="block text-sm font-semibold text-slate-800">{t('exe.type')}</label>
                <select
                  id="exe-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as 'donataria' | 'cluni' | 'publico')}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="donataria">{t('exe.typeDonataria')}</option>
                  <option value="cluni">{t('exe.typeCluni')}</option>
                  <option value="publico">{t('exe.typePublico')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="exe-folio" className="block text-sm font-semibold text-slate-800">
                  {tipo === 'cluni' ? t('exe.folioCluni') : t('exe.folioRfc')}
                </label>
                <input
                  id="exe-folio"
                  value={folio}
                  onChange={(e) => setFolio(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  autoComplete="off"
                />
              </div>
              <div>
                <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={(e) => void subir(e)} className="hidden" />
                <Button size="sm" variant="secondary" loading={subiendo}
                        leadingIcon={<FileUp className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => fileRef.current?.click()}>
                  {ruta ? t('exe.docReady') : t('exe.doc')}
                </Button>
                <p className="mt-1 text-xs text-muted">{t('exe.docHint', { mb: MAX_MB })}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" loading={enviando} onClick={() => void enviar()}>{t('exe.send')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setAbierto(false)}>{t('common.cancel')}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
