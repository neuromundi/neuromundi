/**
 * pricing — aritmética de la cuota de afiliación (lógica pura y testeable).
 *
 * Regla del negocio: quien contrata un año paga **10 meses**. El importe de 12
 * meses se conserva como precio de referencia para mostrarlo tachado, de modo
 * que el ahorro sea evidente.
 *
 * Estas funciones son el espejo en el cliente de lo que hace
 * `membership_price_for()` en la base: si cambia una, debe cambiar la otra.
 */

/** Meses que realmente se cobran al contratar un año. */
export const ANNUAL_MONTHS_CHARGED = 10;
/** Meses que dura la contratación anual (y base del precio de referencia). */
export const ANNUAL_MONTHS_TOTAL = 12;

/** Redondeo a 2 decimales sin los sustos del punto flotante. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Importe anual que se cobra a partir del mensual (10 meses). */
export function annualFromMonthly(monthly: number): number {
  return round2(monthly * ANNUAL_MONTHS_CHARGED);
}

/** Importe anual de referencia a partir del mensual (12 meses). */
export function listFromMonthly(monthly: number): number {
  return round2(monthly * ANNUAL_MONTHS_TOTAL);
}

/** Importe mensual implícito en un anual ya fijado. */
export function monthlyFromAnnual(annual: number): number {
  return round2(annual / ANNUAL_MONTHS_CHARGED);
}

/**
 * Ahorro de contratar anual en vez de mensual. Devuelve 0 cuando no hay
 * referencia o cuando esta no supera al importe cobrado (no inventamos ahorros).
 */
export function annualSaving(annual: number | null, list: number | null): number {
  if (annual == null || list == null) return 0;
  const diff = round2(list - annual);
  return diff > 0 ? diff : 0;
}

/** Porcentaje de ahorro del plan anual, redondeado al entero. */
export function annualSavingPct(annual: number | null, list: number | null): number {
  const saving = annualSaving(annual, list);
  if (saving === 0 || list == null || list <= 0) return 0;
  return Math.round((saving / list) * 100);
}
