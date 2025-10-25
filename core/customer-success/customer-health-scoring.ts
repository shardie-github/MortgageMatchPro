/**
 * Customer Health Scoring System
 * Implements comprehensive customer health scoring with predictive analytics
 */

import { supabaseAdmin } from '../supabase'
import { captureException, captureMessage } from '../monitoring'
import { trackEvent } from '../analytics'

export interface CustomerHealthScore {
  customer_id: string
  overall_score: number
  usage_frequency: number
  feature_adoption: number
  support_satisfaction: number
  churn_risk: number
  engagement_level: number
  last_updated: Date
  trends: {
    score_trend: 'improving' | 'stable' | 'declining'
    usage_trend: 'increasing' | 'stable' | 'decreasing'
    engagement_trend: 'increasing' | 'stable' | 'decreasing'
  }
  recommendations: string[]
  next_review_date: Date
}

export interface CustomerSegment {
  id: string
  name: string
  description: string
  criteria: Record<string, any>
  health_threshold: number
  priority: 'high' | 'medium' | 'low'
  engagement_strategy: string
}

export interface HealthMetric {
  name: string
  value: number
  weight: number
  trend: 'up' | 'down' | 'stable'
  last_updated: Date
}

export interface ChurnPrediction {
  customer_id: string
  churn_probability: number
  risk_factors: string[]
  retention_strategy: string
  next_action: string
  predicted_churn_date: Date
  confidence: number
}

export class CustomerHealthScoring {
  private readonly weights = {
    usage_frequency: 0.25,
    feature_adoption: 0.20,
    support_satisfaction: 0.20,
    engagement_level: 0.20,
    payment_consistency: 0.15,
  }

  /**
   * Calculate comprehensive health score for a customer
   */
  async calculateHealthScore(customerId: string): Promise<CustomerHealthScore> {
    try {
      const metrics = await this.gatherCustomerMetrics(customerId)
      const healthScore = this.computeHealthScore(metrics)
      const trends = await this.analyzeTrends(customerId, metrics)
      const recommendations = await this.generateRecommendations(healthScore, metrics)
      const churnRisk = await this.predictChurnRisk(customerId, metrics)

      const score: CustomerHealthScore = {
        customer_id: customerId,
        overall_score: healthScore.overall,
        usage_frequency: healthScore.usage_frequency,
        feature_adoption: healthScore.feature_adoption,
        support_satisfaction: healthScore.support_satisfaction,
        churn_risk: churnRisk.churn_probability,
        engagement_level: healthScore.engagement_level,
        last_updated: new Date(),
        trends,
        recommendations,
        next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }

      // Store the health score
      await this.storeHealthScore(score)

      // Track analytics event
      await trackEvent('customer_health_score_calculated', {
        customer_id: customerId,
        overall_score: healthScore.overall,
        churn_risk: churnRisk.churn_probability,
      })

      return score
    } catch (error) {
      captureException(error as Error, { context: 'calculate_health_score', customerId })
      throw error
    }
  }

  /**
   * Gather all relevant metrics for a customer
   */
  private async gatherCustomerMetrics(customerId: string): Promise<Record<string, any>> {
    try {
      const [
        usageData,
        featureData,
        supportData,
        paymentData,
        engagementData,
      ] = await Promise.all([
        this.getUsageMetrics(customerId),
        this.getFeatureAdoptionMetrics(customerId),
        this.getSupportMetrics(customerId),
        this.getPaymentMetrics(customerId),
        this.getEngagementMetrics(customerId),
      ])

      return {
        usage: usageData,
        features: featureData,
        support: supportData,
        payments: paymentData,
        engagement: engagementData,
      }
    } catch (error) {
      captureException(error as Error, { context: 'gather_customer_metrics', customerId })
      return {}
    }
  }

  /**
   * Get usage frequency metrics
   */
  private async getUsageMetrics(customerId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_activity_logs')
        .select('event_type, created_at')
        .eq('user_id', customerId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

      if (error) throw error

      const totalSessions = data?.length || 0
      const uniqueDays = new Set(data?.map(log => log.created_at.split('T')[0])).size
      const avgSessionsPerDay = uniqueDays > 0 ? totalSessions / uniqueDays : 0

      return {
        total_sessions: totalSessions,
        unique_days: uniqueDays,
        avg_sessions_per_day: avgSessionsPerDay,
        last_activity: data?.[0]?.created_at || null,
      }
    } catch (error) {
      captureException(error as Error, { context: 'get_usage_metrics', customerId })
      return { total_sessions: 0, unique_days: 0, avg_sessions_per_day: 0, last_activity: null }
    }
  }

  /**
   * Get feature adoption metrics
   */
  private async getFeatureAdoptionMetrics(customerId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('feature_usage')
        .select('feature_name, usage_count, last_used')
        .eq('user_id', customerId)

      if (error) throw error

      const totalFeatures = data?.length || 0
      const activeFeatures = data?.filter(f => f.usage_count > 0).length || 0
      const adoptionRate = totalFeatures > 0 ? (activeFeatures / totalFeatures) * 100 : 0

      return {
        total_features: totalFeatures,
        active_features: activeFeatures,
        adoption_rate: adoptionRate,
        features: data || [],
      }
    } catch (error) {
      captureException(error as Error, { context: 'get_feature_adoption_metrics', customerId })
      return { total_features: 0, active_features: 0, adoption_rate: 0, features: [] }
    }
  }

  /**
   * Get support satisfaction metrics
   */
  private async getSupportMetrics(customerId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('support_tickets')
        .select('satisfaction_score, resolution_time, status, created_at')
        .eq('user_id', customerId)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days

      if (error) throw error

      const tickets = data || []
      const avgSatisfaction = tickets.length > 0 
        ? tickets.reduce((sum, ticket) => sum + (ticket.satisfaction_score || 0), 0) / tickets.length 
        : 0
      const avgResolutionTime = tickets.length > 0
        ? tickets.reduce((sum, ticket) => sum + (ticket.resolution_time || 0), 0) / tickets.length
        : 0
      const openTickets = tickets.filter(ticket => ticket.status === 'open').length

      return {
        avg_satisfaction: avgSatisfaction,
        avg_resolution_time: avgResolutionTime,
        total_tickets: tickets.length,
        open_tickets: openTickets,
        satisfaction_trend: this.calculateTrend(tickets.map(t => t.satisfaction_score || 0)),
      }
    } catch (error) {
      captureException(error as Error, { context: 'get_support_metrics', customerId })
      return { avg_satisfaction: 0, avg_resolution_time: 0, total_tickets: 0, open_tickets: 0, satisfaction_trend: 'stable' }
    }
  }

  /**
   * Get payment consistency metrics
   */
  private async getPaymentMetrics(customerId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('status, created_at, updated_at, amount')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const subscriptions = data || []
      const activeSubscription = subscriptions.find(sub => sub.status === 'active')
      const paymentHistory = subscriptions.filter(sub => sub.status === 'active' || sub.status === 'cancelled')
      
      const paymentConsistency = this.calculatePaymentConsistency(paymentHistory)
      const daysSinceLastPayment = activeSubscription 
        ? Math.floor((Date.now() - new Date(activeSubscription.updated_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      return {
        has_active_subscription: !!activeSubscription,
        payment_consistency: paymentConsistency,
        days_since_last_payment: daysSinceLastPayment,
        total_subscriptions: subscriptions.length,
        current_amount: activeSubscription?.amount || 0,
      }
    } catch (error) {
      captureException(error as Error, { context: 'get_payment_metrics', customerId })
      return { has_active_subscription: false, payment_consistency: 0, days_since_last_payment: 0, total_subscriptions: 0, current_amount: 0 }
    }
  }

  /**
   * Get engagement level metrics
   */
  private async getEngagementMetrics(customerId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_engagement')
        .select('engagement_type, score, created_at')
        .eq('user_id', customerId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

      if (error) throw error

      const engagements = data || []
      const avgEngagement = engagements.length > 0
        ? engagements.reduce((sum, eng) => sum + eng.score, 0) / engagements.length
        : 0

      const engagementTypes = [...new Set(engagements.map(e => e.engagement_type))]
      const engagementDiversity = engagementTypes.length

      return {
        avg_engagement: avgEngagement,
        total_engagements: engagements.length,
        engagement_diversity: engagementDiversity,
        engagement_types: engagementTypes,
        last_engagement: engagements[0]?.created_at || null,
      }
    } catch (error) {
      captureException(error as Error, { context: 'get_engagement_metrics', customerId })
      return { avg_engagement: 0, total_engagements: 0, engagement_diversity: 0, engagement_types: [], last_engagement: null }
    }
  }

  /**
   * Compute overall health score from metrics
   */
  private computeHealthScore(metrics: Record<string, any>): Record<string, number> {
    const usage = this.normalizeUsageScore(metrics.usage)
    const features = this.normalizeFeatureScore(metrics.features)
    const support = this.normalizeSupportScore(metrics.support)
    const payments = this.normalizePaymentScore(metrics.payments)
    const engagement = this.normalizeEngagementScore(metrics.engagement)

    const overall = 
      usage * this.weights.usage_frequency +
      features * this.weights.feature_adoption +
      support * this.weights.support_satisfaction +
      payments * this.weights.payment_consistency +
      engagement * this.weights.engagement_level

    return {
      overall: Math.round(overall),
      usage_frequency: Math.round(usage),
      feature_adoption: Math.round(features),
      support_satisfaction: Math.round(support),
      engagement_level: Math.round(engagement),
    }
  }

  /**
   * Normalize usage score (0-100)
   */
  private normalizeUsageScore(usage: any): number {
    if (!usage) return 0

    const avgSessions = usage.avg_sessions_per_day || 0
    const uniqueDays = usage.unique_days || 0

    // Score based on daily usage and consistency
    let score = 0
    if (avgSessions >= 5) score += 40
    else if (avgSessions >= 2) score += 30
    else if (avgSessions >= 1) score += 20
    else if (avgSessions > 0) score += 10

    if (uniqueDays >= 20) score += 30
    else if (uniqueDays >= 10) score += 20
    else if (uniqueDays >= 5) score += 10

    // Bonus for recent activity
    if (usage.last_activity) {
      const daysSinceActivity = Math.floor((Date.now() - new Date(usage.last_activity).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceActivity <= 1) score += 20
      else if (daysSinceActivity <= 3) score += 10
      else if (daysSinceActivity <= 7) score += 5
    }

    return Math.min(score, 100)
  }

  /**
   * Normalize feature adoption score (0-100)
   */
  private normalizeFeatureScore(features: any): number {
    if (!features) return 0

    const adoptionRate = features.adoption_rate || 0
    const activeFeatures = features.active_features || 0

    let score = adoptionRate * 0.7 // 70% weight on adoption rate
    score += Math.min(activeFeatures * 5, 30) // Up to 30 points for active features

    return Math.min(score, 100)
  }

  /**
   * Normalize support satisfaction score (0-100)
   */
  private normalizeSupportScore(support: any): number {
    if (!support) return 50 // Neutral score if no support data

    const avgSatisfaction = support.avg_satisfaction || 0
    const avgResolutionTime = support.avg_resolution_time || 0
    const openTickets = support.open_tickets || 0

    let score = avgSatisfaction * 20 // Convert 1-5 scale to 0-100

    // Penalty for slow resolution
    if (avgResolutionTime > 48) score -= 20
    else if (avgResolutionTime > 24) score -= 10

    // Penalty for open tickets
    if (openTickets > 3) score -= 20
    else if (openTickets > 1) score -= 10

    return Math.max(0, Math.min(score, 100))
  }

  /**
   * Normalize payment score (0-100)
   */
  private normalizePaymentScore(payments: any): number {
    if (!payments) return 0

    let score = 0

    if (payments.has_active_subscription) {
      score += 50
      
      // Bonus for payment consistency
      score += payments.payment_consistency * 30

      // Penalty for overdue payments
      if (payments.days_since_last_payment > 30) score -= 30
      else if (payments.days_since_last_payment > 14) score -= 15
    }

    return Math.max(0, Math.min(score, 100))
  }

  /**
   * Normalize engagement score (0-100)
   */
  private normalizeEngagementScore(engagement: any): number {
    if (!engagement) return 0

    const avgEngagement = engagement.avg_engagement || 0
    const totalEngagements = engagement.total_engagements || 0
    const engagementDiversity = engagement.engagement_diversity || 0

    let score = avgEngagement * 0.6 // 60% weight on average engagement
    score += Math.min(totalEngagements * 2, 20) // Up to 20 points for frequency
    score += Math.min(engagementDiversity * 5, 20) // Up to 20 points for diversity

    return Math.min(score, 100)
  }

  /**
   * Calculate payment consistency
   */
  private calculatePaymentConsistency(paymentHistory: any[]): number {
    if (paymentHistory.length < 2) return 1.0

    // Simple consistency calculation based on subscription duration
    const totalDuration = paymentHistory.reduce((sum, sub) => {
      const start = new Date(sub.created_at)
      const end = sub.status === 'cancelled' ? new Date(sub.updated_at) : new Date()
      return sum + (end.getTime() - start.getTime())
    }, 0)

    const avgDuration = totalDuration / paymentHistory.length
    const consistency = Math.min(avgDuration / (30 * 24 * 60 * 60 * 1000), 1.0) // Normalize to months

    return consistency
  }

  /**
   * Analyze trends for a customer
   */
  private async analyzeTrends(customerId: string, currentMetrics: Record<string, any>): Promise<CustomerHealthScore['trends']> {
    try {
      // Get historical data for trend analysis
      const { data, error } = await supabaseAdmin
        .from('customer_health_scores')
        .select('overall_score, usage_frequency, engagement_level, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error || !data || data.length < 2) {
        return {
          score_trend: 'stable',
          usage_trend: 'stable',
          engagement_trend: 'stable',
        }
      }

      const scoreTrend = this.calculateTrend(data.map(d => d.overall_score))
      const usageTrend = this.calculateTrend(data.map(d => d.usage_frequency))
      const engagementTrend = this.calculateTrend(data.map(d => d.engagement_level))

      return {
        score_trend: scoreTrend,
        usage_trend: usageTrend,
        engagement_trend: engagementTrend,
      }
    } catch (error) {
      captureException(error as Error, { context: 'analyze_trends', customerId })
      return {
        score_trend: 'stable',
        usage_trend: 'stable',
        engagement_trend: 'stable',
      }
    }
  }

  /**
   * Calculate trend from array of values
   */
  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable'

    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length

    const change = (secondAvg - firstAvg) / firstAvg

    if (change > 0.1) return 'up'
    if (change < -0.1) return 'down'
    return 'stable'
  }

  /**
   * Generate recommendations based on health score
   */
  private async generateRecommendations(healthScore: Record<string, number>, metrics: Record<string, any>): Promise<string[]> {
    const recommendations: string[] = []

    if (healthScore.usage_frequency < 30) {
      recommendations.push('Increase usage frequency through targeted onboarding and feature discovery')
    }

    if (healthScore.feature_adoption < 40) {
      recommendations.push('Improve feature adoption with guided tours and personalized recommendations')
    }

    if (healthScore.support_satisfaction < 60) {
      recommendations.push('Address support satisfaction issues and improve response times')
    }

    if (healthScore.engagement_level < 50) {
      recommendations.push('Boost engagement through gamification and personalized content')
    }

    if (metrics.payments && !metrics.payments.has_active_subscription) {
      recommendations.push('Re-engage customer with subscription offers and value demonstration')
    }

    if (metrics.usage && metrics.usage.unique_days < 5) {
      recommendations.push('Increase session consistency with email campaigns and push notifications')
    }

    return recommendations
  }

  /**
   * Predict churn risk for a customer
   */
  async predictChurnRisk(customerId: string, metrics: Record<string, any>): Promise<ChurnPrediction> {
    try {
      // Simple churn prediction model
      let churnProbability = 0
      const riskFactors: string[] = []

      // Usage-based risk factors
      if (metrics.usage?.avg_sessions_per_day < 1) {
        churnProbability += 0.3
        riskFactors.push('Low usage frequency')
      }

      if (metrics.usage?.unique_days < 5) {
        churnProbability += 0.2
        riskFactors.push('Inconsistent usage pattern')
      }

      // Feature adoption risk factors
      if (metrics.features?.adoption_rate < 30) {
        churnProbability += 0.2
        riskFactors.push('Low feature adoption')
      }

      // Support risk factors
      if (metrics.support?.avg_satisfaction < 3) {
        churnProbability += 0.3
        riskFactors.push('Poor support experience')
      }

      if (metrics.support?.open_tickets > 2) {
        churnProbability += 0.2
        riskFactors.push('Multiple unresolved issues')
      }

      // Payment risk factors
      if (metrics.payments && !metrics.payments.has_active_subscription) {
        churnProbability += 0.4
        riskFactors.push('No active subscription')
      }

      if (metrics.payments?.days_since_last_payment > 30) {
        churnProbability += 0.3
        riskFactors.push('Overdue payment')
      }

      // Engagement risk factors
      if (metrics.engagement?.avg_engagement < 3) {
        churnProbability += 0.2
        riskFactors.push('Low engagement level')
      }

      churnProbability = Math.min(churnProbability, 1.0)

      // Determine retention strategy
      let retentionStrategy = 'Standard retention campaign'
      if (churnProbability > 0.7) {
        retentionStrategy = 'High-touch retention intervention'
      } else if (churnProbability > 0.4) {
        retentionStrategy = 'Targeted retention campaign'
      }

      // Determine next action
      let nextAction = 'Monitor and nurture'
      if (churnProbability > 0.7) {
        nextAction = 'Immediate outreach from customer success manager'
      } else if (churnProbability > 0.4) {
        nextAction = 'Send personalized retention offer'
      }

      // Calculate predicted churn date
      const daysToChurn = churnProbability > 0.7 ? 7 : churnProbability > 0.4 ? 30 : 90
      const predictedChurnDate = new Date(Date.now() + daysToChurn * 24 * 60 * 60 * 1000)

      return {
        customer_id: customerId,
        churn_probability: churnProbability,
        risk_factors: riskFactors,
        retention_strategy: retentionStrategy,
        next_action: nextAction,
        predicted_churn_date: predictedChurnDate,
        confidence: Math.min(churnProbability * 1.2, 1.0),
      }
    } catch (error) {
      captureException(error as Error, { context: 'predict_churn_risk', customerId })
      return {
        customer_id: customerId,
        churn_probability: 0.5,
        risk_factors: ['Unable to analyze risk factors'],
        retention_strategy: 'Standard retention campaign',
        next_action: 'Monitor and nurture',
        predicted_churn_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        confidence: 0.5,
      }
    }
  }

  /**
   * Store health score in database
   */
  private async storeHealthScore(score: CustomerHealthScore): Promise<void> {
    try {
      await supabaseAdmin
        .from('customer_health_scores')
        .upsert({
          ...score,
          last_updated: score.last_updated.toISOString(),
          next_review_date: score.next_review_date.toISOString(),
        })
    } catch (error) {
      captureException(error as Error, { context: 'store_health_score', score })
    }
  }

  /**
   * Get health score for a customer
   */
  async getHealthScore(customerId: string): Promise<CustomerHealthScore | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('customer_health_scores')
        .select('*')
        .eq('customer_id', customerId)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single()

      if (error) return null

      return {
        ...data,
        last_updated: new Date(data.last_updated),
        next_review_date: new Date(data.next_review_date),
      }
    } catch (error) {
      captureException(error as Error, { context: 'get_health_score', customerId })
      return null
    }
  }

  /**
   * Get all customers with health scores
   */
  async getAllHealthScores(limit: number = 100, offset: number = 0): Promise<CustomerHealthScore[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('customer_health_scores')
        .select('*')
        .order('overall_score', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return data?.map(score => ({
        ...score,
        last_updated: new Date(score.last_updated),
        next_review_date: new Date(score.next_review_date),
      })) || []
    } catch (error) {
      captureException(error as Error, { context: 'get_all_health_scores', limit, offset })
      return []
    }
  }

  /**
   * Get customers at risk of churning
   */
  async getAtRiskCustomers(threshold: number = 0.4): Promise<CustomerHealthScore[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('customer_health_scores')
        .select('*')
        .gte('churn_risk', threshold)
        .order('churn_risk', { ascending: false })

      if (error) throw error

      return data?.map(score => ({
        ...score,
        last_updated: new Date(score.last_updated),
        next_review_date: new Date(score.next_review_date),
      })) || []
    } catch (error) {
      captureException(error as Error, { context: 'get_at_risk_customers', threshold })
      return []
    }
  }
}

// Initialize customer health scoring
export const customerHealthScoring = new CustomerHealthScoring()

// Export utility functions
export const calculateHealthScore = customerHealthScoring.calculateHealthScore.bind(customerHealthScoring)
export const getHealthScore = customerHealthScoring.getHealthScore.bind(customerHealthScoring)
export const getAllHealthScores = customerHealthScoring.getAllHealthScores.bind(customerHealthScoring)
export const getAtRiskCustomers = customerHealthScoring.getAtRiskCustomers.bind(customerHealthScoring)