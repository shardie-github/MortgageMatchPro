import { supabaseAdmin } from './supabase'
import { errorTracking } from './monitoring'

export interface LeadMetrics {
  totalLeads: number
  leadsToday: number
  leadsThisWeek: number
  leadsThisMonth: number
  conversionRate: number
  averageLeadScore: number
  leadsByStatus: {
    pending: number
    contacted: number
    converted: number
    rejected: number
  }
  leadsByTier: {
    premium: number
    standard: number
    coaching: number
  }
  topPerformingBrokers: Array<{
    brokerId: string
    name: string
    company: string
    conversionRate: number
    totalLeads: number
    convertedLeads: number
  }>
  alerts: Array<{
    type: 'high_volume' | 'low_conversion' | 'system_error' | 'broker_inactive'
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    timestamp: string
    resolved: boolean
  }>
}

export class LeadMonitoringService {
  /**
   * Get comprehensive lead metrics
   */
  async getLeadMetrics(): Promise<LeadMetrics> {
    try {
      // Get all leads
      const { data: leads, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (leadsError) {
        throw new Error(`Failed to fetch leads: ${leadsError.message}`)
      }

      // Get all brokers
      const { data: brokers, error: brokersError } = await supabaseAdmin
        .from('brokers')
        .select('*')

      if (brokersError) {
        throw new Error(`Failed to fetch brokers: ${brokersError.message}`)
      }

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getFullYear(), now.getMonth() - 1, now.getDate())

      // Calculate metrics
      const totalLeads = leads?.length || 0
      const leadsToday = leads?.filter(lead => 
        new Date(lead.created_at) >= today
      ).length || 0
      const leadsThisWeek = leads?.filter(lead => 
        new Date(lead.created_at) >= weekAgo
      ).length || 0
      const leadsThisMonth = leads?.filter(lead => 
        new Date(lead.created_at) >= monthAgo
      ).length || 0

      const convertedLeads = leads?.filter(lead => lead.status === 'converted').length || 0
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

      const averageLeadScore = totalLeads > 0 
        ? leads?.reduce((sum, lead) => sum + lead.lead_score, 0) / totalLeads 
        : 0

      // Leads by status
      const leadsByStatus = {
        pending: leads?.filter(lead => lead.status === 'pending').length || 0,
        contacted: leads?.filter(lead => lead.status === 'contacted').length || 0,
        converted: convertedLeads,
        rejected: leads?.filter(lead => lead.status === 'rejected').length || 0,
      }

      // Leads by tier
      const leadsByTier = {
        premium: leads?.filter(lead => lead.lead_score >= 70).length || 0,
        standard: leads?.filter(lead => lead.lead_score >= 50 && lead.lead_score < 70).length || 0,
        coaching: leads?.filter(lead => lead.lead_score < 50).length || 0,
      }

      // Top performing brokers
      const brokerPerformance = brokers?.map(broker => {
        const brokerLeads = leads?.filter(lead => lead.broker_id === broker.id) || []
        const convertedBrokerLeads = brokerLeads.filter(lead => lead.status === 'converted')
        const brokerConversionRate = brokerLeads.length > 0 
          ? (convertedBrokerLeads.length / brokerLeads.length) * 100 
          : 0

        return {
          brokerId: broker.id,
          name: broker.name,
          company: broker.company,
          conversionRate: Math.round(brokerConversionRate * 100) / 100,
          totalLeads: brokerLeads.length,
          convertedLeads: convertedBrokerLeads.length,
        }
      }).sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 5) || []

      // Generate alerts
      const alerts = await this.generateAlerts(leads, brokers, {
        totalLeads,
        leadsToday,
        conversionRate,
        averageLeadScore
      })

      return {
        totalLeads,
        leadsToday,
        leadsThisWeek,
        leadsThisMonth,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageLeadScore: Math.round(averageLeadScore * 100) / 100,
        leadsByStatus,
        leadsByTier,
        topPerformingBrokers: brokerPerformance,
        alerts,
      }

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'lead_monitoring',
        operation: 'get_lead_metrics'
      })
      throw error
    }
  }

  /**
   * Generate system alerts based on metrics
   */
  private async generateAlerts(
    leads: any[],
    brokers: any[],
    metrics: {
      totalLeads: number
      leadsToday: number
      conversionRate: number
      averageLeadScore: number
    }
  ): Promise<Array<{
    type: 'high_volume' | 'low_conversion' | 'system_error' | 'broker_inactive'
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    timestamp: string
    resolved: boolean
  }>> {
    const alerts: Array<{
      type: 'high_volume' | 'low_conversion' | 'system_error' | 'broker_inactive'
      severity: 'low' | 'medium' | 'high' | 'critical'
      message: string
      timestamp: string
      resolved: boolean
    }> = []

    const now = new Date().toISOString()

    // High volume alert
    if (metrics.leadsToday > 100) {
      alerts.push({
        type: 'high_volume',
        severity: 'medium',
        message: `High lead volume detected: ${metrics.leadsToday} leads today`,
        timestamp: now,
        resolved: false
      })
    }

    // Low conversion rate alert
    if (metrics.conversionRate < 10 && metrics.totalLeads > 50) {
      alerts.push({
        type: 'low_conversion',
        severity: 'high',
        message: `Low conversion rate: ${metrics.conversionRate.toFixed(1)}% (expected >10%)`,
        timestamp: now,
        resolved: false
      })
    }

    // Broker inactivity alert
    const inactiveBrokers = brokers?.filter(broker => {
      const brokerLeads = leads?.filter(lead => lead.broker_id === broker.id) || []
      const recentLeads = brokerLeads.filter(lead => 
        new Date(lead.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      )
      return broker.is_active && recentLeads.length === 0 && brokerLeads.length > 0
    }) || []

    if (inactiveBrokers.length > 0) {
      alerts.push({
        type: 'broker_inactive',
        severity: 'low',
        message: `${inactiveBrokers.length} broker(s) have not received leads in the past week`,
        timestamp: now,
        resolved: false
      })
    }

    // Low lead quality alert
    if (metrics.averageLeadScore < 40 && metrics.totalLeads > 20) {
      alerts.push({
        type: 'low_conversion',
        severity: 'medium',
        message: `Low average lead score: ${metrics.averageLeadScore.toFixed(1)}/100`,
        timestamp: now,
        resolved: false
      })
    }

    return alerts
  }

  /**
   * Track lead conversion event
   */
  async trackLeadConversion(leadId: string, brokerId: string, conversionValue: number): Promise<void> {
    try {
      // Update lead status
      const { error: updateError } = await supabaseAdmin
        .from('leads')
        .update({
          status: 'converted',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

      if (updateError) {
        throw new Error(`Failed to update lead status: ${updateError.message}`)
      }

      // Log conversion event
      await supabaseAdmin
        .from('conversion_events')
        .insert({
          lead_id: leadId,
          broker_id: brokerId,
          conversion_value: conversionValue,
          converted_at: new Date().toISOString()
        })

      // Track analytics
      errorTracking.captureMessage('Lead converted', {
        level: 'info',
        extra: {
          leadId,
          brokerId,
          conversionValue
        }
      })

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'lead_monitoring',
        operation: 'track_lead_conversion',
        leadId,
        brokerId
      })
      throw error
    }
  }

  /**
   * Get broker performance metrics
   */
  async getBrokerPerformance(brokerId: string, timeRange: 'week' | 'month' | 'quarter' = 'month'): Promise<{
    totalLeads: number
    convertedLeads: number
    conversionRate: number
    averageLeadScore: number
    totalCommission: number
    responseTime: number // Average hours to first contact
  }> {
    try {
      const now = new Date()
      let startDate: Date

      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          break
        case 'quarter':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
          break
      }

      const { data: leads, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('broker_id', brokerId)
        .gte('created_at', startDate.toISOString())

      if (error) {
        throw new Error(`Failed to fetch broker leads: ${error.message}`)
      }

      const totalLeads = leads?.length || 0
      const convertedLeads = leads?.filter(lead => lead.status === 'converted').length || 0
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
      const averageLeadScore = totalLeads > 0 
        ? leads?.reduce((sum, lead) => sum + lead.lead_score, 0) / totalLeads 
        : 0

      // Calculate average response time (simplified)
      const contactedLeads = leads?.filter(lead => 
        lead.status === 'contacted' || lead.status === 'converted'
      ) || []
      
      const responseTimes = contactedLeads.map(lead => {
        const created = new Date(lead.created_at)
        const updated = new Date(lead.updated_at)
        return (updated.getTime() - created.getTime()) / (1000 * 60 * 60) // hours
      })

      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0

      // Calculate commission (simplified)
      const broker = await supabaseAdmin
        .from('brokers')
        .select('commission_rate')
        .eq('id', brokerId)
        .single()

      const commissionRate = broker.data?.commission_rate || 0
      const totalCommission = convertedLeads * (commissionRate / 100) * 1000 // Assume $1000 average

      return {
        totalLeads,
        convertedLeads,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageLeadScore: Math.round(averageLeadScore * 100) / 100,
        totalCommission: Math.round(totalCommission),
        responseTime: Math.round(averageResponseTime * 100) / 100
      }

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'lead_monitoring',
        operation: 'get_broker_performance',
        brokerId
      })
      throw error
    }
  }
}

// Export singleton instance
export const leadMonitoringService = new LeadMonitoringService()