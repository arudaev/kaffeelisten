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
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
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
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
