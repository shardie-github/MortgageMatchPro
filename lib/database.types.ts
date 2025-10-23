export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          subscription_tier: 'free' | 'premium' | 'broker'
          stripe_customer_id: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          subscription_tier?: 'free' | 'premium' | 'broker'
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          subscription_tier?: 'free' | 'premium' | 'broker'
          stripe_customer_id?: string | null
        }
      }
      mortgage_calculations: {
        Row: {
          id: string
          user_id: string
          country: 'CA' | 'US'
          income: number
          debts: number
          down_payment: number
          property_price: number
          interest_rate: number
          term_years: number
          gds_ratio: number
          tds_ratio: number
          dti_ratio: number
          max_affordable: number
          monthly_payment: number
          qualifying_rate: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          country: 'CA' | 'US'
          income: number
          debts: number
          down_payment: number
          property_price: number
          interest_rate: number
          term_years: number
          gds_ratio: number
          tds_ratio: number
          dti_ratio: number
          max_affordable: number
          monthly_payment: number
          qualifying_rate: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          country?: 'CA' | 'US'
          income?: number
          debts?: number
          down_payment?: number
          property_price?: number
          interest_rate?: number
          term_years?: number
          gds_ratio?: number
          tds_ratio?: number
          dti_ratio?: number
          max_affordable?: number
          monthly_payment?: number
          qualifying_rate?: number
          created_at?: string
        }
      }
      rate_checks: {
        Row: {
          id: string
          user_id: string
          country: 'CA' | 'US'
          term_years: number
          rate_type: 'fixed' | 'variable'
          rates: Json
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          country: 'CA' | 'US'
          term_years: number
          rate_type: 'fixed' | 'variable'
          rates: Json
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          user_id?: string
          country?: 'CA' | 'US'
          term_years?: number
          rate_type?: 'fixed' | 'variable'
          rates?: Json
          created_at?: string
          expires_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          phone: string
          lead_data: Json
          lead_score: number
          status: 'pending' | 'contacted' | 'converted' | 'rejected'
          broker_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          phone: string
          lead_data: Json
          lead_score: number
          status?: 'pending' | 'contacted' | 'converted' | 'rejected'
          broker_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          phone?: string
          lead_data?: Json
          lead_score?: number
          status?: 'pending' | 'contacted' | 'converted' | 'rejected'
          broker_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      brokers: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          company: string
          license_number: string
          provinces_states: string[]
          commission_rate: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          company: string
          license_number: string
          provinces_states: string[]
          commission_rate: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          company?: string
          license_number?: string
          provinces_states?: string[]
          commission_rate?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}