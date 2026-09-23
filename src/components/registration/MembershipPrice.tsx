/**
 * MembershipPrice — muestra el costo de membresía en el registro por tipo de
 * perfil. Reglas:
 *   · patient / parent / company  → "Gratuito".
 *   · tipos de pago con precio configurado (registration_quote) → costo MENSUAL
 *     destacado + anual en pequeño; durante la etapa de fundadores, la cuota
 *     ordinaria aparece tachada y el precio fundador destacado.
 *   · especialista → "desde $" (mínimo entre especialista médico y no médico).
 *   · país/tipo sin precio configurado → no muestra nada.
 * El precio sale de la RPC `registration_quote` (0111), que solo lee
 * membership_prices (sin fallback).
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

export function MembershipPrice({ type, className = '' }: { type: string; className?: string }) {
  const { t } = useTranslation();
  const { country } = useCountry();
  const [q, setQ] = useState<Quote | null>(null);
  const free = FREE.has(type);

  useEffect(() => {
    if (free || !country) { setQ(null); return; }
    let alive = true;
    const pType = TYPE_MAP[type] ?? type;
    (async () => {
      const { data } = await (supabase as unknown as {
        rpc: (f: string, a: unknown) => Promise<{ data: unknown }>;
      }).rpc('registration_quote', { p_type: pType, p_country: country });
      if (alive) setQ((data as Quote) ?? null);
    })();
    return () => { alive = false; };
  }, [type, country, free]);

  const fmt = (n: number, cur: string) => '$' + new Intl.NumberFormat('es-MX').format(n) + ' ' + cur;

  if (free) {
    return (
      <div className={className}>
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-extrabold text-emerald-700">{t('reg.price.free')}</span>
        <span className="mt-1 block text-xs text-muted">{t('reg.price.freeNote')}</span>
      </div>
    );
  }
  if (!q || !q.configured) return null;

  const cur = q.currency || 'MXN';
  const hasFounder = q.founder_monthly != null;
  const bigMonthly = hasFounder ? q.founder_monthly : q.ordinary_monthly;
  const bigAnnual = hasFounder ? q.founder_annual : q.ordinary_annual;
  if (bigMonthly == null) return null;

  return (
    <div className={className}>
      {hasFounder && q.ordinary_monthly != null && q.ordinary_monthly !== q.founder_monthly && (
        <div className="text-xs text-slate-400">
          <span className="line-through">{fmt(q.ordinary_monthly, cur)}{t('reg.price.perMonth')}</span>
        </div>
      )}
      <div className="text-2xl font-extrabold text-brand-700">
        {q.is_from && <span className="text-sm font-semibold text-muted">{t('reg.price.from')} </span>}
        {fmt(bigMonthly, cur)}<span className="text-sm font-medium text-muted">{t('reg.price.perMonth')}</span>
      </div>
      {bigAnnual != null && (
        <div className="text-xs text-muted">{t('reg.price.or')} {fmt(bigAnnual, cur)}{t('reg.price.perYear')}</div>
      )}
      {hasFounder && (
        <span className="mt-1 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">{t('reg.price.founderBadge')}</span>
      )}
    </div>
  );
}
