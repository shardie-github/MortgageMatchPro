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
          free_rate_checks_used: number
          last_rate_check_reset: string
          billing_email: string | null
          phone: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          subscription_tier?: 'free' | 'premium' | 'broker'
          stripe_customer_id?: string | null
          free_rate_checks_used?: number
          last_rate_check_reset?: string
          billing_email?: string | null
          phone?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          subscription_tier?: 'free' | 'premium' | 'broker'
          stripe_customer_id?: string | null
          free_rate_checks_used?: number
          last_rate_check_reset?: string
          billing_email?: string | null
          phone?: string | null
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
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
          tier: 'premium' | 'broker'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          trial_start: string | null
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
          tier: 'premium' | 'broker'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string
          stripe_customer_id?: string
          status?: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
          tier?: 'premium' | 'broker'
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      billing_history: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          stripe_payment_intent_id: string | null
          stripe_invoice_id: string | null
          amount: number
          currency: 'cad' | 'usd'
          status: 'succeeded' | 'pending' | 'failed' | 'canceled' | 'requires_action'
          payment_type: 'rate_check' | 'subscription' | 'broker_license' | 'renewal'
          description: string
          metadata: Json | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          amount: number
          currency: 'cad' | 'usd'
          status: 'succeeded' | 'pending' | 'failed' | 'canceled' | 'requires_action'
          payment_type: 'rate_check' | 'subscription' | 'broker_license' | 'renewal'
          description: string
          metadata?: Json | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          amount?: number
          currency?: 'cad' | 'usd'
          status?: 'succeeded' | 'pending' | 'failed' | 'canceled' | 'requires_action'
          payment_type?: 'rate_check' | 'subscription' | 'broker_license' | 'renewal'
          description?: string
          metadata?: Json | null
          created_at?: string
          processed_at?: string | null
        }
      }
      user_entitlements: {
        Row: {
          id: string
          user_id: string
          feature: 'rate_checks' | 'scenario_saving' | 'lead_generation' | 'report_export' | 'broker_white_label' | 'unlimited_calculations'
          entitlement_type: 'subscription' | 'one_time' | 'trial' | 'broker_license'
          is_active: boolean
          expires_at: string | null
          usage_count: number
          usage_limit: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature: 'rate_checks' | 'scenario_saving' | 'lead_generation' | 'report_export' | 'broker_white_label' | 'unlimited_calculations'
          entitlement_type: 'subscription' | 'one_time' | 'trial' | 'broker_license'
          is_active?: boolean
          expires_at?: string | null
          usage_count?: number
          usage_limit?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature?: 'rate_checks' | 'scenario_saving' | 'lead_generation' | 'report_export' | 'broker_white_label' | 'unlimited_calculations'
          entitlement_type?: 'subscription' | 'one_time' | 'trial' | 'broker_license'
          is_active?: boolean
          expires_at?: string | null
          usage_count?: number
          usage_limit?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      rate_check_tokens: {
        Row: {
          id: string
          user_id: string
          billing_history_id: string
          token_count: number
          used_count: number
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          billing_history_id: string
          token_count?: number
          used_count?: number
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          billing_history_id?: string
          token_count?: number
          used_count?: number
          expires_at?: string
          created_at?: string
        }
      }
      broker_licenses: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          company_name: string
          license_number: string
          contact_email: string
          contact_phone: string
          provinces_states: string[]
          white_label_domain: string | null
          custom_branding: Json | null
          is_active: boolean
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          company_name: string
          license_number: string
          contact_email: string
          contact_phone: string
          provinces_states: string[]
          white_label_domain?: string | null
          custom_branding?: Json | null
          is_active?: boolean
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          company_name?: string
          license_number?: string
          contact_email?: string
          contact_phone?: string
          provinces_states?: string[]
          white_label_domain?: string | null
          custom_branding?: Json | null
          is_active?: boolean
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          stripe_payment_method_id: string
          type: 'card' | 'bank_account'
          is_default: boolean
          last_four: string | null
          brand: string | null
          exp_month: number | null
          exp_year: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payment_method_id: string
          type: 'card' | 'bank_account'
          is_default?: boolean
          last_four?: string | null
          brand?: string | null
          exp_month?: number | null
          exp_year?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_payment_method_id?: string
          type?: 'card' | 'bank_account'
          is_default?: boolean
          last_four?: string | null
          brand?: string | null
          exp_month?: number | null
          exp_year?: number | null
          created_at?: string
        }
      }
      refunds: {
        Row: {
          id: string
          billing_history_id: string
          stripe_refund_id: string
          amount: number
          reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other'
          status: 'succeeded' | 'pending' | 'failed' | 'canceled'
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          billing_history_id: string
          stripe_refund_id: string
          amount: number
          reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other'
          status: 'succeeded' | 'pending' | 'failed' | 'canceled'
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          billing_history_id?: string
          stripe_refund_id?: string
          amount?: number
          reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other'
          status?: 'succeeded' | 'pending' | 'failed' | 'canceled'
          created_at?: string
          processed_at?: string | null
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