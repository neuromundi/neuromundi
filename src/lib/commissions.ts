/**
 * commissions — lógica pura del libro de comisiones de afiliados.
 *
 * MODELO DE NEGOCIO (importante para entender los estados):
 * La plataforma NO retiene el dinero. Cuando alguien compra con el código de un
 * promotor, el vendedor cobra el 100% de la venta y queda DEBIÉNDOLE la comisión
 * a ese promotor. Neuromundi solo lleva la cuenta: quién le debe a quién, cuánto,
 * y si ya se liquidó.
 *
 * Estados:
 *  · payable  → la venta está pagada; el vendedor le debe esto al promotor.
 *  · paid     → el vendedor declaró haberla pagado.
 *  · reversed → la venta se reembolsó antes de liquidar; ya no se debe nada.
 *
 * Ojo con `refund_after_payment`: el reembolso llegó DESPUÉS de que el vendedor
 * ya había pagado la comisión. El estado sigue siendo 'paid' porque el dinero
 * salió de verdad; es un aviso para que las partes lo resuelvan, no un saldo.
 */

/**
 * Monedas sin decimales: su unidad mínima ya es la unidad. 1000 JPY son 1000
 * yenes, no 10. Dividir entre 100 aquí mostraría importes 100 veces menores.
 * Debe coincidir con el ZERO_DECIMAL de las Edge Functions de checkout.
 */
export const ZERO_DECIMAL = new Set(['jpy', 'krw', 'clp', 'vnd']);

export type CommissionStatus = 'payable' | 'paid' | 'reversed';

export interface CommissionRow {
  id: string;
  order_id: string;
  /** La otra parte: el vendedor si soy promotor, el promotor si soy vendedor. */
  counterpart_id: string;
  counterpart_name: string | null;
  counterpart_member_no: number | null;
  product_name: string | null;
  amount_cents: number;
  currency: string;
  status: CommissionStatus;
  refund_after_payment: boolean;
  paid_at: string | null;
  paid_note: string | null;
  created_at: string;
}

/** Pasa de la unidad mínima a la unidad de la moneda. */
export function toMajor(cents: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? cents : cents / 100;
}

/** Importe legible: "1,250.00 MXN". */
export function formatAmount(cents: number, currency: string, locale?: string): string {
  const zero = ZERO_DECIMAL.has(currency.toLowerCase());
  const n = toMajor(cents, currency);
  return `${n.toLocaleString(locale, {
    minimumFractionDigits: zero ? 0 : 2,
    maximumFractionDigits: zero ? 0 : 2,
  })} ${currency.toUpperCase()}`;
}

export interface CurrencyTotal {
  currency: string;
  payableCents: number;
  paidCents: number;
  reversedCents: number;
  count: number;
}

/**
 * Totales por moneda. Se separa por moneda a propósito: sumar pesos con dólares
 * daría un número sin significado, y un promotor puede vender en varias.
 */
export function summarize(rows: CommissionRow[]): CurrencyTotal[] {
  const map = new Map<string, CurrencyTotal>();
  for (const r of rows) {
    const cur = r.currency.toLowerCase();
    const t = map.get(cur) ?? {
      currency: cur,
      payableCents: 0,
      paidCents: 0,
      reversedCents: 0,
      count: 0,
    };
    if (r.status === 'payable') t.payableCents += r.amount_cents;
    else if (r.status === 'paid') t.paidCents += r.amount_cents;
    else t.reversedCents += r.amount_cents;
    t.count += 1;
    map.set(cur, t);
  }
  return [...map.values()].sort((a, b) => b.payableCents - a.payableCents);
}

export interface CounterpartGroup {
  id: string;
  name: string;
  memberNo: number | null;
  currency: string;
  payableCents: number;
  paidCents: number;
  /** Ids de las comisiones cobrables: es lo que se manda a marcar como pagado. */
  payableIds: string[];
  rows: CommissionRow[];
}

/**
 * Agrupa por persona Y moneda. La liquidación es por persona (le pagas a alguien
 * el total que le debes), y si le debes en dos monedas son dos pagos distintos.
 * Ordena poniendo primero a quien más se le debe, que es a quien hay que pagarle.
 */
export function groupByCounterpart(rows: CommissionRow[]): CounterpartGroup[] {
  const map = new Map<string, CounterpartGroup>();
  for (const r of rows) {
    const cur = r.currency.toLowerCase();
    const key = `${r.counterpart_id}|${cur}`;
    const g = map.get(key) ?? {
      id: r.counterpart_id,
      name: r.counterpart_name ?? '—',
      memberNo: r.counterpart_member_no,
      currency: cur,
      payableCents: 0,
      paidCents: 0,
      payableIds: [],
      rows: [],
    };
    if (r.status === 'payable') {
      g.payableCents += r.amount_cents;
      g.payableIds.push(r.id);
    } else if (r.status === 'paid') {
      g.paidCents += r.amount_cents;
    }
    g.rows.push(r);
    map.set(key, g);
  }
  return [...map.values()].sort(
    (a, b) => b.payableCents - a.payableCents || a.name.localeCompare(b.name),
  );
}

/** Folio de miembro visible. */
export function folio(n: number | null): string {
  return n != null ? `NM-${String(n).padStart(6, '0')}` : '—';
}

function esc(v: string | number, delim: string): string {
  const s = String(v);
  return s.includes(delim) || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export const COMMISSION_CSV_HEADERS = [
  'fecha',
  'contraparte',
  'folio',
  'producto',
  'importe',
  'moneda',
  'estado',
  'pagada_el',
  'nota',
] as const;

/**
 * Estado de cuenta descargable. Lleva BOM y separador ';' por lo mismo que el
 * CSV de cuotas: es lo que Excel en español espera al abrir con doble clic.
 * El importe va en la unidad de la moneda (pesos, no centavos) porque este
 * archivo es para contabilidad, no para reimportarlo.
 */
export function commissionsCsv(rows: CommissionRow[], delim: ';' | ',' = ';'): string {
  const head = COMMISSION_CSV_HEADERS.join(delim);
  const body = rows.map((r) =>
    [
      esc(r.created_at.slice(0, 10), delim),
      esc(r.counterpart_name ?? '', delim),
      esc(folio(r.counterpart_member_no), delim),
      esc(r.product_name ?? '', delim),
      esc(toMajor(r.amount_cents, r.currency), delim),
      esc(r.currency.toUpperCase(), delim),
      esc(r.status, delim),
      esc(r.paid_at ? r.paid_at.slice(0, 10) : '', delim),
      esc(r.paid_note ?? '', delim),
    ].join(delim),
  );
  return '﻿' + [head, ...body].join('\r\n') + '\r\n';
}
