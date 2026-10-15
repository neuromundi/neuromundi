/**
 * PerfilPublicadoCard — confirmación de que el perfil está publicado.
 *
 * POR QUÉ EXISTE (15 oct 2026). PublicationSteps enseña los tres pasos para
 * aparecer en el directorio y, en cuanto se cumplen, se oculta. El resultado
 * medido en el primer pago real: la persona publica su perfil y la pantalla
 * simplemente deja de mostrar algo. Ninguna confirmación, ningún enlace para
 * comprobarlo. Quien acaba de pagar por visibilidad se queda sin saber si la
 * tiene.
 *
 * Esta tarjeta ocupa ese hueco: dice que está publicado, lleva a verlo tal
 * como lo ve el público, y —cuando corresponde— a los muros de fundadores y
 * de donantes, que hasta hoy no tenían ningún enlace desde el panel.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Crown, HandHeart } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function PerfilPublicadoCard({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [publicado, setPublicado] = useState(false);
  const [esFundador, setEsFundador] = useState(false);
  const [esDonante, setEsDonante] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [perfil, fundador, donativo] = await Promise.all([
        supabase.from('profiles').select('is_published').eq('id', userId).maybeSingle(),
        supabase.from('founder_members').select('user_id').eq('user_id', userId).maybeSingle(),
        // `donations` no está en los tipos generados del cliente, así que la
        // consulta se hace sin tipar. Es sólo una comprobación de existencia.
        (supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (a: string, b: unknown) => {
                eq: (a: string, b: unknown) => {
                  eq: (a: string, b: unknown) => {
                    limit: (n: number) => { maybeSingle: () => Promise<{ data: unknown }> };
                  };
                };
              };
            };
          };
        }).from('donations').select('id').eq('donor_user_id', userId)
          .eq('status', 'paid').eq('wall_published', true).limit(1).maybeSingle(),
      ]);
      if (!vivo) return;
      setPublicado(!!(perfil.data as { is_published?: boolean } | null)?.is_published);
      setEsFundador(!!fundador.data);
      setEsDonante(!!donativo.data);
    })();
    return () => { vivo = false; };
  }, [userId]);

  if (!publicado) return null;

  return (
    <section className="rounded-2xl border-2 border-sage-200 bg-sage-50/70 p-4">
      <h2 className="flex items-start gap-2 text-sm font-bold text-sage-800">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        {t('pubOk.titulo')}
      </h2>
      <p className="mt-1 text-sm text-slate-700">{t('pubOk.cuerpo')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/proveedor/${userId}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-sage-800 ring-1 ring-sage-200 hover:bg-sage-50"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> {t('pubOk.verPerfil')}
        </Link>
        {esFundador && (
          <Link
            to="/fundadores"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-50"
          >
            <Crown className="h-4 w-4" aria-hidden="true" /> {t('pubOk.muroFundadores')}
          </Link>
        )}
        {esDonante && (
          <Link
            to="/donantes"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50"
          >
            <HandHeart className="h-4 w-4" aria-hidden="true" /> {t('pubOk.muroDonantes')}
          </Link>
        )}
      </div>
    </section>
  );
}
