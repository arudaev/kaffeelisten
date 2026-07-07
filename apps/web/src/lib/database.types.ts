export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          active: boolean
          created_at: string
          billing_mode: 'individual' | 'company_paid'
          billing_contact_name: string | null
          billing_contact_email: string | null
          billing_notes: string | null
        }
        Insert: {
          id?: string
          name: string
          active?: boolean
          created_at?: string
          billing_mode?: 'individual' | 'company_paid'
          billing_contact_name?: string | null
          billing_contact_email?: string | null
          billing_notes?: string | null
        }
        Update: {
          id?: string
          name?: string
          active?: boolean
          created_at?: string
          billing_mode?: 'individual' | 'company_paid'
          billing_contact_name?: string | null
          billing_contact_email?: string | null
          billing_notes?: string | null
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
          email_verified_at: string | null
          email_verify_token_hash: string | null
          email_verify_expires_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          work_email?: string | null
          active?: boolean
          created_at?: string
          email_verified_at?: string | null
          email_verify_token_hash?: string | null
          email_verify_expires_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          work_email?: string | null
          active?: boolean
          created_at?: string
          email_verified_at?: string | null
          email_verify_token_hash?: string | null
          email_verify_expires_at?: string | null
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
          company_documents_enabled: boolean
          member_paid_grid_enabled: boolean
          issue_invoices: boolean
          issuer_legal_name: string | null
          issuer_address: string | null
          issuer_vat_id: string | null
          issuer_iban: string | null
          issuer_bic: string | null
          invoice_number_prefix: string | null
          invoice_payment_terms: string | null
          invoice_vat_rate: number
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
          company_documents_enabled?: boolean
          member_paid_grid_enabled?: boolean
          issue_invoices?: boolean
          issuer_legal_name?: string | null
          issuer_address?: string | null
          issuer_vat_id?: string | null
          issuer_iban?: string | null
          issuer_bic?: string | null
          invoice_number_prefix?: string | null
          invoice_payment_terms?: string | null
          invoice_vat_rate?: number
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
          company_documents_enabled?: boolean
          member_paid_grid_enabled?: boolean
          issue_invoices?: boolean
          issuer_legal_name?: string | null
          issuer_address?: string | null
          issuer_vat_id?: string | null
          issuer_iban?: string | null
          issuer_bic?: string | null
          invoice_number_prefix?: string | null
          invoice_payment_terms?: string | null
          invoice_vat_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      billing_runs: {
        Row: {
          report_month: string
          status: 'running' | 'completed' | 'failed'
          attempts: number
          last_error: string | null
          started_at: string
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          report_month: string
          status?: 'running' | 'completed' | 'failed'
          attempts?: number
          last_error?: string | null
          started_at?: string
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          report_month?: string
          status?: 'running' | 'completed' | 'failed'
          attempts?: number
          last_error?: string | null
          started_at?: string
          completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      billing_documents: {
        Row: {
          id: string
          report_month: string
          document_number: string
          recipient_type: 'member' | 'company' | 'itc1_archive'
          recipient_name: string
          recipient_email: string
          company_id: string | null
          member_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          status: 'draft' | 'sent' | 'failed' | 'voided'
          paid: boolean
          sent_at: string | null
          resend_message_id: string | null
          voided_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          report_month: string
          document_number: string
          recipient_type: 'member' | 'company' | 'itc1_archive'
          recipient_name: string
          recipient_email: string
          company_id?: string | null
          member_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          status?: 'draft' | 'sent' | 'failed' | 'voided'
          paid?: boolean
          sent_at?: string | null
          resend_message_id?: string | null
          voided_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          report_month?: string
          document_number?: string
          recipient_type?: 'member' | 'company' | 'itc1_archive'
          recipient_name?: string
          recipient_email?: string
          company_id?: string | null
          member_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          status?: 'draft' | 'sent' | 'failed' | 'voided'
          paid?: boolean
          sent_at?: string | null
          resend_message_id?: string | null
          voided_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'billing_documents_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'billing_documents_member_id_fkey'
            columns: ['member_id']
            referencedRelation: 'members'
            referencedColumns: ['id']
          }
        ]
      }
      member_payments: {
        Row: {
          member_id: string
          report_month: string
          amount_cents: number | null
          paid: boolean
          paid_at: string | null
          updated_at: string
        }
        Insert: {
          member_id: string
          report_month: string
          amount_cents?: number | null
          paid?: boolean
          paid_at?: string | null
          updated_at?: string
        }
        Update: {
          member_id?: string
          report_month?: string
          amount_cents?: number | null
          paid?: boolean
          paid_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'member_payments_member_id_fkey'
            columns: ['member_id']
            referencedRelation: 'members'
            referencedColumns: ['id']
          }
        ]
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
      set_member_email_token: {
        Args: { p_member_id: string; p_token: string; p_ttl_minutes?: number }
        Returns: undefined
      }
      confirm_member_email: {
        Args: { p_member_id: string; p_token: string }
        Returns: string | null
      }
      next_billing_document_number: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
