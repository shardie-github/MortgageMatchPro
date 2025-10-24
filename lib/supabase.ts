import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Enhanced client configuration for client-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'mortgagematch-pro@1.0.0'
    }
  }
})

// Enhanced admin client for server-side operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'X-Client-Info': 'mortgagematch-pro-admin@1.0.0'
    }
  }
})

// Realtime client for live updates
export const supabaseRealtime = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  }
})

// Edge function client for serverless functions
export const supabaseEdge = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  global: {
    headers: {
      'X-Client-Info': 'mortgagematch-pro-edge@1.0.0'
    }
  }
})

// Type exports
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
export type Insert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Update<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Utility types for better type safety
export type UserProfile = Tables<'users'>
export type MortgageCalculation = Tables<'mortgage_calculations'>
export type RateCheck = Tables<'rate_checks'>
export type Lead = Tables<'leads'>
export type Broker = Tables<'brokers'>
export type Subscription = Tables<'subscriptions'>
export type BillingHistory = Tables<'billing_history'>

// Enhanced error handling
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: string,
    public hint?: string
  ) {
    super(message)
    this.name = 'SupabaseError'
  }
}

// Connection health check
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1)
    
    return !error
  } catch {
    return false
  }
}

// Database performance monitoring
export async function getDatabaseStats() {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_database_stats')
    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to get database stats:', error)
    return null
  }
}