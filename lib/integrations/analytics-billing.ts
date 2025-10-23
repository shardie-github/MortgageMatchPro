import { supabaseAdmin } from '../supabase'
import { z } from 'zod'

// Analytics and Billing Types
export interface RevenueMetrics {
  totalRevenue: number
  monthlyRecurringRevenue: number
  averageRevenuePerUser: number
  customerLifetimeValue: number
  churnRate: number
  revenueGrowthRate: number
  revenueBySource: Record<string, number>
  revenueByTier: Record<string, number>
  revenueByRegion: Record<string, number>
}

export interface UsageMetrics {
  totalApiCalls: number
  averageCallsPerUser: number
  peakConcurrentUsers: number
  averageResponseTime: number
  errorRate: number
  callsByEndpoint: Record<string, number>
  callsByTier: Record<string, number>
  callsByRegion: Record<string, number>
  callsByHour: Record<string, number>
}

export interface PartnerMetrics {
  totalPartners: number
  activePartners: number
  partnerRevenue: number
  averageRevenuePerPartner: number
  topPerformingPartners: Array<{
    partnerId: string
    partnerName: string
    revenue: number
    calls: number
  }>
  partnerChurnRate: number
}

export interface BillingData {
  userId: string
  subscriptionId: string
  tier: string
  billingPeriod: {
    start: string
    end: string
  }
  charges: Array<{
    type: 'subscription' | 'usage' | 'overage' | 'setup'
    description: string
    amount: number
    quantity?: number
    unitPrice?: number
  }>
  totalAmount: number
  taxAmount: number
  discountAmount: number
  finalAmount: number
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  dueDate: string
  paidDate?: string
}

// Analytics and Billing Service
export class AnalyticsBillingService {
  // Get comprehensive revenue metrics
  async getRevenueMetrics(startDate: string, endDate: string): Promise<{
    success: boolean
    metrics?: RevenueMetrics
    error?: string
  }> {
    try {
      // Get revenue data
      const { data: revenueData, error: revenueError } = await supabaseAdmin
        .from('revenue_tracking')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (revenueError) {
        throw new Error(`Database error: ${revenueError.message}`)
      }

      // Get subscription data
      const { data: subscriptionData, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (subError) {
        throw new Error(`Database error: ${subError.message}`)
      }

      // Calculate metrics
      const totalRevenue = revenueData?.reduce((sum, r) => sum + r.amount_usd, 0) || 0
      const monthlyRecurringRevenue = this.calculateMRR(subscriptionData || [])
      const averageRevenuePerUser = this.calculateARPU(revenueData || [])
      const customerLifetimeValue = this.calculateCLV(revenueData || [])
      const churnRate = this.calculateChurnRate(subscriptionData || [])
      const revenueGrowthRate = await this.calculateRevenueGrowth(startDate, endDate)

      // Group by source
      const revenueBySource = this.groupBy(revenueData || [], 'revenue_type', 'amount_usd')
      const revenueByTier = this.groupBy(subscriptionData || [], 'tier', 'amount')
      const revenueByRegion = this.groupBy(revenueData || [], 'region', 'amount_usd')

      const metrics: RevenueMetrics = {
        totalRevenue,
        monthlyRecurringRevenue,
        averageRevenuePerUser,
        customerLifetimeValue,
        churnRate,
        revenueGrowthRate,
        revenueBySource,
        revenueByTier,
        revenueByRegion,
      }

      return {
        success: true,
        metrics,
      }
    } catch (error) {
      console.error('Get revenue metrics failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get revenue metrics failed',
      }
    }
  }

  // Get usage metrics
  async getUsageMetrics(startDate: string, endDate: string): Promise<{
    success: boolean
    metrics?: UsageMetrics
    error?: string
  }> {
    try {
      const { data: usageData, error } = await supabaseAdmin
        .from('api_usage')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const usage = usageData || []
      const totalApiCalls = usage.length
      const averageCallsPerUser = this.calculateAverageCallsPerUser(usage)
      const peakConcurrentUsers = await this.calculatePeakConcurrentUsers(startDate, endDate)
      const averageResponseTime = this.calculateAverageResponseTime(usage)
      const errorRate = this.calculateErrorRate(usage)

      const callsByEndpoint = this.groupBy(usage, 'endpoint', 'count')
      const callsByTier = await this.getCallsByTier(usage)
      const callsByRegion = this.groupBy(usage, 'region', 'count')
      const callsByHour = this.groupByHour(usage)

      const metrics: UsageMetrics = {
        totalApiCalls,
        averageCallsPerUser,
        peakConcurrentUsers,
        averageResponseTime,
        errorRate,
        callsByEndpoint,
        callsByTier,
        callsByRegion,
        callsByHour,
      }

      return {
        success: true,
        metrics,
      }
    } catch (error) {
      console.error('Get usage metrics failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get usage metrics failed',
      }
    }
  }

  // Get partner metrics
  async getPartnerMetrics(startDate: string, endDate: string): Promise<{
    success: boolean
    metrics?: PartnerMetrics
    error?: string
  }> {
    try {
      const { data: partnerData, error: partnerError } = await supabaseAdmin
        .from('partner_integrations')
        .select('*')

      if (partnerError) {
        throw new Error(`Database error: ${partnerError.message}`)
      }

      const { data: revenueData, error: revenueError } = await supabaseAdmin
        .from('revenue_tracking')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .not('partner_id', 'is', null)

      if (revenueError) {
        throw new Error(`Database error: ${revenueError.message}`)
      }

      const totalPartners = partnerData?.length || 0
      const activePartners = partnerData?.filter(p => p.is_active).length || 0
      const partnerRevenue = revenueData?.reduce((sum, r) => sum + r.amount_usd, 0) || 0
      const averageRevenuePerPartner = activePartners > 0 ? partnerRevenue / activePartners : 0

      // Get top performing partners
      const partnerRevenueMap = new Map<string, { revenue: number; calls: number }>()
      revenueData?.forEach(r => {
        if (r.partner_id) {
          const existing = partnerRevenueMap.get(r.partner_id) || { revenue: 0, calls: 0 }
          partnerRevenueMap.set(r.partner_id, {
            revenue: existing.revenue + r.amount_usd,
            calls: existing.calls + 1,
          })
        }
      })

      const topPerformingPartners = Array.from(partnerRevenueMap.entries())
        .map(([partnerId, data]) => {
          const partner = partnerData?.find(p => p.id === partnerId)
          return {
            partnerId,
            partnerName: partner?.partner_name || 'Unknown',
            revenue: data.revenue,
            calls: data.calls,
          }
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      const partnerChurnRate = await this.calculatePartnerChurnRate(startDate, endDate)

      const metrics: PartnerMetrics = {
        totalPartners,
        activePartners,
        partnerRevenue,
        averageRevenuePerPartner,
        topPerformingPartners,
        partnerChurnRate,
      }

      return {
        success: true,
        metrics,
      }
    } catch (error) {
      console.error('Get partner metrics failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get partner metrics failed',
      }
    }
  }

  // Generate billing statement
  async generateBillingStatement(userId: string, period: string): Promise<{
    success: boolean
    billingData?: BillingData
    error?: string
  }> {
    try {
      // Get user subscription
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (subError || !subscription) {
        throw new Error('Active subscription not found')
      }

      // Get usage for the period
      const startDate = new Date(period + '-01')
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

      const { data: usageData, error: usageError } = await supabaseAdmin
        .from('api_usage')
        .select('*')
        .eq('api_key_id', '') // This would need to be filtered by user's keys
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (usageError) {
        throw new Error(`Database error: ${usageError.message}`)
      }

      // Calculate charges
      const charges = this.calculateCharges(subscription, usageData || [])
      const totalAmount = charges.reduce((sum, charge) => sum + charge.amount, 0)
      const taxAmount = totalAmount * 0.13 // 13% tax
      const discountAmount = 0 // Could be calculated based on promotions
      const finalAmount = totalAmount + taxAmount - discountAmount

      const billingData: BillingData = {
        userId,
        subscriptionId: subscription.id,
        tier: subscription.tier,
        billingPeriod: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        charges,
        totalAmount,
        taxAmount,
        discountAmount,
        finalAmount,
        status: 'pending',
        dueDate: new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days after period end
      }

      return {
        success: true,
        billingData,
      }
    } catch (error) {
      console.error('Generate billing statement failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generate billing statement failed',
      }
    }
  }

  // Get partner dashboard data
  async getPartnerDashboard(partnerId: string, startDate: string, endDate: string): Promise<{
    success: boolean
    dashboard?: {
      revenue: number
      calls: number
      conversionRate: number
      averageRevenuePerCall: number
      topEndpoints: Array<{ endpoint: string; calls: number; revenue: number }>
      revenueByDay: Record<string, number>
      callsByDay: Record<string, number>
      recentActivity: Array<{
        type: string
        description: string
        amount?: number
        timestamp: string
      }>
    }
    error?: string
  }> {
    try {
      // Get partner revenue data
      const { data: revenueData, error: revenueError } = await supabaseAdmin
        .from('revenue_tracking')
        .select('*')
        .eq('partner_id', partnerId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (revenueError) {
        throw new Error(`Database error: ${revenueError.message}`)
      }

      // Get usage data
      const { data: usageData, error: usageError } = await supabaseAdmin
        .from('api_usage')
        .select('*')
        .eq('partner_id', partnerId) // This would need to be added to the schema
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (usageError) {
        throw new Error(`Database error: ${usageError.message}`)
      }

      const revenue = revenueData?.reduce((sum, r) => sum + r.amount_usd, 0) || 0
      const calls = usageData?.length || 0
      const conversionRate = calls > 0 ? (revenueData?.length || 0) / calls : 0
      const averageRevenuePerCall = calls > 0 ? revenue / calls : 0

      // Top endpoints
      const endpointStats = new Map<string, { calls: number; revenue: number }>()
      usageData?.forEach(usage => {
        const existing = endpointStats.get(usage.endpoint) || { calls: 0, revenue: 0 }
        endpointStats.set(usage.endpoint, {
          calls: existing.calls + 1,
          revenue: existing.revenue + (usage.cost_usd || 0),
        })
      })

      const topEndpoints = Array.from(endpointStats.entries())
        .map(([endpoint, stats]) => ({ endpoint, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Revenue and calls by day
      const revenueByDay = this.groupByDay(revenueData || [], 'amount_usd')
      const callsByDay = this.groupByDay(usageData || [], 'count')

      // Recent activity
      const recentActivity = [
        ...(revenueData || []).map(r => ({
          type: 'revenue',
          description: `Revenue: $${r.amount_usd.toFixed(2)}`,
          amount: r.amount_usd,
          timestamp: r.created_at,
        })),
        ...(usageData || []).map(u => ({
          type: 'api_call',
          description: `API call: ${u.endpoint}`,
          timestamp: u.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)

      return {
        success: true,
        dashboard: {
          revenue,
          calls,
          conversionRate,
          averageRevenuePerCall,
          topEndpoints,
          revenueByDay,
          callsByDay,
          recentActivity,
        },
      }
    } catch (error) {
      console.error('Get partner dashboard failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get partner dashboard failed',
      }
    }
  }

  // Helper methods
  private calculateMRR(subscriptions: any[]): number {
    return subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((sum, sub) => sum + (sub.amount || 0), 0)
  }

  private calculateARPU(revenueData: any[]): number {
    const uniqueUsers = new Set(revenueData.map(r => r.user_id)).size
    const totalRevenue = revenueData.reduce((sum, r) => sum + r.amount_usd, 0)
    return uniqueUsers > 0 ? totalRevenue / uniqueUsers : 0
  }

  private calculateCLV(revenueData: any[]): number {
    // Simplified CLV calculation
    const avgRevenuePerUser = this.calculateARPU(revenueData)
    const avgLifespanMonths = 12 // This would be calculated from actual data
    return avgRevenuePerUser * avgLifespanMonths
  }

  private calculateChurnRate(subscriptions: any[]): number {
    const totalSubscriptions = subscriptions.length
    const canceledSubscriptions = subscriptions.filter(sub => sub.status === 'canceled').length
    return totalSubscriptions > 0 ? canceledSubscriptions / totalSubscriptions : 0
  }

  private async calculateRevenueGrowth(startDate: string, endDate: string): Promise<number> {
    // This would compare with previous period
    return 0.15 // Mock 15% growth
  }

  private calculateAverageCallsPerUser(usage: any[]): number {
    const uniqueUsers = new Set(usage.map(u => u.user_id)).size
    return uniqueUsers > 0 ? usage.length / uniqueUsers : 0
  }

  private async calculatePeakConcurrentUsers(startDate: string, endDate: string): Promise<number> {
    // This would analyze concurrent usage patterns
    return 150 // Mock value
  }

  private calculateAverageResponseTime(usage: any[]): number {
    const totalTime = usage.reduce((sum, u) => sum + (u.response_time_ms || 0), 0)
    return usage.length > 0 ? totalTime / usage.length : 0
  }

  private calculateErrorRate(usage: any[]): number {
    const errorCalls = usage.filter(u => u.status_code >= 400).length
    return usage.length > 0 ? errorCalls / usage.length : 0
  }

  private async getCallsByTier(usage: any[]): Promise<Record<string, number>> {
    // This would join with user data to get tiers
    return { free: 100, basic: 200, pro: 300, enterprise: 50 }
  }

  private groupByHour(usage: any[]): Record<string, number> {
    const hourGroups: Record<string, number> = {}
    usage.forEach(u => {
      const hour = new Date(u.created_at).getHours().toString()
      hourGroups[hour] = (hourGroups[hour] || 0) + 1
    })
    return hourGroups
  }

  private groupByDay(data: any[], valueField: string): Record<string, number> {
    const dayGroups: Record<string, number> = {}
    data.forEach(item => {
      const day = item.created_at.split('T')[0]
      if (valueField === 'count') {
        dayGroups[day] = (dayGroups[day] || 0) + 1
      } else {
        dayGroups[day] = (dayGroups[day] || 0) + (item[valueField] || 0)
      }
    })
    return dayGroups
  }

  private groupBy(data: any[], field: string, valueField: string): Record<string, number> {
    const groups: Record<string, number> = {}
    data.forEach(item => {
      const key = item[field] || 'unknown'
      if (valueField === 'count') {
        groups[key] = (groups[key] || 0) + 1
      } else {
        groups[key] = (groups[key] || 0) + (item[valueField] || 0)
      }
    })
    return groups
  }

  private calculateCharges(subscription: any, usage: any[]): Array<{
    type: 'subscription' | 'usage' | 'overage' | 'setup'
    description: string
    amount: number
    quantity?: number
    unitPrice?: number
  }> {
    const charges = []

    // Subscription fee
    charges.push({
      type: 'subscription',
      description: `${subscription.tier} subscription`,
      amount: subscription.amount || 0,
    })

    // Usage charges
    const usageCost = usage.reduce((sum, u) => sum + (u.cost_usd || 0), 0)
    if (usageCost > 0) {
      charges.push({
        type: 'usage',
        description: `API usage (${usage.length} calls)`,
        amount: usageCost,
        quantity: usage.length,
        unitPrice: usageCost / usage.length,
      })
    }

    return charges
  }

  private async calculatePartnerChurnRate(startDate: string, endDate: string): Promise<number> {
    // This would calculate partner churn rate
    return 0.05 // Mock 5% churn rate
  }
}

// Factory function
export function createAnalyticsBillingService(): AnalyticsBillingService {
  return new AnalyticsBillingService()
}
