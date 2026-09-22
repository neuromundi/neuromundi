/**
 * comparisonRegions — datos de la tabla comparativa de la portada, POR REGIÓN.
 *
 * La plataforma es mundial, así que la tabla SIEMPRE se muestra, pero adapta sus
 * columnas (competidores) y su fila de precios a la región de quien la ve:
 *   · latam  → Doctoralia, Top Doctors, Doctores.lat (MXN)
 *   · europe → Doctolib, Doctoralia, Top Doctors (EUR)
 *   · usa    → Zocdoc, Psychology Today, Healthgrades (USD)
 *   · world  → categorías genéricas (sin marcas), precio "varía por país"
 *
 * REGLA (igual que en todo el proyecto): nada de datos sin verificar. Las marcas
 * y cifras de abajo se comprobaron con información pública (sep-2026); el pie de
 * la tabla lo declara. Los NOMBRES de marca son propios y NO se traducen; los
 * textos (tags, categorías, frases de precio) salen de i18n (home.compare.*).
 *
 * Los nombres de marca de cada región se listan también en `home.compare.brands`
 * de i18n SOLO para el pie legal (marcas de sus titulares); aquí viven como dato.
 */
import { COUNTRIES, MEXICO_NAME } from '@/data/countries';
import { CONTINENT_BY_CODE } from '@/data/continents';

export const FEATURE_KEYS = [
  'specialized', 'free', 'booking', 'reviews',
  'neuroaffirm', 'community', 'kit', 'inclusion', 'store',
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type RegionKey = 'latam' | 'europe' | 'usa' | 'world';

export interface Col {
  /** Marca (se renderiza tal cual, no se traduce). Exclusivo con nameKey. */
  brand?: string;
  /** Clave i18n para el nombre (región 'world', categorías genéricas). */
  nameKey?: string;
  /** Clave i18n del subtítulo/etiqueta de la columna. */
  tagKey: string;
  /** ¿Tiene cada característica? */
  marks: Record<FeatureKey, boolean>;
  /** Cifra de precio con moneda (no se traduce), p. ej. "≈ €129–139". */
  priceValue?: string;
  /** Clave i18n si el precio es una frase (p. ej. "Bajo invitación"). */
  priceKey?: string;
  /** Clave i18n del sub del precio (unidad o nota). */
  priceSubKey?: string;
}

/** Atajo para construir marcas: [specialized, free, booking, reviews] + resto en false. */
function marks(spec: boolean, free: boolean, booking: boolean, reviews: boolean): Record<FeatureKey, boolean> {
  return {
    specialized: spec, free, booking, reviews,
    neuroaffirm: false, community: false, kit: false, inclusion: false, store: false,
  };
}

export const REGIONS: Record<RegionKey, { cols: [Col, Col, Col]; brandsNote: string }> = {
  latam: {
    brandsNote: 'Doctoralia, Top Doctors, Doctores.lat',
    cols: [
      { brand: 'Doctoralia', tagKey: 'home.compare.tagDirectory', marks: marks(false, true, true, true), priceValue: '≈ $1,500–$4,000', priceSubKey: 'home.compare.price.mxnMonth' },
      { brand: 'Top Doctors', tagKey: 'home.compare.tagDirectory', marks: marks(false, true, true, true), priceKey: 'home.compare.price.byInvitation', priceSubKey: 'home.compare.price.notPublic' },
      { brand: 'Doctores.lat', tagKey: 'home.compare.tagDirectory', marks: marks(false, true, true, true), priceKey: 'home.compare.price.notPublic' },
    ],
  },
  europe: {
    brandsNote: 'Doctolib, Doctoralia, Top Doctors',
    cols: [
      { brand: 'Doctolib', tagKey: 'home.compare.tagDirectory', marks: marks(false, true, true, false), priceValue: '≈ €129–139', priceSubKey: 'home.compare.price.eurMonth' },
      { brand: 'Doctoralia', tagKey: 'home.compare.tagDirectory', marks: marks(false, true, true, true), priceKey: 'home.compare.price.paidPlans' },
      { brand: 'Top Doctors', tagKey: 'home.compare.tagDirectory', marks: marks(false, true, true, true), priceKey: 'home.compare.price.byInvitation', priceSubKey: 'home.compare.price.notPublic' },
    ],
  },
  usa: {
    brandsNote: 'Zocdoc, Psychology Today, Healthgrades',
    cols: [
      { brand: 'Zocdoc', tagKey: 'home.compare.tagDirectory', marks: marks(false, true, true, true), priceKey: 'home.compare.price.perBooking' },
      { brand: 'Psychology Today', tagKey: 'home.compare.tagDirectory', marks: marks(false, true, false, false), priceValue: '≈ $29.95', priceSubKey: 'home.compare.price.usdMonth' },
      { brand: 'Healthgrades', tagKey: 'home.compare.tagDirectory', marks: marks(false, true, true, true), priceKey: 'home.compare.price.freeBasicPaid' },
    ],
  },
  world: {
    brandsNote: '',
    cols: [
      { nameKey: 'home.compare.cats.directories', tagKey: 'home.compare.tagDirectory', marks: marks(false, true, true, true), priceKey: 'home.compare.price.variesByCountry' },
      { nameKey: 'home.compare.cats.telemed', tagKey: 'home.compare.tags.telemed', marks: marks(false, true, true, false), priceKey: 'home.compare.price.variesByCountry' },
      { nameKey: 'home.compare.cats.software', tagKey: 'home.compare.tags.software', marks: marks(false, false, true, false), priceKey: 'home.compare.price.variesByCountry' },
    ],
  },
};

/** Países de América Latina (ISO alpha-2): hispanohablantes + Brasil. */
const LATAM_CODES = new Set([
  'MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO', 'PR',
  'CO', 'VE', 'EC', 'PE', 'BO', 'CL', 'AR', 'PY', 'UY', 'BR',
]);

const CODE_BY_NAME: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.name, c.code]),
);

/** Zonas horarias IANA de LatAm (México, Centroamérica, Caribe hispano, Sudamérica). */
const LATAM_TZ = new Set([
  'America/Mexico_City', 'America/Cancun', 'America/Merida', 'America/Monterrey',
  'America/Matamoros', 'America/Chihuahua', 'America/Ciudad_Juarez', 'America/Ojinaga',
  'America/Mazatlan', 'America/Bahia_Banderas', 'America/Hermosillo', 'America/Tijuana',
  'America/Guatemala', 'America/Belize', 'America/Tegucigalpa', 'America/El_Salvador',
  'America/Managua', 'America/Costa_Rica', 'America/Panama',
  'America/Havana', 'America/Santo_Domingo', 'America/Puerto_Rico',
  'America/Bogota', 'America/Caracas', 'America/Guayaquil', 'America/Galapagos',
  'America/Lima', 'America/La_Paz', 'America/Santiago', 'America/Punta_Arenas',
  'Pacific/Easter', 'America/Asuncion', 'America/Montevideo',
  'America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife',
  'America/Manaus', 'America/Belem', 'America/Cuiaba', 'America/Campo_Grande',
  'America/Porto_Velho', 'America/Rio_Branco', 'America/Boa_Vista', 'America/Maceio',
  'America/Araguaina', 'America/Santarem', 'America/Eirunepe', 'America/Noronha',
]);

/** Zonas horarias de México (para mostrar la cuota concreta de MX). */
const MEXICO_TZ = new Set([
  'America/Mexico_City', 'America/Cancun', 'America/Merida', 'America/Monterrey',
  'America/Matamoros', 'America/Chihuahua', 'America/Ciudad_Juarez', 'America/Ojinaga',
  'America/Mazatlan', 'America/Bahia_Banderas', 'America/Hermosillo', 'America/Tijuana',
]);

/** ¿La visita es de México? (país elegido = México, o sin país y zona horaria MX). */
function isMexico(country: string | null): boolean {
  if (country) return country === MEXICO_NAME;
  try {
    return MEXICO_TZ.has(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  } catch {
    return false;
  }
}

/** Precio de Neuromundi en la fila de precios: cifra concreta en México, genérico en el resto. */
export interface NmPrice { value?: string; key?: string; subKey: string }
export function nmPrice(country: string | null): NmPrice {
  if (isMexico(country)) {
    // Cuota de fundador en México, expresada por mes para comparar de tú a tú.
    return { value: '≈ $250–$800', subKey: 'home.compare.price.nmMxSub' };
  }
  return { key: 'home.compare.price.nm', subKey: 'home.compare.price.nmSub' };
}

function regionFromTimezone(): RegionKey {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (LATAM_TZ.has(tz) || tz.startsWith('America/Argentina/')) return 'latam';
    if (tz.startsWith('Europe/') || tz.startsWith('Atlantic/')) return 'europe';
    if (tz.startsWith('America/') || tz.startsWith('Canada/') || tz.startsWith('US/')) return 'usa';
    return 'world';
  } catch {
    return 'world';
  }
}

/**
 * Región de la comparativa según el país elegido (intención explícita) o, si no
 * eligió, la zona horaria del navegador. Devuelve siempre una región válida.
 */
export function comparisonRegionOf(country: string | null): RegionKey {
  if (country) {
    const code = CODE_BY_NAME[country];
    if (!code) return 'world';
    if (LATAM_CODES.has(code)) return 'latam';
    if (code === 'US' || code === 'CA') return 'usa';
    if (CONTINENT_BY_CODE[code] === 'Europa') return 'europe';
    return 'world';
  }
  return regionFromTimezone();
}
