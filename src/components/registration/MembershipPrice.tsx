/**
 * MembershipPrice — costo de membresía en el registro.
 *
 * Modos:
 *  · Por tipo de tarjeta (`type`): patient/parent/company → "Gratuito";
 *    tipos de pago con precio → cuota; sin precio → nada. 'service_provider' usa
 *    "desde" (mínimo entre especialista médico/no médico).
 *  · Por afiliación resuelta (`affiliate`): consulta ese tipo exacto (p. ej. el
 *    formulario de especialista, una vez que la profesión define si es médica).
 *  · `pending`: muestra un texto de espera (aún no hay dato para resolver).
 *  · `boxed`: envuelve todo en un recuadro con `boxLabel` (para la barra lateral
 *    del formulario).
 *
 * Costo MENSUAL destacado + anual pequeño; en etapa de fundadores la cuota
 * ordinaria aparece tachada. Datos desde la RPC `registration_quote` (0111).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCountry } from '@/stores/countryStore';
import { supabase } from '@/lib/supabase';

const FREE = new Set(['patient', 'parent', 'company']);
const TYPE_MAP: Record<string, string> = { clinic: 'clinic', service_provider: 'specialist' };

interface Quote {
  configured: boolean;
  is_from?: boolean;
  currency?: string;
  founder_monthly?: number | null;
  founder_annual?: number | null;
  ordinary_monthly?: number | null;
  ordinary_annual?: number | null;
}

interface Props {
  type?: string;
  affiliate?: string;
  pending?: boolean;
  pendingText?: string;
  boxed?: boolean;
  boxLabel?: string;
  /** Si el tipo/país no tiene precio configurado, no renderiza nada (oculta el recuadro). */
  hideIfEmpty?: boolean;
  className?: string;
}

export function MembershipPrice({ type, affiliate, pending, pendingText, boxed, boxLabel, hideIfEmpty, className = '' }: Props) {
  const { t } = useTranslation();
  const { country } = useCountry();
  const [q, setQ] = useState<Quote | null>(null);
  const free = !!type && FREE.has(type);
  const pType = affiliate ?? (type ? (TYPE_MAP[type] ?? type) : null);

  useEffect(() => {
    if (free || pending || !pType || !country) { setQ(null); return; }
    let alive = true;
    (async () => {
      const { data } = await (supabase as unknown as {
        rpc: (f: string, a: unknown) => Promise<{ data: unknown }>;
      }).rpc('registration_quote', { p_type: pType, p_country: country });
      if (alive) setQ((data as Quote) ?? null);
    })();
    return () => { alive = false; };
  }, [pType, country, free, pending]);

  const fmt = (n: number, cur: string) => '$' + new Intl.NumberFormat('es-MX').format(n) + ' ' + cur;

  function priceInner(): JSX.Element | null {
    const cur = q?.currency || 'MXN';
    const hasFounder = q?.founder_monthly != null;
    const bigMonthly = hasFounder ? q?.founder_monthly : q?.ordinary_monthly;
    const bigAnnual = hasFounder ? q?.founder_annual : q?.ordinary_annual;
    if (!q || !q.configured || bigMonthly == null) return null;
    return (
      <>
        {hasFounder && q.ordinary_monthly != null && q.ordinary_monthly !== q.founder_monthly && (
          <div className="text-xs text-slate-400"><span className="line-through">{fmt(q.ordinary_monthly, cur)}{t('reg.price.perMonth')}</span></div>
        )}
        <div className="text-2xl font-extrabold text-brand-700">
          {q.is_from && <span className="text-sm font-semibold text-muted">{t('reg.price.from')} </span>}
          {fmt(bigMonthly, cur)}<span className="text-sm font-medium text-muted">{t('reg.price.perMonth')}</span>
        </div>
        {bigAnnual != null && <div className="text-xs text-muted">{t('reg.price.or')} {fmt(bigAnnual, cur)}{t('reg.price.perYear')}</div>}
        {hasFounder && <span className="mt-1 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">{t('reg.price.founderBadge')}</span>}
      </>
    );
  }

  // Contenido según el estado.
  let inner: JSX.Element | null = null;
  if (pending) {
    inner = <p className="text-sm leading-snug text-slate-600">{pendingText ?? t('reg.price.pending')}</p>;
  } else if (free) {
    inner = (
      <>
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-extrabold text-emerald-700">{t('reg.price.free')}</span>
        <span className="mt-1 block text-xs text-muted">{t('reg.price.freeNote')}</span>
      </>
    );
  } else {
    inner = priceInner();
    if (!inner && boxed) {
      if (hideIfEmpty) return null;
      inner = <p className="text-sm leading-snug text-slate-500">{t('reg.price.notConfigured')}</p>;
    }
  }

  if (!boxed) return inner ? <div className={className}>{inner}</div> : null;

  return (
    <div className={`rounded-2xl border border-sky-200 bg-sky-50 p-4 ${className}`}>
      <p className="text-xs font-extrabold uppercase tracking-wide text-brand-700">{boxLabel ?? t('reg.price.boxLabel')}</p>
      <div className="mt-1.5">{inner}</div>
    </div>
  );
}
