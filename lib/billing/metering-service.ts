import { getBillingAdapter } from './billing-service'
import { supabaseAdmin } from '../supabase'
import { 
  UsageEvent, 
  UsageSnapshot, 
  UsageEventType,
  QuotaExceededError 
} from '../types/billing'
import { OrganizationLimits } from '../types/tenancy'

export class MeteringService {
  private static billingAdapter = getBillingAdapter()

  /**
   * Record a usage event
   */
  static async recordUsage(
    organizationId: string,
    eventType: UsageEventType,
    quantity: number,
    unitPrice: number,
    metadata: Record<string, any> = {}
  ): Promise<UsageEvent> {
    try {
      const amount = quantity * unitPrice
      const currency = 'CAD' // Default currency

      const usageEvent = await this.billingAdapter.recordUsage({
        organizationId,
        eventType,
        quantity,
        unitPrice,
        amount,
        currency,
        metadata
      })

      // Update daily usage snapshot
      await this.updateDailySnapshot(organizationId, eventType, quantity, amount)

      return usageEvent
    } catch (error) {
      console.error('Record usage error:', error)
      throw error
    }
  }

  /**
   * Record AI call usage
   */
  static async recordAiCall(
    organizationId: string,
    tokens: number,
    model: string,
    costPerToken: number = 0.0001
  ): Promise<UsageEvent> {
    return this.recordUsage(
      organizationId,
      'ai_call',
      1,
      costPerToken * tokens,
      { model, tokens }
    )
  }

  /**
   * Record AI token usage
   */
  static async recordAiTokens(
    organizationId: string,
    tokens: number,
    model: string,
    costPerToken: number = 0.0001
  ): Promise<UsageEvent> {
    return this.recordUsage(
      organizationId,
      'ai_token',
      tokens,
      costPerToken,
      { model }
    )
  }

  /**
   * Record API call usage
   */
  static async recordApiCall(
    organizationId: string,
    endpoint: string,
    method: string,
    costPerCall: number = 0.001
  ): Promise<UsageEvent> {
    return this.recordUsage(
      organizationId,
      'api_call',
      1,
      costPerCall,
      { endpoint, method }
    )
  }

  /**
   * Record webhook delivery
   */
  static async recordWebhookDelivery(
    organizationId: string,
    webhookId: string,
    success: boolean,
    costPerDelivery: number = 0.01
  ): Promise<UsageEvent> {
    return this.recordUsage(
      organizationId,
      'webhook_delivery',
      1,
      costPerDelivery,
      { webhookId, success }
    )
  }

  /**
   * Record export usage
   */
  static async recordExport(
    organizationId: string,
    format: string,
    size: number,
    costPerExport: number = 0.05
  ): Promise<UsageEvent> {
    return this.recordUsage(
      organizationId,
      'export',
      1,
      costPerExport,
      { format, size }
    )
  }

  /**
   * Record storage usage
   */
  static async recordStorage(
    organizationId: string,
    sizeBytes: number,
    costPerGb: number = 0.1
  ): Promise<UsageEvent> {
    const sizeGb = sizeBytes / (1024 * 1024 * 1024)
    return this.recordUsage(
      organizationId,
      'storage',
      sizeGb,
      costPerGb,
      { sizeBytes }
    )
  }

  /**
   * Check if organization has exceeded a quota
   */
  static async checkQuota(
    organizationId: string,
    quotaType: keyof OrganizationLimits
  ): Promise<{ current: number; limit: number; exceeded: boolean }> {
    try {
      // Get organization limits
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('limits')
        .eq('id', organizationId)
        .single()

      if (!org) {
        throw new Error('Organization not found')
      }

      const limit = org.limits[quotaType]
      if (limit === -1) {
        // Unlimited
        return { current: 0, limit: -1, exceeded: false }
      }

      // Get current usage
      const current = await this.getCurrentUsage(organizationId, quotaType)

      return {
        current,
        limit,
        exceeded: current >= limit
      }
    } catch (error) {
      console.error('Check quota error:', error)
      throw error
    }
  }

  /**
   * Get current usage for a specific quota type
   */
  private static async getCurrentUsage(
    organizationId: string,
    quotaType: keyof OrganizationLimits
  ): Promise<number> {
    const today = new Date().toISOString().split('T')[0]

    switch (quotaType) {
      case 'maxUsers':
        const { count: userCount } = await supabaseAdmin
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'active')
        return userCount || 0

      case 'maxAiCallsPerDay':
        const { data: aiUsage } = await supabaseAdmin
          .from('usage_snapshots')
          .select('ai_calls')
          .eq('organization_id', organizationId)
          .eq('date', today)
          .single()
        return aiUsage?.ai_calls || 0

      case 'maxSavedScenarios':
        const { count: scenarioCount } = await supabaseAdmin
          .from('mortgage_calculations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
        return scenarioCount || 0

      case 'maxIntegrations':
        const { count: integrationCount } = await supabaseAdmin
          .from('integrations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
        return integrationCount || 0

      case 'maxWebhooks':
        const { count: webhookCount } = await supabaseAdmin
          .from('webhook_events')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
        return webhookCount || 0

      case 'maxApiKeys':
        const { count: apiKeyCount } = await supabaseAdmin
          .from('api_keys')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
        return apiKeyCount || 0

      default:
        return 0
    }
  }

  /**
   * Enforce quota limits
   */
  static async enforceQuota(
    organizationId: string,
    quotaType: keyof OrganizationLimits
  ): Promise<void> {
    const quota = await this.checkQuota(organizationId, quotaType)
    
    if (quota.exceeded) {
      throw new QuotaExceededError(
        `Quota exceeded for ${quotaType}`,
        quotaType,
        quota.current,
        quota.limit,
        organizationId
      )
    }
  }

  /**
   * Update daily usage snapshot
   */
  private static async updateDailySnapshot(
    organizationId: string,
    eventType: UsageEventType,
    quantity: number,
    amount: number
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get or create today's snapshot
      let { data: snapshot } = await supabaseAdmin
        .from('usage_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .single()

      if (!snapshot) {
        // Create new snapshot
        const { data: newSnapshot, error } = await supabaseAdmin
          .from('usage_snapshots')
          .insert({
            organization_id: organizationId,
            date: today,
            ai_calls: 0,
            ai_tokens: 0,
            api_calls: 0,
            webhook_deliveries: 0,
            exports: 0,
            storage_used: 0,
            cost: 0
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create usage snapshot: ${error.message}`)
        }

        snapshot = newSnapshot
      }

      // Update the snapshot
      const updates: any = {
        cost: (snapshot.cost || 0) + amount
      }

      switch (eventType) {
        case 'ai_call':
          updates.ai_calls = (snapshot.ai_calls || 0) + quantity
          break
        case 'ai_token':
          updates.ai_tokens = (snapshot.ai_tokens || 0) + quantity
          break
        case 'api_call':
          updates.api_calls = (snapshot.api_calls || 0) + quantity
          break
        case 'webhook_delivery':
          updates.webhook_deliveries = (snapshot.webhook_deliveries || 0) + quantity
          break
        case 'export':
          updates.exports = (snapshot.exports || 0) + quantity
          break
        case 'storage':
          updates.storage_used = (snapshot.storage_used || 0) + quantity
          break
      }

      const { error } = await supabaseAdmin
        .from('usage_snapshots')
        .update(updates)
        .eq('id', snapshot.id)

      if (error) {
        throw new Error(`Failed to update usage snapshot: ${error.message}`)
      }
    } catch (error) {
      console.error('Update daily snapshot error:', error)
      // Don't throw here as it's not critical for the main operation
    }
  }

  /**
   * Get usage summary for an organization
   */
  static async getUsageSummary(
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalCost: number
    totalAiCalls: number
    totalAiTokens: number
    totalApiCalls: number
    totalWebhookDeliveries: number
    totalExports: number
    totalStorage: number
    dailyBreakdown: Array<{
      date: string
      cost: number
      aiCalls: number
      aiTokens: number
      apiCalls: number
      webhookDeliveries: number
      exports: number
      storage: number
    }>
  }> {
    try {
      const { data: snapshots, error } = await supabaseAdmin
        .from('usage_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) {
        throw new Error(`Failed to get usage summary: ${error.message}`)
      }

      const dailyBreakdown = (snapshots || []).map(snapshot => ({
        date: snapshot.date,
        cost: snapshot.cost || 0,
        aiCalls: snapshot.ai_calls || 0,
        aiTokens: snapshot.ai_tokens || 0,
        apiCalls: snapshot.api_calls || 0,
        webhookDeliveries: snapshot.webhook_deliveries || 0,
        exports: snapshot.exports || 0,
        storage: snapshot.storage_used || 0
      }))

      const totalCost = dailyBreakdown.reduce((sum, day) => sum + day.cost, 0)
      const totalAiCalls = dailyBreakdown.reduce((sum, day) => sum + day.aiCalls, 0)
      const totalAiTokens = dailyBreakdown.reduce((sum, day) => sum + day.aiTokens, 0)
      const totalApiCalls = dailyBreakdown.reduce((sum, day) => sum + day.apiCalls, 0)
      const totalWebhookDeliveries = dailyBreakdown.reduce((sum, day) => sum + day.webhookDeliveries, 0)
      const totalExports = dailyBreakdown.reduce((sum, day) => sum + day.exports, 0)
      const totalStorage = dailyBreakdown.reduce((sum, day) => sum + day.storage, 0)

      return {
        totalCost,
        totalAiCalls,
        totalAiTokens,
        totalApiCalls,
        totalWebhookDeliveries,
        totalExports,
        totalStorage,
        dailyBreakdown
      }
    } catch (error) {
      console.error('Get usage summary error:', error)
      throw error
    }
  }

  /**
   * Get current month usage
   */
  static async getCurrentMonthUsage(organizationId: string) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    return this.getUsageSummary(
      organizationId,
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    )
  }

  /**
   * Get usage forecast based on current trends
   */
  static async getUsageForecast(organizationId: string, days: number = 30) {
    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

      const usage = await this.getUsageSummary(
        organizationId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )

      const avgDailyCost = usage.totalCost / days
      const forecast = {
        projectedCost: avgDailyCost * 30, // Next 30 days
        projectedAiCalls: (usage.totalAiCalls / days) * 30,
        projectedApiCalls: (usage.totalApiCalls / days) * 30,
        trend: avgDailyCost > 0 ? 'increasing' : 'stable'
      }

      return forecast
    } catch (error) {
      console.error('Get usage forecast error:', error)
      throw error
    }
  }
}