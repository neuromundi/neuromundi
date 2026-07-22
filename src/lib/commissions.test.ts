import { describe, it, expect } from 'vitest';
import {
  toMajor,
  formatAmount,
  summarize,
  groupByCounterpart,
  folio,
  commissionsCsv,
  type CommissionRow,
} from './commissions';

const row = (over: Partial<CommissionRow> = {}): CommissionRow => ({
  id: 'c1',
  order_id: 'o1',
  counterpart_id: 'u1',
  counterpart_name: 'Ana',
  counterpart_member_no: 123,
  product_name: 'Kit sensorial',
  amount_cents: 10000,
  currency: 'mxn',
  status: 'payable',
  refund_after_payment: false,
  paid_at: null,
  paid_note: null,
  created_at: '2026-07-01T10:00:00.000Z',
  ...over,
});

describe('toMajor', () => {
  it('divide entre 100 en monedas con decimales', () => {
    expect(toMajor(10000, 'mxn')).toBe(100);
  });

  it('NO divide en monedas sin decimales', () => {
    // 1000 JPY son mil yenes, no diez.
    expect(toMajor(1000, 'jpy')).toBe(1000);
    expect(toMajor(1000, 'JPY')).toBe(1000);
  });
});

describe('formatAmount', () => {
  it('muestra dos decimales y la moneda en mayúsculas', () => {
    expect(formatAmount(125050, 'mxn', 'en-US')).toBe('1,250.50 MXN');
  });

  it('no pone decimales en yenes', () => {
    expect(formatAmount(1000, 'jpy', 'en-US')).toBe('1,000 JPY');
  });
});

describe('summarize', () => {
  it('separa por moneda y por estado', () => {
    const r = summarize([
      row({ id: 'a', amount_cents: 10000, status: 'payable' }),
      row({ id: 'b', amount_cents: 5000, status: 'paid' }),
      row({ id: 'c', amount_cents: 2000, status: 'reversed' }),
      row({ id: 'd', amount_cents: 700, currency: 'usd', status: 'payable' }),
    ]);
    const mxn = r.find((x) => x.currency === 'mxn')!;
    expect(mxn.payableCents).toBe(10000);
    expect(mxn.paidCents).toBe(5000);
    expect(mxn.reversedCents).toBe(2000);
    expect(mxn.count).toBe(3);
    expect(r.find((x) => x.currency === 'usd')!.payableCents).toBe(700);
  });

  it('nunca mezcla monedas distintas en un mismo total', () => {
    const r = summarize([row({ currency: 'mxn' }), row({ id: 'b', currency: 'usd' })]);
    expect(r).toHaveLength(2);
  });

  it('una comisión revertida no suma a lo cobrable', () => {
    const [t] = summarize([row({ status: 'reversed' })]);
    expect(t.payableCents).toBe(0);
  });

  it('de una lista vacía saca una lista vacía', () => {
    expect(summarize([])).toEqual([]);
  });
});

describe('groupByCounterpart', () => {
  it('junta las comisiones de la misma persona', () => {
    const g = groupByCounterpart([
      row({ id: 'a', amount_cents: 1000 }),
      row({ id: 'b', amount_cents: 2000 }),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].payableCents).toBe(3000);
    expect(g[0].payableIds).toEqual(['a', 'b']);
  });

  it('separa a la misma persona si le debes en dos monedas', () => {
    // Son dos pagos distintos: no se pueden liquidar juntos.
    const g = groupByCounterpart([
      row({ id: 'a', currency: 'mxn' }),
      row({ id: 'b', currency: 'usd' }),
    ]);
    expect(g).toHaveLength(2);
  });

  it('solo mete en payableIds lo que de verdad se debe', () => {
    const g = groupByCounterpart([
      row({ id: 'a', status: 'payable' }),
      row({ id: 'b', status: 'paid' }),
      row({ id: 'c', status: 'reversed' }),
    ]);
    expect(g[0].payableIds).toEqual(['a']);
    expect(g[0].paidCents).toBe(10000);
    expect(g[0].rows).toHaveLength(3);
  });

  it('ordena primero a quien más se le debe', () => {
    const g = groupByCounterpart([
      row({ id: 'a', counterpart_id: 'u1', counterpart_name: 'Ana', amount_cents: 100 }),
      row({ id: 'b', counterpart_id: 'u2', counterpart_name: 'Beto', amount_cents: 9000 }),
    ]);
    expect(g[0].name).toBe('Beto');
  });

  it('aguanta un nombre nulo sin romperse', () => {
    const g = groupByCounterpart([row({ counterpart_name: null })]);
    expect(g[0].name).toBe('—');
  });
});

describe('folio', () => {
  it('rellena con ceros a seis dígitos', () => {
    expect(folio(123)).toBe('NM-000123');
  });

  it('devuelve raya si no hay folio', () => {
    expect(folio(null)).toBe('—');
  });
});

describe('commissionsCsv', () => {
  it('lleva BOM para que Excel respete los acentos', () => {
    expect(commissionsCsv([row()]).charCodeAt(0)).toBe(0xfeff);
  });

  it('exporta el importe en pesos, no en centavos', () => {
    const csv = commissionsCsv([row({ amount_cents: 125050 })]);
    expect(csv).toContain(';1250.5;MXN;');
  });

  it('escapa el separador dentro de un campo', () => {
    const csv = commissionsCsv([row({ product_name: 'Kit; grande' })]);
    expect(csv).toContain('"Kit; grande"');
  });

  it('escapa las comillas dobles', () => {
    const csv = commissionsCsv([row({ product_name: 'Kit "pro"' })]);
    expect(csv).toContain('"Kit ""pro"""');
  });

  it('incluye una fila por comisión más el encabezado', () => {
    const csv = commissionsCsv([row({ id: 'a' }), row({ id: 'b' })]);
    expect(csv.trim().split('\r\n')).toHaveLength(3);
  });
});
