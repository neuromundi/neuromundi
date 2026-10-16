export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_actions: {
        Row: {
          action: string
          created_at: string
          email: string | null
          id: string
          is_paid: boolean
          member_no: number | null
          reason: string | null
          reason_detail: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          email?: string | null
          id?: string
          is_paid?: boolean
          member_no?: number | null
          reason?: string | null
          reason_detail?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          email?: string | null
          id?: string
          is_paid?: boolean
          member_no?: number | null
          reason?: string | null
          reason_detail?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_messages: {
        Row: {
          audience: string
          body: string
          created_at: string
          id: string
          recipient_count: number
          recipient_id: string | null
          sender_id: string | null
          title: string | null
        }
        Insert: {
          audience: string
          body: string
          created_at?: string
          id?: string
          recipient_count?: number
          recipient_id?: string | null
          sender_id?: string | null
          title?: string | null
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          recipient_count?: number
          recipient_id?: string | null
          sender_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      affiliate_codes: {
        Row: {
          code: string
          commission_pct: number
          created_at: string
          id: string
          is_active: boolean
          provider_id: string
        }
        Insert: {
          code: string
          commission_pct?: number
          created_at?: string
          id?: string
          is_active?: boolean
          provider_id: string
        }
        Update: {
          code?: string
          commission_pct?: number
          created_at?: string
          id?: string
          is_active?: boolean
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_codes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_codes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_codes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount_cents: number
          created_at: string
          currency: string
          id: string
          order_id: string
          paid_at: string | null
          paid_note: string | null
          product_name: string | null
          refund_after_payment: boolean
          reversed_at: string | null
          status: string
          vendor_id: string
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          created_at?: string
          currency: string
          id?: string
          order_id: string
          paid_at?: string | null
          paid_note?: string | null
          product_name?: string | null
          refund_after_payment?: boolean
          reversed_at?: string | null
          status?: string
          vendor_id: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          paid_note?: string | null
          product_name?: string | null
          refund_after_payment?: boolean
          reversed_at?: string | null
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      alliance_credits: {
        Row: {
          alliance_id: string
          amount_value: number | null
          created_at: string
          currency: string | null
          id: string
          source_user_id: string
          status: string
        }
        Insert: {
          alliance_id: string
          amount_value?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          source_user_id: string
          status?: string
        }
        Update: {
          alliance_id?: string
          amount_value?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          source_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alliance_credits_alliance_id_fkey"
            columns: ["alliance_id"]
            isOneToOne: false
            referencedRelation: "alliance_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_credits_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_credits_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_credits_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      alliance_partners: {
        Row: {
          contact: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          promo_code: string | null
          tier: string
        }
        Insert: {
          contact?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          promo_code?: string | null
          tier?: string
        }
        Update: {
          contact?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          promo_code?: string | null
          tier?: string
        }
        Relationships: []
      }
      allies: {
        Row: {
          countries: string[] | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string
          name: string
          sort_order: number
          website: string | null
        }
        Insert: {
          countries?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url: string
          name: string
          sort_order?: number
          website?: string | null
        }
        Update: {
          countries?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string
          name?: string
          sort_order?: number
          website?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: number
          props: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: never
          props?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: never
          props?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          channel: string
          created_at: string
          id: string
          offset_hours: number
          send_at: string
          status: string
        }
        Insert: {
          appointment_id: string
          channel: string
          created_at?: string
          id?: string
          offset_hours: number
          send_at: string
          status?: string
        }
        Update: {
          appointment_id?: string
          channel?: string
          created_at?: string
          id?: string
          offset_hours?: number
          send_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_requests: {
        Row: {
          calendar_entry_id: string | null
          charge_currency: string | null
          charge_percent: number
          charge_total: number | null
          created_at: string
          email_reminded_at: string | null
          ends_at: string | null
          id: string
          location: string | null
          mode: string
          note: string | null
          online_url: string | null
          payment_status: string
          recipient_id: string
          rejection_reason: string | null
          reminded_at: string | null
          responded_at: string | null
          specialist_id: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          calendar_entry_id?: string | null
          charge_currency?: string | null
          charge_percent?: number
          charge_total?: number | null
          created_at?: string
          email_reminded_at?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          mode?: string
          note?: string | null
          online_url?: string | null
          payment_status?: string
          recipient_id: string
          rejection_reason?: string | null
          reminded_at?: string | null
          responded_at?: string | null
          specialist_id: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          calendar_entry_id?: string | null
          charge_currency?: string | null
          charge_percent?: number
          charge_total?: number | null
          created_at?: string
          email_reminded_at?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          mode?: string
          note?: string | null
          online_url?: string | null
          payment_status?: string
          recipient_id?: string
          rejection_reason?: string | null
          reminded_at?: string | null
          responded_at?: string | null
          specialist_id?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_calendar_entry_id_fkey"
            columns: ["calendar_entry_id"]
            isOneToOne: false
            referencedRelation: "calendar_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          note: string | null
          patient_id: string
          provider_id: string
          source: string
          starts_at: string
          status: string
          video_link: string | null
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          note?: string | null
          patient_id: string
          provider_id: string
          source?: string
          starts_at: string
          status?: string
          video_link?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          note?: string | null
          patient_id?: string
          provider_id?: string
          source?: string
          starts_at?: string
          status?: string
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          contact: string
          created_at: string
          id: string
          name: string
          note: string | null
          preferred: string | null
          provider_id: string
          status: string
        }
        Insert: {
          contact: string
          created_at?: string
          id?: string
          name: string
          note?: string | null
          preferred?: string | null
          provider_id: string
          status?: string
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          preferred?: string | null
          provider_id?: string
          status?: string
        }
        Relationships: []
      }
      calendar_entries: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          kind: string
          location: string | null
          online_url: string | null
          source_event_id: string | null
          starts_at: string
          title: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          online_url?: string | null
          source_event_id?: string | null
          starts_at: string
          title: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          online_url?: string | null
          source_event_id?: string | null
          starts_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_entries_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_config: {
        Row: {
          active: boolean
          active_markets: Json
          block_days_by_country: Json
          community_url: string | null
          default_block_days: number
          directory_open: boolean
          founder_caps_by_country: Json
          founder_deadline_by_country: Json
          founder_discount: Json
          id: number
          paises_directorio_abierto: string[]
          popup_active: boolean
          popup_continents: Json
          start_at: string | null
          updated_at: string
          verificacion_deadline: string
          whatsapp_url: string | null
        }
        Insert: {
          active?: boolean
          active_markets?: Json
          block_days_by_country?: Json
          community_url?: string | null
          default_block_days?: number
          directory_open?: boolean
          founder_caps_by_country?: Json
          founder_deadline_by_country?: Json
          founder_discount?: Json
          id?: number
          paises_directorio_abierto?: string[]
          popup_active?: boolean
          popup_continents?: Json
          start_at?: string | null
          updated_at?: string
          verificacion_deadline?: string
          whatsapp_url?: string | null
        }
        Update: {
          active?: boolean
          active_markets?: Json
          block_days_by_country?: Json
          community_url?: string | null
          default_block_days?: number
          directory_open?: boolean
          founder_caps_by_country?: Json
          founder_deadline_by_country?: Json
          founder_discount?: Json
          id?: number
          paises_directorio_abierto?: string[]
          popup_active?: boolean
          popup_continents?: Json
          start_at?: string | null
          updated_at?: string
          verificacion_deadline?: string
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      campaign_emails: {
        Row: {
          created_at: string
          last_reminder_at: string | null
          reminders_sent: number
          user_id: string
          welcome_sent_at: string | null
        }
        Insert: {
          created_at?: string
          last_reminder_at?: string | null
          reminders_sent?: number
          user_id: string
          welcome_sent_at?: string | null
        }
        Update: {
          created_at?: string
          last_reminder_at?: string | null
          reminders_sent?: number
          user_id?: string
          welcome_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience: string
          body: string
          channels: string[]
          created_at: string
          id: string
          owner_id: string
          sent_count: number
          status: string
          title: string
        }
        Insert: {
          audience?: string
          body: string
          channels?: string[]
          created_at?: string
          id?: string
          owner_id: string
          sent_count?: number
          status?: string
          title: string
        }
        Update: {
          audience?: string
          body?: string
          channels?: string[]
          created_at?: string
          id?: string
          owner_id?: string
          sent_count?: number
          status?: string
          title?: string
        }
        Relationships: []
      }
      catalog_suggestions: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          id: string
          kind: string
          name: string
          note: string | null
          page: string | null
          section: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kind: string
          name: string
          note?: string | null
          page?: string | null
          section?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          name?: string
          note?: string | null
          page?: string | null
          section?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      categories: {
        Row: {
          color_hex: string | null
          created_at: string
          icon_name: string | null
          id: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          icon_name?: string | null
          id?: number
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          icon_name?: string | null
          id?: number
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      clinical_consents: {
        Row: {
          granted_at: string
          id: string
          patient_id: string
          provider_id: string
          revoked_at: string | null
          status: string
        }
        Insert: {
          granted_at?: string
          id?: string
          patient_id: string
          provider_id: string
          revoked_at?: string | null
          status?: string
        }
        Update: {
          granted_at?: string
          id?: string
          patient_id?: string
          provider_id?: string
          revoked_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "clinical_consents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_consents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_consents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      clinical_entries: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          id: string
          kind: string
          patient_id: string
          period: string | null
          title: string
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          patient_id: string
          period?: string | null
          title: string
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          patient_id?: string
          period?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "clinical_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      clinical_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          patient_id: string
          provider_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          patient_id: string
          provider_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          patient_id?: string
          provider_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "clinical_messages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_messages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_messages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "clinical_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          consumer_id: string
          created_at: string
          estado: string
          id: string
          mensaje: string
          nota_respuesta: string | null
          provider_id: string
          resuelta_en: string | null
        }
        Insert: {
          consumer_id: string
          created_at?: string
          estado?: string
          id?: string
          mensaje: string
          nota_respuesta?: string | null
          provider_id: string
          resuelta_en?: string | null
        }
        Update: {
          consumer_id?: string
          created_at?: string
          estado?: string
          id?: string
          mensaje?: string
          nota_respuesta?: string | null
          provider_id?: string
          resuelta_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "contact_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      contactados_campana_20260908: {
        Row: {
          asunto: string
          correo: string
          enviado_el: string
          nota: string | null
        }
        Insert: {
          asunto?: string
          correo: string
          enviado_el?: string
          nota?: string | null
        }
        Update: {
          asunto?: string
          correo?: string
          enviado_el?: string
          nota?: string | null
        }
        Relationships: []
      }
      content_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      content_posts: {
        Row: {
          author_id: string
          body: string | null
          cover_url: string | null
          created_at: string
          excerpt: string | null
          external_url: string | null
          id: string
          is_published: boolean
          keywords: string[]
          title: string
          topic: string | null
          type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          external_url?: string | null
          id?: string
          is_published?: boolean
          keywords?: string[]
          title: string
          topic?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          external_url?: string | null
          id?: string
          is_published?: boolean
          keywords?: string[]
          title?: string
          topic?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      content_ratings: {
        Row: {
          created_at: string
          id: string
          post_id: string
          stars: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          stars: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          stars?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      content_views: {
        Row: {
          post_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          post_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          post_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      country_discounts: {
        Row: {
          country_label: string
          is_active: boolean
          note: string | null
          pct: number
          updated_at: string
        }
        Insert: {
          country_label: string
          is_active?: boolean
          note?: string | null
          pct: number
          updated_at?: string
        }
        Update: {
          country_label?: string
          is_active?: boolean
          note?: string | null
          pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      country_pricing: {
        Row: {
          country_label: string
          currency: string
          fx_per_usd: number
          is_active: boolean
          updated_at: string
          zero_decimal: boolean
        }
        Insert: {
          country_label: string
          currency: string
          fx_per_usd: number
          is_active?: boolean
          updated_at?: string
          zero_decimal?: boolean
        }
        Update: {
          country_label?: string
          currency?: string
          fx_per_usd?: number
          is_active?: boolean
          updated_at?: string
          zero_decimal?: boolean
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content: string | null
          duration_min: number | null
          id: string
          module_id: string
          position: number
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          duration_min?: number | null
          id?: string
          module_id: string
          position?: number
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          duration_min?: number | null
          id?: string
          module_id?: string
          position?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          audience: string | null
          author_id: string
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          level: string | null
          title: string
        }
        Insert: {
          audience?: string | null
          author_id: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          title: string
        }
        Update: {
          audience?: string | null
          author_id?: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      directorio: {
        Row: {
          actualizada_en: string
          ambito: string | null
          baja_motivo: string | null
          baja_solicitada: boolean
          busqueda: unknown
          ciudad: string | null
          clase_scian: string | null
          clasificacion_auto: boolean
          clee: string | null
          colonia: string | null
          contactabilidad: number
          correo: string | null
          correo_rebotado: boolean
          correo_rebotado_el: string | null
          cp: string | null
          creada_en: string
          direccion: string | null
          especializacion: string | null
          estado: string | null
          estado_revision: string
          fecha_verificacion: string | null
          fuente: string
          fuente_url: string | null
          id: string
          intervention_areas: string[]
          invitada_en: string | null
          lat: number | null
          lng: number | null
          neuro_conditions: string[]
          nombre: string
          notas: string | null
          pais: string
          product_categories: string[]
          profession: string | null
          provider_type: string
          provider_types: string[] | null
          publicacion_forzada: boolean
          publicacion_forzada_en: string | null
          publicacion_forzada_nota: string | null
          publicacion_forzada_por: string | null
          reclamada_en: string | null
          reclamada_por: string | null
          seccion_auto: boolean
          sections: string[]
          sector: string | null
          sitio_web: string | null
          specialties: string[]
          telefono: string | null
          verificada_manual: boolean
        }
        Insert: {
          actualizada_en?: string
          ambito?: string | null
          baja_motivo?: string | null
          baja_solicitada?: boolean
          busqueda?: unknown
          ciudad?: string | null
          clase_scian?: string | null
          clasificacion_auto?: boolean
          clee?: string | null
          colonia?: string | null
          contactabilidad?: number
          correo?: string | null
          correo_rebotado?: boolean
          correo_rebotado_el?: string | null
          cp?: string | null
          creada_en?: string
          direccion?: string | null
          especializacion?: string | null
          estado?: string | null
          estado_revision?: string
          fecha_verificacion?: string | null
          fuente?: string
          fuente_url?: string | null
          id?: string
          intervention_areas?: string[]
          invitada_en?: string | null
          lat?: number | null
          lng?: number | null
          neuro_conditions?: string[]
          nombre: string
          notas?: string | null
          pais?: string
          product_categories?: string[]
          profession?: string | null
          provider_type: string
          provider_types?: string[] | null
          publicacion_forzada?: boolean
          publicacion_forzada_en?: string | null
          publicacion_forzada_nota?: string | null
          publicacion_forzada_por?: string | null
          reclamada_en?: string | null
          reclamada_por?: string | null
          seccion_auto?: boolean
          sections?: string[]
          sector?: string | null
          sitio_web?: string | null
          specialties?: string[]
          telefono?: string | null
          verificada_manual?: boolean
        }
        Update: {
          actualizada_en?: string
          ambito?: string | null
          baja_motivo?: string | null
          baja_solicitada?: boolean
          busqueda?: unknown
          ciudad?: string | null
          clase_scian?: string | null
          clasificacion_auto?: boolean
          clee?: string | null
          colonia?: string | null
          contactabilidad?: number
          correo?: string | null
          correo_rebotado?: boolean
          correo_rebotado_el?: string | null
          cp?: string | null
          creada_en?: string
          direccion?: string | null
          especializacion?: string | null
          estado?: string | null
          estado_revision?: string
          fecha_verificacion?: string | null
          fuente?: string
          fuente_url?: string | null
          id?: string
          intervention_areas?: string[]
          invitada_en?: string | null
          lat?: number | null
          lng?: number | null
          neuro_conditions?: string[]
          nombre?: string
          notas?: string | null
          pais?: string
          product_categories?: string[]
          profession?: string | null
          provider_type?: string
          provider_types?: string[] | null
          publicacion_forzada?: boolean
          publicacion_forzada_en?: string | null
          publicacion_forzada_nota?: string | null
          publicacion_forzada_por?: string | null
          reclamada_en?: string | null
          reclamada_por?: string | null
          seccion_auto?: boolean
          sections?: string[]
          sector?: string | null
          sitio_web?: string | null
          specialties?: string[]
          telefono?: string | null
          verificada_manual?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "directorio_publicacion_forzada_por_fkey"
            columns: ["publicacion_forzada_por"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directorio_publicacion_forzada_por_fkey"
            columns: ["publicacion_forzada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directorio_publicacion_forzada_por_fkey"
            columns: ["publicacion_forzada_por"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "directorio_reclamada_por_fkey"
            columns: ["reclamada_por"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directorio_reclamada_por_fkey"
            columns: ["reclamada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directorio_reclamada_por_fkey"
            columns: ["reclamada_por"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      directorio_invitaciones: {
        Row: {
          abierta_en: string | null
          abierta_ultima_en: string | null
          aperturas: number
          baja_en: string | null
          cancelada_en: string | null
          cancelada_motivo: string | null
          correo: string
          creada_en: string
          directorio_id: string
          enviada_en: string | null
          expira_en: string
          id: string
          token: string
          usada_en: string | null
        }
        Insert: {
          abierta_en?: string | null
          abierta_ultima_en?: string | null
          aperturas?: number
          baja_en?: string | null
          cancelada_en?: string | null
          cancelada_motivo?: string | null
          correo: string
          creada_en?: string
          directorio_id: string
          enviada_en?: string | null
          expira_en?: string
          id?: string
          token?: string
          usada_en?: string | null
        }
        Update: {
          abierta_en?: string | null
          abierta_ultima_en?: string | null
          aperturas?: number
          baja_en?: string | null
          cancelada_en?: string | null
          cancelada_motivo?: string | null
          correo?: string
          creada_en?: string
          directorio_id?: string
          enviada_en?: string | null
          expira_en?: string
          id?: string
          token?: string
          usada_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directorio_invitaciones_directorio_id_fkey"
            columns: ["directorio_id"]
            isOneToOne: false
            referencedRelation: "directorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directorio_invitaciones_directorio_id_fkey"
            columns: ["directorio_id"]
            isOneToOne: false
            referencedRelation: "revision_campana_20260908"
            referencedColumns: ["ficha_id"]
          },
        ]
      }
      directorio_plan_invitacion: {
        Row: {
          carril: string | null
          creada_en: string
          ficha_id: string
          motivo: string | null
          orden: number
          score: number
          tanda: number
        }
        Insert: {
          carril?: string | null
          creada_en?: string
          ficha_id: string
          motivo?: string | null
          orden: number
          score: number
          tanda: number
        }
        Update: {
          carril?: string | null
          creada_en?: string
          ficha_id?: string
          motivo?: string | null
          orden?: number
          score?: number
          tanda?: number
        }
        Relationships: [
          {
            foreignKeyName: "directorio_plan_invitacion_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: true
            referencedRelation: "directorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directorio_plan_invitacion_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: true
            referencedRelation: "revision_campana_20260908"
            referencedColumns: ["ficha_id"]
          },
        ]
      }
      directorio_reglas_clasificacion: {
        Row: {
          clave: string
          destino: string
          id: number
          patron: string
          prioridad: number
        }
        Insert: {
          clave: string
          destino: string
          id?: number
          patron: string
          prioridad?: number
        }
        Update: {
          clave?: string
          destino?: string
          id?: number
          patron?: string
          prioridad?: number
        }
        Relationships: []
      }
      directory_grace_notices: {
        Row: {
          sent_at: string
          stage: string
          user_id: string
        }
        Insert: {
          sent_at?: string
          stage: string
          user_id: string
        }
        Update: {
          sent_at?: string
          stage?: string
          user_id?: string
        }
        Relationships: []
      }
      discount_transactions: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          offer_id: string
          parent_id: string
          provider_id: string
          scanned_at: string | null
          scanned_by: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          offer_id: string
          parent_id: string
          provider_id: string
          scanned_at?: string | null
          scanned_by?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          offer_id?: string
          parent_id?: string
          provider_id?: string
          scanned_at?: string | null
          scanned_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_transactions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_transactions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_transactions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_transactions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "discount_transactions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_transactions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_transactions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "discount_transactions_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_transactions_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_transactions_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      donation_tiers: {
        Row: {
          ally_amount: number
          ambassador_amount: number
          currency: string
          driver_amount: number
          is_active: boolean
          seed_amount: number
          symbol: string
          updated_at: string
          zero_decimal: boolean
        }
        Insert: {
          ally_amount: number
          ambassador_amount: number
          currency: string
          driver_amount: number
          is_active?: boolean
          seed_amount: number
          symbol?: string
          updated_at?: string
          zero_decimal?: boolean
        }
        Update: {
          ally_amount?: number
          ambassador_amount?: number
          currency?: string
          driver_amount?: number
          is_active?: boolean
          seed_amount?: number
          symbol?: string
          updated_at?: string
          zero_decimal?: boolean
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount_cents: number
          contact_name: string
          created_at: string
          currency: string
          donor_user_id: string | null
          email: string
          grant_badge: boolean
          grant_course: boolean
          id: string
          is_company: boolean
          level: string
          org_name: string | null
          paid_at: string | null
          publish_as: string | null
          publish_consent: boolean
          ship_address: string | null
          ship_city: string | null
          ship_country: string | null
          ship_postal: string | null
          ship_recipient: string | null
          ship_use_registered: boolean
          status: string
          stripe_session_id: string | null
          waive_physical: boolean
          wall_featured: boolean
          wall_logo_url: string | null
          wall_note: string | null
          wall_published: boolean
        }
        Insert: {
          amount_cents: number
          contact_name: string
          created_at?: string
          currency: string
          donor_user_id?: string | null
          email: string
          grant_badge?: boolean
          grant_course?: boolean
          id?: string
          is_company?: boolean
          level: string
          org_name?: string | null
          paid_at?: string | null
          publish_as?: string | null
          publish_consent?: boolean
          ship_address?: string | null
          ship_city?: string | null
          ship_country?: string | null
          ship_postal?: string | null
          ship_recipient?: string | null
          ship_use_registered?: boolean
          status?: string
          stripe_session_id?: string | null
          waive_physical?: boolean
          wall_featured?: boolean
          wall_logo_url?: string | null
          wall_note?: string | null
          wall_published?: boolean
        }
        Update: {
          amount_cents?: number
          contact_name?: string
          created_at?: string
          currency?: string
          donor_user_id?: string | null
          email?: string
          grant_badge?: boolean
          grant_course?: boolean
          id?: string
          is_company?: boolean
          level?: string
          org_name?: string | null
          paid_at?: string | null
          publish_as?: string | null
          publish_consent?: boolean
          ship_address?: string | null
          ship_city?: string | null
          ship_country?: string | null
          ship_postal?: string | null
          ship_recipient?: string | null
          ship_use_registered?: boolean
          status?: string
          stripe_session_id?: string | null
          waive_physical?: boolean
          wall_featured?: boolean
          wall_logo_url?: string | null
          wall_note?: string | null
          wall_published?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "donations_donor_user_id_fkey"
            columns: ["donor_user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_donor_user_id_fkey"
            columns: ["donor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_donor_user_id_fkey"
            columns: ["donor_user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_online: boolean
          is_published: boolean
          nota_admin: string | null
          online_url: string | null
          revisada_en: string | null
          revisada_por: string | null
          revision: string
          starts_at: string
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_online?: boolean
          is_published?: boolean
          nota_admin?: string | null
          online_url?: string | null
          revisada_en?: string | null
          revisada_por?: string | null
          revision?: string
          starts_at: string
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          category?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_online?: boolean
          is_published?: boolean
          nota_admin?: string | null
          online_url?: string | null
          revisada_en?: string | null
          revisada_por?: string | null
          revision?: string
          starts_at?: string
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_revisada_por_fkey"
            columns: ["revisada_por"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_revisada_por_fkey"
            columns: ["revisada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_revisada_por_fkey"
            columns: ["revisada_por"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      expert_questions: {
        Row: {
          categoria: string | null
          correo: string | null
          created_at: string
          estado: string
          id: string
          nombre: string | null
          nota_admin: string | null
          pais: string | null
          pregunta: string
          resuelta_en: string | null
          resuelta_por: string | null
          user_id: string | null
        }
        Insert: {
          categoria?: string | null
          correo?: string | null
          created_at?: string
          estado?: string
          id?: string
          nombre?: string | null
          nota_admin?: string | null
          pais?: string | null
          pregunta: string
          resuelta_en?: string | null
          resuelta_por?: string | null
          user_id?: string | null
        }
        Update: {
          categoria?: string | null
          correo?: string | null
          created_at?: string
          estado?: string
          id?: string
          nombre?: string | null
          nota_admin?: string | null
          pais?: string | null
          pregunta?: string
          resuelta_en?: string | null
          resuelta_por?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expert_questions_resuelta_por_fkey"
            columns: ["resuelta_por"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_questions_resuelta_por_fkey"
            columns: ["resuelta_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_questions_resuelta_por_fkey"
            columns: ["resuelta_por"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "expert_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      founder_members: {
        Row: {
          country: string | null
          created_at: string
          grace_until: string | null
          kind: string
          user_id: string
          wall_featured: boolean
          wall_order: number
          wall_published: boolean
        }
        Insert: {
          country?: string | null
          created_at?: string
          grace_until?: string | null
          kind: string
          user_id: string
          wall_featured?: boolean
          wall_order?: number
          wall_published?: boolean
        }
        Update: {
          country?: string | null
          created_at?: string
          grace_until?: string | null
          kind?: string
          user_id?: string
          wall_featured?: boolean
          wall_order?: number
          wall_published?: boolean
        }
        Relationships: []
      }
      founder_requests: {
        Row: {
          country: string | null
          kind: string | null
          nota_admin: string | null
          nota_usuario: string | null
          resuelta_en: string | null
          resuelta_por: string | null
          solicitada_en: string
          status: string
          user_id: string
        }
        Insert: {
          country?: string | null
          kind?: string | null
          nota_admin?: string | null
          nota_usuario?: string | null
          resuelta_en?: string | null
          resuelta_por?: string | null
          solicitada_en?: string
          status?: string
          user_id: string
        }
        Update: {
          country?: string | null
          kind?: string | null
          nota_admin?: string | null
          nota_usuario?: string | null
          resuelta_en?: string | null
          resuelta_por?: string | null
          solicitada_en?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_requests_resuelta_por_fkey"
            columns: ["resuelta_por"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_requests_resuelta_por_fkey"
            columns: ["resuelta_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_requests_resuelta_por_fkey"
            columns: ["resuelta_por"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "founder_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          captions: Json
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          captions?: Json
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          captions?: Json
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      home_tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          detail: string | null
          due_date: string | null
          id: string
          patient_id: string
          provider_id: string
          title: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          detail?: string | null
          due_date?: string | null
          id?: string
          patient_id: string
          provider_id: string
          title: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          detail?: string | null
          due_date?: string | null
          id?: string
          patient_id?: string
          provider_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "home_tasks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_tasks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_tasks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      improvement_suggestions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          page: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          page?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          page?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "improvement_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      job_openings: {
        Row: {
          apply_email: string | null
          apply_url: string | null
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          education: string | null
          experience: string | null
          id: string
          is_active: boolean
          note: string | null
          opportunity_type: string
          positions: number | null
          salary_text: string | null
          skills: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          apply_email?: string | null
          apply_url?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          education?: string | null
          experience?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          opportunity_type?: string
          positions?: number | null
          salary_text?: string | null
          skills?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          apply_email?: string | null
          apply_url?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          education?: string | null
          experience?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          opportunity_type?: string
          positions?: number | null
          salary_text?: string | null
          skills?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      launch_waitlist: {
        Row: {
          country: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      lesson_completions: {
        Row: {
          completed_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      member_badges: {
        Row: {
          badge_key: string
          id: string
          is_active: boolean
          member_type: string
          public_url: string | null
          storage_path: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          badge_key: string
          id?: string
          is_active?: boolean
          member_type: string
          public_url?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          badge_key?: string
          id?: string
          is_active?: boolean
          member_type?: string
          public_url?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      membership_commission_config: {
        Row: {
          activo: boolean
          actualizado_en: string
          comision_pct: number
          exige_referidor_activo: boolean
          id: number
          pago_minimo_cents: number
          recurrente: boolean
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          comision_pct?: number
          exige_referidor_activo?: boolean
          id?: number
          pago_minimo_cents?: number
          recurrente?: boolean
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          comision_pct?: number
          exige_referidor_activo?: boolean
          id?: number
          pago_minimo_cents?: number
          recurrente?: boolean
        }
        Relationships: []
      }
      membership_commissions: {
        Row: {
          amount_cents: number
          base_cents: number
          comision_pct: number
          creada_en: string
          currency: string
          es_primer_pago: boolean
          id: string
          pagada_en: string | null
          pagada_nota: string | null
          referred_id: string
          referrer_id: string
          revertida_en: string | null
          status: string
          stripe_ref: string
        }
        Insert: {
          amount_cents: number
          base_cents: number
          comision_pct: number
          creada_en?: string
          currency: string
          es_primer_pago?: boolean
          id?: string
          pagada_en?: string | null
          pagada_nota?: string | null
          referred_id: string
          referrer_id: string
          revertida_en?: string | null
          status?: string
          stripe_ref: string
        }
        Update: {
          amount_cents?: number
          base_cents?: number
          comision_pct?: number
          creada_en?: string
          currency?: string
          es_primer_pago?: boolean
          id?: string
          pagada_en?: string | null
          pagada_nota?: string | null
          referred_id?: string
          referrer_id?: string
          revertida_en?: string | null
          status?: string
          stripe_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_commissions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_commissions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_commissions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "membership_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      membership_fees: {
        Row: {
          affiliate_type: string
          base_usd: number
          is_active: boolean
          updated_at: string
        }
        Insert: {
          affiliate_type: string
          base_usd: number
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          affiliate_type?: string
          base_usd?: number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      membership_payments: {
        Row: {
          amount_cents: number
          concepto: string
          creada_en: string
          currency: string
          id: string
          member_class: string | null
          paid_at: string
          paid_until: string | null
          period: string | null
          refunded_en: string | null
          status: string
          stripe_ref: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          concepto?: string
          creada_en?: string
          currency: string
          id?: string
          member_class?: string | null
          paid_at?: string
          paid_until?: string | null
          period?: string | null
          refunded_en?: string | null
          status?: string
          stripe_ref: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          concepto?: string
          creada_en?: string
          currency?: string
          id?: string
          member_class?: string | null
          paid_at?: string
          paid_until?: string | null
          period?: string | null
          refunded_en?: string | null
          status?: string
          stripe_ref?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      membership_prices: {
        Row: {
          affiliate_type: string
          amount: number
          annual_amount: number | null
          annual_list_amount: number | null
          country_label: string
          currency: string
          gratuita: boolean
          is_active: boolean
          member_class: string
          monthly_amount: number | null
          updated_at: string
          zero_decimal: boolean
        }
        Insert: {
          affiliate_type: string
          amount: number
          annual_amount?: number | null
          annual_list_amount?: number | null
          country_label: string
          currency: string
          gratuita?: boolean
          is_active?: boolean
          member_class?: string
          monthly_amount?: number | null
          updated_at?: string
          zero_decimal?: boolean
        }
        Update: {
          affiliate_type?: string
          amount?: number
          annual_amount?: number | null
          annual_list_amount?: number | null
          country_label?: string
          currency?: string
          gratuita?: boolean
          is_active?: boolean
          member_class?: string
          monthly_amount?: number | null
          updated_at?: string
          zero_decimal?: boolean
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          owner_id: string
          sort_order: number
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          owner_id: string
          sort_order?: number
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          owner_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          muted_categories: string[]
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          muted_categories?: string[]
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          muted_categories?: string[]
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number | null
          id: string
          max_redemptions: number | null
          provider_id: string
          redemptions_count: number
          status: string
          terms: string | null
          title: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number | null
          id?: string
          max_redemptions?: number | null
          provider_id: string
          redemptions_count?: number
          status?: string
          terms?: string | null
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number | null
          id?: string
          max_redemptions?: number | null
          provider_id?: string
          redemptions_count?: number
          status?: string
          terms?: string | null
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      orders: {
        Row: {
          affiliate_id: string | null
          amount_cents: number
          buyer_id: string | null
          buyer_name: string | null
          commission_cents: number
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          product_id: string | null
          product_name: string
          status: string
          stripe_session_id: string | null
          vendor_id: string
        }
        Insert: {
          affiliate_id?: string | null
          amount_cents: number
          buyer_id?: string | null
          buyer_name?: string | null
          commission_cents?: number
          created_at?: string
          currency: string
          id?: string
          paid_at?: string | null
          product_id?: string | null
          product_name: string
          status?: string
          stripe_session_id?: string | null
          vendor_id: string
        }
        Update: {
          affiliate_id?: string | null
          amount_cents?: number
          buyer_id?: string | null
          buyer_name?: string | null
          commission_cents?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          product_id?: string | null
          product_name?: string
          status?: string
          stripe_session_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      parent_list_items: {
        Row: {
          created_at: string
          id: string
          list_id: string
          note: string | null
          provider_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          note?: string | null
          provider_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          note?: string | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "parent_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_list_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_list_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_list_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      parent_lists: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          owner_id: string
          share_token: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          owner_id: string
          share_token?: string
          title?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          owner_id?: string
          share_token?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          appointment_id: string | null
          created_at: string
          currency: string
          id: string
          kind: string
          paid_at: string | null
          payer_id: string | null
          payer_name: string | null
          payer_rfc: string | null
          provider_id: string
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          amount_cents: number
          appointment_id?: string | null
          created_at?: string
          currency: string
          id?: string
          kind?: string
          paid_at?: string | null
          payer_id?: string | null
          payer_name?: string | null
          payer_rfc?: string | null
          provider_id: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          amount_cents?: number
          appointment_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          paid_at?: string | null
          payer_id?: string | null
          payer_name?: string | null
          payer_rfc?: string | null
          provider_id?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      payout_accounts: {
        Row: {
          actualizado_en: string
          contacto: string | null
          contacto_tipo: string | null
          metodo: string
          moneda: string | null
          notas: string | null
          pais: string | null
          titular: string | null
          user_id: string
        }
        Insert: {
          actualizado_en?: string
          contacto?: string | null
          contacto_tipo?: string | null
          metodo: string
          moneda?: string | null
          notas?: string | null
          pais?: string | null
          titular?: string | null
          user_id: string
        }
        Update: {
          actualizado_en?: string
          contacto?: string | null
          contacto_tipo?: string | null
          metodo?: string
          moneda?: string | null
          notas?: string | null
          pais?: string | null
          titular?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string
          id: string
          note: string | null
          prescription_id: string
          product_id: string
          quantity: number
          unit_price_snapshot: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          prescription_id: string
          product_id: string
          quantity?: number
          unit_price_snapshot?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          prescription_id?: string
          product_id?: string
          quantity?: number
          unit_price_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          ordered_at: string | null
          parent_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["prescription_status"]
          therapist_id: string
          title: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          ordered_at?: string | null
          parent_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["prescription_status"]
          therapist_id: string
          title?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          ordered_at?: string | null
          parent_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["prescription_status"]
          therapist_id?: string
          title?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "prescriptions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          price: number | null
          purchase_url: string | null
          review_note: string | null
          reviewed_at: string | null
          status: string
          stock: number | null
          store_category: string | null
          store_category_other: string | null
          store_subcategory: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number | null
          purchase_url?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          status?: string
          stock?: number | null
          store_category?: string | null
          store_category_other?: string | null
          store_subcategory?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category_id?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number | null
          purchase_url?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          status?: string
          stock?: number | null
          store_category?: string | null
          store_category_other?: string | null
          store_subcategory?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      profile_events: {
        Row: {
          created_at: string
          day: string
          id: string
          kind: string
          provider_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          kind: string
          provider_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          kind?: string
          provider_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "profile_events_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_events_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_events_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepts_neuromundi_id: boolean
          accepts_payments: boolean
          account_type: string | null
          address: string | null
          age_ranges: string[] | null
          avatar_url: string | null
          badge_level: string | null
          bio: string | null
          birth_date: string | null
          booking_url: string | null
          business_name: string | null
          cedula_profesional: string | null
          certified_staff: boolean | null
          city: string | null
          comms_opt_in: boolean | null
          condition: string | null
          consultation_amount: number | null
          consultation_currency: string | null
          country: string | null
          created_at: string
          dial_code: string | null
          empresa_limitada: boolean
          empresa_plazo_desde: string | null
          exencion_aprobada_en: string | null
          exencion_aprobada_por: string | null
          exencion_documento: string | null
          exencion_folio: string | null
          exencion_rechazo: string | null
          exencion_solicitada_en: string | null
          exencion_tipo: string | null
          exencion_vigente_hasta: string | null
          facebook: string | null
          fiscal_country: string | null
          fiscal_cp: string | null
          fiscal_direccion: string | null
          fiscal_email: string | null
          fiscal_razon_social: string | null
          fiscal_regimen: string | null
          fiscal_tax_id: string | null
          fiscal_uso_cfdi: string | null
          full_name: string
          fundador_autorizado: boolean
          fundador_autorizado_en: string | null
          fundador_autorizado_por: string | null
          gender: string | null
          id: string
          instagram: string | null
          interests: string[] | null
          intervention_areas: string[] | null
          is_advisor: boolean
          is_company: boolean
          is_inclusive_company: boolean
          is_inclusive_school: boolean
          is_institutional_ally: boolean
          is_internal: boolean
          is_medical_override: boolean | null
          is_published: boolean
          is_verified: boolean
          latitude: number | null
          life_stage: string | null
          linkedin: string | null
          longitude: number | null
          member_no: number | null
          membership_cancelada_en: string | null
          membership_due_at: string | null
          membership_paid_until: string | null
          membership_period: string | null
          membership_status: string
          modalities: string[] | null
          municipality: string | null
          neuro_conditions: string[]
          neuroaffirming: boolean
          org_doc_kind: string | null
          org_doc_note: string | null
          org_doc_reviewed_at: string | null
          org_doc_status: string | null
          org_doc_submitted_at: string | null
          org_doc_url: string | null
          phone: string | null
          pre_suspend_published: boolean | null
          price_range: string | null
          product_categories: string[] | null
          products_offered: string[] | null
          profession: string | null
          promo_code_used: string | null
          provider_details: Json | null
          provider_type: string | null
          public_key: string | null
          qr_token: string
          referral_credit_pct: number
          referred_at: string | null
          referred_by: number | null
          rfc: string | null
          role: string
          rules_accepted_at: string | null
          rules_version_accepted: string | null
          sales_channels: string[] | null
          school_grades: string[]
          search_tsv: unknown
          sections: string[]
          sector: string | null
          services_offered: string | null
          shipping_coverage: string[] | null
          specialties: string[] | null
          state: string | null
          stripe_charges_enabled: boolean
          stripe_connect_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          suspend_until: string | null
          suspended_at: string | null
          tiktok: string | null
          title_prefix: string | null
          updated_at: string
          wants_founder: boolean
          website: string | null
          website_url: string | null
          whatsapp: string | null
          winback_until: string | null
          year_started: number | null
        }
        Insert: {
          accepts_neuromundi_id?: boolean
          accepts_payments?: boolean
          account_type?: string | null
          address?: string | null
          age_ranges?: string[] | null
          avatar_url?: string | null
          badge_level?: string | null
          bio?: string | null
          birth_date?: string | null
          booking_url?: string | null
          business_name?: string | null
          cedula_profesional?: string | null
          certified_staff?: boolean | null
          city?: string | null
          comms_opt_in?: boolean | null
          condition?: string | null
          consultation_amount?: number | null
          consultation_currency?: string | null
          country?: string | null
          created_at?: string
          dial_code?: string | null
          empresa_limitada?: boolean
          empresa_plazo_desde?: string | null
          exencion_aprobada_en?: string | null
          exencion_aprobada_por?: string | null
          exencion_documento?: string | null
          exencion_folio?: string | null
          exencion_rechazo?: string | null
          exencion_solicitada_en?: string | null
          exencion_tipo?: string | null
          exencion_vigente_hasta?: string | null
          facebook?: string | null
          fiscal_country?: string | null
          fiscal_cp?: string | null
          fiscal_direccion?: string | null
          fiscal_email?: string | null
          fiscal_razon_social?: string | null
          fiscal_regimen?: string | null
          fiscal_tax_id?: string | null
          fiscal_uso_cfdi?: string | null
          full_name?: string
          fundador_autorizado?: boolean
          fundador_autorizado_en?: string | null
          fundador_autorizado_por?: string | null
          gender?: string | null
          id: string
          instagram?: string | null
          interests?: string[] | null
          intervention_areas?: string[] | null
          is_advisor?: boolean
          is_company?: boolean
          is_inclusive_company?: boolean
          is_inclusive_school?: boolean
          is_institutional_ally?: boolean
          is_internal?: boolean
          is_medical_override?: boolean | null
          is_published?: boolean
          is_verified?: boolean
          latitude?: number | null
          life_stage?: string | null
          linkedin?: string | null
          longitude?: number | null
          member_no?: number | null
          membership_cancelada_en?: string | null
          membership_due_at?: string | null
          membership_paid_until?: string | null
          membership_period?: string | null
          membership_status?: string
          modalities?: string[] | null
          municipality?: string | null
          neuro_conditions?: string[]
          neuroaffirming?: boolean
          org_doc_kind?: string | null
          org_doc_note?: string | null
          org_doc_reviewed_at?: string | null
          org_doc_status?: string | null
          org_doc_submitted_at?: string | null
          org_doc_url?: string | null
          phone?: string | null
          pre_suspend_published?: boolean | null
          price_range?: string | null
          product_categories?: string[] | null
          products_offered?: string[] | null
          profession?: string | null
          promo_code_used?: string | null
          provider_details?: Json | null
          provider_type?: string | null
          public_key?: string | null
          qr_token?: string
          referral_credit_pct?: number
          referred_at?: string | null
          referred_by?: number | null
          rfc?: string | null
          role?: string
          rules_accepted_at?: string | null
          rules_version_accepted?: string | null
          sales_channels?: string[] | null
          school_grades?: string[]
          search_tsv?: unknown
          sections?: string[]
          sector?: string | null
          services_offered?: string | null
          shipping_coverage?: string[] | null
          specialties?: string[] | null
          state?: string | null
          stripe_charges_enabled?: boolean
          stripe_connect_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          suspend_until?: string | null
          suspended_at?: string | null
          tiktok?: string | null
          title_prefix?: string | null
          updated_at?: string
          wants_founder?: boolean
          website?: string | null
          website_url?: string | null
          whatsapp?: string | null
          winback_until?: string | null
          year_started?: number | null
        }
        Update: {
          accepts_neuromundi_id?: boolean
          accepts_payments?: boolean
          account_type?: string | null
          address?: string | null
          age_ranges?: string[] | null
          avatar_url?: string | null
          badge_level?: string | null
          bio?: string | null
          birth_date?: string | null
          booking_url?: string | null
          business_name?: string | null
          cedula_profesional?: string | null
          certified_staff?: boolean | null
          city?: string | null
          comms_opt_in?: boolean | null
          condition?: string | null
          consultation_amount?: number | null
          consultation_currency?: string | null
          country?: string | null
          created_at?: string
          dial_code?: string | null
          empresa_limitada?: boolean
          empresa_plazo_desde?: string | null
          exencion_aprobada_en?: string | null
          exencion_aprobada_por?: string | null
          exencion_documento?: string | null
          exencion_folio?: string | null
          exencion_rechazo?: string | null
          exencion_solicitada_en?: string | null
          exencion_tipo?: string | null
          exencion_vigente_hasta?: string | null
          facebook?: string | null
          fiscal_country?: string | null
          fiscal_cp?: string | null
          fiscal_direccion?: string | null
          fiscal_email?: string | null
          fiscal_razon_social?: string | null
          fiscal_regimen?: string | null
          fiscal_tax_id?: string | null
          fiscal_uso_cfdi?: string | null
          full_name?: string
          fundador_autorizado?: boolean
          fundador_autorizado_en?: string | null
          fundador_autorizado_por?: string | null
          gender?: string | null
          id?: string
          instagram?: string | null
          interests?: string[] | null
          intervention_areas?: string[] | null
          is_advisor?: boolean
          is_company?: boolean
          is_inclusive_company?: boolean
          is_inclusive_school?: boolean
          is_institutional_ally?: boolean
          is_internal?: boolean
          is_medical_override?: boolean | null
          is_published?: boolean
          is_verified?: boolean
          latitude?: number | null
          life_stage?: string | null
          linkedin?: string | null
          longitude?: number | null
          member_no?: number | null
          membership_cancelada_en?: string | null
          membership_due_at?: string | null
          membership_paid_until?: string | null
          membership_period?: string | null
          membership_status?: string
          modalities?: string[] | null
          municipality?: string | null
          neuro_conditions?: string[]
          neuroaffirming?: boolean
          org_doc_kind?: string | null
          org_doc_note?: string | null
          org_doc_reviewed_at?: string | null
          org_doc_status?: string | null
          org_doc_submitted_at?: string | null
          org_doc_url?: string | null
          phone?: string | null
          pre_suspend_published?: boolean | null
          price_range?: string | null
          product_categories?: string[] | null
          products_offered?: string[] | null
          profession?: string | null
          promo_code_used?: string | null
          provider_details?: Json | null
          provider_type?: string | null
          public_key?: string | null
          qr_token?: string
          referral_credit_pct?: number
          referred_at?: string | null
          referred_by?: number | null
          rfc?: string | null
          role?: string
          rules_accepted_at?: string | null
          rules_version_accepted?: string | null
          sales_channels?: string[] | null
          school_grades?: string[]
          search_tsv?: unknown
          sections?: string[]
          sector?: string | null
          services_offered?: string | null
          shipping_coverage?: string[] | null
          specialties?: string[] | null
          state?: string | null
          stripe_charges_enabled?: boolean
          stripe_connect_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          suspend_until?: string | null
          suspended_at?: string | null
          tiktok?: string | null
          title_prefix?: string | null
          updated_at?: string
          wants_founder?: boolean
          website?: string | null
          website_url?: string | null
          whatsapp?: string | null
          winback_until?: string | null
          year_started?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_fundador_autorizado_por_fkey"
            columns: ["fundador_autorizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_fundador_autorizado_por_fkey"
            columns: ["fundador_autorizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_fundador_autorizado_por_fkey"
            columns: ["fundador_autorizado_por"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          amount_currency: string | null
          amount_off: number | null
          benefit: string
          bound_email: string | null
          code: string
          created_at: string
          expires_at: string | null
          is_active: boolean
          kind: string
          max_uses: number | null
          note: string | null
          percent_off: number | null
          scope: string
          used_count: number
        }
        Insert: {
          amount_currency?: string | null
          amount_off?: number | null
          benefit?: string
          bound_email?: string | null
          code: string
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          kind?: string
          max_uses?: number | null
          note?: string | null
          percent_off?: number | null
          scope?: string
          used_count?: number
        }
        Update: {
          amount_currency?: string | null
          amount_off?: number | null
          benefit?: string
          bound_email?: string | null
          code?: string
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          kind?: string
          max_uses?: number | null
          note?: string | null
          percent_off?: number | null
          scope?: string
          used_count?: number
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          code: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "promo_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      provider_availability: {
        Row: {
          end_time: string
          id: string
          is_active: boolean
          provider_id: string
          slot_minutes: number
          start_time: string
          weekday: number
        }
        Insert: {
          end_time: string
          id?: string
          is_active?: boolean
          provider_id: string
          slot_minutes?: number
          start_time: string
          weekday: number
        }
        Update: {
          end_time?: string
          id?: string
          is_active?: boolean
          provider_id?: string
          slot_minutes?: number
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      provider_categories: {
        Row: {
          category_id: number
          provider_id: string
        }
        Insert: {
          category_id: number
          provider_id: string
        }
        Update: {
          category_id?: number
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_categories_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_categories_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_categories_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      provider_connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      provider_locations: {
        Row: {
          address: string
          country: string | null
          created_at: string
          hours: string | null
          id: string
          label: string | null
          latitude: number | null
          longitude: number | null
          municipality: string | null
          phone: string | null
          provider_id: string
          sort_order: number
          state: string | null
        }
        Insert: {
          address: string
          country?: string | null
          created_at?: string
          hours?: string | null
          id?: string
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          municipality?: string | null
          phone?: string | null
          provider_id: string
          sort_order?: number
          state?: string | null
        }
        Update: {
          address?: string
          country?: string | null
          created_at?: string
          hours?: string | null
          id?: string
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          municipality?: string | null
          phone?: string | null
          provider_id?: string
          sort_order?: number
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      provider_time_off: {
        Row: {
          all_day: boolean
          created_at: string
          ends_at: string
          id: string
          provider_id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          ends_at: string
          id?: string
          provider_id: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          ends_at?: string
          id?: string
          provider_id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_time_off_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_time_off_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_time_off_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      raffle_tickets: {
        Row: {
          created_at: string
          id: string
          ref_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ref_id?: string | null
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ref_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_tickets_ref_id_fkey"
            columns: ["ref_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_tickets_ref_id_fkey"
            columns: ["ref_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_tickets_ref_id_fkey"
            columns: ["ref_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "raffle_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      raffle_winners: {
        Row: {
          batch: string | null
          drawn_at: string
          id: string
          role_filter: string | null
          user_id: string
        }
        Insert: {
          batch?: string | null
          drawn_at?: string
          id?: string
          role_filter?: string | null
          user_id: string
        }
        Update: {
          batch?: string | null
          drawn_at?: string
          id?: string
          role_filter?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      referral_config: {
        Row: {
          discount_pct: number
          id: number
          referrer_max_pct: number
          referrer_step_pct: number
          validity_days: number
        }
        Insert: {
          discount_pct?: number
          id?: number
          referrer_max_pct?: number
          referrer_step_pct?: number
          validity_days?: number
        }
        Update: {
          discount_pct?: number
          id?: number
          referrer_max_pct?: number
          referrer_step_pct?: number
          validity_days?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          is_paying_type: boolean
          referred_id: string
          referred_role: string | null
          referrer_id: string
          referrer_member_no: number | null
          referrer_role: string | null
          reward_counted_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_paying_type?: boolean
          referred_id: string
          referred_role?: string | null
          referrer_id: string
          referrer_member_no?: number | null
          referrer_role?: string | null
          reward_counted_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_paying_type?: boolean
          referred_id?: string
          referred_role?: string | null
          referrer_id?: string
          referrer_member_no?: number | null
          referrer_role?: string | null
          reward_counted_at?: string | null
        }
        Relationships: []
      }
      renewal_notices: {
        Row: {
          enviado_en: string
          etapa: string
          periodo: string
          user_id: string
        }
        Insert: {
          enviado_en?: string
          etapa: string
          periodo: string
          user_id: string
        }
        Update: {
          enviado_en?: string
          etapa?: string
          periodo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_notices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_notices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_notices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_note: string | null
          attachments: string[]
          category: string
          category_other: string | null
          created_at: string
          description: string
          id: string
          is_member: boolean
          reported_member_no: number | null
          reporter_email: string | null
          reporter_id: string | null
          reporter_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          attachments?: string[]
          category: string
          category_other?: string | null
          created_at?: string
          description: string
          id?: string
          is_member?: boolean
          reported_member_no?: number | null
          reporter_email?: string | null
          reporter_id?: string | null
          reporter_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          attachments?: string[]
          category?: string
          category_other?: string | null
          created_at?: string
          description?: string
          id?: string
          is_member?: boolean
          reported_member_no?: number | null
          reporter_email?: string | null
          reporter_id?: string | null
          reporter_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      respaldo_bitacora: {
        Row: {
          eliminada_en: string
          filas: number | null
          resumen: string | null
          tabla: string
        }
        Insert: {
          eliminada_en?: string
          filas?: number | null
          resumen?: string | null
          tabla: string
        }
        Update: {
          eliminada_en?: string
          filas?: number | null
          resumen?: string | null
          tabla?: string
        }
        Relationships: []
      }
      satisfaction_surveys: {
        Row: {
          accessibility_score: number
          comments: string | null
          created_at: string
          facilities_score: number | null
          flexibility_crisis_score: number
          human_treatment_score: number
          id: string
          is_anonymous: boolean
          offer_compliance_score: number
          parent_id: string
          price_value_score: number
          professionalism_score: number | null
          provider_id: string
          provider_response: string | null
          provider_response_at: string | null
          quality_score: number
          sensory_adaptation_score: number
          transaction_id: string | null
        }
        Insert: {
          accessibility_score: number
          comments?: string | null
          created_at?: string
          facilities_score?: number | null
          flexibility_crisis_score: number
          human_treatment_score: number
          id?: string
          is_anonymous?: boolean
          offer_compliance_score: number
          parent_id: string
          price_value_score: number
          professionalism_score?: number | null
          provider_id: string
          provider_response?: string | null
          provider_response_at?: string | null
          quality_score: number
          sensory_adaptation_score: number
          transaction_id?: string | null
        }
        Update: {
          accessibility_score?: number
          comments?: string | null
          created_at?: string
          facilities_score?: number | null
          flexibility_crisis_score?: number
          human_treatment_score?: number
          id?: string
          is_anonymous?: boolean
          offer_compliance_score?: number
          parent_id?: string
          price_value_score?: number
          professionalism_score?: number | null
          provider_id?: string
          provider_response?: string | null
          provider_response_at?: string | null
          quality_score?: number
          sensory_adaptation_score?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_surveys_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "discount_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      search_alerts: {
        Row: {
          category_id: number | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category_id?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category_id?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_alerts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      secure_file_keys: {
        Row: {
          file_id: string
          recipient_id: string
          wrapped_key: string
        }
        Insert: {
          file_id: string
          recipient_id: string
          wrapped_key: string
        }
        Update: {
          file_id?: string
          recipient_id?: string
          wrapped_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "secure_file_keys_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "secure_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_file_keys_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_file_keys_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_file_keys_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      secure_files: {
        Row: {
          created_at: string
          expires_at: string | null
          filename: string
          id: string
          iv: string
          mime: string | null
          owner_id: string
          patient_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          filename: string
          id?: string
          iv: string
          mime?: string | null
          owner_id: string
          patient_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          filename?: string
          id?: string
          iv?: string
          mime?: string | null
          owner_id?: string
          patient_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "secure_files_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_files_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_files_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "secure_files_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_files_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_files_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      specialists: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          module_type: string
          specialty: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          module_type: string
          specialty?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          module_type?: string
          specialty?: string | null
        }
        Relationships: []
      }
      support_throttle: {
        Row: {
          created_at: string
          id: number
          ip: string
        }
        Insert: {
          created_at?: string
          id?: never
          ip: string
        }
        Update: {
          created_at?: string
          id?: never
          ip?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          answers: Json
          consent: boolean
          country: string | null
          created_at: string
          id: string
          lang: string | null
          role: string | null
          sections: string[]
          source: string | null
          user_id: string | null
        }
        Insert: {
          answers?: Json
          consent?: boolean
          country?: string | null
          created_at?: string
          id?: string
          lang?: string | null
          role?: string | null
          sections?: string[]
          source?: string | null
          user_id?: string | null
        }
        Update: {
          answers?: Json
          consent?: boolean
          country?: string | null
          created_at?: string
          id?: string
          lang?: string | null
          role?: string | null
          sections?: string[]
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      topic_subscriptions: {
        Row: {
          scope_city: string | null
          scope_country: string | null
          topics: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          scope_city?: string | null
          scope_country?: string | null
          topics?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          scope_city?: string | null
          scope_country?: string | null
          topics?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_event_rsvps: {
        Row: {
          event_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "tribe_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_event_sensory: {
        Row: {
          comfort: number | null
          created_at: string
          event_id: string
          id: string
          noise_level: number | null
          notes: string | null
          quiet_room_used: boolean | null
          reviewer_id: string
        }
        Insert: {
          comfort?: number | null
          created_at?: string
          event_id: string
          id?: string
          noise_level?: number | null
          notes?: string | null
          quiet_room_used?: boolean | null
          reviewer_id: string
        }
        Update: {
          comfort?: number | null
          created_at?: string
          event_id?: string
          id?: string
          noise_level?: number | null
          notes?: string | null
          quiet_room_used?: boolean | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_event_sensory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "tribe_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_event_sensory_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_event_sensory_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_event_sensory_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_events: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          creator_id: string
          description: string
          id: string
          is_online: boolean
          location: string | null
          noise: string
          quiet_room: boolean
          section: string | null
          sensory_tips: string | null
          starts_at: string
          status: string
          title: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          creator_id: string
          description: string
          id?: string
          is_online?: boolean
          location?: string | null
          noise: string
          quiet_room?: boolean
          section?: string | null
          sensory_tips?: string | null
          starts_at: string
          status?: string
          title: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          is_online?: boolean
          location?: string | null
          noise?: string
          quiet_room?: boolean
          section?: string | null
          sensory_tips?: string | null
          starts_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_forum_invites: {
        Row: {
          created_at: string
          forum_id: string
          id: string
          invitee_id: string
          inviter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          forum_id: string
          id?: string
          invitee_id: string
          inviter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          forum_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_forum_invites_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "tribe_forums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "tribe_forum_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_forum_members: {
        Row: {
          forum_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          forum_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          forum_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_forum_members_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "tribe_forums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_forum_moderators: {
        Row: {
          created_at: string
          forum_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          forum_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          forum_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_forum_moderators_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "tribe_forums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_moderators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_moderators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_moderators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_forum_prefs: {
        Row: {
          countries: string[] | null
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          countries?: string[] | null
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          countries?: string[] | null
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_forum_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forum_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_forums: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          language: string | null
          notify_countries: string[] | null
          section: string | null
          status: string
          theme: string | null
          title: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          language?: string | null
          notify_countries?: string[] | null
          section?: string | null
          status?: string
          theme?: string | null
          title: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          language?: string | null
          notify_countries?: string[] | null
          section?: string | null
          status?: string
          theme?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_forums_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forums_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_forums_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_gratitude: {
        Row: {
          badge_key: string
          created_at: string
          forum_id: string | null
          giver_id: string
          id: string
          is_anonymous: boolean
          points: number
          receiver_id: string
        }
        Insert: {
          badge_key: string
          created_at?: string
          forum_id?: string | null
          giver_id: string
          id?: string
          is_anonymous?: boolean
          points?: number
          receiver_id: string
        }
        Update: {
          badge_key?: string
          created_at?: string
          forum_id?: string | null
          giver_id?: string
          id?: string
          is_anonymous?: boolean
          points?: number
          receiver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_gratitude_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "tribe_forums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_gratitude_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_gratitude_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_gratitude_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "tribe_gratitude_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_gratitude_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_gratitude_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_members: {
        Row: {
          can_evaluate: boolean
          can_review: boolean
          can_write: boolean
          created_at: string
          energy: string
          points: number
          rules_accepted_at: string | null
          show_city: boolean
          show_country: boolean
          show_diagnosis: boolean
          show_interests: boolean
          silent_mode: boolean
          status: string
          user_id: string
        }
        Insert: {
          can_evaluate?: boolean
          can_review?: boolean
          can_write?: boolean
          created_at?: string
          energy?: string
          points?: number
          rules_accepted_at?: string | null
          show_city?: boolean
          show_country?: boolean
          show_diagnosis?: boolean
          show_interests?: boolean
          silent_mode?: boolean
          status?: string
          user_id: string
        }
        Update: {
          can_evaluate?: boolean
          can_review?: boolean
          can_write?: boolean
          created_at?: string
          energy?: string
          points?: number
          rules_accepted_at?: string | null
          show_city?: boolean
          show_country?: boolean
          show_diagnosis?: boolean
          show_interests?: boolean
          silent_mode?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_mentor_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          mentorship_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          mentorship_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          mentorship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_mentor_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mentor_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mentor_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "tribe_mentor_messages_mentorship_id_fkey"
            columns: ["mentorship_id"]
            isOneToOne: false
            referencedRelation: "tribe_mentorships"
            referencedColumns: ["id"]
          },
        ]
      }
      tribe_mentors: {
        Row: {
          bio: string | null
          created_at: string
          is_active: boolean
          section: string | null
          tracks: string[]
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          is_active?: boolean
          section?: string | null
          tracks?: string[]
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          is_active?: boolean
          section?: string | null
          tracks?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_mentors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mentors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mentors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_mentorships: {
        Row: {
          created_at: string
          id: string
          mentee_id: string
          mentor_id: string
          status: string
          track: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentee_id: string
          mentor_id: string
          status?: string
          track: string
        }
        Update: {
          created_at?: string
          id?: string
          mentee_id?: string
          mentor_id?: string
          status?: string
          track?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_mentorships_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mentorships_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mentorships_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "tribe_mentorships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mentorships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mentorships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          forum_id: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          forum_id: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          forum_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "tribe_messages_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "tribe_forums"
            referencedColumns: ["id"]
          },
        ]
      }
      tribe_mod_ratings: {
        Row: {
          availability: number
          comment: string | null
          cordiality: number
          created_at: string
          empathy: number
          id: string
          inclusive_language: number
          is_anonymous: boolean
          knowledge: number
          moderator_id: string
          rater_id: string
        }
        Insert: {
          availability: number
          comment?: string | null
          cordiality: number
          created_at?: string
          empathy: number
          id?: string
          inclusive_language: number
          is_anonymous?: boolean
          knowledge: number
          moderator_id: string
          rater_id: string
        }
        Update: {
          availability?: number
          comment?: string | null
          cordiality?: number
          created_at?: string
          empathy?: number
          id?: string
          inclusive_language?: number
          is_anonymous?: boolean
          knowledge?: number
          moderator_id?: string
          rater_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_mod_ratings_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mod_ratings_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mod_ratings_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "tribe_mod_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mod_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_mod_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      tribe_moderators: {
        Row: {
          created_at: string
          ethics_accepted_at: string | null
          justification: string | null
          points: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ethics_accepted_at?: string | null
          justification?: string | null
          points?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ethics_accepted_at?: string | null
          justification?: string | null
          points?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_moderators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_moderators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_moderators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      user_agreements: {
        Row: {
          accepted_at: string
          doc_version: string
          id: string
          user_id: string
          user_type: string
        }
        Insert: {
          accepted_at?: string
          doc_version: string
          id?: string
          user_id: string
          user_type: string
        }
        Update: {
          accepted_at?: string
          doc_version?: string
          id?: string
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agreements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_agreements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_agreements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      user_progress: {
        Row: {
          module_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          module_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          module_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          id: string
          note: string | null
          patient_id: string
          provider_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          patient_id: string
          provider_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          patient_id?: string
          provider_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "waitlist_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
    }
    Views: {
      affiliate_earnings: {
        Row: {
          affiliate_id: string | null
          commission_cents_total: number | null
          currency: string | null
          sales: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      blog_feed: {
        Row: {
          author_avatar: string | null
          author_business: string | null
          author_id: string | null
          author_name: string | null
          avg_stars: number | null
          body: string | null
          cover_url: string | null
          created_at: string | null
          excerpt: string | null
          external_url: string | null
          id: string | null
          keywords: string[] | null
          ratings_count: number | null
          title: string | null
          topic: string | null
          type: string | null
          updated_at: string | null
          views_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      courses_public: {
        Row: {
          audience: string | null
          author_id: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          effective_country: string | null
          id: string | null
          is_published: boolean | null
          level: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      directorio_publico: {
        Row: {
          accepts_neuromundi_id: boolean | null
          accepts_payments: boolean | null
          account_type: string | null
          address: string | null
          age_ranges: string[] | null
          avatar_url: string | null
          badge_level: string | null
          bio: string | null
          booking_url: string | null
          business_name: string | null
          cedula_profesional: string | null
          certified_staff: boolean | null
          city: string | null
          clee: string | null
          comms_opt_in: boolean | null
          consultation_amount: number | null
          consultation_currency: string | null
          country: string | null
          created_at: string | null
          dial_code: string | null
          facebook: string | null
          full_name: string | null
          id: string | null
          instagram: string | null
          interests: string[] | null
          intervention_areas: string[] | null
          is_advisor: boolean | null
          is_company: boolean | null
          is_inclusive_company: boolean | null
          is_inclusive_school: boolean | null
          is_institutional_ally: boolean | null
          is_medical_override: boolean | null
          is_published: boolean | null
          is_verified: boolean | null
          latitude: number | null
          life_stage: string | null
          linkedin: string | null
          longitude: number | null
          member_no: number | null
          membership_status: string | null
          modalities: string[] | null
          municipality: string | null
          neuro_conditions: string[] | null
          neuroaffirming: boolean | null
          origen: string | null
          phone: string | null
          price_range: string | null
          product_categories: string[] | null
          products_offered: string[] | null
          profession: string | null
          provider_details: Json | null
          provider_type: string | null
          provider_types: string[] | null
          reclamable: boolean | null
          role: string | null
          sales_channels: string[] | null
          school_grades: string[] | null
          search_tsv: unknown
          sections: string[] | null
          services_offered: string | null
          shipping_coverage: string[] | null
          specialties: string[] | null
          state: string | null
          tiktok: string | null
          title_prefix: string | null
          updated_at: string | null
          verificada: boolean | null
          wants_founder: boolean | null
          website: string | null
          website_url: string | null
          whatsapp: string | null
          year_started: number | null
        }
        Relationships: []
      }
      directorio_publico_seguro: {
        Row: {
          accepts_neuromundi_id: boolean | null
          accepts_payments: boolean | null
          account_type: string | null
          address: string | null
          age_ranges: string[] | null
          avatar_url: string | null
          badge_level: string | null
          bio: string | null
          booking_url: string | null
          business_name: string | null
          cedula_profesional: string | null
          certified_staff: boolean | null
          city: string | null
          clee: string | null
          comms_opt_in: boolean | null
          consultation_amount: number | null
          consultation_currency: string | null
          country: string | null
          created_at: string | null
          dial_code: string | null
          facebook: string | null
          full_name: string | null
          id: string | null
          instagram: string | null
          interests: string[] | null
          intervention_areas: string[] | null
          is_advisor: boolean | null
          is_company: boolean | null
          is_inclusive_company: boolean | null
          is_inclusive_school: boolean | null
          is_institutional_ally: boolean | null
          is_medical_override: boolean | null
          is_published: boolean | null
          is_verified: boolean | null
          latitude: number | null
          life_stage: string | null
          linkedin: string | null
          longitude: number | null
          member_no: number | null
          modalities: string[] | null
          municipality: string | null
          neuro_conditions: string[] | null
          neuroaffirming: boolean | null
          origen: string | null
          perfil_activo: boolean | null
          phone: string | null
          price_range: string | null
          product_categories: string[] | null
          products_offered: string[] | null
          profession: string | null
          provider_details: Json | null
          provider_type: string | null
          provider_types: string[] | null
          reclamable: boolean | null
          role: string | null
          sales_channels: string[] | null
          school_grades: string[] | null
          search_tsv: unknown
          sections: string[] | null
          services_offered: string | null
          shipping_coverage: string[] | null
          specialties: string[] | null
          state: string | null
          tiktok: string | null
          title_prefix: string | null
          updated_at: string | null
          verificada: boolean | null
          wants_founder: boolean | null
          website: string | null
          website_url: string | null
          whatsapp: string | null
          year_started: number | null
        }
        Relationships: []
      }
      founder_counts: {
        Row: {
          capacity: number | null
          country: string | null
          kind: string | null
          used: number | null
        }
        Relationships: []
      }
      perfiles_basicos: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          city: string | null
          country: string | null
          full_name: string | null
          id: string | null
          is_published: boolean | null
          is_verified: boolean | null
          member_no: number | null
          provider_type: string | null
          public_key: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          full_name?: string | null
          id?: string | null
          is_published?: boolean | null
          is_verified?: boolean | null
          member_no?: number | null
          provider_type?: string | null
          public_key?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          full_name?: string | null
          id?: string | null
          is_published?: boolean | null
          is_verified?: boolean | null
          member_no?: number | null
          provider_type?: string | null
          public_key?: string | null
        }
        Relationships: []
      }
      provider_badge_inputs: {
        Row: {
          avg_human_treatment: number | null
          avg_professionalism: number | null
          avg_quality: number | null
          content_count: number | null
          discount_pct: number | null
          documental_verified: boolean | null
          evs_score: number | null
          provider_id: string | null
          response_rate_pct: number | null
          retention_pct: number | null
          total_reviews: number | null
        }
        Relationships: []
      }
      public_post_ratings: {
        Row: {
          avg_stars: number | null
          post_id: string | null
          rating_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      public_product_ratings: {
        Row: {
          avg_rating: number | null
          product_id: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_provider_comments: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string | null
          overall: number | null
          provider_id: string | null
          provider_response: string | null
          provider_response_at: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string | null
          overall?: never
          provider_id?: string | null
          provider_response?: string | null
          provider_response_at?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string | null
          overall?: never
          provider_id?: string | null
          provider_response?: string | null
          provider_response_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      public_provider_ratings: {
        Row: {
          avg_accessibility: number | null
          avg_facilities: number | null
          avg_flexibility_crisis: number | null
          avg_human_treatment: number | null
          avg_offer_compliance: number | null
          avg_price_value: number | null
          avg_professionalism: number | null
          avg_quality: number | null
          avg_sensory_adaptation: number | null
          business_name: string | null
          city: string | null
          evs_score: number | null
          provider_id: string | null
          provider_type: string | null
          total_reviews: number | null
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "perfiles_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_badge_inputs"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      revision_campana_20260908: {
        Row: {
          ciudad: string | null
          correo: string | null
          entrega: string | null
          estado: string | null
          ficha_id: string | null
          grupo: string | null
          nombre: string | null
          provider_type: string | null
          sector: string | null
          sitio_web: string | null
          telefono: string | null
          variante_recibida: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aceptar_reglamento: { Args: never; Returns: Json }
      admin_account_actions: {
        Args: never
        Returns: {
          action: string
          created_at: string
          email: string
          id: string
          is_paid: boolean
          member_no: number
          reason: string
          reason_detail: string
          role: string
          user_id: string
        }[]
      }
      admin_alliance_redeem: {
        Args: { p_alliance_id: string | null }
        Returns: number
      }
      admin_alliance_summary: {
        Args: never
        Returns: {
          affiliates: number
          alliance_id: string
          country: string
          credits_accrued: number
          credits_value: number
          name: string
          promo_code: string
          tier: string
        }[]
      }
      admin_alta_correo_ficha: {
        Args: {
          p_correo: string | null
          p_ficha: string | null
          p_nota?: string | null
          p_tanda?: number | null
        }
        Returns: Json
      }
      admin_badge_inputs: {
        Args: never
        Returns: {
          avg_human_treatment: number
          avg_professionalism: number
          avg_quality: number
          content_count: number
          discount_pct: number
          documental_verified: boolean
          evs_score: number
          provider_id: string
          response_rate_pct: number
          retention_pct: number
          total_reviews: number
        }[]
      }
      admin_borrar_ficha_de_prueba: { Args: { p_id: string }; Returns: Json }
      admin_campaign_set: {
        Args: {
          p_active: boolean | null
          p_days_by_country: Json | null
          p_default_days: number | null
          p_founder_discount: Json | null
          p_popup_active: boolean | null
          p_popup_continents: Json | null
          p_start_at: string | null
        }
        Returns: undefined
      }
      admin_catalog_suggestions: {
        Args: never
        Returns: {
          country: string
          created_at: string
          email: string
          id: string
          kind: string
          name: string
          note: string
          page: string
          section: string
          status: string
          user_id: string
        }[]
      }
      admin_clear_membership_price: {
        Args: { p_class: string | null; p_country: string | null; p_type: string | null }
        Returns: Json
      }
      admin_comisiones_detalle: {
        Args: { p_referrer: string | null }
        Returns: {
          amount_cents: number
          base_cents: number
          comision_pct: number
          creada_en: string
          currency: string
          es_primer_pago: boolean
          id: string
          pagada_en: string
          pagada_nota: string
          referido: string
          status: string
        }[]
      }
      admin_comisiones_membresia: {
        Args: { p_estado?: string | null }
        Returns: {
          alcanza_umbral: boolean
          comisiones: number
          correo: string
          cuenta_contacto: string
          cuenta_de_cobro: boolean
          cuenta_titular: string
          currency: string
          metodo_cobro: string
          monto_cents: number
          primera: string
          referidor: string
          referidor_vigente: boolean
          referidos: number
          referrer_id: string
          ultima: string
          umbral_cents: number
        }[]
      }
      admin_commissions: {
        Args: never
        Returns: {
          affiliate_id: string
          affiliate_member_no: number
          affiliate_name: string
          amount_cents: number
          created_at: string
          currency: string
          id: string
          paid_at: string
          product_name: string
          refund_after_payment: boolean
          status: string
          vendor_id: string
          vendor_member_no: number
          vendor_name: string
        }[]
      }
      admin_configured_countries: {
        Args: never
        Returns: {
          country_label: string
          types: number
        }[]
      }
      admin_country_discounts: {
        Args: never
        Returns: {
          country_label: string
          is_active: boolean
          note: string
          pct: number
          updated_at: string
        }[]
      }
      admin_country_prices: {
        Args: { p_country: string | null }
        Returns: {
          affiliate_type: string
          annual_amount: number
          annual_list_amount: number
          currency: string
          is_override: boolean
          member_class: string
          monthly_amount: number
          zero_decimal: boolean
        }[]
      }
      admin_create_category: {
        Args: { p_name: string | null; p_slug: string | null }
        Returns: undefined
      }
      admin_cuenta_de_cobro: {
        Args: { p_user: string | null }
        Returns: {
          actualizado_en: string
          contacto: string | null
          contacto_tipo: string | null
          metodo: string
          moneda: string | null
          notas: string | null
          pais: string | null
          titular: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_directorio_invitaciones: {
        Args: never
        Returns: {
          abierta_en: string
          abierta_ultima_en: string
          aperturas: number
          baja_en: string
          cancelada_en: string
          ciudad: string
          correo: string
          creada_en: string
          enviada_en: string
          estado_geo: string
          expira_en: string
          id: string
          nombre: string
          provider_type: string
          rebotado: boolean
          usada_en: string
        }[]
      }
      admin_directorio_resumen: { Args: never; Returns: Json }
      admin_donation_stats: {
        Args: never
        Returns: {
          currency: string
          paid_cents: number
          paid_count: number
          physical_pending: number
          wall_published: number
        }[]
      }
      admin_donations: {
        Args: { p_status?: string | null }
        Returns: {
          amount_cents: number
          contact_name: string
          created_at: string
          currency: string
          email: string
          id: string
          is_company: boolean
          level: string
          org_name: string
          paid_at: string
          publish_as: string
          publish_consent: boolean
          ship_address: string
          ship_city: string
          ship_country: string
          ship_postal: string
          ship_recipient: string
          ship_use_registered: boolean
          status: string
          waive_physical: boolean
          wall_featured: boolean
          wall_logo_url: string
          wall_note: string
          wall_published: boolean
        }[]
      }
      admin_enviar_invitacion: {
        Args: {
          p_correo: string | null
          p_cortesia?: boolean | null
          p_fundador?: boolean | null
          p_nombre: string | null
          p_provider_type?: string | null
          p_send?: boolean | null
        }
        Returns: {
          enviado: boolean
          ficha_id: string
          promo: string
          token: string
        }[]
      }
      admin_eventos_en_revision: {
        Args: { p_estado?: string | null }
        Returns: {
          category: string
          city: string
          country: string
          cover_url: string
          created_at: string
          description: string
          ends_at: string
          id: string
          is_online: boolean
          is_published: boolean
          member_no: number
          nota_admin: string
          online_url: string
          prestador: string
          prestador_id: string
          revisada_en: string
          revision: string
          starts_at: string
          title: string
          venue: string
        }[]
      }
      admin_eventos_pendientes: { Args: never; Returns: number }
      admin_exencion_resolver: {
        Args: {
          p_aprobar: boolean | null
          p_meses?: number | null
          p_nota?: string | null
          p_user: string | null
        }
        Returns: boolean
      }
      admin_exenciones: {
        Args: { p_estado?: string | null }
        Returns: {
          aprobada_en: string
          dias: number
          documento: string
          email: string
          estado: string
          folio: string
          id: string
          nombre: string
          provider_type: string
          rechazo: string
          sector: string
          solicitada_en: string
          tipo: string
          vigente_hasta: string
        }[]
      }
      admin_export_membership_prices: {
        Args: never
        Returns: {
          affiliate_type: string
          annual_amount: number
          annual_list_amount: number
          country_label: string
          currency: string
          member_class: string
          monthly_amount: number
          zero_decimal: boolean
        }[]
      }
      admin_fichas_retiradas: {
        Args: { p_buscar?: string | null; p_limit?: number | null }
        Returns: {
          ciudad: string
          correo: string
          estado: string
          ficha_id: string
          nombre: string
          pais: string
          provider_type: string
          publicacion_forzada: boolean
          publicacion_forzada_en: string
          publicacion_forzada_nota: string
          reclamada_por: string
          sector: string
          sitio_web: string
          telefono: string
        }[]
      }
      admin_fichas_sin_correo: {
        Args: { p_buscar?: string | null; p_limit?: number | null }
        Returns: {
          ciudad: string
          especializacion: string
          estado: string
          ficha_id: string
          nombre: string
          pais: string
          provider_type: string
          sector: string
          sitio_web: string
          telefono: string
        }[]
      }
      admin_forum_moderators: {
        Args: { p_forum?: string | null; p_status?: string | null }
        Returns: {
          created_at: string
          forum_id: string
          forum_title: string
          id: string
          member_no: number
          name: string
          status: string
          user_id: string
        }[]
      }
      admin_founders: {
        Args: { p_country?: string | null }
        Returns: {
          country: string
          display_name: string
          kind: string
          member_no: number
          user_id: string
          wall_featured: boolean
          wall_order: number
          wall_published: boolean
        }[]
      }
      admin_import_membership_prices: {
        Args: { p_replace?: boolean | null; p_rows: Json | null }
        Returns: Json
      }
      admin_improvement_suggestions: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          message: string
          page: string
          user_id: string
        }[]
      }
      admin_invitaciones_vigencia: {
        Args: never
        Returns: {
          enviadas: number
          primera_en_vencer: string
          sin_enviar: number
          vencen_en_15_dias: number
          vencidas: number
          vivas: number
        }[]
      }
      admin_liquidar_comisiones: {
        Args: {
          p_currency?: string | null
          p_forzar?: boolean | null
          p_nota?: string | null
          p_referrer: string | null
        }
        Returns: number
      }
      admin_list_advisors: {
        Args: never
        Returns: {
          email: string
          member_no: number
          name: string
          user_id: string
        }[]
      }
      admin_log_account_action: {
        Args: { p_action: string | null; p_nota: string | null; p_user: string | null }
        Returns: undefined
      }
      admin_member_extend: {
        Args: { p_dias: number | null; p_nota?: string | null; p_user: string | null }
        Returns: string
      }
      admin_member_reactivate: {
        Args: { p_nota?: string | null; p_user: string | null }
        Returns: boolean
      }
      admin_member_set_exempt: {
        Args: { p_nota?: string | null; p_user: string | null; p_value: boolean | null }
        Returns: string
      }
      admin_member_set_expiry: {
        Args: { p_fecha: string | null; p_nota?: string | null; p_user: string | null }
        Returns: string
      }
      admin_member_suspend: {
        Args: { p_meses?: number | null; p_nota?: string | null; p_user: string | null }
        Returns: string
      }
      admin_members: {
        Args: {
          p_estado?: string | null
          p_fundador?: boolean | null
          p_limit?: number | null
          p_pagado?: boolean | null
          p_pais?: string | null
          p_publicado?: boolean | null
          p_q?: string | null
          p_reclamado?: boolean | null
          p_seccion?: string | null
          p_tipo?: string | null
        }
        Returns: {
          affiliate_type: string
          business_name: string
          country: string
          created_at: string
          email: string
          es_fundador: boolean
          ficha_id: string
          ficha_verificada: boolean
          full_name: string
          ha_pagado: boolean
          id: string
          is_published: boolean
          member_no: number
          membership_due_at: string
          membership_paid_until: string
          membership_period: string
          membership_status: string
          provider_type: string
          role: string
          sections: string[]
          suspend_until: string
          suspended_at: string
        }[]
      }
      admin_members_facetas: {
        Args: never
        Returns: {
          paises: string[]
          tipos: string[]
        }[]
      }
      admin_membership_prices: {
        Args: never
        Returns: {
          affiliate_type: string
          amount: number
          country_label: string
          currency: string
          is_override: boolean
          zero_decimal: boolean
        }[]
      }
      admin_membership_renewals: {
        Args: never
        Returns: {
          country: string
          days_until: number
          due_at: string
          id: string
          is_founder: boolean
          member_no: number
          membership_status: string
          name: string
          paid_until: string
          provider_type: string
        }[]
      }
      admin_metrics: { Args: never; Returns: Json }
      admin_other_values: {
        Args: { p_country?: string | null }
        Returns: {
          category_id: number
          country: string
          kind: string
          label: string
          provider_ids: string[]
          uses: number
        }[]
      }
      admin_pending_org_docs: {
        Args: never
        Returns: {
          id: string
          member_no: string
          nombre: string
          org_doc_kind: string
          org_doc_submitted_at: string
          org_doc_url: string
          provider_type: string
        }[]
      }
      admin_preguntas_experto: {
        Args: { p_estado?: string | null }
        Returns: {
          categoria: string
          correo: string
          created_at: string
          es_miembro: boolean
          estado: string
          id: string
          nombre: string
          nota_admin: string
          pais: string
          pregunta: string
          resuelta_en: string
        }[]
      }
      admin_preguntas_experto_pendientes: { Args: never; Returns: number }
      admin_promote_other_to_category: {
        Args: {
          p_country?: string | null
          p_kind?: string | null
          p_label: string | null
          p_link?: boolean | null
        }
        Returns: number
      }
      admin_raffle_draw: {
        Args: { p_batch?: string | null; p_count: number | null; p_role?: string | null }
        Returns: {
          email: string
          member_no: number
          name: string
          tickets: number
          user_id: string
        }[]
      }
      admin_raffle_entries: {
        Args: never
        Returns: {
          email: string
          member_no: number
          name: string
          role: string
          tickets: number
          user_id: string
        }[]
      }
      admin_raffle_winners: {
        Args: never
        Returns: {
          batch: string
          drawn_at: string
          email: string
          member_no: number
          name: string
          user_id: string
        }[]
      }
      admin_referral_config: {
        Args: never
        Returns: {
          discount_pct: number
          referrer_max_pct: number
          referrer_step_pct: number
          validity_days: number
        }[]
      }
      admin_referrals: {
        Args: never
        Returns: {
          id: string
          is_paying_type: boolean
          link_still_valid: boolean
          referred_has_paid: boolean
          referred_id: string
          referred_member_no: number
          referred_name: string
          referred_paid_until: string
          referred_role: string
          referrer_id: string
          referrer_member_no: number
          referrer_name: string
          referrer_role: string
          reward_counted: boolean
          reward_due: boolean
          reward_manual: boolean
          used_at: string
        }[]
      }
      admin_reports: {
        Args: never
        Returns: {
          admin_note: string | null
          attachments: string[]
          category: string
          category_other: string | null
          created_at: string
          description: string
          id: string
          is_member: boolean
          reported_member_no: number | null
          reporter_email: string | null
          reporter_id: string | null
          reporter_name: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "reports"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_republicar_ficha: {
        Args: { p_ficha: string | null; p_nota?: string | null; p_republicar?: boolean | null }
        Returns: boolean
      }
      admin_resolver_pregunta_experto: {
        Args: { p_estado: string | null; p_id: string | null; p_nota?: string | null }
        Returns: Json
      }
      admin_resolver_solicitud_fundador: {
        Args: { p_conceder: boolean | null; p_nota?: string | null; p_user: string | null }
        Returns: Json
      }
      admin_revisar_evento: {
        Args: { p_decision: string | null; p_id: string | null; p_nota?: string | null }
        Returns: Json
      }
      admin_send_message: {
        Args: {
          p_audience: string | null
          p_body: string | null
          p_recipient_member_no?: number | null
          p_title: string | null
        }
        Returns: Json
      }
      admin_set_active_markets: {
        Args: { p_markets: string[] | null }
        Returns: undefined
      }
      admin_set_advisor:
        | { Args: { p_member_no: number; p_on: boolean }; Returns: undefined }
        | { Args: { p_on: boolean; p_user: string }; Returns: undefined }
      admin_set_alliance_partner: {
        Args: { p_country?: string | null; p_name: string | null; p_promo_code: string | null }
        Returns: string
      }
      admin_set_campaign_community: {
        Args: { p_url: string | null }
        Returns: undefined
      }
      admin_set_catalog_suggestion_status: {
        Args: { p_id: string | null; p_status: string | null }
        Returns: undefined
      }
      admin_set_country_discount: {
        Args: {
          p_active?: boolean | null
          p_country: string | null
          p_note?: string | null
          p_pct: number | null
        }
        Returns: undefined
      }
      admin_set_donation_wall: {
        Args: {
          p_featured?: boolean | null
          p_id: string | null
          p_logo_url?: string | null
          p_note?: string | null
          p_publish_as?: string | null
          p_published: boolean | null
        }
        Returns: Json
      }
      admin_set_ficha_verificada: {
        Args: { p_id: string | null; p_value: boolean | null }
        Returns: boolean
      }
      admin_set_forum_moderator: {
        Args: { p_id: string | null; p_status: string | null }
        Returns: undefined
      }
      admin_set_forum_status: {
        Args: { p_forum: string | null; p_status: string | null }
        Returns: undefined
      }
      admin_set_founder_cap: {
        Args: { p_cap: number | null; p_country: string | null; p_kind: string | null }
        Returns: undefined
      }
      admin_set_founder_wall: {
        Args: {
          p_featured: boolean | null
          p_order: number | null
          p_published: boolean | null
          p_user: string | null
        }
        Returns: undefined
      }
      admin_set_membership_price: {
        Args: {
          p_annual: number | null
          p_annual_list: number | null
          p_class: string | null
          p_country: string | null
          p_currency: string | null
          p_monthly: number | null
          p_type: string | null
          p_zero_decimal?: boolean | null
        }
        Returns: Json
      }
      admin_set_moderator_status: {
        Args: { p_status: string | null; p_user: string | null }
        Returns: undefined
      }
      admin_set_neuroaffirming: {
        Args: { p_id: string | null; p_value: boolean | null }
        Returns: undefined
      }
      admin_set_org_doc: {
        Args: { p_approve: boolean | null; p_note?: string | null; p_user: string | null }
        Returns: boolean
      }
      admin_set_profile_flag: {
        Args: { p_flag: string | null; p_id: string | null; p_value: boolean | null }
        Returns: undefined
      }
      admin_set_published: {
        Args: { p_id: string | null; p_value: boolean | null }
        Returns: undefined
      }
      admin_set_referral_config: {
        Args: {
          p_discount_pct: number | null
          p_referrer_max_pct: number | null
          p_referrer_step_pct: number | null
          p_validity_days: number | null
        }
        Returns: Json
      }
      admin_set_tribe_member: {
        Args: {
          p_can_evaluate: boolean | null
          p_can_review: boolean | null
          p_can_write: boolean | null
          p_status: string | null
          p_user: string | null
        }
        Returns: undefined
      }
      admin_set_verificacion_deadline: {
        Args: { p_fecha: string | null }
        Returns: string
      }
      admin_set_verified: {
        Args: { p_id: string | null; p_value: boolean | null }
        Returns: undefined
      }
      admin_set_whatsapp_url: { Args: { p_url: string }; Returns: undefined }
      admin_solicitudes_fundador: {
        Args: { p_status?: string | null }
        Returns: {
          affiliate_type: string
          correo: string
          cupo: number
          kind: string
          nombre: string
          nota_admin: string
          nota_usuario: string
          pais: string
          solicitada_en: string
          status: string
          usados: number
          user_id: string
        }[]
      }
      admin_tribe_forums: {
        Args: { p_status?: string | null }
        Returns: {
          city: string
          country: string
          created_at: string
          creator_name: string
          description: string
          id: string
          language: string
          status: string
          theme: string
          title: string
        }[]
      }
      admin_tribe_member_lookup: {
        Args: { p_member_no: number | null }
        Returns: {
          can_evaluate: boolean
          can_review: boolean
          can_write: boolean
          name: string
          status: string
          user_id: string
        }[]
      }
      admin_tribe_moderators: {
        Args: { p_status?: string | null }
        Returns: {
          created_at: string
          justification: string
          member_no: number
          name: string
          points: number
          status: string
          user_id: string
        }[]
      }
      affiliate_type_for: { Args: { p_user: string }; Returns: string }
      aplicar_plazos_empresa: { Args: never; Returns: Json }
      avisar_exenciones_por_vencer: { Args: never; Returns: number }
      badge_rank: { Args: { lvl: string }; Returns: number }
      booking_provider_name: { Args: { p_member_no: number }; Returns: string }
      campaign_email_sent: {
        Args: { p_kind: string | null; p_user: string | null }
        Returns: undefined
      }
      campaign_recipients: {
        Args: { p_campaign_id: string | null }
        Returns: {
          full_name: string
          phone: string
          user_id: string
        }[]
      }
      campaign_reminder_queue: {
        Args: never
        Returns: {
          country: string
          email: string
          fundador_hasta: string
          name: string
          opens_at: string
          pct: number
          user_id: string
          ya_abierto: boolean
        }[]
      }
      campaign_status: { Args: never; Returns: Json }
      campaign_welcome_queue: {
        Args: never
        Returns: {
          country: string
          email: string
          name: string
          opens_at: string
          provider_type: string
          role: string
          sector: string
          user_id: string
          ya_abierto: boolean
        }[]
      }
      can_review_provider: { Args: { p_provider: string }; Returns: boolean }
      cancel_my_account: {
        Args: { p_detail?: string | null; p_reason: string | null }
        Returns: Json
      }
      claim_founder_slot: {
        Args: { p_country: string | null; p_kind: string | null }
        Returns: boolean
      }
      claim_free_founder_seat: { Args: never; Returns: boolean }
      clasificar_directorio: { Args: { p_forzar?: boolean }; Returns: number }
      complete_onboarding: {
        Args: {
          p_country: string | null
          p_full_name: string | null
          p_municipality: string | null
          p_provider_type: string | null
          p_role: string | null
          p_rules_version: string | null
          p_school_grades?: string[] | null
          p_state: string | null
        }
        Returns: boolean
      }
      compute_provider_level: { Args: { p_id: string }; Returns: string }
      consume_referral_credit: { Args: { p_user: string }; Returns: undefined }
      country_discount_pct: { Args: { p_country: string }; Returns: number }
      course_visible: { Args: { p_course: string }; Returns: boolean }
      cumple_requisitos: { Args: { p_id: string }; Returns: boolean }
      cuota_cubierta: { Args: { p_id: string }; Returns: boolean }
      daily_billing_report: {
        Args: { p_date: string | null }
        Returns: {
          amount: number
          currency: string
          kind: string
          paid_at: string
          payer_name: string
          payer_rfc: string
        }[]
      }
      decrement_stock: { Args: { p_product_id: string }; Returns: undefined }
      derivar_secciones_directorio: {
        Args: { p_forzar?: boolean | null }
        Returns: number
      }
      devengar_comision_membresia: {
        Args: {
          p_base_cents: number | null
          p_currency: string | null
          p_primer_pago?: boolean | null
          p_referred: string | null
          p_stripe_ref: string | null
        }
        Returns: Json
      }
      directorio_abierto_en: { Args: { p_pais: string }; Returns: boolean }
      directorio_abre_en: { Args: { p_pais: string }; Returns: string }
      directorio_invitacion_enviada: {
        Args: { p_token: string | null }
        Returns: boolean
      }
      directorio_invitacion_rebote: {
        Args: { p_motivo?: string | null; p_token: string | null }
        Returns: boolean
      }
      directorio_invitaciones_cola_tanda_v2: {
        Args: { p_limit?: number | null; p_tanda: number | null }
        Returns: {
          affiliate_type: string
          ciudad: string
          correo: string
          correo_personal: boolean
          estado: string
          moneda: string
          nombre: string
          orden: number
          pais: string
          precio_configurado: boolean
          precio_fundador: number
          precio_ordinario: number
          provider_type: string
          sector: string
          token: string
          ya_contactado_8sep: boolean
        }[]
      }
      directorio_invitaciones_cola_v2: {
        Args: { p_limit?: number | null }
        Returns: {
          ciudad: string
          correo: string
          correo_personal: boolean
          estado: string
          nombre: string
          pais: string
          provider_type: string
          sector: string
          token: string
          ya_contactado_8sep: boolean
        }[]
      }
      donor_provider_ids: {
        Args: never
        Returns: {
          id: string
        }[]
      }
      donor_wall: {
        Args: never
        Returns: {
          display_name: string
          featured: boolean
          is_company: boolean
          level: string
          logo_url: string
          note: string
          since: string
        }[]
      }
      emit_all_due_appointment_reminders: { Args: never; Returns: number }
      emit_directory_grace_reminders: { Args: never; Returns: number }
      emit_due_appointment_reminders: { Args: never; Returns: number }
      emit_suspension_reminders: { Args: never; Returns: number }
      empresa_con_oferta: { Args: { p_id: string }; Returns: boolean }
      empresa_estado: { Args: { p_id: string }; Returns: Json }
      estado_exencion: { Args: { p_id: string }; Returns: Json }
      estado_publicacion: { Args: { p_id: string }; Returns: Json }
      exento_de_cuota: {
        Args: { p_provider_type: string | null; p_sector: string | null }
        Returns: boolean
      }
      expire_membership_grace: { Args: never; Returns: undefined }
      expire_stale_transactions: { Args: never; Returns: undefined }
      ficha_affiliate_type: {
        Args: { p_profession: string | null; p_provider_type: string | null }
        Returns: string
      }
      ficha_contacto_visible: {
        Args: { p_reclamada_por: string | null }
        Returns: boolean
      }
      ficha_exenta: { Args: { p_id: string }; Returns: boolean }
      ficha_pais_por_token: { Args: { p_token: string }; Returns: string }
      ficha_por_token: {
        Args: { p_token: string | null }
        Returns: {
          ciudad: string
          correo: string
          direccion: string
          especializacion: string
          estado: string
          ficha_id: string
          fuente: string
          fuente_url: string
          nombre: string
          provider_type: string
          sector: string
          sitio_web: string
          telefono: string
        }[]
      }
      ficha_visible: { Args: { p_reclamada_por: string }; Returns: boolean }
      founder_cap_for: {
        Args: { p_country: string | null; p_kind: string | null }
        Returns: number
      }
      founder_capacity: { Args: { p_kind: string }; Returns: number }
      founder_count: { Args: never; Returns: number }
      founder_cupo_usado: {
        Args: { p_country: string | null; p_kind: string | null }
        Returns: number
      }
      founder_disponible: {
        Args: { p_country: string | null; p_type: string | null }
        Returns: boolean
      }
      founder_eligible: { Args: { p_id: string }; Returns: boolean }
      founder_kind_for: { Args: { p_id: string }; Returns: string }
      founder_kind_para_tipo: { Args: { p_type: string }; Returns: string }
      founder_provider_ids: {
        Args: never
        Returns: {
          id: string
        }[]
      }
      founders_wall: {
        Args: { p_country?: string | null }
        Returns: {
          country: string
          display_name: string
          featured: boolean
          is_company: boolean
          kind: string
          member_no: number
        }[]
      }
      founders_wall_countries: {
        Args: never
        Returns: {
          country: string
          n: number
        }[]
      }
      get_membership_quote: {
        Args: { p_country: string | null; p_type: string | null }
        Returns: {
          amount: number
          base_usd: number
          currency: string
        }[]
      }
      get_shared_list: { Args: { p_token: string }; Returns: Json }
      grant_founder_seat: { Args: { p_id: string }; Returns: boolean }
      grant_referral_credit: {
        Args: { p_referred: string | null }
        Returns: {
          credit_pct: number
          referrer_id: string
          subscription_id: string
        }[]
      }
      guardar_cuenta_de_cobro: {
        Args: {
          p_contacto?: string | null
          p_contacto_tipo?: string | null
          p_metodo: string | null
          p_moneda?: string | null
          p_notas?: string | null
          p_pais?: string | null
          p_titular?: string | null
        }
        Returns: {
          actualizado_en: string
          contacto: string | null
          contacto_tipo: string | null
          metodo: string
          moneda: string | null
          notas: string | null
          pais: string | null
          titular: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_clinical_access: {
        Args: { p_patient: string | null; p_viewer: string | null }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_advisor: { Args: never; Returns: boolean }
      is_advisor: { Args: never; Returns: boolean }
      is_consumer: { Args: { p_id: string }; Returns: boolean }
      is_donor: { Args: { p_id: string }; Returns: boolean }
      is_founder: { Args: { p_id: string }; Returns: boolean }
      is_medical_profession: {
        Args: { p_profession: string | null }
        Returns: boolean
      }
      is_member_active: { Args: { p_id: string }; Returns: boolean }
      is_parent: { Args: { p_id: string }; Returns: boolean }
      is_provider: { Args: { p_id: string }; Returns: boolean }
      is_tribe_active: { Args: { p_uid?: string }; Returns: boolean }
      is_tribe_moderator: { Args: { p_uid?: string }; Returns: boolean }
      join_launch_waitlist: {
        Args: { p_country?: string | null; p_email: string | null }
        Returns: undefined
      }
      limpiar_baja_de_membresia: { Args: { p_user: string }; Returns: boolean }
      marcar_aviso_renovacion: {
        Args: { p_etapa: string | null; p_periodo: string | null; p_user: string | null }
        Returns: boolean
      }
      marcar_baja_de_membresia: { Args: { p_user: string }; Returns: boolean }
      marcar_ficha_reclamada: {
        Args: { p_perfil: string | null; p_token: string | null }
        Returns: boolean
      }
      marcar_invitacion_abierta: {
        Args: { p_token: string | null }
        Returns: undefined
      }
      mark_commissions_paid: {
        Args: { p_ids: string[] | null; p_note?: string | null }
        Returns: Json
      }
      membership_discount: {
        Args: { p_user: string | null }
        Returns: {
          referral_pct: number
          referrer_pct: number
          total_pct: number
        }[]
      }
      membership_price_for: {
        Args: {
          p_class?: string | null
          p_country: string | null
          p_period?: string | null
          p_type: string | null
        }
        Returns: {
          amount: number
          annual_amount: number
          annual_list_amount: number
          currency: string
          is_override: boolean
          list_amount: number
          monthly_amount: number
          zero_decimal: boolean
        }[]
      }
      membership_promo: {
        Args: { p_user: string | null }
        Returns: {
          amount_currency: string
          amount_off: number
          benefit: string
          percent_off: number
        }[]
      }
      message_threads: {
        Args: never
        Returns: {
          last_at: string
          last_body: string
          other_avatar: string
          other_id: string
          other_member_no: number
          other_name: string
          unread: number
        }[]
      }
      mi_cuenta_de_cobro: {
        Args: never
        Returns: {
          actualizado_en: string
          contacto: string | null
          contacto_tipo: string | null
          metodo: string
          moneda: string | null
          notas: string | null
          pais: string | null
          titular: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mi_membresia: {
        Args: never
        Returns: {
          baja_solicitada_en: string
          estado: string
          exencion_vigente_hasta: string
          exenta: boolean
          periodicidad: string
          tiene_suscripcion: boolean
          vigente_hasta: string
        }[]
      }
      mi_solicitud_fundador: { Args: never; Returns: Json }
      mis_pagos: {
        Args: never
        Returns: {
          concepto: string
          currency: string
          estado: string
          fecha: string
          monto_cents: number
          referencia: string
          tipo: string
        }[]
      }
      mis_solicitudes_de_contacto: {
        Args: { p_estado?: string | null }
        Returns: {
          created_at: string
          estado: string
          id: string
          mensaje: string
          nota_respuesta: string
          otro_member_no: number
          otro_nombre: string
          resuelta_en: string
          soy: string
        }[]
      }
      my_badge_inputs: {
        Args: never
        Returns: {
          avg_human_treatment: number
          avg_professionalism: number
          avg_quality: number
          content_count: number
          discount_pct: number
          documental_verified: boolean
          evs_score: number
          provider_id: string
          response_rate_pct: number
          retention_pct: number
          total_reviews: number
        }[]
      }
      my_commissions_earned: {
        Args: never
        Returns: {
          amount_cents: number
          counterpart_id: string
          counterpart_member_no: number
          counterpart_name: string
          created_at: string
          currency: string
          id: string
          order_id: string
          paid_at: string
          paid_note: string
          product_name: string
          refund_after_payment: boolean
          status: string
        }[]
      }
      my_commissions_owed: {
        Args: never
        Returns: {
          amount_cents: number
          counterpart_id: string
          counterpart_member_no: number
          counterpart_name: string
          created_at: string
          currency: string
          id: string
          order_id: string
          paid_at: string
          paid_note: string
          product_name: string
          refund_after_payment: boolean
          status: string
        }[]
      }
      my_membership_discount: {
        Args: never
        Returns: {
          referral_pct: number
          referrer_pct: number
          total_pct: number
        }[]
      }
      my_membership_monthly_ordinary: {
        Args: never
        Returns: {
          currency: string
          monthly_amount: number
        }[]
      }
      my_membership_options: {
        Args: never
        Returns: {
          affiliate_type: string
          annual_amount: number
          annual_list_amount: number
          currency: string
          is_founder: boolean
          member_class: string
          monthly_amount: number
          zero_decimal: boolean
        }[]
      }
      my_membership_promo: {
        Args: never
        Returns: {
          amount_currency: string
          amount_off: number
          benefit: string
          percent_off: number
        }[]
      }
      my_raffle_tickets: { Args: never; Returns: number }
      my_referral_count: { Args: never; Returns: number }
      my_referral_summary: {
        Args: never
        Returns: {
          accrued_pct: number
          max_pct: number
          paying_uses: number
          rewarded_uses: number
          step_pct: number
          total_uses: number
          validity_days: number
        }[]
      }
      my_waitlist: {
        Args: never
        Returns: {
          created_at: string
          id: string
          note: string
          patient_id: string
          patient_member_no: number
          patient_name: string
          status: string
        }[]
      }
      nm_compare_price: {
        Args: { p_country: string | null }
        Returns: {
          currency: string
          max_month: number
          min_month: number
        }[]
      }
      normalize_country: { Args: { p: string }; Returns: string }
      notif_category: { Args: { p_type: string }; Returns: string }
      notify_admins: {
        Args: { p_body: string | null; p_data?: Json | null; p_title: string | null; p_type: string | null }
        Returns: undefined
      }
      owns_course: { Args: { p_course: string }; Returns: boolean }
      perfil_completo: { Args: { p_id: string }; Returns: boolean }
      prescription_mark_ordered: { Args: { p_id: string }; Returns: undefined }
      prescription_mark_viewed: { Args: { p_id: string }; Returns: undefined }
      proponer_evento: {
        Args: {
          p_category?: string | null
          p_city?: string | null
          p_country?: string | null
          p_cover_url?: string | null
          p_description?: string | null
          p_ends_at?: string | null
          p_is_online?: boolean | null
          p_online_url?: string | null
          p_starts_at: string | null
          p_title: string | null
          p_venue?: string | null
        }
        Returns: Json
      }
      provider_metrics: {
        Args: never
        Returns: {
          contacts_30d: number
          contacts_total: number
          views_30d: number
          views_total: number
        }[]
      }
      provider_search_text: {
        Args: {
          bio: string | null
          business: string | null
          full_name: string | null
          pd: Json | null
          profession: string | null
        }
        Returns: string
      }
      public_jobs: {
        Args: { p_country?: string | null; p_type?: string | null }
        Returns: {
          apply_email: string
          apply_url: string
          city: string
          company_id: string
          company_name: string
          country: string
          created_at: string
          education: string
          experience: string
          id: string
          note: string
          opportunity_type: string
          positions: number
          salary_text: string
          skills: string
          title: string
        }[]
      }
      public_jobs_countries: {
        Args: never
        Returns: {
          country: string
          n: number
        }[]
      }
      publicar_por_pago: { Args: { p_id: string }; Returns: boolean }
      publicar_si_procede: { Args: { p_id: string }; Returns: boolean }
      puede_publicar: { Args: { p_id: string }; Returns: boolean }
      purge_expired_suspensions: { Args: never; Returns: number }
      purge_lapsed_founders: { Args: never; Returns: number }
      reactivate_my_account: { Args: never; Returns: undefined }
      recommend_blog: {
        Args: { p_limit?: number | null }
        Returns: {
          author_avatar: string | null
          author_business: string | null
          author_id: string | null
          author_name: string | null
          avg_stars: number | null
          body: string | null
          cover_url: string | null
          created_at: string | null
          excerpt: string | null
          external_url: string | null
          id: string | null
          keywords: string[] | null
          ratings_count: number | null
          title: string | null
          topic: string | null
          type: string | null
          updated_at: string | null
          views_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "blog_feed"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_alliance_credit: {
        Args: {
          p_amount?: number | null
          p_code: string | null
          p_currency?: string | null
          p_user_id: string | null
        }
        Returns: undefined
      }
      redeem_promo_code: { Args: { p_code: string }; Returns: Json }
      refresh_all_badges: { Args: never; Returns: number }
      refresh_provider_badge: { Args: { p_id: string }; Returns: string }
      registrar_pago_de_membresia: {
        Args: {
          p_amount_cents: number | null
          p_concepto?: string | null
          p_currency: string | null
          p_member_class?: string | null
          p_paid_until?: string | null
          p_period?: string | null
          p_stripe_ref: string | null
          p_user: string | null
        }
        Returns: boolean
      }
      registrar_pregunta_experto: {
        Args: {
          p_categoria?: string | null
          p_correo?: string | null
          p_nombre?: string | null
          p_pais?: string | null
          p_pregunta: string | null
        }
        Returns: Json
      }
      registrar_renovacion_terapia: {
        Args: {
          p_amount_cents: number | null
          p_currency: string | null
          p_invoice: string | null
          p_payer: string | null
          p_provider: string | null
          p_subscription?: string | null
        }
        Returns: boolean
      }
      registration_quote: {
        Args: { p_country: string | null; p_type: string | null }
        Returns: Json
      }
      reglamento_vigente: { Args: never; Returns: string }
      renovaciones_por_avisar: {
        Args: { p_dias?: number | null }
        Returns: {
          correo: string
          currency: string
          etapa: string
          monto_cents: number
          nombre: string
          periodo: string
          renueva_el: string
          user_id: string
        }[]
      }
      renovar_invitaciones_por_vencer: { Args: never; Returns: number }
      request_appointment: {
        Args: {
          p_charge_currency?: string | null
          p_charge_percent?: number | null
          p_charge_total?: number | null
          p_ends?: string | null
          p_location?: string | null
          p_mode?: string | null
          p_note?: string | null
          p_online_url?: string | null
          p_recipient_member_no: number | null
          p_starts: string | null
          p_title: string | null
        }
        Returns: Json
      }
      request_booking: {
        Args: {
          p_contact: string | null
          p_name: string | null
          p_note?: string | null
          p_preferred?: string | null
          p_provider_member_no: number | null
        }
        Returns: Json
      }
      resolve_affiliate: {
        Args: { p_code: string | null }
        Returns: {
          commission_pct: number
          provider_id: string
        }[]
      }
      resolve_parent_by_qr: {
        Args: { p_id: string | null; p_token: string | null }
        Returns: {
          full_name: string
          id: string
          member_no: number
          role: string
          suspended: boolean
        }[]
      }
      respond_appointment: {
        Args: { p_accept: boolean | null; p_reason?: string | null; p_request: string | null }
        Returns: Json
      }
      respond_review: {
        Args: { p_survey_id: string | null; p_text: string | null }
        Returns: Json
      }
      responder_solicitud_contacto: {
        Args: { p_aceptar: boolean | null; p_id: string | null; p_nota?: string | null }
        Returns: Json
      }
      revertir_pago_de_membresia: {
        Args: { p_stripe_ref: string | null }
        Returns: boolean
      }
      revertir_ultimo_pago_de_membresia: {
        Args: { p_user: string | null }
        Returns: boolean
      }
      search_all: {
        Args: { q: string | null }
        Returns: {
          id: string
          kind: string
          subtitle: string
          title: string
          url: string
        }[]
      }
      search_contacts: {
        Args: { p_query: string | null }
        Returns: {
          avatar_url: string
          business_name: string
          country: string
          full_name: string
          member_no: number
          role: string
        }[]
      }
      search_members: {
        Args: { p_query: string | null }
        Returns: {
          avatar_url: string
          business_name: string
          full_name: string
          member_no: number
          role: string
        }[]
      }
      search_patients: {
        Args: { p_query: string | null }
        Returns: {
          avatar_url: string
          full_name: string
          member_no: number
          relation: string
        }[]
      }
      secure_file_key_for_me: { Args: { p_file: string }; Returns: boolean }
      secure_file_owned_by_me: { Args: { p_file: string }; Returns: boolean }
      send_message: {
        Args: { p_body: string | null; p_recipient_member_no: number | null }
        Returns: Json
      }
      set_founder_optout: { Args: { p_optout: boolean }; Returns: boolean }
      set_membership_active: {
        Args: {
          p_customer: string | null
          p_paid_until: string | null
          p_subscription: string | null
          p_user: string | null
        }
        Returns: undefined
      }
      set_referrer: { Args: { p_member_no: number }; Returns: Json }
      sin_acentos: { Args: { p_texto: string }; Returns: string }
      solicitar_baja_ficha: {
        Args: { p_motivo?: string | null; p_token: string | null }
        Returns: boolean
      }
      solicitar_contacto: {
        Args: { p_mensaje: string | null; p_provider_member_no: number | null }
        Returns: Json
      }
      solicitar_cuota_fundador: { Args: { p_nota?: string }; Returns: Json }
      solicitar_exencion: {
        Args: { p_documento: string | null; p_folio: string | null; p_tipo: string | null }
        Returns: boolean
      }
      submit_catalog_suggestion: {
        Args: {
          p_country?: string | null
          p_email?: string | null
          p_kind: string | null
          p_name: string | null
          p_note?: string | null
          p_page?: string | null
          p_section?: string | null
        }
        Returns: undefined
      }
      submit_improvement: {
        Args: { p_email?: string | null; p_message: string | null; p_page?: string | null }
        Returns: undefined
      }
      submit_org_document: {
        Args: { p_kind: string | null; p_url: string | null }
        Returns: boolean
      }
      submit_provider_review: {
        Args: {
          p_accessibility: number | null
          p_anonymous?: boolean | null
          p_comment?: string | null
          p_facilities?: number | null
          p_flexibility: number | null
          p_human: number | null
          p_offer: number | null
          p_price: number | null
          p_professionalism?: number | null
          p_provider: string | null
          p_quality: number | null
          p_sensory: number | null
        }
        Returns: undefined
      }
      survey_results: { Args: never; Returns: Json }
      suspend_my_account: { Args: never; Returns: string }
      track_profile_event: {
        Args: { p_kind: string | null; p_provider_id: string | null }
        Returns: undefined
      }
      tribe_am_i_forum_moderator: {
        Args: { p_forum: string | null }
        Returns: boolean
      }
      tribe_apply_forum_moderator: {
        Args: { p_forum: string | null }
        Returns: undefined
      }
      tribe_apply_moderator: {
        Args: { p_accept: boolean | null; p_justification: string | null }
        Returns: undefined
      }
      tribe_badge_points: { Args: { p_badge: string }; Returns: number }
      tribe_become_mentor: {
        Args: { p_bio: string | null; p_section?: string | null; p_tracks: string[] | null }
        Returns: undefined
      }
      tribe_cancel_event: { Args: { p_event: string }; Returns: undefined }
      tribe_close_forum: { Args: { p_forum: string }; Returns: undefined }
      tribe_create_event: {
        Args: {
          p_city: string | null
          p_country: string | null
          p_description: string | null
          p_is_online: boolean | null
          p_location: string | null
          p_noise: string | null
          p_quiet_room: boolean | null
          p_section?: string | null
          p_sensory_tips: string | null
          p_starts_at: string | null
          p_title: string | null
        }
        Returns: string
      }
      tribe_create_forum: {
        Args: {
          p_apply_moderator?: boolean | null
          p_city: string | null
          p_country: string | null
          p_description: string | null
          p_language: string | null
          p_notify_countries: string[] | null
          p_section?: string | null
          p_theme: string | null
          p_title: string | null
        }
        Returns: string
      }
      tribe_delete_message: { Args: { p_msg: string }; Returns: undefined }
      tribe_event_rsvp: {
        Args: { p_event: string | null; p_going: boolean | null }
        Returns: undefined
      }
      tribe_event_sensory_report: {
        Args: {
          p_comfort: number | null
          p_event: string | null
          p_noise: number | null
          p_notes: string | null
          p_quiet_used: boolean | null
        }
        Returns: undefined
      }
      tribe_events_list: {
        Args: { p_country?: string | null; p_section?: string | null }
        Returns: {
          city: string
          country: string
          creator_name: string
          description: string
          going: number
          i_going: boolean
          i_reported: boolean
          id: string
          is_online: boolean
          is_past: boolean
          location: string
          noise: string
          quiet_room: boolean
          section: string
          sensory_tips: string
          starts_at: string
          title: string
        }[]
      }
      tribe_forum_call_moderators: {
        Args: { p_forum: string | null }
        Returns: undefined
      }
      tribe_forum_messages: {
        Args: { p_forum: string | null }
        Returns: {
          author_energy: string
          author_id: string
          author_is_mod: boolean
          author_name: string
          body: string
          created_at: string
          id: string
        }[]
      }
      tribe_forum_prefs_get: {
        Args: never
        Returns: {
          countries: string[]
          push_enabled: boolean
        }[]
      }
      tribe_forum_prefs_set: {
        Args: { p_countries: string[] | null; p_push: boolean | null }
        Returns: undefined
      }
      tribe_forums_list: {
        Args: {
          p_country?: string | null
          p_language?: string | null
          p_query?: string | null
          p_section?: string | null
          p_theme?: string | null
        }
        Returns: {
          city: string
          country: string
          created_at: string
          description: string
          i_member: boolean
          id: string
          language: string
          members: number
          section: string
          theme: string
          title: string
        }[]
      }
      tribe_give_gratitude: {
        Args: {
          p_anonymous?: boolean | null
          p_badge: string | null
          p_forum?: string | null
          p_receiver: string | null
        }
        Returns: number
      }
      tribe_impact: {
        Args: { p_user: string | null }
        Returns: {
          badge_key: string
          n: number
          points: number
          silent: boolean
        }[]
      }
      tribe_invite: {
        Args: { p_forum: string | null; p_member_no: number | null }
        Returns: undefined
      }
      tribe_mentor_messages_list: {
        Args: { p_mentorship: string | null }
        Returns: {
          author_id: string
          author_name: string
          body: string
          created_at: string
          id: string
        }[]
      }
      tribe_mentors_list: {
        Args: { p_section?: string | null; p_track?: string | null }
        Returns: {
          bio: string
          my_status: string
          name: string
          section: string
          tracks: string[]
          user_id: string
        }[]
      }
      tribe_moderator_profile: {
        Args: { p_moderator: string | null }
        Returns: {
          availability: number
          cordiality: number
          empathy: number
          inclusive_language: number
          knowledge: number
          n_ratings: number
          points: number
        }[]
      }
      tribe_moderators_list: {
        Args: never
        Returns: {
          avg_rating: number
          i_rated: boolean
          n_ratings: number
          name: string
          points: number
          user_id: string
        }[]
      }
      tribe_my_invites: {
        Args: never
        Returns: {
          created_at: string
          forum_id: string
          forum_title: string
          id: string
          inviter_name: string
        }[]
      }
      tribe_my_mentor: {
        Args: never
        Returns: {
          bio: string
          is_active: boolean
          section: string
          tracks: string[]
        }[]
      }
      tribe_my_mentorships: {
        Args: never
        Returns: {
          counterpart_name: string
          created_at: string
          id: string
          role: string
          status: string
          track: string
        }[]
      }
      tribe_my_moderator: {
        Args: never
        Returns: {
          justification: string
          points: number
          status: string
        }[]
      }
      tribe_rate_moderator: {
        Args: {
          p_anonymous?: boolean | null
          p_availability: number | null
          p_comment?: string | null
          p_cordiality: number | null
          p_empathy: number | null
          p_inclusive: number | null
          p_knowledge: number | null
          p_moderator: string | null
        }
        Returns: undefined
      }
      tribe_request_mentor: {
        Args: { p_mentor: string | null; p_track: string | null }
        Returns: undefined
      }
      tribe_respond_invite: {
        Args: { p_accept: boolean | null; p_invite: string | null }
        Returns: undefined
      }
      tribe_respond_mentorship: {
        Args: { p_accept: boolean | null; p_id: string | null }
        Returns: undefined
      }
      tribe_set_mentor_active: {
        Args: { p_active: boolean | null }
        Returns: undefined
      }
      tribe_set_silent: { Args: { p_silent: boolean }; Returns: undefined }
      tribe_tokens_left: { Args: never; Returns: number }
      type_badge_providers: {
        Args: never
        Returns: {
          id: string
          is_inclusive_company: boolean
          is_inclusive_school: boolean
          is_institutional_ally: boolean
        }[]
      }
      umbral_liquidacion_cents: {
        Args: { p_currency: string | null }
        Returns: number
      }
      verificacion_deadline: { Args: never; Returns: string }
      verify_ally: {
        Args: { p_id: string | null }
        Returns: {
          countries: string[]
          found: boolean
          name: string
          vigente: boolean
          website: string
        }[]
      }
      verify_badge: {
        Args: { p_folio: string | null }
        Returns: {
          country: string
          found: boolean
          is_company: boolean
          is_founder: boolean
          kind: string
          member_no: number
          name: string
          neuroaffirming: boolean
          vigente: boolean
        }[]
      }
      waitlist_add: {
        Args: { p_note?: string | null; p_patient_member_no: number | null }
        Returns: Json
      }
      waitlist_join: {
        Args: { p_note?: string | null; p_provider_member_no: number | null }
        Returns: Json
      }
      waitlist_notify_slot: { Args: { p_message?: string }; Returns: Json }
      waitlist_set_status: {
        Args: { p_id: string | null; p_status: string | null }
        Returns: Json
      }
    }
    Enums: {
      prescription_status: "draft" | "sent" | "viewed" | "ordered" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      prescription_status: ["draft", "sent", "viewed", "ordered", "archived"],
    },
  },
} as const

// ── Añadido por scripts/arreglar-tipos.mjs ─────────────────────────────────
// El generador no emite estas uniones ni el ayudante Views<>, y el proyecto
// las importa desde aquí desde antes de que los tipos se generaran.
export type UserRole = 'patient' | 'parent' | 'provider' | 'admin';
export type ProviderType =
  | 'service_provider' | 'merchant' | 'school' | 'clinic' | 'wellness'
  | 'tourism' | 'legal' | 'ngo' | 'caregiver' | 'company';
export type TransactionStatus = 'pending' | 'completed' | 'expired' | 'disputed';
export type OfferStatus = 'active' | 'paused' | 'expired' | 'draft';
export type DiscountType = 'percentage' | 'fixed' | 'freebie';
export type PrescriptionStatus = 'draft' | 'sent' | 'viewed' | 'ordered' | 'archived';

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];
