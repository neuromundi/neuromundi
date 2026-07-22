/**
 * Esquemas Zod compartidos.
 *
 * La encuesta valida solo las dimensiones aplicables al tipo de proveedor: las 7
 * universales siempre, y las 2 de service_provider únicamente cuando corresponde.
 */
import { z } from 'zod';
import { dimensionsForProviderType } from '@/types/app';
import type { ProviderType } from '@/types/app';
import { isStrictEmail, isDisposableEmail } from '@/lib/email';

const REQUIRED = 'survey.required';
const score = z
  .number({ invalid_type_error: REQUIRED })
  .int()
  .min(1, REQUIRED)
  .max(5);

const optionalScore = z.number().int().min(1).max(5).nullable();

export interface SurveyFormValues {
  quality_score: number;
  human_treatment_score: number;
  accessibility_score: number;
  price_value_score: number;
  offer_compliance_score: number;
  sensory_adaptation_score: number;
  flexibility_crisis_score: number;
  facilities_score: number | null;
  professionalism_score: number | null;
  comments: string;
  is_anonymous: boolean;
}

/**
 * Construye el esquema de validación para un tipo de proveedor concreto.
 * Para merchant, las dimensiones de servicio quedan opcionales (se envían null).
 */
export function makeSurveySchema(providerType: ProviderType | null) {
  const includeService = providerType === 'service_provider';
  return z.object({
    quality_score: score,
    human_treatment_score: score,
    accessibility_score: score,
    price_value_score: score,
    offer_compliance_score: score,
    sensory_adaptation_score: score,
    flexibility_crisis_score: score,
    facilities_score: includeService ? score : optionalScore,
    professionalism_score: includeService ? score : optionalScore,
    comments: z.string().max(500, 'val.commentMax').default(''),
    is_anonymous: z.boolean(),
  });
}

/** Valores iniciales de la encuesta (0 = sin calificar todavía). */
export function emptySurveyValues(): SurveyFormValues {
  return {
    quality_score: 0,
    human_treatment_score: 0,
    accessibility_score: 0,
    price_value_score: 0,
    offer_compliance_score: 0,
    sensory_adaptation_score: 0,
    flexibility_crisis_score: 0,
    facilities_score: null,
    professionalism_score: null,
    comments: '',
    is_anonymous: true,
  };
}

/** Devuelve true si todas las dimensiones aplicables ya tienen valor 1–5. */
export function isSurveyComplete(
  values: SurveyFormValues,
  providerType: ProviderType | null,
): boolean {
  return dimensionsForProviderType(providerType).every((key) => {
    const v = values[key];
    return typeof v === 'number' && v >= 1 && v <= 5;
  });
}

// ── Ofertas ──────────────────────────────────────────────────────────────────

export const OFFER_STATUSES = ['draft', 'active', 'paused'] as const;

/**
 * Esquema de creación/edición de ofertas. `discount_value` es obligatorio para
 * porcentaje y monto fijo, e ignorado para cortesía. Si hay ambas fechas, la de
 * fin debe ser posterior a la de inicio.
 */
export const offerSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'offer.errTitleMin')
      .max(120, 'offer.errTitleMax'),
    description: z.string().max(1000, 'offer.errDescMax').optional().default(''),
    discount_type: z.enum(['percentage', 'fixed', 'freebie']),
    discount_value: z.number().positive('offer.errPositive').nullable(),
    terms: z.string().max(1000).optional().default(''),
    valid_from: z.string().optional().default(''),
    valid_until: z.string().optional().default(''),
    max_redemptions: z.number().int().positive().nullable(),
    status: z.enum(['draft', 'active', 'paused']),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === 'percentage') {
      if (data.discount_value == null || data.discount_value < 1 || data.discount_value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['discount_value'],
          message: 'offer.errPercent',
        });
      }
    } else if (data.discount_type === 'fixed') {
      if (data.discount_value == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['discount_value'],
          message: 'offer.errAmount',
        });
      }
    }
    if (data.valid_from && data.valid_until && data.valid_until <= data.valid_from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valid_until'],
        message: 'offer.errDates',
      });
    }
  });

export type OfferFormValues = z.input<typeof offerSchema>;

export function defaultOfferValues(): OfferFormValues {
  return {
    title: '',
    description: '',
    discount_type: 'percentage',
    discount_value: null,
    terms: '',
    valid_from: '',
    valid_until: '',
    max_redemptions: null,
    status: 'draft',
  };
}

// ── Productos ────────────────────────────────────────────────────────────────

/**
 * Esquema de alta/edición de producto del catálogo. `purchase_url`, si se
 * proporciona, debe ser una URL válida (handoff de compra con el proveedor).
 */
export const productSchema = z.object({
  name: z.string().trim().min(2, 'product.errName').max(140, 'product.errNameMax'),
  description: z.string().max(2000).optional().default(''),
  price: z.number().nonnegative('product.errPrice').nullable(),
  image_url: z
    .string()
    .trim()
    .url('val.url')
    .optional()
    .or(z.literal('')),
  purchase_url: z
    .string()
    .trim()
    .url('product.errPurchaseUrl')
    .optional()
    .or(z.literal('')),
  category_id: z.number().int().nullable(),
  store_category: z.string().max(40).optional().default(''),
  // Si la clasificación es "Otro", el oferente debe especificar cuál propone.
  store_category_other: z.string().trim().max(60).optional().default(''),
  is_active: z.boolean(),
}).refine(
  (v) => v.store_category !== 'otro' || (v.store_category_other ?? '').trim().length >= 3,
  { path: ['store_category_other'], message: 'product.errOtherRequired' },
);

export type ProductFormValues = z.input<typeof productSchema>;

export function defaultProductValues(): ProductFormValues {
  return {
    name: '',
    description: '',
    price: null,
    image_url: '',
    purchase_url: '',
    category_id: null,
    store_category: '',
    store_category_other: '',
    is_active: true,
  };
}

// ── Autenticación ────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().trim().email('val.email'),
  password: z.string().min(1, 'val.passwordRequired'),
});
export type LoginValues = z.infer<typeof loginSchema>;

/** Una sucursal/ubicación en el registro de un proveedor. */
export const regLocationSchema = z.object({
  label: z.string().optional().default(''),
  address: z.string().trim().min(1, 'reg.errAddress'),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  phone: z.string().optional().default(''),
  hours: z.string().optional().default(''),
});

export const REG_TYPES = ['patient', 'parent', 'service_provider', 'merchant', 'school'] as const;
export type RegType = (typeof REG_TYPES)[number];

export const registerSchema = z
  .object({
    regType: z.enum(REG_TYPES),
    email: z
      .string()
      .trim()
      .email('val.email')
      .refine(isStrictEmail, 'val.emailInvalid')
      .refine((v) => !isDisposableEmail(v), 'val.emailDisposable'),
    password: z.string().min(8, 'val.passwordMin'),
    confirm_password: z.string().optional().default(''),
    confirm_email: z.string().trim().optional().default(''),
    is_company: z.boolean().default(false),
    school_grades: z.array(z.string()).optional().default([]),
    full_name: z.string().trim().optional().default(''),
    business_name: z.string().trim().optional().default(''),
    birth_date: z.string().optional().default(''),
    gender: z.string().optional().default(''),
    condition: z.string().optional().default(''),
    country: z.string().optional().default(''),
    state: z.string().optional().default(''),
    municipality: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    dial_code: z.string().optional().default('+52'),
    services_offered: z.string().optional().default(''),
    website: z.string().trim().optional().default(''),
    instagram: z.string().trim().optional().default(''),
    tiktok: z.string().trim().optional().default(''),
    facebook: z.string().trim().optional().default(''),
    cedula_profesional: z.string().trim().optional().default(''),
    // Adulto independiente (flujo paciente "para mí")
    life_stage: z.string().optional().default(''),
    interests: z.array(z.string()).optional().default([]),
    comms_opt_in: z.boolean().optional().default(false),
    locations: z.array(regLocationSchema).optional().default([]),
    accept_terms: z.boolean().refine((v) => v === true, { message: 'reg.errTerms' }),
    accept_rules: z.boolean().refine((v) => v === true, { message: 'reg.errRules' }),
    accept_manifesto: z.boolean().refine((v) => v === true, { message: 'reg.errManifesto' }),
    wants_founder: z.boolean().optional().default(true),
  })
  .superRefine((d, ctx) => {
    const consumer = d.regType === 'patient' || d.regType === 'parent';
    const provider = d.regType === 'service_provider' || d.regType === 'merchant' || d.regType === 'school';
    const req = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    // Confirmación de contraseña (debe coincidir).
    if (d.password !== d.confirm_password) req(['confirm_password'], 'val.passwordMismatch');
    // Confirmación de correo (debe coincidir).
    if (d.email.trim().toLowerCase() !== d.confirm_email.trim().toLowerCase()) req(['confirm_email'], 'val.emailMismatch');

    // Nombre completo (persona física) o razón social (empresa).
    if (provider && d.is_company) {
      if (!d.business_name || d.business_name.trim().length < 2) req(['business_name'], 'reg.errBusiness');
    } else if (!d.full_name || d.full_name.trim().length < 2) {
      req(['full_name'], 'val.nameMin');
    }

    // Fecha de nacimiento: consumidores siempre; proveedores solo si son persona física.
    if (consumer || (provider && !d.is_company)) {
      if (!d.birth_date) req(['birth_date'], 'reg.errBirth');
    }

    // Neurodivergencia / padecimiento: obligatorio para consumidores.
    if (consumer && (!d.condition || d.condition.trim() === '')) req(['condition'], 'reg.errCondition');

    // País / estado / municipalidad: obligatorios para todos los tipos.
    if (!d.country || d.country.trim() === '') req(['country'], 'reg.errRequired');
    if (!d.state || d.state.trim() === '') req(['state'], 'reg.errRequired');
    if (!d.municipality || d.municipality.trim() === '') req(['municipality'], 'reg.errRequired');

    // Proveedores: servicio(s)/producto(s) y al menos una sucursal con teléfono y horarios.
    if (provider) {
      if (!d.services_offered || d.services_offered.trim() === '')
        req(['services_offered'], d.regType === 'merchant' ? 'reg.errProducts' : 'reg.errServices');
      if (!d.locations || d.locations.length === 0) {
        req(['locations'], 'reg.errLocations');
      } else {
        d.locations.forEach((loc, i) => {
          if (!loc.phone || loc.phone.trim() === '') req(['locations', i, 'phone'], 'reg.errLocPhone');
          if (!loc.hours || loc.hours.trim() === '') req(['locations', i, 'hours'], 'reg.errLocHours');
        });
      }
    }
  });
export type RegisterValues = z.input<typeof registerSchema>;

// ── Perfil / ajustes ─────────────────────────────────────────────────────────

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'val.nameMin'),
  phone: z.string().trim().max(30).optional().default(''),
  bio: z.string().max(500).optional().default(''),
  business_name: z.string().trim().max(140).optional().default(''),
  website_url: z.string().trim().url('val.url').optional().or(z.literal('')),
  address: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().max(100).optional().default(''),
  country: z.string().trim().max(100).optional().default(''),
  state: z.string().trim().max(100).optional().default(''),
  municipality: z.string().trim().max(100).optional().default(''),
  birth_date: z.string().optional().default(''),
  gender: z.string().trim().max(60).optional().default(''),
  condition: z.string().trim().max(200).optional().default(''),
  rfc: z.string().trim().max(20).optional().default(''),
  fiscal_razon_social: z.string().trim().max(200).optional().default(''),
  fiscal_regimen: z.string().trim().max(10).optional().default(''),
  fiscal_uso_cfdi: z.string().trim().max(10).optional().default(''),
  fiscal_cp: z.string().trim().max(12).optional().default(''),
  fiscal_direccion: z.string().trim().max(250).optional().default(''),
  fiscal_email: z.string().trim().email('val.email').optional().or(z.literal('')),
  fiscal_tax_id: z.string().trim().max(40).optional().default(''),
  fiscal_country: z.string().trim().max(100).optional().default(''),
  school_grades: z.array(z.string()).optional().default([]),
  is_company: z.boolean().optional().default(false),
  services_offered: z.string().max(1000).optional().default(''),
  provider_type: z
    .enum(['service_provider', 'merchant', 'school', 'clinic', 'wellness', 'tourism', 'legal', 'ngo', 'caregiver'])
    .nullable()
    .optional(),
  is_published: z.boolean().optional().default(false),
});

export type ProfileFormValues = z.input<typeof profileSchema>;
