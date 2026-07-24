/**
 * Tipos de la base de datos Neuromundi.
 *
 * Equivalente a lo que produce `supabase gen types typescript`, escrito a mano
 * para reflejar exactamente el esquema de la PARTE 1. Cuando el proyecto esté
 * conectado, puede regenerarse con:
 *
 *   supabase gen types typescript --project-id <id> --schema public > database.ts
 *
 * Mientras tanto, este archivo mantiene el tipado estricto del cliente.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── Enums del esquema ────────────────────────────────────────────────────────
export type UserRole = 'patient' | 'parent' | 'provider' | 'admin';
export type ProviderType = 'service_provider' | 'merchant' | 'school' | 'clinic' | 'wellness' | 'tourism' | 'legal' | 'ngo' | 'caregiver';
export type TransactionStatus = 'pending' | 'completed' | 'expired' | 'disputed';
export type OfferStatus = 'active' | 'paused' | 'expired' | 'draft';
export type DiscountType = 'percentage' | 'fixed' | 'freebie';
export type PrescriptionStatus = 'draft' | 'sent' | 'viewed' | 'ordered' | 'archived';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          bio: string | null;
          qr_token: string;
          provider_type: ProviderType | null;
          business_name: string | null;
          website_url: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          is_verified: boolean;
          is_published: boolean;
          latitude: number | null;
          longitude: number | null;
          birth_date: string | null;
          gender: string | null;
          condition: string | null;
          state: string | null;
          municipality: string | null;
          is_company: boolean;
          services_offered: string | null;
          membership_status: string;
          membership_due_at: string | null;
          membership_paid_until: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          promo_code_used: string | null;
          dial_code: string | null;
          website: string | null;
          instagram: string | null;
          tiktok: string | null;
          facebook: string | null;
          cedula_profesional: string | null;
          rules_version_accepted: string | null;
          rules_accepted_at: string | null;
          stripe_connect_id: string | null;
          stripe_charges_enabled: boolean;
          accepts_payments: boolean;
          consultation_amount: number | null;
          consultation_currency: string | null;
          rfc: string | null;
          public_key: string | null;
          fiscal_razon_social: string | null;
          fiscal_regimen: string | null;
          fiscal_uso_cfdi: string | null;
          fiscal_cp: string | null;
          fiscal_direccion: string | null;
          fiscal_email: string | null;
          fiscal_tax_id: string | null;
          fiscal_country: string | null;
          school_grades: string[];
          account_type: string | null;
          life_stage: string | null;
          interests: string[] | null;
          comms_opt_in: boolean | null;
          title_prefix: string | null;
          profession: string | null;
          whatsapp: string | null;
          booking_url: string | null;
          linkedin: string | null;
          specialties: string[] | null;
          modalities: string[] | null;
          age_ranges: string[] | null;
          intervention_areas: string[] | null;
          product_categories: string[] | null;
          products_offered: string[] | null;
          sales_channels: string[] | null;
          shipping_coverage: string[] | null;
          price_range: string | null;
          provider_details: Record<string, unknown> | null;
          member_no: number | null;
          referred_by: number | null;
          referred_at: string | null;
          referral_credit_pct: number;
          wants_founder: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          qr_token?: string;
          provider_type?: ProviderType | null;
          business_name?: string | null;
          website_url?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          is_verified?: boolean;
          is_published?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          birth_date?: string | null;
          gender?: string | null;
          condition?: string | null;
          state?: string | null;
          municipality?: string | null;
          is_company?: boolean;
          services_offered?: string | null;
          membership_status?: string;
          membership_due_at?: string | null;
          membership_paid_until?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          promo_code_used?: string | null;
          dial_code?: string | null;
          website?: string | null;
          instagram?: string | null;
          tiktok?: string | null;
          facebook?: string | null;
          cedula_profesional?: string | null;
          rules_version_accepted?: string | null;
          rules_accepted_at?: string | null;
          stripe_connect_id?: string | null;
          stripe_charges_enabled?: boolean;
          accepts_payments?: boolean;
          consultation_amount?: number | null;
          consultation_currency?: string | null;
          rfc?: string | null;
          public_key?: string | null;
          fiscal_razon_social?: string | null;
          fiscal_regimen?: string | null;
          fiscal_uso_cfdi?: string | null;
          fiscal_cp?: string | null;
          fiscal_direccion?: string | null;
          fiscal_email?: string | null;
          fiscal_tax_id?: string | null;
          fiscal_country?: string | null;
          school_grades?: string[];
          account_type?: string | null;
          life_stage?: string | null;
          interests?: string[] | null;
          comms_opt_in?: boolean | null;
          title_prefix?: string | null;
          profession?: string | null;
          whatsapp?: string | null;
          booking_url?: string | null;
          linkedin?: string | null;
          specialties?: string[] | null;
          modalities?: string[] | null;
          age_ranges?: string[] | null;
          intervention_areas?: string[] | null;
          product_categories?: string[] | null;
          products_offered?: string[] | null;
          sales_channels?: string[] | null;
          shipping_coverage?: string[] | null;
          price_range?: string | null;
          provider_details?: Record<string, unknown> | null;
          member_no?: number | null;
          referred_by?: number | null;
          referred_at?: string | null;
          referral_credit_pct?: number;
          wants_founder?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };

      categories: {
        Row: {
          id: number;
          slug: string;
          name: string;
          icon_name: string | null;
          color_hex: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          slug: string;
          name: string;
          icon_name?: string | null;
          color_hex?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };

      provider_categories: {
        Row: {
          provider_id: string;
          category_id: number;
        };
        Insert: {
          provider_id: string;
          category_id: number;
        };
        Update: Partial<Database['public']['Tables']['provider_categories']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'provider_categories_provider_id_fkey';
            columns: ['provider_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'provider_categories_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };

      offers: {
        Row: {
          id: string;
          provider_id: string;
          title: string;
          description: string | null;
          discount_type: DiscountType;
          discount_value: number | null;
          terms: string | null;
          valid_from: string | null;
          valid_until: string | null;
          max_redemptions: number | null;
          redemptions_count: number;
          status: OfferStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          title: string;
          description?: string | null;
          discount_type: DiscountType;
          discount_value?: number | null;
          terms?: string | null;
          valid_from?: string | null;
          valid_until?: string | null;
          max_redemptions?: number | null;
          redemptions_count?: number;
          status?: OfferStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['offers']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'offers_provider_id_fkey';
            columns: ['provider_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      discount_transactions: {
        Row: {
          id: string;
          offer_id: string;
          provider_id: string;
          parent_id: string;
          status: TransactionStatus;
          scanned_by: string | null;
          scanned_at: string | null;
          completed_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          provider_id: string;
          parent_id: string;
          status?: TransactionStatus;
          scanned_by?: string | null;
          scanned_at?: string | null;
          completed_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['discount_transactions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'discount_transactions_offer_id_fkey';
            columns: ['offer_id'];
            referencedRelation: 'offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'discount_transactions_parent_id_fkey';
            columns: ['parent_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      satisfaction_surveys: {
        Row: {
          id: string;
          transaction_id: string;
          parent_id: string;
          provider_id: string;
          quality_score: number;
          human_treatment_score: number;
          accessibility_score: number;
          price_value_score: number;
          offer_compliance_score: number;
          sensory_adaptation_score: number;
          flexibility_crisis_score: number;
          facilities_score: number | null;
          professionalism_score: number | null;
          comments: string | null;
          is_anonymous: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          parent_id: string;
          provider_id: string;
          quality_score: number;
          human_treatment_score: number;
          accessibility_score: number;
          price_value_score: number;
          offer_compliance_score: number;
          sensory_adaptation_score: number;
          flexibility_crisis_score: number;
          facilities_score?: number | null;
          professionalism_score?: number | null;
          comments?: string | null;
          is_anonymous?: boolean;
          created_at?: string;
        };
        // Las encuestas son inmutables: no se exponen updates en la app.
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'satisfaction_surveys_transaction_id_fkey';
            columns: ['transaction_id'];
            referencedRelation: 'discount_transactions';
            referencedColumns: ['id'];
          },
        ];
      };

      products: {
        Row: {
          id: string;
          vendor_id: string;
          category_id: number | null;
          name: string;
          description: string | null;
          price: number | null;
          currency: string;
          image_url: string | null;
          purchase_url: string | null;
          store_category: string | null;
          store_category_other: string | null;
          stock: number | null;
          is_featured: boolean;
          is_active: boolean;
          status: string;
          review_note: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          category_id?: number | null;
          name: string;
          description?: string | null;
          price?: number | null;
          currency?: string;
          image_url?: string | null;
          purchase_url?: string | null;
          store_category?: string | null;
          store_category_other?: string | null;
          stock?: number | null;
          is_featured?: boolean;
          is_active?: boolean;
          status?: string;
          review_note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'products_vendor_id_fkey';
            columns: ['vendor_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      prescriptions: {
        Row: {
          id: string;
          therapist_id: string;
          parent_id: string;
          title: string;
          note: string | null;
          status: PrescriptionStatus;
          sent_at: string | null;
          viewed_at: string | null;
          ordered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          therapist_id: string;
          parent_id: string;
          title?: string;
          note?: string | null;
          status?: PrescriptionStatus;
          sent_at?: string | null;
          viewed_at?: string | null;
          ordered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['prescriptions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'prescriptions_therapist_id_fkey';
            columns: ['therapist_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      prescription_items: {
        Row: {
          id: string;
          prescription_id: string;
          product_id: string;
          quantity: number;
          note: string | null;
          unit_price_snapshot: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          prescription_id: string;
          product_id: string;
          quantity?: number;
          note?: string | null;
          unit_price_snapshot?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['prescription_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'prescription_items_prescription_id_fkey';
            columns: ['prescription_id'];
            referencedRelation: 'prescriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescription_items_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      provider_connections: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: 'pending' | 'accepted';
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: 'pending' | 'accepted';
          created_at?: string;
          responded_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['provider_connections']['Insert']>;
        Relationships: [];
      };
      parent_lists: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          is_public: boolean;
          share_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title?: string;
          is_public?: boolean;
          share_token?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['parent_lists']['Insert']>;
        Relationships: [];
      };
      parent_list_items: {
        Row: {
          id: string;
          list_id: string;
          provider_id: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          provider_id: string;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['parent_list_items']['Insert']>;
        Relationships: [];
      };

      provider_locations: {
        Row: {
          id: string;
          provider_id: string;
          label: string | null;
          address: string;
          country: string | null;
          state: string | null;
          municipality: string | null;
          latitude: number | null;
          longitude: number | null;
          phone: string | null;
          hours: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          label?: string | null;
          address: string;
          country?: string | null;
          state?: string | null;
          municipality?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          hours?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['provider_locations']['Insert']>;
        Relationships: [];
      };

      membership_fees: {
        Row: { affiliate_type: string; base_usd: number; is_active: boolean; updated_at: string };
        Insert: { affiliate_type: string; base_usd: number; is_active?: boolean; updated_at?: string };
        Update: Partial<Database['public']['Tables']['membership_fees']['Insert']>;
        Relationships: [];
      };

      country_pricing: {
        Row: {
          country_label: string;
          currency: string;
          fx_per_usd: number;
          zero_decimal: boolean;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          country_label: string;
          currency: string;
          fx_per_usd: number;
          zero_decimal?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['country_pricing']['Insert']>;
        Relationships: [];
      };

      promo_codes: {
        Row: {
          code: string;
          kind: string;
          scope: string;
          max_uses: number | null;
          used_count: number;
          expires_at: string | null;
          is_active: boolean;
          note: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          kind?: string;
          scope?: string;
          max_uses?: number | null;
          used_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['promo_codes']['Insert']>;
        Relationships: [];
      };

      promo_redemptions: {
        Row: { id: string; code: string; user_id: string; redeemed_at: string };
        Insert: { id?: string; code: string; user_id: string; redeemed_at?: string };
        Update: Partial<Database['public']['Tables']['promo_redemptions']['Insert']>;
        Relationships: [];
      };

      provider_availability: {
        Row: {
          id: string;
          provider_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          slot_minutes: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          provider_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          slot_minutes?: number;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['provider_availability']['Insert']>;
        Relationships: [];
      };

      appointments: {
        Row: {
          id: string;
          provider_id: string;
          patient_id: string;
          starts_at: string;
          ends_at: string;
          status: string;
          video_link: string | null;
          note: string | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          patient_id: string;
          starts_at: string;
          ends_at: string;
          status?: string;
          video_link?: string | null;
          note?: string | null;
          source?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
        Relationships: [];
      };

      waitlist: {
        Row: {
          id: string;
          provider_id: string;
          patient_id: string;
          note: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          patient_id: string;
          note?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['waitlist']['Insert']>;
        Relationships: [];
      };

      appointment_reminders: {
        Row: {
          id: string;
          appointment_id: string;
          channel: string;
          offset_hours: number;
          send_at: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          channel: string;
          offset_hours: number;
          send_at: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['appointment_reminders']['Insert']>;
        Relationships: [];
      };

      payments: {
        Row: {
          id: string;
          provider_id: string;
          payer_id: string | null;
          appointment_id: string | null;
          kind: string;
          amount_cents: number;
          currency: string;
          status: string;
          payer_name: string | null;
          payer_rfc: string | null;
          stripe_session_id: string | null;
          stripe_payment_intent: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          provider_id: string;
          payer_id?: string | null;
          appointment_id?: string | null;
          kind?: string;
          amount_cents: number;
          currency: string;
          status?: string;
          payer_name?: string | null;
          payer_rfc?: string | null;
          stripe_session_id?: string | null;
          stripe_payment_intent?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          paid_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
        Relationships: [];
      };

      content_posts: {
        Row: { id: string; author_id: string; type: string; title: string; body: string | null; external_url: string | null; keywords: string[]; topic: string | null; cover_url: string | null; excerpt: string | null; is_published: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; author_id: string; type?: string; title: string; body?: string | null; external_url?: string | null; keywords?: string[]; topic?: string | null; cover_url?: string | null; excerpt?: string | null; is_published?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['content_posts']['Insert']>;
        Relationships: [];
      };

      content_ratings: {
        Row: { id: string; post_id: string; user_id: string; stars: number; created_at: string };
        Insert: { id?: string; post_id: string; user_id: string; stars: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['content_ratings']['Insert']>;
        Relationships: [];
      };

      content_comments: {
        Row: { id: string; post_id: string; user_id: string; body: string; created_at: string };
        Insert: { id?: string; post_id: string; user_id: string; body: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['content_comments']['Insert']>;
        Relationships: [];
      };

      content_views: {
        Row: { post_id: string; user_id: string; viewed_at: string };
        Insert: { post_id: string; user_id: string; viewed_at?: string };
        Update: Partial<Database['public']['Tables']['content_views']['Insert']>;
        Relationships: [];
      };
      reports: {
        Row: { id: string; reporter_id: string | null; reported_member_no: number | null; category: string; category_other: string | null; description: string; attachments: string[]; status: string; admin_note: string | null; reporter_email: string | null; reporter_name: string | null; is_member: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; reporter_id?: string | null; reported_member_no?: number | null; category: string; category_other?: string | null; description: string; attachments?: string[]; status?: string; admin_note?: string | null; reporter_email?: string | null; reporter_name?: string | null; is_member?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
        Relationships: [];
      };
      founder_members: {
        Row: { user_id: string; kind: string; country: string | null; created_at: string };
        Insert: { user_id: string; kind: string; country?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['founder_members']['Insert']>;
        Relationships: [];
      };

      notifications: {
        Row: { id: string; user_id: string; type: string; title: string; body: string | null; data: Record<string, unknown>; is_read: boolean; created_at: string };
        Insert: { id?: string; user_id: string; type: string; title: string; body?: string | null; data?: Record<string, unknown>; is_read?: boolean; created_at?: string };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };

      clinical_consents: {
        Row: { id: string; patient_id: string; provider_id: string; status: string; granted_at: string; revoked_at: string | null };
        Insert: { id?: string; patient_id: string; provider_id: string; status?: string; granted_at?: string; revoked_at?: string | null };
        Update: Partial<Database['public']['Tables']['clinical_consents']['Insert']>;
        Relationships: [];
      };

      clinical_entries: {
        Row: { id: string; patient_id: string; author_id: string; kind: string; title: string; body: string | null; period: string | null; created_at: string };
        Insert: { id?: string; patient_id: string; author_id: string; kind?: string; title: string; body?: string | null; period?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['clinical_entries']['Insert']>;
        Relationships: [];
      };

      home_tasks: {
        Row: { id: string; patient_id: string; provider_id: string; title: string; detail: string | null; due_date: string | null; completed: boolean; completed_at: string | null; created_at: string };
        Insert: { id?: string; patient_id: string; provider_id: string; title: string; detail?: string | null; due_date?: string | null; completed?: boolean; completed_at?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['home_tasks']['Insert']>;
        Relationships: [];
      };

      clinical_messages: {
        Row: { id: string; patient_id: string; provider_id: string; sender_id: string; body: string; created_at: string };
        Insert: { id?: string; patient_id: string; provider_id: string; sender_id: string; body: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['clinical_messages']['Insert']>;
        Relationships: [];
      };

      secure_files: {
        Row: { id: string; owner_id: string; patient_id: string; filename: string; mime: string | null; storage_path: string; iv: string; expires_at: string | null; created_at: string };
        Insert: { id?: string; owner_id: string; patient_id: string; filename: string; mime?: string | null; storage_path: string; iv: string; expires_at?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['secure_files']['Insert']>;
        Relationships: [];
      };

      secure_file_keys: {
        Row: { file_id: string; recipient_id: string; wrapped_key: string };
        Insert: { file_id: string; recipient_id: string; wrapped_key: string };
        Update: Partial<Database['public']['Tables']['secure_file_keys']['Insert']>;
        Relationships: [];
      };

      affiliate_codes: {
        Row: { id: string; provider_id: string; code: string; commission_pct: number; is_active: boolean; created_at: string };
        Insert: { id?: string; provider_id: string; code: string; commission_pct?: number; is_active?: boolean; created_at?: string };
        Update: Partial<Database['public']['Tables']['affiliate_codes']['Insert']>;
        Relationships: [];
      };

      orders: {
        Row: { id: string; product_id: string | null; buyer_id: string | null; vendor_id: string; affiliate_id: string | null; product_name: string; amount_cents: number; currency: string; commission_cents: number; status: string; buyer_name: string | null; stripe_session_id: string | null; created_at: string; paid_at: string | null };
        Insert: { id?: string; product_id?: string | null; buyer_id?: string | null; vendor_id: string; affiliate_id?: string | null; product_name: string; amount_cents: number; currency: string; commission_cents?: number; status?: string; buyer_name?: string | null; stripe_session_id?: string | null; created_at?: string; paid_at?: string | null };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: [];
      };

      allies: {
        Row: { id: string; name: string; logo_url: string; website: string | null; sort_order: number; is_active: boolean; created_at: string };
        Insert: { id?: string; name: string; logo_url: string; website?: string | null; sort_order?: number; is_active?: boolean; created_at?: string };
        Update: Partial<Database['public']['Tables']['allies']['Insert']>;
        Relationships: [];
      };

      donation_tiers: {
        Row: { currency: string; symbol: string; zero_decimal: boolean; seed_amount: number; ally_amount: number; driver_amount: number; ambassador_amount: number; is_active: boolean; updated_at: string };
        Insert: { currency: string; symbol?: string; zero_decimal?: boolean; seed_amount: number; ally_amount: number; driver_amount: number; ambassador_amount: number; is_active?: boolean; updated_at?: string };
        Update: Partial<Database['public']['Tables']['donation_tiers']['Insert']>;
        Relationships: [];
      };

      message_templates: {
        Row: { id: string; owner_id: string; title: string; body: string; sort_order: number; created_at: string };
        Insert: { id?: string; owner_id: string; title: string; body: string; sort_order?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['message_templates']['Insert']>;
        Relationships: [];
      };

      provider_time_off: {
        Row: { id: string; provider_id: string; starts_at: string; ends_at: string; all_day: boolean; reason: string | null; created_at: string };
        Insert: { id?: string; provider_id: string; starts_at: string; ends_at: string; all_day?: boolean; reason?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['provider_time_off']['Insert']>;
        Relationships: [];
      };

      search_alerts: {
        Row: { id: string; user_id: string; country: string | null; category_id: number | null; city: string | null; created_at: string };
        Insert: { id?: string; user_id: string; country?: string | null; category_id?: number | null; city?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['search_alerts']['Insert']>;
        Relationships: [];
      };

      notification_prefs: {
        Row: { user_id: string; push_enabled: boolean; muted_categories: string[]; updated_at: string };
        Insert: { user_id: string; push_enabled?: boolean; muted_categories?: string[]; updated_at?: string };
        Update: Partial<Database['public']['Tables']['notification_prefs']['Insert']>;
        Relationships: [];
      };

      courses: {
        Row: { id: string; author_id: string; title: string; description: string | null; cover_url: string | null; level: string | null; audience: string | null; country: string | null; is_published: boolean; created_at: string };
        Insert: { id?: string; author_id: string; title: string; description?: string | null; cover_url?: string | null; level?: string | null; audience?: string | null; country?: string | null; is_published?: boolean; created_at?: string };
        Update: Partial<Database['public']['Tables']['courses']['Insert']>;
        Relationships: [];
      };

      course_modules: {
        Row: { id: string; course_id: string; title: string; position: number };
        Insert: { id?: string; course_id: string; title: string; position?: number };
        Update: Partial<Database['public']['Tables']['course_modules']['Insert']>;
        Relationships: [];
      };

      course_lessons: {
        Row: { id: string; module_id: string; title: string; content: string | null; video_url: string | null; position: number; duration_min: number | null };
        Insert: { id?: string; module_id: string; title: string; content?: string | null; video_url?: string | null; position?: number; duration_min?: number | null };
        Update: Partial<Database['public']['Tables']['course_lessons']['Insert']>;
        Relationships: [];
      };

      course_enrollments: {
        Row: { id: string; course_id: string; user_id: string; enrolled_at: string };
        Insert: { id?: string; course_id: string; user_id: string; enrolled_at?: string };
        Update: Partial<Database['public']['Tables']['course_enrollments']['Insert']>;
        Relationships: [];
      };

      lesson_completions: {
        Row: { user_id: string; lesson_id: string; completed_at: string };
        Insert: { user_id: string; lesson_id: string; completed_at?: string };
        Update: Partial<Database['public']['Tables']['lesson_completions']['Insert']>;
        Relationships: [];
      };

      messages: {
        Row: { id: string; sender_id: string; recipient_id: string; body: string; read_at: string | null; created_at: string };
        Insert: { id?: string; sender_id: string; recipient_id: string; body: string; read_at?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };

      campaigns: {
        Row: { id: string; owner_id: string; title: string; body: string; channels: string[]; audience: string; status: string; sent_count: number; created_at: string };
        Insert: { id?: string; owner_id: string; title: string; body: string; channels?: string[]; audience?: string; status?: string; sent_count?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>;
        Relationships: [];
      };

      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; created_at: string };
        Insert: { id?: string; user_id: string; endpoint: string; p256dh: string; auth: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>;
        Relationships: [];
      };
    };

    Views: {
      provider_badge_inputs: {
        Row: { provider_id: string; documental_verified: boolean; avg_quality: number | null; avg_human_treatment: number | null; avg_professionalism: number | null; evs_score: number | null; total_reviews: number; discount_pct: number; content_count: number; response_rate_pct: number; retention_pct: number };
        Relationships: [];
      };
      courses_public: {
        Row: { id: string; author_id: string; title: string; description: string | null; cover_url: string | null; level: string | null; audience: string | null; country: string | null; is_published: boolean; created_at: string; effective_country: string | null };
        Relationships: [];
      };
      blog_feed: {
        Row: { id: string; author_id: string; type: string; title: string; excerpt: string | null; body: string | null; external_url: string | null; cover_url: string | null; topic: string | null; keywords: string[]; created_at: string; updated_at: string; author_name: string | null; author_business: string | null; author_avatar: string | null; avg_stars: number; ratings_count: number; views_count: number };
        Relationships: [];
      };
      affiliate_earnings: {
        Row: { affiliate_id: string; sales: number; commission_cents_total: number; currency: string };
        Relationships: [];
      };
      public_post_ratings: {
        Row: { post_id: string; avg_stars: number; rating_count: number };
        Relationships: [];
      };
      public_provider_ratings: {
        Row: {
          provider_id: string | null;
          business_name: string | null;
          provider_type: ProviderType | null;
          city: string | null;
          total_reviews: number | null;
          avg_quality: number | null;
          avg_human_treatment: number | null;
          avg_accessibility: number | null;
          avg_price_value: number | null;
          avg_offer_compliance: number | null;
          avg_sensory_adaptation: number | null;
          avg_flexibility_crisis: number | null;
          avg_facilities: number | null;
          avg_professionalism: number | null;
          evs_score: number | null;
        };
        Relationships: [];
      };
    };

    Functions: {
      expire_stale_transactions: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      resolve_parent_by_qr: {
        Args: { p_id: string; p_token: string };
        Returns: { id: string; full_name: string }[];
      };
      prescription_mark_viewed: {
        Args: { p_id: string };
        Returns: undefined;
      };
      prescription_mark_ordered: {
        Args: { p_id: string };
        Returns: undefined;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      send_message: {
        Args: { p_recipient_member_no: number; p_body: string };
        Returns: Json;
      };
      my_waitlist: {
        Args: Record<string, never>;
        Returns: { id: string; patient_id: string; patient_name: string | null; patient_member_no: number | null; note: string | null; status: string; created_at: string }[];
      };
      waitlist_add: {
        Args: { p_patient_member_no: number; p_note?: string };
        Returns: Json;
      };
      waitlist_join: {
        Args: { p_provider_member_no: number; p_note?: string };
        Returns: Json;
      };
      waitlist_set_status: {
        Args: { p_id: string; p_status: string };
        Returns: Json;
      };
      waitlist_notify_slot: {
        Args: { p_message?: string };
        Returns: Json;
      };
      campaign_recipients: {
        Args: { p_campaign_id: string };
        Returns: { user_id: string; full_name: string | null; phone: string | null }[];
      };
      message_threads: {
        Args: Record<string, never>;
        Returns: { other_id: string; other_name: string | null; other_member_no: number | null; other_avatar: string | null; last_body: string | null; last_at: string; unread: number }[];
      };
      refresh_all_badges: {
        Args: Record<string, never>;
        Returns: number;
      };
      recommend_blog: {
        Args: { p_limit?: number };
        Returns: Database['public']['Views']['blog_feed']['Row'][];
      };
      my_membership_options: {
        Args: Record<string, never>;
        Returns: { affiliate_type: string; member_class: 'founder' | 'ordinary'; currency: string; monthly_amount: number | null; annual_amount: number | null; annual_list_amount: number | null; zero_decimal: boolean; is_founder: boolean }[];
      };
      affiliate_type_for: {
        Args: { p_user: string };
        Returns: string;
      };
      is_medical_profession: {
        Args: { p_profession: string };
        Returns: boolean | null;
      };
      membership_price_for: {
        Args: { p_type: string; p_country: string; p_class?: string; p_period?: string };
        Returns: { currency: string; amount: number; list_amount: number | null; monthly_amount: number | null; annual_amount: number | null; annual_list_amount: number | null; zero_decimal: boolean; is_override: boolean }[];
      };
      admin_membership_prices: {
        Args: Record<string, never>;
        Returns: { affiliate_type: string; country_label: string; currency: string; amount: number; zero_decimal: boolean; is_override: boolean }[];
      };
      admin_export_membership_prices: {
        Args: Record<string, never>;
        Returns: { country_label: string; affiliate_type: string; member_class: string; currency: string; monthly_amount: number | null; annual_amount: number | null; annual_list_amount: number | null; zero_decimal: boolean }[];
      };
      admin_import_membership_prices: {
        Args: { p_rows: Json; p_replace?: boolean };
        Returns: Json;
      };
      normalize_country: {
        Args: { p: string };
        Returns: string;
      };
      // ── Libro de comisiones de afiliados (migración 0043) ────────────────
      my_commissions_earned: {
        Args: Record<string, never>;
        Returns: { id: string; order_id: string; counterpart_id: string; counterpart_name: string | null; counterpart_member_no: number | null; product_name: string | null; amount_cents: number; currency: string; status: string; refund_after_payment: boolean; paid_at: string | null; paid_note: string | null; created_at: string }[];
      };
      my_commissions_owed: {
        Args: Record<string, never>;
        Returns: { id: string; order_id: string; counterpart_id: string; counterpart_name: string | null; counterpart_member_no: number | null; product_name: string | null; amount_cents: number; currency: string; status: string; refund_after_payment: boolean; paid_at: string | null; paid_note: string | null; created_at: string }[];
      };
      mark_commissions_paid: {
        Args: { p_ids: string[]; p_note?: string | null };
        Returns: Json;
      };
      admin_commissions: {
        Args: Record<string, never>;
        Returns: { id: string; vendor_id: string; vendor_name: string | null; vendor_member_no: number | null; affiliate_id: string; affiliate_name: string | null; affiliate_member_no: number | null; product_name: string | null; amount_cents: number; currency: string; status: string; refund_after_payment: boolean; paid_at: string | null; created_at: string }[];
      };
      // ── Donaciones (migraciones 0045 / 0046) ─────────────────────────────
      donor_wall: {
        Args: Record<string, never>;
        Returns: { display_name: string; level: string; is_company: boolean; featured: boolean; note: string | null; logo_url: string | null; since: string | null }[];
      };
      admin_donation_stats: {
        Args: Record<string, never>;
        Returns: { currency: string; paid_count: number; paid_cents: number; wall_published: number; physical_pending: number }[];
      };
      admin_donations: {
        Args: { p_status?: string | null };
        Returns: { id: string; created_at: string; paid_at: string | null; status: string; level: string; amount_cents: number; currency: string; is_company: boolean; contact_name: string; org_name: string | null; email: string; publish_consent: boolean; publish_as: string | null; wall_published: boolean; wall_featured: boolean; wall_note: string | null; wall_logo_url: string | null; waive_physical: boolean; ship_use_registered: boolean; ship_recipient: string | null; ship_address: string | null; ship_city: string | null; ship_postal: string | null; ship_country: string | null }[];
      };
      admin_set_donation_wall: {
        Args: { p_id: string; p_published: boolean; p_featured?: boolean; p_publish_as?: string | null; p_note?: string | null; p_logo_url?: string | null };
        Returns: Json;
      };
      search_members: {
        Args: { p_query: string };
        Returns: { member_no: number; full_name: string; business_name: string | null; avatar_url: string | null; role: string }[];
      };
      respond_review: {
        Args: { p_survey_id: string; p_text: string };
        Returns: Json;
      };
      track_profile_event: {
        Args: { p_provider_id: string; p_kind: string };
        Returns: undefined;
      };
      provider_metrics: {
        Args: Record<string, never>;
        Returns: { views_total: number; views_30d: number; contacts_total: number; contacts_30d: number }[];
      };
      admin_country_prices: {
        Args: { p_country: string };
        Returns: { affiliate_type: string; member_class: string; currency: string; monthly_amount: number | null; annual_amount: number | null; annual_list_amount: number | null; zero_decimal: boolean; is_override: boolean }[];
      };
      admin_configured_countries: {
        Args: Record<string, never>;
        Returns: { country_label: string; types: number }[];
      };
      admin_set_membership_price: {
        Args: { p_type: string; p_country: string; p_class: string; p_currency: string; p_monthly: number; p_annual: number; p_annual_list: number; p_zero_decimal?: boolean };
        Returns: Json;
      };
      admin_clear_membership_price: {
        Args: { p_type: string; p_country: string; p_class: string };
        Returns: Json;
      };
      admin_referral_config: {
        Args: Record<string, never>;
        Returns: { discount_pct: number; validity_days: number; referrer_step_pct: number; referrer_max_pct: number }[];
      };
      admin_set_referral_config: {
        Args: { p_discount_pct: number; p_validity_days: number; p_referrer_step_pct: number; p_referrer_max_pct: number };
        Returns: Json;
      };
      grant_referral_credit: {
        Args: { p_referred: string };
        Returns: { referrer_id: string; credit_pct: number; subscription_id: string | null }[];
      };
      consume_referral_credit: {
        Args: { p_user: string };
        Returns: undefined;
      };
      my_referral_summary: {
        Args: Record<string, never>;
        Returns: { total_uses: number; paying_uses: number; rewarded_uses: number; accrued_pct: number; max_pct: number; step_pct: number; validity_days: number }[];
      };
      my_membership_discount: {
        Args: Record<string, never>;
        Returns: { referral_pct: number; referrer_pct: number; total_pct: number }[];
      };
      membership_discount: {
        Args: { p_user: string };
        Returns: { referral_pct: number; referrer_pct: number; total_pct: number }[];
      };
      admin_referrals: {
        Args: Record<string, never>;
        Returns: { id: string; used_at: string; referrer_id: string; referrer_name: string | null; referrer_member_no: number | null; referred_id: string; referred_name: string | null; referred_member_no: number | null; referred_role: string | null; is_paying_type: boolean; referred_has_paid: boolean; referred_paid_until: string | null; link_still_valid: boolean; reward_due: boolean; reward_manual: boolean; reward_counted: boolean; referrer_role: string | null }[];
      };
      set_referrer: {
        Args: { p_member_no: number };
        Returns: Json;
      };
      my_referral_count: {
        Args: Record<string, never>;
        Returns: number;
      };
      set_founder_optout: {
        Args: { p_optout: boolean };
        Returns: boolean;
      };
      admin_membership_renewals: {
        Args: Record<string, never>;
        Returns: { id: string; member_no: number | null; name: string; provider_type: string | null; country: string | null; membership_status: string; paid_until: string | null; due_at: string | null; is_founder: boolean; days_until: number | null }[];
      };
      admin_reports: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['reports']['Row'][];
      };
      claim_founder_slot: {
        Args: { p_kind: string; p_country: string | null };
        Returns: boolean;
      };
      is_founder: {
        Args: { p_id: string };
        Returns: boolean;
      };
      admin_badge_inputs: {
        Args: Record<string, never>;
        Returns: { provider_id: string; documental_verified: boolean; avg_quality: number | null; avg_human_treatment: number | null; avg_professionalism: number | null; evs_score: number | null; total_reviews: number; discount_pct: number; content_count: number; response_rate_pct: number; retention_pct: number }[];
      };
      my_badge_inputs: {
        Args: Record<string, never>;
        Returns: { provider_id: string; documental_verified: boolean; avg_quality: number | null; avg_human_treatment: number | null; avg_professionalism: number | null; evs_score: number | null; total_reviews: number; discount_pct: number; content_count: number; response_rate_pct: number; retention_pct: number }[];
      };
      admin_other_values: {
        Args: { p_country?: string | null };
        Returns: { country: string | null; kind: string; label: string; uses: number; provider_ids: string[]; category_id: number | null }[];
      };
      admin_promote_other_to_category: {
        Args: { p_label: string; p_country?: string | null; p_kind?: string | null; p_link?: boolean };
        Returns: number;
      };
      admin_set_verified: {
        Args: { p_id: string; p_value: boolean };
        Returns: undefined;
      };
      admin_set_published: {
        Args: { p_id: string; p_value: boolean };
        Returns: undefined;
      };
      is_provider: {
        Args: { p_id: string };
        Returns: boolean;
      };
      is_parent: {
        Args: { p_id: string };
        Returns: boolean;
      };
      is_consumer: {
        Args: { p_id: string };
        Returns: boolean;
      };
      is_member_active: {
        Args: { p_id: string };
        Returns: boolean;
      };
      redeem_promo_code: {
        Args: { p_code: string };
        Returns: { ok: boolean; error?: string };
      };
      get_membership_quote: {
        Args: { p_type: string; p_country: string };
        Returns: { currency: string; amount: number; base_usd: number }[];
      };
      daily_billing_report: {
        Args: { p_date: string };
        Returns: { payer_name: string; payer_rfc: string; amount: number; currency: string; kind: string; paid_at: string }[];
      };
      search_all: {
        Args: { q: string };
        Returns: { kind: string; id: string; title: string; subtitle: string; url: string }[];
      };
      has_clinical_access: {
        Args: { p_patient: string; p_viewer: string };
        Returns: boolean;
      };
      resolve_affiliate: {
        Args: { p_code: string };
        Returns: { provider_id: string; commission_pct: number }[];
      };
      owns_course: { Args: { p_course: string }; Returns: boolean };
      course_visible: { Args: { p_course: string }; Returns: boolean };
      complete_onboarding: {
        Args: {
          p_role: string;
          p_provider_type: string;
          p_full_name: string;
          p_country: string;
          p_state: string;
          p_municipality: string;
          p_rules_version: string;
        };
        Returns: boolean;
      };
      get_shared_list: {
        Args: { p_token: string };
        Returns: Json;
      };
    };

    Enums: {
      user_role: UserRole;
      provider_type: ProviderType;
      transaction_status: TransactionStatus;
      offer_status: OfferStatus;
      prescription_status: PrescriptionStatus;
    };

    CompositeTypes: Record<string, never>;
  };
}

// ── Helpers de acceso a tipos de tabla ───────────────────────────────────────
type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];

export type Views<T extends keyof PublicSchema['Views']> =
  PublicSchema['Views'][T]['Row'];
