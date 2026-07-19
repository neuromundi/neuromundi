/**
 * providerCatalog — catálogos para el registro e indexación de proveedores.
 * Los `value` son claves canónicas que se guardan/indexan; etiquetas en español.
 */
export interface CatItem { value: string; label: string; sub?: string[] }

export const PRODUCT_CATEGORIES: CatItem[] = [
  {
    value: 'sensorial', label: 'Regulación y Procesamiento Sensorial',
    sub: ['Propiocepción y presión profunda', 'Estimulación vestibular', 'Regulación auditiva y visual', 'Táctiles y orales (fidgets)'],
  },
  {
    value: 'cognitivo', label: 'Desarrollo Cognitivo y Funciones Ejecutivas',
    sub: ['Organización y estructuración temporal', 'Estimulación cognitiva', 'Software y tecnología de apoyo'],
  },
  {
    value: 'comunicacion', label: 'Comunicación y Lenguaje',
    sub: ['Sistemas Aumentativos (SAAC)', 'Recursos visuales (PECS)', 'Material logopédico'],
  },
  {
    value: 'autonomia', label: 'Autonomía y AVD',
    sub: ['Alimentación adaptada', 'Higiene y cuidado personal', 'Vestimenta inclusiva'],
  },
  {
    value: 'motricidad', label: 'Motricidad y Psicomotricidad',
    sub: ['Motricidad fina y grafomotricidad', 'Motricidad gruesa', 'Posicionamiento y ergonomía'],
  },
  {
    value: 'social_emocional', label: 'Habilidades Sociales y Educación Emocional',
    sub: ['Inteligencia emocional', 'Juego cooperativo', 'Libros y cuentos adaptados'],
  },
  { value: 'otro', label: 'Otro' },
];

export const SALES_CHANNELS: CatItem[] = [
  { value: 'online', label: 'Tienda en línea' },
  { value: 'fisica', label: 'Tienda física' },
  { value: 'whatsapp', label: 'Ventas por WhatsApp' },
  { value: 'distribuidores', label: 'Distribuidores autorizados' },
];

export const SHIPPING_COVERAGE: CatItem[] = [
  { value: 'local', label: 'Local' },
  { value: 'nacional', label: 'Nacional' },
  { value: 'internacional', label: 'Internacional' },
];

export const PRICE_RANGES: string[] = ['$', '$$', '$$$'];

export const REDEMPTION_METHODS: CatItem[] = [
  { value: 'qr_fisica', label: 'Tienda física (escaneo de QR en mostrador)' },
  { value: 'cupon_online', label: 'Tienda en línea (cupón dinámico en el checkout)' },
];
