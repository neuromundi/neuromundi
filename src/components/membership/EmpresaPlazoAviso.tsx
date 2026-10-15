/**
 * EmpresaPlazoAviso — estado del plazo para publicar la primera oferta.
 *
 * POR QUÉ EXISTE (14 oct 2026). La membresía de una empresa es gratuita
 * porque ofrece empleo, voluntariado o servicio social a personas
 * neurodivergentes. Antes se concedía esa exención para siempre con sólo
 * elegir la tarjeta, sin comprobar nada. Ahora nace provisional: a los 30 días
 * sin ninguna oferta el perfil sale del directorio, y a los 45 se limitan
 * mensajería y Academy (migración 0223).
 *
 * En ningún momento se cobra nada, y publicar una oferta reactiva todo en el
 * acto. Este aviso existe para que eso no sorprenda a nadie: dice en qué
 * etapa está, cuántos días quedan y qué hay que hacer.
 *
 * No se pinta nada cuando la empresa ya tiene una oferta viva: quien está al
 * corriente no necesita que le recuerden una regla que no le afecta.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Estado {
  aplica: boolean;
  con_oferta?: boolean;
  dias?: number;
  etapa?: 'al_corriente' | 'provisional' | 'sin_directorio' | 'limitada';
  dias_para_directorio?: number;
  dias_para_limite?: number;
}

export function EmpresaPlazoAviso() {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const [e, setE] = useState<Estado | null>(null);

  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    (async () => {
      const { data } = await supabase.rpc('empresa_estado', { p_id: userId });
      if (vivo) setE((data as Estado) ?? null);
    })();
    return () => { vivo = false; };
  }, [userId]);

  if (!e?.aplica || e.etapa === 'al_corriente') return null;

  const grave = e.etapa === 'sin_directorio' || e.etapa === 'limitada';
  const cuerpo =
    e.etapa === 'limitada' ? t('empresaPlazo.limitada')
    : e.etapa === 'sin_directorio' ? t('empresaPlazo.sinDirectorio', { dias: e.dias_para_limite ?? 0 })
    : t('empresaPlazo.provisional', { dias: e.dias_para_directorio ?? 0 });

  return (
    <section
      role="status"
      className={`rounded-2xl border-2 p-4 ${
        grave ? 'border-amber-300 bg-amber-50' : 'border-brand-200 bg-brand-50/70'
      }`}
    >
      <h2 className={`flex items-start gap-2 text-sm font-bold ${grave ? 'text-amber-900' : 'text-brand-800'}`}>
        {grave
          ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          : <Briefcase className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
        {grave ? t('empresaPlazo.tituloGrave') : t('empresaPlazo.titulo')}
      </h2>
      <p className={`mt-2 text-sm ${grave ? 'text-amber-900' : 'text-slate-700'}`}>{cuerpo}</p>
      <p className="mt-2 text-xs font-medium text-slate-600">{t('empresaPlazo.comoReactivar')}</p>
    </section>
  );
}
