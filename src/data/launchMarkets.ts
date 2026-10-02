/**
 * launchMarkets — fases de lanzamiento por país (campaña 2026).
 *
 * ACTIVOS ahora (tarifas visibles + fundador): países de habla hispana +
 * Brasil + Portugal + Estados Unidos (gran público hispano). El resto queda en
 * "próximamente" (inicio 2027): se les muestra un aviso y lista de espera, y se
 * OCULTAN las tarifas. Se clasifica por el NOMBRE del país en español (igual que
 * `profiles.country` y el `countryStore`).
 */
export const ACTIVE_MARKETS = new Set<string>([
  // Hispanohablantes
  'México', 'España', 'Argentina', 'Colombia', 'Perú', 'Venezuela', 'Chile',
  'Ecuador', 'Guatemala', 'Cuba', 'Bolivia', 'República Dominicana', 'Honduras',
  'Paraguay', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panamá', 'Uruguay',
  'Guinea Ecuatorial', 'Puerto Rico',
  // Lusófonos (fase 1)
  'Brasil', 'Portugal',
  // Gran público hispano
  'Estados Unidos',
]);

/** ¿El país está ACTIVO en esta fase? `null`/desconocido se trata como neutral (true). */
export function isActiveMarket(country: string | null | undefined): boolean {
  if (!country) return true;
  return ACTIVE_MARKETS.has(country.trim());
}

/** ¿El país está en fase "próximamente 2027"? (conocido y NO activo). */
export function isComingSoon(country: string | null | undefined): boolean {
  return !!country && !ACTIVE_MARKETS.has(country.trim());
}
