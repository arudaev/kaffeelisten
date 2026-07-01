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
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
