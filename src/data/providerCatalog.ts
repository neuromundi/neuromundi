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
  // ── Ampliación (taxonomía Neuromundi) ──────────────────────────────────────
  {
    value: 'perinatal', label: 'Perinatal y Alimentación Temprana',
    sub: ['Soporte y posicionamiento (biberones terapéuticos, cojines)', 'Transición a sólidos (cucharas texturizadas, vasos con válvula)', 'Exploración oral (mordedores médicos, cepillos dedales)'],
  },
  {
    value: 'neurosensorial_tech', label: 'Tecnología Neurosensorial',
    sub: ['Hardware de regulación (auriculares óseos: Forbrain, Soundsory)', 'Software y biofeedback (SSP/Unyte, HeartMath)', 'Relojes visuales (Time Timers) y apps de rutinas'],
  },
  {
    value: 'mascotas_nf', label: 'Mascotas Neuro-Friendly',
    sub: ['Accesorios sensoriales (placas de silicona, correas sin ruido)', 'Apoyo ejecutivo (entregas automatizadas, areneros autolimpiables)', 'Seguridad (correas manos libres)'],
  },
  {
    value: 'arte_musica', label: 'Arte y Música Adaptados',
    sub: ['Instrumentos adaptados (tambores de lengüetas, kalimbas, pentatónicos)', 'Materiales de arte sensoriales (arcillas, pinturas texturizadas)', 'Herramientas sin desorden (mess-free)', 'Cancelación de ruido para músicos'],
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
