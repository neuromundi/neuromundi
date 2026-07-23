/**
 * donation — lógica pura del embudo de donación (sin React, testeable).
 *
 * Decisiones de negocio:
 *  · Hay CUATRO niveles según el monto. Los umbrales viven en la moneda del
 *    donante, no en una moneda única convertida: así el donante ve cifras
 *    redondas en su propia moneda y no "$183.47".
 *  · La recompensa FÍSICA (pin, taza) aplica del segundo nivel en adelante. Ese
 *    es el disparador de la casilla de renuncia y del formulario de envío.
 *  · La moneda se decide por el país del donante. Hoy soportamos MXN y USD, con
 *    USD como respaldo para el resto del mundo; se puede ampliar añadiendo
 *    entradas a CURRENCIES y a COUNTRY_CURRENCY.
 */

export type DonationLevel = 'seed' | 'ally' | 'driver' | 'ambassador';

/** El orden importa: define qué nivel es "mayor" para comparar recompensas. */
export const LEVELS: DonationLevel[] = ['seed', 'ally', 'driver', 'ambassador'];

export interface CurrencyConfig {
  code: string;
  /** Símbolo para mostrar. MXN y USD comparten '$'; se distingue por el código. */
  symbol: string;
  /** Monedas sin decimales (JPY, CLP…): su unidad mínima ya es la unidad. */
  zeroDecimal: boolean;
  /** Botones de monto predefinidos, en la unidad mayor (no en centavos). */
  presets: number[];
  /** Umbral mínimo (inclusive) de cada nivel, en la unidad mayor. */
  thresholds: Record<DonationLevel, number>;
}

/**
 * Escalones por moneda. La escalera USD es la del brief (10/50/100/150). La de
 * MXN se fija en cifras redondas equivalentes en intención, no al tipo de cambio
 * del día: 10 USD de entrada equivalen aquí a 200 MXN, etc. El admin puede
 * ajustarlas; son la referencia inicial.
 */
export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    zeroDecimal: false,
    presets: [10, 50, 100, 150],
    thresholds: { seed: 10, ally: 50, driver: 100, ambassador: 150 },
  },
  MXN: {
    code: 'MXN',
    symbol: '$',
    zeroDecimal: false,
    presets: [200, 1000, 2000, 3000],
    thresholds: { seed: 200, ally: 1000, driver: 2000, ambassador: 3000 },
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    zeroDecimal: false,
    presets: [10, 50, 100, 150],
    thresholds: { seed: 10, ally: 50, driver: 100, ambassador: 150 },
  },
};

/**
 * País (nombre en español, como se guarda en profiles.country) → moneda.
 * Las claves van sin acentos y en minúsculas (así las normaliza stripAccents).
 * La eurozona se mapea a EUR; el resto cae a USD por defecto.
 */
const COUNTRY_CURRENCY: Record<string, string> = {
  mexico: 'MXN',
  // Eurozona (países que usan el euro).
  alemania: 'EUR',
  austria: 'EUR',
  belgica: 'EUR',
  chipre: 'EUR',
  croacia: 'EUR',
  eslovaquia: 'EUR',
  eslovenia: 'EUR',
  espana: 'EUR',
  estonia: 'EUR',
  finlandia: 'EUR',
  francia: 'EUR',
  grecia: 'EUR',
  irlanda: 'EUR',
  italia: 'EUR',
  letonia: 'EUR',
  lituania: 'EUR',
  luxemburgo: 'EUR',
  malta: 'EUR',
  'paises bajos': 'EUR',
  portugal: 'EUR',
};

export const DEFAULT_CURRENCY = 'USD';

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Moneda sugerida para un país. Cae a USD si no lo conocemos. */
export function currencyForCountry(country: string | null | undefined): string {
  if (!country) return DEFAULT_CURRENCY;
  const key = stripAccents(country.trim().toLowerCase());
  return COUNTRY_CURRENCY[key] ?? DEFAULT_CURRENCY;
}

export type CurrenciesMap = Record<string, CurrencyConfig>;

/**
 * Config de una moneda. Acepta un mapa OPCIONAL: cuando el admin edita los
 * importes, la página pasa el mapa cargado de la base; si no se pasa nada, se
 * usan los valores por defecto de este archivo (que a su vez son la siembra de
 * la tabla `donation_tiers`). Así los dos nunca se contradicen al arrancar.
 */
export function currencyConfig(code: string, currencies: CurrenciesMap = CURRENCIES): CurrencyConfig {
  return currencies[code?.toUpperCase()] ?? currencies[DEFAULT_CURRENCY] ?? CURRENCIES[DEFAULT_CURRENCY];
}

/**
 * Nivel que corresponde a un monto. Devuelve null si el monto es menor al
 * mínimo (nivel 'seed'): por debajo de eso no hay recompensa asociada.
 */
export function levelForAmount(
  amount: number,
  currencyCode: string,
  currencies: CurrenciesMap = CURRENCIES,
): DonationLevel | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const cfg = currencyConfig(currencyCode, currencies);
  let match: DonationLevel | null = null;
  for (const lvl of LEVELS) {
    if (amount >= cfg.thresholds[lvl]) match = lvl;
  }
  return match;
}

/** ¿Este nivel incluye recompensa física (pin/taza)? Del 2.º en adelante. */
export function hasPhysicalReward(level: DonationLevel | null): boolean {
  if (!level) return false;
  return LEVELS.indexOf(level) >= LEVELS.indexOf('ally');
}

/** ¿El monto da derecho a recompensa física? (atajo para la UI) */
export function amountHasPhysical(
  amount: number,
  currencyCode: string,
  currencies: CurrenciesMap = CURRENCIES,
): boolean {
  return hasPhysicalReward(levelForAmount(amount, currencyCode, currencies));
}

/**
 * Claves i18n de las recompensas de cada nivel, ACUMULATIVAS (cada nivel suma a
 * lo del anterior). La UI las traduce y las pinta como lista.
 */
export const LEVEL_REWARDS: Record<DonationLevel, string[]> = {
  seed: ['donate.reward.course', 'donate.reward.wall'],
  ally: ['donate.reward.course', 'donate.reward.wall', 'donate.reward.pin'],
  driver: ['donate.reward.course', 'donate.reward.wall', 'donate.reward.pin', 'donate.reward.mug'],
  ambassador: [
    'donate.reward.course',
    'donate.reward.pin',
    'donate.reward.mug',
    'donate.reward.wallFeatured',
    'donate.reward.ambassadorExtra',
  ],
};

/** Convierte un monto en la unidad mayor a la unidad mínima de Stripe. */
export function toMinorUnits(amount: number, currencyCode: string, currencies: CurrenciesMap = CURRENCIES): number {
  const cfg = currencyConfig(currencyCode, currencies);
  return cfg.zeroDecimal ? Math.round(amount) : Math.round(amount * 100);
}

/** Formatea un monto (unidad mayor) con su moneda: "1,000 MXN". */
export function formatDonation(amount: number, currencyCode: string, locale?: string, currencies: CurrenciesMap = CURRENCIES): string {
  const cfg = currencyConfig(currencyCode, currencies);
  return `${amount.toLocaleString(locale, {
    minimumFractionDigits: cfg.zeroDecimal ? 0 : 0,
    maximumFractionDigits: cfg.zeroDecimal ? 0 : 2,
  })} ${cfg.code}`;
}
