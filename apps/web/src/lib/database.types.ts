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
        Update: never
      }
    }
  }
}
