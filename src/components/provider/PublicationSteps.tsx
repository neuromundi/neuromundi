/**
 * PublicationSteps — los tres pasos para aparecer en el directorio.
 *
 * Regla (migración 0163): publicar exige perfil COMPLETO y cuota CUBIERTA
 * —pagada o exenta—, y la propia base de datos lo impide con un trigger. Antes
 * la casilla de Ajustes era el único camino y nadie la veía; peor aún, la vista
 * mostraba 30 días de gracia a quien no había completado ni pagado (migración
 * 0165 la retiró), así que el panel prometía una visibilidad que ya no existe.
 *
 * Este componente hace consciente el requisito: enseña los tres pasos, cuál
 * falta y qué falta exactamente, y sólo habilita "Publicar" cuando procede.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, Lock } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useMembership } from '@/hooks/useMembership';

type Estado = {
  completo: boolean;
  faltantes: string[];
  cuota: boolean;
  exento: boolean;
  publicado: boolean;
  suspendido: boolean;
  puede: boolean;
};

export function PublicationSteps({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { startCheckout } = useMembership();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const leer = useCallback(async () => {
    const { data, error } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc('estado_publicacion', { p_id: userId });
    if (error) { setEstado(null); return; }
    setEstado(data as unknown as Estado);
  }, [userId]);

  useEffect(() => { void leer(); }, [leer]);

  // Ya publicado, o suspendido (no es su decisión): nada que mostrar aquí.
  if (!estado || estado.publicado || estado.suspendido) return null;

  async function publicar() {
    setOcupado(true);
    const { error } = await supabase.from('profiles').update({ is_published: true }).eq('id', userId);
    setOcupado(false);
    if (error) {
      toast.error(/perfil_no_publicable/.test(error.message) ? t('pub.blocked') : error.message);
      void leer();
      return;
    }
    toast.success(t('pub.done'));
    void leer();
  }

  async function pagar() {
    setOcupado(true);
    const res = await startCheckout('annual');
    if (!res.ok) { toast.error(t('membership.payError')); setOcupado(false); }
  }

  const faltantes = (estado.faltantes ?? []).map((f) => t(`pub.missing.${f}`)).join(', ');

  return (
    <section className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4" aria-labelledby="pub-title">
      <div className="flex items-start gap-3">
        <EyeOff className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="pub-title" className="font-bold text-amber-900">{t('pub.title')}</h2>
          <p className="text-sm text-amber-800">{t('pub.intro')}</p>

          <ol className="mt-3 space-y-3">
            <Paso
              n={1}
              hecho={estado.completo}
              titulo={t('pub.step1.title')}
              detalle={estado.completo ? t('pub.step1.ok') : t('pub.step1.missing', { campos: faltantes })}
            >
              {!estado.completo && (
                <Button size="sm" variant="secondary" onClick={() => navigate('/ajustes')}>
                  {t('pub.step1.cta')}
                </Button>
              )}
            </Paso>

            <Paso
              n={2}
              hecho={estado.cuota}
              titulo={t('pub.step2.title')}
              detalle={estado.exento ? t('pub.step2.exempt') : estado.cuota ? t('pub.step2.ok') : t('pub.step2.pending')}
            >
              {!estado.cuota && (
                <Button size="sm" variant="secondary" loading={ocupado} onClick={() => void pagar()}>
                  {t('pub.step2.cta')}
                </Button>
              )}
            </Paso>

            <Paso
              n={3}
              hecho={false}
              titulo={t('pub.step3.title')}
              detalle={estado.puede ? t('pub.step3.ready') : t('pub.step3.locked')}
            >
              <Button
                size="sm"
                disabled={!estado.puede}
                loading={ocupado}
                leadingIcon={estado.puede ? <Eye className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
                onClick={() => void publicar()}
              >
                {t('pub.step3.cta')}
              </Button>
            </Paso>
          </ol>
        </div>
      </div>
    </section>
  );
}

function Paso({ n, hecho, titulo, detalle, children }: {
  n: number; hecho: boolean; titulo: string; detalle: string; children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          hecho ? 'bg-emerald-600 text-white' : 'bg-white text-amber-800 ring-1 ring-amber-300'
        }`}
        aria-hidden="true"
      >
        {hecho ? <Check className="h-4 w-4" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${hecho ? 'text-emerald-800' : 'text-amber-900'}`}>{titulo}</p>
        <p className="text-sm text-amber-800">{detalle}</p>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </li>
  );
}
