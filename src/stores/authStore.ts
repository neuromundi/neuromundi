/**
 * Store de autenticación (Zustand).
 *
 * Única fuente de verdad de la sesión. Concentra toda la lógica de Supabase Auth
 * para que los componentes no la toquen directamente: consumen `useAuth()`.
 */
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logger, toMessage } from '@/lib/utils';
import type { Profile, Result, UserRole } from '@/types/app';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/** Datos de una sucursal/ubicación que un proveedor agrega al registrarse. */
export interface SignUpLocation {
  label?: string | null;
  address: string;
  country?: string | null;
  state?: string | null;
  municipality?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  hours?: string | null;
}

interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
  providerType?: 'service_provider' | 'merchant' | 'school' | 'clinic' | 'wellness' | 'tourism' | 'legal' | 'ngo' | 'caregiver' | null;
  isCompany?: boolean;
  businessName?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  condition?: string | null;
  country?: string | null;
  state?: string | null;
  municipality?: string | null;
  address?: string | null;
  phone?: string | null;
  servicesOffered?: string | null;
  website?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
  cedulaProfesional?: string | null;
  /** Versión del reglamento + descargo aceptada por el usuario. */
  rulesVersion?: string | null;
  /** Grados académicos (solo escuelas). */
  schoolGrades?: string[] | null;
  /** Adulto independiente (flujo paciente "para mí"). */
  accountType?: 'padre_tutor' | 'adulto_independiente' | null;
  lifeStage?: string | null;
  interests?: string[] | null;
  commsOptIn?: boolean | null;
  /** Especialista: perfil profesional indexable. */
  titlePrefix?: string | null;
  profession?: string | null;
  bio?: string | null;
  whatsapp?: string | null;
  bookingUrl?: string | null;
  linkedin?: string | null;
  rfc?: string | null;
  specialties?: string[] | null;
  modalities?: string[] | null;
  ageRanges?: string[] | null;
  interventionAreas?: string[] | null;
  providerDetails?: Record<string, unknown> | null;
  /** Proveedor comercial: productos indexables. */
  productCategories?: string[] | null;
  productsOffered?: string[] | null;
  salesChannels?: string[] | null;
  shippingCoverage?: string[] | null;
  priceRange?: string | null;
  /** Sucursales (solo proveedores). Se insertan tras crear la cuenta. */
  locations?: SignUpLocation[];
}

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Inicializa el listener de sesión. Llamar una sola vez en el arranque. */
  initialize: () => () => void;
  signIn: (email: string, password: string) => Promise<Result<User>>;
  signUp: (input: SignUpInput) => Promise<Result<User | null>>;
  /** Inicia OAuth con un proveedor social (redirige fuera de la app). */
  signInWithProvider: (provider: 'google' | 'facebook' | 'apple' | 'linkedin_oidc' | 'azure') => Promise<Result<true>>;
  /** Completa el perfil de un usuario que entró por login social. */
  completeOnboarding: (input: {
    role: 'patient' | 'parent' | 'provider';
    providerType?: string | null;
    fullName?: string;
    country?: string;
    state?: string;
    municipality?: string;
    schoolGrades?: string[];
    rulesVersion: string;
  }) => Promise<Result<true>>;
  signOut: () => Promise<void>;
  /** Vuelve a leer el perfil del usuario actual desde la base. */
  refreshProfile: () => Promise<void>;
  /** Permite a otros hooks (useProfile) sincronizar el perfil tras editar. */
  setProfile: (profile: Profile) => void;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    logger.error('No se pudo cargar el perfil:', error.message);
    return null;
  }
  return data;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  session: null,
  user: null,
  profile: null,

  initialize: () => {
    // Estado inicial desde sesión persistida.
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        set({ status: 'authenticated', session, user: session.user, profile });
      } else {
        set({ status: 'unauthenticated', session: null, user: null, profile: null });
      }
    });

    // Suscripción a cambios de sesión.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        set({ status: 'authenticated', session, user: session.user, profile });
      } else {
        set({ status: 'unauthenticated', session: null, user: null, profile: null });
      }
    });

    // Cleanup para usar en useEffect.
    return () => sub.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: toMessage(error) };
    return { ok: true, data: data.user };
  },

  signUp: async (input) => {
    const {
      email,
      password,
      fullName,
      role = 'parent',
      providerType = null,
      isCompany,
      businessName,
      birthDate,
      gender,
      condition,
      country,
      state,
      municipality,
      address,
      phone,
      servicesOffered,
      website,
      instagram,
      tiktok,
      facebook,
      cedulaProfesional,
      rulesVersion,
      schoolGrades,
      accountType,
      lifeStage,
      interests,
      commsOptIn,
      titlePrefix,
      profession,
      bio,
      whatsapp,
      bookingUrl,
      linkedin,
      rfc,
      specialties,
      modalities,
      ageRanges,
      interventionAreas,
      providerDetails,
      productCategories,
      productsOffered,
      salesChannels,
      shippingCoverage,
      priceRange,
      locations,
    } = input;

    // El trigger handle_new_user lee TODOS estos metadatos y crea el perfil.
    const meta: Record<string, unknown> = { full_name: fullName, role };
    const put = (k: string, v: unknown) => {
      if (v !== undefined && v !== null && v !== '') meta[k] = String(v);
    };
    put('provider_type', providerType);
    put('business_name', businessName);
    if (isCompany != null) meta.is_company = isCompany ? 'true' : 'false';
    put('birth_date', birthDate);
    put('gender', gender);
    put('condition', condition);
    put('country', country);
    put('state', state);
    put('municipality', municipality);
    put('address', address);
    put('phone', phone);
    put('services_offered', servicesOffered);
    put('website', website);
    put('instagram', instagram);
    put('tiktok', tiktok);
    put('facebook', facebook);
    put('cedula_profesional', cedulaProfesional);
    put('rules_version', rulesVersion);
    put('account_type', accountType);
    put('life_stage', lifeStage);
    if (commsOptIn != null) meta.comms_opt_in = commsOptIn ? 'true' : 'false';
    if (interests && interests.length > 0) meta.interests = interests;
    // Especialista
    put('title_prefix', titlePrefix);
    put('profession', profession);
    put('bio', bio);
    put('whatsapp', whatsapp);
    put('booking_url', bookingUrl);
    put('linkedin', linkedin);
    put('rfc', rfc);
    if (specialties && specialties.length > 0) meta.specialties = specialties;
    if (modalities && modalities.length > 0) meta.modalities = modalities;
    if (ageRanges && ageRanges.length > 0) meta.age_ranges = ageRanges;
    if (interventionAreas && interventionAreas.length > 0) meta.intervention_areas = interventionAreas;
    if (productCategories && productCategories.length > 0) meta.product_categories = productCategories;
    if (productsOffered && productsOffered.length > 0) meta.products_offered = productsOffered;
    if (salesChannels && salesChannels.length > 0) meta.sales_channels = salesChannels;
    if (shippingCoverage && shippingCoverage.length > 0) meta.shipping_coverage = shippingCoverage;
    put('price_range', priceRange);
    if (providerDetails && Object.keys(providerDetails).length > 0) meta.provider_details = providerDetails;
    // Grados escolares como arreglo JSON real (el trigger lo lee como array).
    if (schoolGrades && schoolGrades.length > 0) meta.school_grades = schoolGrades;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    if (error) return { ok: false, error: toMessage(error) };

    // Si hay sesión activa (confirmación de correo desactivada) y el proveedor
    // registró sucursales, las insertamos. Si no, se podrán agregar en Ajustes.
    const userId = data.user?.id;
    if (userId && data.session && locations && locations.length > 0) {
      const rows = locations
        .filter((l) => l.address && l.address.trim() !== '')
        .map((l, i) => ({
          provider_id: userId,
          label: l.label ?? null,
          address: l.address,
          country: l.country ?? null,
          state: l.state ?? null,
          municipality: l.municipality ?? null,
          latitude: l.latitude ?? null,
          longitude: l.longitude ?? null,
          phone: l.phone ?? null,
          hours: l.hours ?? null,
          sort_order: i,
        }));
      if (rows.length > 0) {
        const { error: locErr } = await supabase.from('provider_locations').insert(rows);
        if (locErr) logger.error('No se pudieron guardar las sucursales', locErr);
      }
    }

    return { ok: true, data: data.user };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ status: 'unauthenticated', session: null, user: null, profile: null });
  },

  signInWithProvider: async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/panel` },
    });
    if (error) return { ok: false, error: toMessage(error) };
    return { ok: true, data: true };
  },

  completeOnboarding: async (input) => {
    const { data, error } = await supabase.rpc('complete_onboarding', {
      p_role: input.role,
      p_provider_type: input.providerType ?? '',
      p_full_name: input.fullName ?? '',
      p_country: input.country ?? '',
      p_state: input.state ?? '',
      p_municipality: input.municipality ?? '',
      p_rules_version: input.rulesVersion,
      p_school_grades: input.schoolGrades ?? [],
    });
    if (error) return { ok: false, error: toMessage(error) };
    await get().refreshProfile();
    void data;
    return { ok: true, data: true };
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    const profile = await fetchProfile(user.id);
    if (profile) set({ profile });
  },

  setProfile: (profile) => set({ profile }),
}));
