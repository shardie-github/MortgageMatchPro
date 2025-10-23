import { supabaseAdmin } from '../supabase'
import { z } from 'zod'
import crypto from 'crypto'

// API Tier and Pricing Types
export type ApiTier = 'free' | 'basic' | 'pro' | 'enterprise'
export type ApiEndpoint = 'affordability' | 'rate_search' | 'scenario_simulation' | 'underwriting_score' | 'lead_generation'

export interface ApiPricing {
  tier: ApiTier
  monthlyCalls: number
  pricePerCall: number
  monthlyFee: number
  features: string[]
  rateLimitPerMinute: number
  rateLimitPerDay: number
}

export interface ApiKey {
  id: string
  userId: string
  keyName: string
  keyHash: string
  keyPrefix: string
  tier: ApiTier
  permissions: string[]
  rateLimitPerMinute: number
  rateLimitPerDay: number
  isActive: boolean
  lastUsedAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface ApiUsage {
  id: string
  apiKeyId: string
  endpoint: string
  method: string
  statusCode: number
  responseTimeMs: number
  requestSizeBytes: number
  responseSizeBytes: number
  costUsd: number
  metadata: Record<string, any>
  createdAt: string
}

export interface ApiSubscription {
  id: string
  userId: string
  tier: ApiTier
  status: 'active' | 'canceled' | 'suspended' | 'expired'
  currentPeriodStart: string
  currentPeriodEnd: string
  monthlyCallsUsed: number
  monthlyCallsLimit: number
  createdAt: string
  updatedAt: string
}

// API Marketplace Service
export class ApiMarketplaceService {
  private pricing: Record<ApiTier, ApiPricing> = {
    free: {
      tier: 'free',
      monthlyCalls: 100,
      pricePerCall: 0,
      monthlyFee: 0,
      features: ['Basic affordability calculation', 'Rate search (limited)', 'Basic support'],
      rateLimitPerMinute: 10,
      rateLimitPerDay: 100,
    },
    basic: {
      tier: 'basic',
      monthlyCalls: 1000,
      pricePerCall: 0.05,
      monthlyFee: 29,
      features: ['All free features', 'Advanced rate search', 'Scenario simulation', 'Email support'],
      rateLimitPerMinute: 60,
      rateLimitPerDay: 1000,
    },
    pro: {
      tier: 'pro',
      monthlyCalls: 10000,
      pricePerCall: 0.03,
      monthlyFee: 99,
      features: ['All basic features', 'Underwriting scoring', 'Lead generation', 'Priority support', 'Webhooks'],
      rateLimitPerMinute: 300,
      rateLimitPerDay: 10000,
    },
    enterprise: {
      tier: 'enterprise',
      monthlyCalls: 100000,
      pricePerCall: 0.01,
      monthlyFee: 299,
      features: ['All pro features', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'Custom rate limits'],
      rateLimitPerMinute: 1000,
      rateLimitPerDay: 100000,
    },
  }

  // Generate API key
  async generateApiKey(data: {
    userId: string
    keyName: string
    tier: ApiTier
    permissions: string[]
  }): Promise<{
    success: boolean
    apiKey?: string
    keyId?: string
    error?: string
  }> {
    try {
      // Generate secure API key
      const apiKey = `mm_${crypto.randomBytes(32).toString('hex')}`
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
      const keyPrefix = apiKey.substring(0, 8)

      // Get pricing for tier
      const pricing = this.pricing[data.tier]

      // Store in database
      const { data: keyData, error } = await supabaseAdmin
        .from('api_keys')
        .insert({
          user_id: data.userId,
          key_name: data.keyName,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          tier: data.tier,
          permissions: data.permissions,
          rate_limit_per_minute: pricing.rateLimitPerMinute,
          rate_limit_per_day: pricing.rateLimitPerDay,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return {
        success: true,
        apiKey,
        keyId: keyData.id,
      }
    } catch (error) {
      console.error('API key generation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API key generation failed',
      }
    }
  }

  // Validate API key and check rate limits
  async validateApiKey(apiKey: string): Promise<{
    success: boolean
    keyData?: ApiKey
    error?: string
  }> {
    try {
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return {
          success: false,
          error: 'Invalid API key',
        }
      }

      // Check if key is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return {
          success: false,
          error: 'API key expired',
        }
      }

      return {
        success: true,
        keyData: data as ApiKey,
      }
    } catch (error) {
      console.error('API key validation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API key validation failed',
      }
    }
  }

  // Check rate limits
  async checkRateLimit(apiKeyId: string, endpoint: string): Promise<{
    success: boolean
    allowed: boolean
    resetTime?: string
    error?: string
  }> {
    try {
      const now = new Date()
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Get key data
      const { data: keyData, error: keyError } = await supabaseAdmin
        .from('api_keys')
        .select('rate_limit_per_minute, rate_limit_per_day')
        .eq('id', apiKeyId)
        .single()

      if (keyError || !keyData) {
        return {
          success: false,
          allowed: false,
          error: 'API key not found',
        }
      }

      // Check minute rate limit
      const { count: minuteCount } = await supabaseAdmin
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', apiKeyId)
        .gte('created_at', oneMinuteAgo.toISOString())

      if (minuteCount && minuteCount >= keyData.rate_limit_per_minute) {
        return {
          success: true,
          allowed: false,
          resetTime: new Date(now.getTime() + 60 * 1000).toISOString(),
        }
      }

      // Check daily rate limit
      const { count: dayCount } = await supabaseAdmin
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', apiKeyId)
        .gte('created_at', oneDayAgo.toISOString())

      if (dayCount && dayCount >= keyData.rate_limit_per_day) {
        return {
          success: true,
          allowed: false,
          resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        }
      }

      return {
        success: true,
        allowed: true,
      }
    } catch (error) {
      console.error('Rate limit check failed:', error)
      return {
        success: false,
        allowed: false,
        error: error instanceof Error ? error.message : 'Rate limit check failed',
      }
    }
  }

  // Record API usage
  async recordUsage(data: {
    apiKeyId: string
    endpoint: string
    method: string
    statusCode: number
    responseTimeMs: number
    requestSizeBytes: number
    responseSizeBytes: number
    metadata?: Record<string, any>
  }): Promise<{
    success: boolean
    usageId?: string
    cost?: number
    error?: string
  }> {
    try {
      // Get key data for pricing
      const { data: keyData, error: keyError } = await supabaseAdmin
        .from('api_keys')
        .select('tier')
        .eq('id', data.apiKeyId)
        .single()

      if (keyError || !keyData) {
        throw new Error('API key not found')
      }

      // Calculate cost
      const pricing = this.pricing[keyData.tier as ApiTier]
      const cost = pricing.pricePerCall

      // Record usage
      const { data: usageData, error } = await supabaseAdmin
        .from('api_usage')
        .insert({
          api_key_id: data.apiKeyId,
          endpoint: data.endpoint,
          method: data.method,
          status_code: data.statusCode,
          response_time_ms: data.responseTimeMs,
          request_size_bytes: data.requestSizeBytes,
          response_size_bytes: data.responseSizeBytes,
          cost_usd: cost,
          metadata: data.metadata || {},
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      // Update last used timestamp
      await supabaseAdmin
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.apiKeyId)

      return {
        success: true,
        usageId: usageData.id,
        cost,
      }
    } catch (error) {
      console.error('Usage recording failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Usage recording failed',
      }
    }
  }

  // Get API usage statistics
  async getUsageStats(apiKeyId: string, startDate: string, endDate: string): Promise<{
    success: boolean
    stats?: {
      totalCalls: number
      totalCost: number
      averageResponseTime: number
      successRate: number
      callsByEndpoint: Record<string, number>
      callsByDay: Record<string, number>
    }
    error?: string
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('api_usage')
        .select('*')
        .eq('api_key_id', apiKeyId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const usage = data || []
      const totalCalls = usage.length
      const totalCost = usage.reduce((sum, u) => sum + u.cost_usd, 0)
      const averageResponseTime = usage.reduce((sum, u) => sum + u.response_time_ms, 0) / totalCalls
      const successfulCalls = usage.filter(u => u.status_code >= 200 && u.status_code < 300).length
      const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0

      // Group by endpoint
      const callsByEndpoint = usage.reduce((acc, u) => {
        acc[u.endpoint] = (acc[u.endpoint] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Group by day
      const callsByDay = usage.reduce((acc, u) => {
        const day = u.created_at.split('T')[0]
        acc[day] = (acc[day] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        success: true,
        stats: {
          totalCalls,
          totalCost,
          averageResponseTime,
          successRate,
          callsByEndpoint,
          callsByDay,
        },
      }
    } catch (error) {
      console.error('Get usage stats failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get usage stats failed',
      }
    }
  }

  // Get user's API keys
  async getUserApiKeys(userId: string): Promise<{
    success: boolean
    keys?: ApiKey[]
    error?: string
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return {
        success: true,
        keys: data || [],
      }
    } catch (error) {
      console.error('Get user API keys failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get user API keys failed',
      }
    }
  }

  // Update API key
  async updateApiKey(apiKeyId: string, updates: Partial<ApiKey>): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await supabaseAdmin
        .from('api_keys')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', apiKeyId)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Update API key failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update API key failed',
      }
    }
  }

  // Delete API key
  async deleteApiKey(apiKeyId: string, userId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await supabaseAdmin
        .from('api_keys')
        .delete()
        .eq('id', apiKeyId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Delete API key failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete API key failed',
      }
    }
  }

  // Get pricing information
  getPricing(): Record<ApiTier, ApiPricing> {
    return this.pricing
  }

  // Calculate monthly bill
  async calculateMonthlyBill(userId: string, month: string): Promise<{
    success: boolean
    bill?: {
      subscriptionFee: number
      usageCost: number
      totalCost: number
      callsUsed: number
      callsIncluded: number
      overageCalls: number
      overageCost: number
    }
    error?: string
  }> {
    try {
      // Get user's subscription
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('user_entitlements')
        .select('api_tier, monthly_api_calls')
        .eq('user_id', userId)
        .single()

      if (subError || !subscription) {
        throw new Error('User subscription not found')
      }

      const pricing = this.pricing[subscription.api_tier as ApiTier]
      const startDate = new Date(month + '-01')
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

      // Get usage for the month
      const { data: usage, error: usageError } = await supabaseAdmin
        .from('api_usage')
        .select('cost_usd')
        .eq('api_key_id', '') // This would need to be filtered by user's keys
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (usageError) {
        throw new Error(`Database error: ${usageError.message}`)
      }

      const callsUsed = usage?.length || 0
      const usageCost = usage?.reduce((sum, u) => sum + u.cost_usd, 0) || 0
      const callsIncluded = pricing.monthlyCalls
      const overageCalls = Math.max(0, callsUsed - callsIncluded)
      const overageCost = overageCalls * pricing.pricePerCall

      return {
        success: true,
        bill: {
          subscriptionFee: pricing.monthlyFee,
          usageCost,
          totalCost: pricing.monthlyFee + usageCost + overageCost,
          callsUsed,
          callsIncluded,
          overageCalls,
          overageCost,
        },
      }
    } catch (error) {
      console.error('Calculate monthly bill failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculate monthly bill failed',
      }
    }
  }

  // Create API subscription
  async createSubscription(userId: string, tier: ApiTier): Promise<{
    success: boolean
    subscriptionId?: string
    error?: string
  }> {
    try {
      const pricing = this.pricing[tier]
      const now = new Date()
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

      const { data, error } = await supabaseAdmin
        .from('user_entitlements')
        .upsert({
          user_id: userId,
          api_tier: tier,
          monthly_api_calls: pricing.monthlyCalls,
          api_calls_used: 0,
          reset_date: nextMonth.toISOString().split('T')[0],
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return {
        success: true,
        subscriptionId: data.id,
      }
    } catch (error) {
      console.error('Create subscription failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Create subscription failed',
      }
    }
  }
}

// Factory function
export function createApiMarketplaceService(): ApiMarketplaceService {
  return new ApiMarketplaceService()
}
