import { supabase, supabaseAdmin, supabaseRealtime, Tables, Insert, Update } from './supabase'
import { createClient } from 'redis'

// Redis client for caching
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

redis.on('error', (err) => console.log('Redis Client Error', err))
redis.connect()

// Cache configuration
const CACHE_TTL = {
  USER_PROFILE: 300, // 5 minutes
  MORTGAGE_CALCULATIONS: 600, // 10 minutes
  RATE_CHECKS: 3600, // 1 hour
  BROKERS: 1800, // 30 minutes
  LEADS: 300, // 5 minutes
  SUBSCRIPTIONS: 600, // 10 minutes
  ANALYTICS: 60, // 1 minute
}

// Enhanced database service with caching, optimization, and error handling
export class DatabaseService {
  // User operations
  static async getUserProfile(userId: string): Promise<Tables<'users'> | null> {
    const cacheKey = `user:${userId}`
    
    try {
      // Try cache first
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      // Cache the result
      if (data) {
        await redis.setEx(cacheKey, CACHE_TTL.USER_PROFILE, JSON.stringify(data))
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  static async updateUserProfile(userId: string, updates: Update<'users'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)

      if (error) throw error

      // Invalidate cache
      await redis.del(`user:${userId}`)
      return true
    } catch (error) {
      console.error('Error updating user profile:', error)
      return false
    }
  }

  // Mortgage calculations with advanced querying
  static async getMortgageCalculations(
    userId: string,
    options: {
      limit?: number
      offset?: number
      country?: string
      sortBy?: 'created_at' | 'property_price' | 'monthly_payment'
      sortOrder?: 'asc' | 'desc'
    } = {}
  ): Promise<Tables<'mortgage_calculations'>[]> {
    const {
      limit = 50,
      offset = 0,
      country,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    const cacheKey = `calculations:${userId}:${JSON.stringify(options)}`

    try {
      // Try cache first
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      let query = supabase
        .from('mortgage_calculations')
        .select('*')
        .eq('user_id', userId)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1)

      if (country) {
        query = query.eq('country', country)
      }

      const { data, error } = await query

      if (error) throw error

      // Cache the result
      if (data) {
        await redis.setEx(cacheKey, CACHE_TTL.MORTGAGE_CALCULATIONS, JSON.stringify(data))
      }

      return data || []
    } catch (error) {
      console.error('Error fetching mortgage calculations:', error)
      return []
    }
  }

  static async saveMortgageCalculation(calculation: Insert<'mortgage_calculations'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('mortgage_calculations')
        .insert(calculation)
        .select('id')
        .single()

      if (error) throw error

      // Invalidate user's calculation cache
      if (calculation.user_id) {
        const pattern = `calculations:${calculation.user_id}:*`
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }

      return data?.id || null
    } catch (error) {
      console.error('Error saving mortgage calculation:', error)
      return null
    }
  }

  // Rate checks with intelligent caching
  static async getRateChecks(
    userId: string,
    options: {
      country?: string
      rateType?: string
      limit?: number
    } = {}
  ): Promise<Tables<'rate_checks'>[]> {
    const { country, rateType, limit = 20 } = options
    const cacheKey = `rate_checks:${userId}:${JSON.stringify(options)}`

    try {
      // Try cache first
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      let query = supabase
        .from('rate_checks')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit)

      if (country) query = query.eq('country', country)
      if (rateType) query = query.eq('rate_type', rateType)

      const { data, error } = await query

      if (error) throw error

      // Cache the result
      if (data) {
        await redis.setEx(cacheKey, CACHE_TTL.RATE_CHECKS, JSON.stringify(data))
      }

      return data || []
    } catch (error) {
      console.error('Error fetching rate checks:', error)
      return []
    }
  }

  static async saveRateCheck(rateCheck: Insert<'rate_checks'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('rate_checks')
        .insert(rateCheck)
        .select('id')
        .single()

      if (error) throw error

      // Invalidate user's rate check cache
      if (rateCheck.user_id) {
        const pattern = `rate_checks:${rateCheck.user_id}:*`
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }

      return data?.id || null
    } catch (error) {
      console.error('Error saving rate check:', error)
      return null
    }
  }

  // Lead management with advanced filtering
  static async getLeads(
    userId: string,
    options: {
      status?: string
      brokerId?: string
      limit?: number
      offset?: number
      sortBy?: 'created_at' | 'lead_score' | 'updated_at'
      sortOrder?: 'asc' | 'desc'
    } = {}
  ): Promise<Tables<'leads'>[]> {
    const {
      status,
      brokerId,
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    const cacheKey = `leads:${userId}:${JSON.stringify(options)}`

    try {
      // Try cache first
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      let query = supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1)

      if (status) query = query.eq('status', status)
      if (brokerId) query = query.eq('broker_id', brokerId)

      const { data, error } = await query

      if (error) throw error

      // Cache the result
      if (data) {
        await redis.setEx(cacheKey, CACHE_TTL.LEADS, JSON.stringify(data))
      }

      return data || []
    } catch (error) {
      console.error('Error fetching leads:', error)
      return []
    }
  }

  static async saveLead(lead: Insert<'leads'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert(lead)
        .select('id')
        .single()

      if (error) throw error

      // Invalidate user's lead cache
      if (lead.user_id) {
        const pattern = `leads:${lead.user_id}:*`
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }

      return data?.id || null
    } catch (error) {
      console.error('Error saving lead:', error)
      return null
    }
  }

  // Broker operations
  static async getBrokers(options: {
    isActive?: boolean
    provincesStates?: string[]
    limit?: number
  } = {}): Promise<Tables<'brokers'>[]> {
    const { isActive = true, provincesStates, limit = 100 } = options
    const cacheKey = `brokers:${JSON.stringify(options)}`

    try {
      // Try cache first
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      let query = supabase
        .from('brokers')
        .select('*')
        .eq('is_active', isActive)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (provincesStates && provincesStates.length > 0) {
        query = query.overlaps('provinces_states', provincesStates)
      }

      const { data, error } = await query

      if (error) throw error

      // Cache the result
      if (data) {
        await redis.setEx(cacheKey, CACHE_TTL.BROKERS, JSON.stringify(data))
      }

      return data || []
    } catch (error) {
      console.error('Error fetching brokers:', error)
      return []
    }
  }

  // Subscription management
  static async getUserSubscription(userId: string): Promise<Tables<'subscriptions'> | null> {
    const cacheKey = `subscription:${userId}`

    try {
      // Try cache first
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') throw error

      // Cache the result
      if (data) {
        await redis.setEx(cacheKey, CACHE_TTL.SUBSCRIPTIONS, JSON.stringify(data))
      }

      return data
    } catch (error) {
      console.error('Error fetching user subscription:', error)
      return null
    }
  }

  // Analytics and reporting
  static async getUserAnalytics(userId: string): Promise<any> {
    const cacheKey = `analytics:${userId}`

    try {
      // Try cache first
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      // Get comprehensive user analytics
      const [calculations, rateChecks, leads, subscription] = await Promise.all([
        supabase
          .from('mortgage_calculations')
          .select('id, created_at, country, property_price, monthly_payment')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('rate_checks')
          .select('id, created_at, country, rate_type')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('leads')
          .select('id, created_at, status, lead_score')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
        this.getUserSubscription(userId)
      ])

      const analytics = {
        totalCalculations: calculations.data?.length || 0,
        totalRateChecks: rateChecks.data?.length || 0,
        totalLeads: leads.data?.length || 0,
        subscriptionTier: subscription?.tier || 'free',
        recentActivity: [
          ...(calculations.data || []).map(c => ({ ...c, type: 'calculation' })),
          ...(rateChecks.data || []).map(r => ({ ...r, type: 'rate_check' })),
          ...(leads.data || []).map(l => ({ ...l, type: 'lead' }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }

      // Cache the result
      await redis.setEx(cacheKey, CACHE_TTL.ANALYTICS, JSON.stringify(analytics))

      return analytics
    } catch (error) {
      console.error('Error fetching user analytics:', error)
      return null
    }
  }

  // Realtime subscriptions
  static subscribeToUserUpdates(userId: string, callback: (payload: any) => void) {
    return supabaseRealtime
      .channel(`user:${userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'mortgage_calculations',
          filter: `user_id=eq.${userId}`
        }, 
        callback
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'leads',
          filter: `user_id=eq.${userId}`
        }, 
        callback
      )
      .subscribe()
  }

  // Batch operations for better performance
  static async batchInsertMortgageCalculations(calculations: Insert<'mortgage_calculations'>[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mortgage_calculations')
        .insert(calculations)

      if (error) throw error

      // Invalidate caches for all affected users
      const userIds = [...new Set(calculations.map(c => c.user_id))]
      for (const userId of userIds) {
        const pattern = `calculations:${userId}:*`
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }

      return true
    } catch (error) {
      console.error('Error batch inserting mortgage calculations:', error)
      return false
    }
  }

  // Database health and performance monitoring
  static async getDatabaseHealth(): Promise<any> {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_database_health')
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching database health:', error)
      return null
    }
  }

  // Cleanup expired data
  static async cleanupExpiredData(): Promise<void> {
    try {
      // Clean up expired rate checks
      await supabaseAdmin
        .from('rate_checks')
        .delete()
        .lt('expires_at', new Date().toISOString())

      // Clean up old audit logs (older than 90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      
      await supabaseAdmin
        .from('comprehensive_audit_logs')
        .delete()
        .lt('timestamp', ninetyDaysAgo.toISOString())

      console.log('Expired data cleanup completed')
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }
}

// Export singleton instance
export const db = DatabaseService