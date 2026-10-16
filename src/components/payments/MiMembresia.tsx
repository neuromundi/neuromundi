/**
 * MiMembresia — qué pagó, hasta cuándo, y cómo darse de baja.
 *
 * Por qué existe (15 oct 2026, auditoría, hallazgo C-9): la membresía es una
 * suscripción anual de Stripe y no había NINGUNA pantalla que dijera «vigente
 * hasta tal fecha», ni forma alguna de darla de baja. Quien se daba de baja, se
 * suspendía o borraba su cuenta seguía con la suscripción viva y le volvían a
 * cobrar. La única salida real era el contracargo.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, CalendarClock, CircleSlash, AlertTriangle } from 'lucide-react';
import { Button, useToast, useConfirm } from '@/components/ui';
import { supabase } from '@/lib/supabase';

interface Membresia {
  estado: string | null;
  vigente_hasta: string | null;
  periodicidad: string | null;
  tiene_suscripcion: boolean;
  baja_solicitada_en: string | null;
  exenta: boolean;
  exencion_vigente_hasta: string | null;
}

const fecha = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date(iso))
    : '—';

export function MiMembresia() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirmar = useConfirm();
  const [m, setM] = useState<Membresia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc('mi_membresia');
    const fila = Array.isArray(data) ? data[0] : data;
    setM((fila as Membresia | null) ?? null);
    setCargando(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const darDeBaja = useCallback(async () => {
    const ok = await confirmar({
      title: t('membresia.bajaTitulo'),
      message: t('membresia.bajaAviso', { fecha: fecha(m?.vigente_hasta ?? null) }),
      confirmLabel: t('membresia.bajaConfirmar'), danger: true,
    });
    if (!ok) return;
    setOcupado(true);
    const { data, error } = await supabase.functions.invoke('cancelar-membresia', { body: {} });
    setOcupado(false);
    const resp = data as { ok?: boolean; error?: string } | null;
    if (error || !resp?.ok) {
      toast.error(resp?.error ?? t('membresia.bajaFallo'));
      return;
    }
    toast.success(t('membresia.bajaHecha'));
    await cargar();
  }, [confirmar, t, m?.vigente_hasta, toast, cargar]);

  if (cargando || !m) return null;

  // Familias, pacientes, ONG y empresas no pagan: no se les ofrece una baja
  // que no tiene nada que cancelar.
  if (m.exenta) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-sage-200 bg-sage-50 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sage-700" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-sage-900">{t('membresia.exenta')}</p>
          {m.exencion_vigente_hasta ? (
            <p className="mt-1 text-sm text-sage-800">
              {t('membresia.exentaHasta', { fecha: fecha(m.exencion_vigente_hasta) })}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const deBaja = !!m.baja_solicitada_en;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-brand-700" aria-hidden="true" />
        <h3 className="text-sm font-bold text-slate-900">{t('membresia.title')}</h3>
      </div>

      <p className="text-sm text-slate-700">
        {t(`membresia.estado.${m.estado ?? 'pending'}`, { defaultValue: m.estado ?? '' })}
        {m.periodicidad ? ` · ${t(`membresia.periodo.${m.periodicidad}`)}` : ''}
      </p>
      <p className="mt-1 text-sm text-muted">
        {t('membresia.vigenteHasta', { fecha: fecha(m.vigente_hasta) })}
      </p>

      {deBaja ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm text-amber-900">
            {t('membresia.yaDeBaja', { fecha: fecha(m.vigente_hasta) })}
          </p>
        </div>
      ) : m.tiene_suscripcion ? (
        <>
          <p className="mt-3 text-xs text-muted">{t('membresia.bajaNota')}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-red-700"
            disabled={ocupado}
            onClick={() => void darDeBaja()}
            leadingIcon={<CircleSlash className="h-4 w-4" />}
          >
            {t('membresia.baja')}
          </Button>
        </>
      ) : null}
    </div>
  );
}
