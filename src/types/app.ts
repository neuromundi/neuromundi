/**
 * Tipos de dominio de la aplicación.
 *
 * Derivan de los tipos de base de datos pero expresan los conceptos del producto
 * (perfil, oferta, transacción, encuesta, EVS) de forma cómoda para la UI y los
 * hooks. Mantener la dependencia en una sola dirección: app.ts depende de
 * database.ts, nunca al revés.
 */

import type {
  Tables,
  TablesInsert,
  Views,
  UserRole,
  ProviderType,
  TransactionStatus,
  OfferStatus,
  DiscountType,
  PrescriptionStatus,
} from './database';
import type { BadgeResult } from '@/lib/badge';

export type {
  UserRole,
  ProviderType,
  TransactionStatus,
  OfferStatus,
  DiscountType,
  PrescriptionStatus,
};

// ── Entidades base ───────────────────────────────────────────────────────────
export type Profile = Tables<'profiles'>;
export type Category = Tables<'categories'>;
export type Offer = Tables<'offers'>;
export type Transaction = Tables<'discount_transactions'>;
export type Survey = Tables<'satisfaction_surveys'>;
export type ProviderRating = Views<'public_provider_ratings'>;
export type Product = Tables<'products'>;
export type Prescription = Tables<'prescriptions'>;
export type PrescriptionItem = Tables<'prescription_items'>;
export type ProviderConnection = Tables<'provider_connections'>;
export type ParentList = Tables<'parent_lists'>;
export type ParentListItem = Tables<'parent_list_items'>;
export type ProviderLocation = Tables<'provider_locations'>;
export type ProviderLocationInsert = TablesInsert<'provider_locations'>;

export type OfferInsert = TablesInsert<'offers'>;
export type SurveyInsert = TablesInsert<'satisfaction_surveys'>;
export type TransactionInsert = TablesInsert<'discount_transactions'>;
export type ProductInsert = TablesInsert<'products'>;
export type PrescriptionInsert = TablesInsert<'prescriptions'>;

// ── Composiciones para la UI ─────────────────────────────────────────────────

/**
 * Lo que de verdad devuelve la vista pública del directorio (migración 0220):
 * el perfil SIN las columnas privadas. Si algo del directorio intenta leer un
 * identificador de Stripe, el RFC, la fecha de nacimiento o el estado de la
 * membresía, el compilador lo detiene aquí — antes se habría pedido en vano y
 * habría llegado vacío en tiempo de ejecución.
 */
// Desde el 16 oct 2026 los tipos se generan desde la base, y entonces esto
// deja de ser una resta sobre `profiles` y pasa a ser LA FILA DE LA VISTA, que
// es lo que de verdad llega. La resta anterior describía bien qué columnas NO
// vienen, pero mentía en la nulabilidad: una vista pierde los NOT NULL, así
// que casi todas sus columnas pueden venir nulas y el código suponía que no.
//
// Se conservan tipados estrechos `id`, `role` y `provider_type` porque la
// pantalla ramifica sobre ellos: la vista sólo expone perfiles publicados, que
// siempre tienen identificador y tipo.
type FilaDirectorio = Views<'directorio_publico_seguro'>;

/**
 * COLUMNAS_DIRECTORIO — lo que la pantalla del directorio pide de verdad.
 *
 * Antes pedia `select('*')`: las 73 columnas de las 1,000 fichas, 1,750 KB por
 * visitante. Medido el 19 de octubre de 2026: con 10 visitantes a la vez el
 * directorio tardaba 6.7 segundos. Dos tercios de ese peso eran los NOMBRES de
 * las columnas repetidos mil veces.
 *
 * La lista es la union de todo lo que usan el gancho (los nueve filtros, el
 * orden y la lista de ciudades), la tarjeta y el mapa. `PerfilPublico` se
 * construye con `Pick` sobre esta lista, asi que si alguien usa un campo que no
 * se pide, el compilador lo detiene AQUI en vez de dejar la pantalla con un
 * hueco en blanco que nadie ve. Para anadir un campo a la tarjeta hay que
 * anadirlo tambien a esta lista: eso es lo que protege.
 *
 * `provider_types` se lee con un casteo en el filtro por tipo, asi que el
 * compilador no lo vigila: no se quite de aqui.
 */
export const COLUMNAS_DIRECTORIO = [
  'id', 'role', 'provider_type', 'provider_types',
  'full_name', 'business_name', 'avatar_url', 'bio', 'profession',
  'city', 'state', 'country', 'latitude', 'longitude', 'ubicacion_aproximada',
  'sections', 'specialties', 'intervention_areas', 'neuro_conditions',
  'product_categories', 'products_offered', 'services_offered',
  'age_ranges', 'modalities', 'neuroaffirming', 'provider_details',
  'is_published', 'is_verified', 'perfil_activo', 'verificada',
  'is_inclusive_school', 'is_inclusive_company', 'is_institutional_ally',
] as const satisfies readonly (keyof FilaDirectorio)[];

/** La misma lista, lista para `select()`. */
export const SELECT_DIRECTORIO = COLUMNAS_DIRECTORIO.join(',');

export type PerfilPublico = Omit<
  FilaDirectorio,
  'id' | 'role' | 'provider_type' | 'perfil_activo' | 'verificada'
> & {
  id: string;
  role: UserRole | null;
  provider_type: ProviderType | null;
  perfil_activo?: boolean | null;
  verificada?: boolean | null;
};

/**
 * PerfilDeDirectorio — la fila recortada que llega a la LISTA del directorio.
 *
 * `PerfilPublico` sigue siendo la fila completa, porque el perfil del prestador
 * y la pagina de inclusion escolar leen la misma vista con sus propias
 * consultas y necesitan telefono, direccion, numero de miembro y demas. El
 * recorte es solo de esta pantalla, que trae mil fichas de golpe.
 */
export type PerfilDeDirectorio = Pick<
  PerfilPublico,
  (typeof COLUMNAS_DIRECTORIO)[number]
>;

/** Proveedor enriquecido con su EVS y categorías, listo para el directorio. */
export interface ProviderWithRating extends PerfilDeDirectorio {
  rating: ProviderRating | null;
  categories: Category[];
  /** Distintivo oficial calculado (src/lib/badge). Opcional: lo adjunta el directorio. */
  badge?: BadgeResult | null;
  /** Miembro Fundador: aparece primero en el directorio y con sello (SEO fundadores). */
  is_founder?: boolean;
  /** Donante (prestador con donación pagada): desempata en el directorio, por debajo del fundador. */
  is_donor?: boolean;
  /**
   * ¿La ficha está confirmada? La calcula la vista `directorio_publico`: una
   * cuenta real siempre es true; una ficha del directorio lo es si alguien la
   * reclamó o si el admin la confirmó por fuera (`verificada_manual`).
   *
   * Desde `campaign_config.verificacion_deadline`, las fichas sin confirmar
   * dejan de exponer teléfono y sitio web, y se ordenan por debajo. Es lo que
   * promete el correo de invitación de la campaña de fundadores.
   */
  verificada?: boolean;
}

/** Payload que viaja dentro del QR del padre. */
export interface ParentQrPayload {
  parentId: string;
  qrToken: string;
}

/** Producto con su vendedor (para el catálogo). */
export interface ProductWithVendor extends Product {
  vendorName: string | null;
  categoryName: string | null;
}

/** Ítem de receta resuelto con los datos del producto. */
export interface PrescriptionLineItem extends PrescriptionItem {
  product: Product | null;
}

/** Receta completa lista para mostrar (con ítems y nombre del terapeuta). */
export interface PrescriptionDetail extends Prescription {
  items: PrescriptionLineItem[];
  therapistName: string | null;
}

/** Borrador en memoria que arma el terapeuta antes de enviar. */
export interface CartDraftItem {
  product: Product;
  quantity: number;
  note: string;
}

/** Resumen mínimo de un proveedor para tarjetas de red y de listas. */
export interface ProviderSummary {
  id: string;
  name: string;
  city: string | null;
  avatar_url: string | null;
  provider_type: ProviderType | null;
}

/** Una conexión de red resuelta con el perfil de la otra parte. */
export interface ConnectionWithProfile {
  connection: ProviderConnection;
  other: ProviderSummary;
  /** 'incoming' = me la enviaron; 'outgoing' = la envié yo. */
  direction: 'incoming' | 'outgoing';
}

/** Estado de conexión con un proveedor concreto (para el botón Conectar). */
export type ConnectionState =
  | { kind: 'none' }
  | { kind: 'pending'; direction: 'incoming' | 'outgoing'; id: string }
  | { kind: 'connected'; id: string };

/** Lista de un padre con su conteo de ítems. */
export interface ParentListWithCount extends ParentList {
  itemCount: number;
}

/** Ítem de lista resuelto con el resumen del proveedor. */
export interface ParentListItemResolved extends ProviderSummary {
  itemId: string;
  listId: string;
  note: string | null;
}

/** Resultado del RPC get_shared_list (lista pública por token). */
export interface SharedListView {
  id: string;
  title: string;
  owner_name: string;
  items: Array<ProviderSummary & { provider_id: string; note: string | null }>;
}


/** Las 7 métricas universales más las 2 exclusivas de service_provider. */
export const SURVEY_DIMENSIONS = [
  'quality_score',
  'human_treatment_score',
  'accessibility_score',
  'price_value_score',
  'offer_compliance_score',
  'sensory_adaptation_score',
  'flexibility_crisis_score',
  'facilities_score',
  'professionalism_score',
] as const;

export type SurveyDimension = (typeof SURVEY_DIMENSIONS)[number];

/** Las 7 que aplican a todo proveedor. */
export const UNIVERSAL_DIMENSIONS: readonly SurveyDimension[] = [
  'quality_score',
  'human_treatment_score',
  'accessibility_score',
  'price_value_score',
  'offer_compliance_score',
  'sensory_adaptation_score',
  'flexibility_crisis_score',
];

/** Las 2 que solo aplican a service_provider. */
export const SERVICE_ONLY_DIMENSIONS: readonly SurveyDimension[] = [
  'facilities_score',
  'professionalism_score',
];

/** Metadatos de presentación de cada dimensión (label + icono lucide). */
export interface DimensionMeta {
  key: SurveyDimension;
  label: string;
  iconName: string;
  helpText: string;
}

export const DIMENSION_META: Record<SurveyDimension, DimensionMeta> = {
  quality_score: {
    key: 'quality_score',
    label: 'Calidad',
    iconName: 'BadgeCheck',
    helpText: 'Qué tan bueno fue el servicio o producto en general.',
  },
  human_treatment_score: {
    key: 'human_treatment_score',
    label: 'Trato humano',
    iconName: 'Heart',
    helpText: 'Amabilidad, paciencia y empatía del personal.',
  },
  accessibility_score: {
    key: 'accessibility_score',
    label: 'Accesibilidad',
    iconName: 'Accessibility',
    helpText: 'Facilidad de acceso físico y de comunicación.',
  },
  price_value_score: {
    key: 'price_value_score',
    label: 'Precio justo',
    iconName: 'Tag',
    helpText: 'Relación entre lo que pagaste y lo que recibiste.',
  },
  offer_compliance_score: {
    key: 'offer_compliance_score',
    label: 'Cumplió la oferta',
    iconName: 'Handshake',
    helpText: 'El descuento se aplicó tal como se prometió.',
  },
  sensory_adaptation_score: {
    key: 'sensory_adaptation_score',
    label: 'Ambiente sensorial',
    iconName: 'Waves',
    helpText: 'Ruido, luces y estímulos manejables para tu familia.',
  },
  flexibility_crisis_score: {
    key: 'flexibility_crisis_score',
    label: 'Flexibilidad',
    iconName: 'LifeBuoy',
    helpText: 'Capacidad de adaptarse ante una crisis o imprevisto.',
  },
  facilities_score: {
    key: 'facilities_score',
    label: 'Instalaciones',
    iconName: 'Building2',
    helpText: 'Estado y comodidad del espacio físico.',
  },
  professionalism_score: {
    key: 'professionalism_score',
    label: 'Profesionalismo',
    iconName: 'GraduationCap',
    helpText: 'Preparación y formación del equipo.',
  },
};

/** Devuelve las dimensiones aplicables según el tipo de proveedor. */
export function dimensionsForProviderType(
  type: ProviderType | null,
): readonly SurveyDimension[] {
  return type === 'service_provider'
    ? SURVEY_DIMENSIONS
    : UNIVERSAL_DIMENSIONS;
}

/** Mapa dimensión → columna de promedio en `public_provider_ratings`. */
export const RATING_AVG_COLUMN: Record<SurveyDimension, keyof ProviderRating> = {
  quality_score: 'avg_quality',
  human_treatment_score: 'avg_human_treatment',
  accessibility_score: 'avg_accessibility',
  price_value_score: 'avg_price_value',
  offer_compliance_score: 'avg_offer_compliance',
  sensory_adaptation_score: 'avg_sensory_adaptation',
  flexibility_crisis_score: 'avg_flexibility_crisis',
  facilities_score: 'avg_facilities',
  professionalism_score: 'avg_professionalism',
};

/** Mapa dimensión → clave i18n de su etiqueta corta (grupo `dim`). */
export const DIMENSION_LABEL_KEY: Record<SurveyDimension, string> = {
  quality_score: 'dim.quality',
  human_treatment_score: 'dim.humanTreatment',
  accessibility_score: 'dim.accessibility',
  price_value_score: 'dim.priceValue',
  offer_compliance_score: 'dim.offerCompliance',
  sensory_adaptation_score: 'dim.sensoryAdaptation',
  flexibility_crisis_score: 'dim.flexibilityCrisis',
  facilities_score: 'dim.facilities',
  professionalism_score: 'dim.professionalism',
};

/** Mapa dimensión → clave i18n de su texto de ayuda (grupo `dimHelp`). */
export const DIMENSION_HELP_KEY: Record<SurveyDimension, string> = {
  quality_score: 'dimHelp.quality',
  human_treatment_score: 'dimHelp.humanTreatment',
  accessibility_score: 'dimHelp.accessibility',
  price_value_score: 'dimHelp.priceValue',
  offer_compliance_score: 'dimHelp.offerCompliance',
  sensory_adaptation_score: 'dimHelp.sensoryAdaptation',
  flexibility_crisis_score: 'dimHelp.flexibilityCrisis',
  facilities_score: 'dimHelp.facilities',
  professionalism_score: 'dimHelp.professionalism',
};

// ── Resultados de operaciones (sin lanzar excepciones a la UI) ───────────────
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
