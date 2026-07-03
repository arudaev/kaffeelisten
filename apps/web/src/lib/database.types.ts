export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          id: string
          company_id: string
          name: string
          work_email: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          work_email?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          work_email?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'members_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      items: {
        Row: {
          id: string
          name: string
          unit_label: string
          price_cents: number
          category: 'coffee' | 'drink' | 'snack' | 'food' | 'other'
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          unit_label?: string
          price_cents?: number
          category?: 'coffee' | 'drink' | 'snack' | 'food' | 'other'
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          unit_label?: string
          price_cents?: number
          category?: 'coffee' | 'drink' | 'snack' | 'food' | 'other'
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          member_id: string
          company_id: string
          item_id: string
          quantity: number
          logged_at: string
        }
        Insert: {
          id?: string
          member_id: string
          company_id: string
          item_id: string
          quantity?: number
          logged_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          company_id?: string
          item_id?: string
          quantity?: number
          logged_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_member_id_fkey'
            columns: ['member_id']
            referencedRelation: 'members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_item_id_fkey'
            columns: ['item_id']
            referencedRelation: 'items'
            referencedColumns: ['id']
          }
        ]
      }
      transactions_archive: {
        Row: {
          id: string
          member_id: string
          company_id: string
          item_id: string
          quantity: number
          logged_at: string
          archived_at: string
          report_month: string
        }
        Insert: {
          id: string
          member_id: string
          company_id: string
          item_id: string
          quantity: number
          logged_at: string
          archived_at?: string
          report_month: string
        }
        Update: {
          id?: string
          member_id?: string
          company_id?: string
          item_id?: string
          quantity?: number
          logged_at?: string
          archived_at?: string
          report_month?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: number
          admin_pin_hash: string | null
          pin_length: number
          pin_updated_at: string | null
          pin_reset_token_hash: string | null
          pin_reset_expires_at: string | null
          report_recipients: string[]
          ceo_email: string | null
          cc_ceo_on_reports: boolean
          member_statements_enabled: boolean
          auto_report_enabled: boolean
          auto_report_day: number | null
          report_accent: string
          report_subject: string | null
          report_intro: string | null
          report_include_pdf: boolean
          report_include_excel: boolean
          member_subject: string | null
          member_intro: string | null
          max_items_per_order: number | null
          updated_at: string
        }
        Insert: {
          id?: number
          admin_pin_hash?: string | null
          pin_length?: number
          pin_updated_at?: string | null
          pin_reset_token_hash?: string | null
          pin_reset_expires_at?: string | null
          report_recipients?: string[]
          ceo_email?: string | null
          cc_ceo_on_reports?: boolean
          member_statements_enabled?: boolean
          auto_report_enabled?: boolean
          auto_report_day?: number | null
          report_accent?: string
          report_subject?: string | null
          report_intro?: string | null
          report_include_pdf?: boolean
          report_include_excel?: boolean
          member_subject?: string | null
          member_intro?: string | null
          max_items_per_order?: number | null
          updated_at?: string
        }
        Update: {
          id?: number
          admin_pin_hash?: string | null
          pin_length?: number
          pin_updated_at?: string | null
          pin_reset_token_hash?: string | null
          pin_reset_expires_at?: string | null
          report_recipients?: string[]
          ceo_email?: string | null
          cc_ceo_on_reports?: boolean
          member_statements_enabled?: boolean
          auto_report_enabled?: boolean
          auto_report_day?: number | null
          report_accent?: string
          report_subject?: string | null
          report_intro?: string | null
          report_include_pdf?: boolean
          report_include_excel?: boolean
          member_subject?: string | null
          member_intro?: string | null
          max_items_per_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      app_theme: {
        Row: {
          id: number
          default_mode: 'system' | 'light' | 'dark'
          active_palette: string
          custom: Record<string, unknown>
          updated_at: string
        }
        Insert: {
          id?: number
          default_mode?: 'system' | 'light' | 'dark'
          active_palette?: string
          custom?: Record<string, unknown>
          updated_at?: string
        }
        Update: {
          id?: number
          default_mode?: 'system' | 'light' | 'dark'
          active_palette?: string
          custom?: Record<string, unknown>
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      verify_admin_pin: {
        Args: { p_pin: string }
        Returns: boolean
      }
      set_admin_pin: {
        Args: { p_pin: string }
        Returns: undefined
      }
      set_pin_reset_token: {
        Args: { p_code: string; p_ttl_minutes?: number }
        Returns: undefined
      }
      consume_pin_reset: {
        Args: { p_code: string; p_new_pin: string }
        Returns: boolean
      }
      log_order: {
        Args: { p_member_id: string; p_items: { item_id: string; quantity: number }[] }
        Returns: string[]
      }
      undo_order: {
        Args: { p_ids: string[] }
        Returns: number
      }
      register_member: {
        Args: { p_company_id: string; p_name: string; p_email: string }
        Returns: { id: string; name: string; company_id: string; active: boolean }[]
      }
      pin_rate_consume: {
        Args: { p_key: string; p_max: number; p_window_secs: number; p_lock_secs: number }
        Returns: boolean
      }
      pin_rate_reset: {
        Args: { p_key: string }
        Returns: undefined
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
