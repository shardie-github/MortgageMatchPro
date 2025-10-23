import { supabaseAdmin } from '../supabase'
import { trackEvent } from '../analytics'
import { openai } from '../openai'

export interface ChurnRiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  score: number
  factors: string[]
  recommendations: string[]
  nextAction: string
}

export interface RetentionCampaign {
  id: string
  type: 'welcome_series' | 're_engagement' | 'renewal_reminder' | 'feature_adoption' | 'churn_prevention'
  trigger: string
  content: {
    subject?: string
    message: string
    cta?: string
    personalization?: Record<string, any>
  }
  deliveryMethod: 'in_app' | 'email' | 'sms' | 'push'
  priority: number
}

export interface UserEngagementProfile {
  userId: string
  lastActiveAt: Date
  sessionCount: number
  featureUsage: Record<string, number>
  conversionEvents: string[]
  churnRiskScore: number
  preferredChannels: string[]
  engagementTrend: 'increasing' | 'stable' | 'decreasing'
}

export class RetainBotAgent {
  private userId: string
  private userEmail: string
  private userSegment: string

  constructor(userId: string, userEmail: string, userSegment: string = 'homebuyer') {
    this.userId = userId
    this.userEmail = userEmail
    this.userSegment = userSegment
  }

  /**
   * Assess user's churn risk using ML and behavioral data
   */
  async assessChurnRisk(): Promise<ChurnRiskAssessment> {
    try {
      // Gather user engagement data
      const engagementProfile = await this.getUserEngagementProfile()
      
      // Analyze behavioral patterns
      const behavioralFactors = await this.analyzeBehavioralPatterns()
      
      // Calculate churn risk score using AI
      const riskScore = await this.calculateChurnRiskScore(engagementProfile, behavioralFactors)
      
      // Generate recommendations
      const recommendations = await this.generateRetentionRecommendations(riskScore, behavioralFactors)
      
      // Determine next action
      const nextAction = this.determineNextAction(riskScore)
      
      // Store assessment
      await this.storeChurnRiskAssessment(riskScore, behavioralFactors, recommendations)
      
      return {
        riskLevel: this.categorizeRiskLevel(riskScore),
        score: riskScore,
        factors: behavioralFactors,
        recommendations,
        nextAction
      }
    } catch (error) {
      console.error('Error assessing churn risk:', error)
      return {
        riskLevel: 'low',
        score: 0.3,
        factors: [],
        recommendations: ['Continue using the platform regularly'],
        nextAction: 'monitor'
      }
    }
  }

  /**
   * Trigger appropriate retention campaign based on user state
   */
  async triggerRetentionCampaign(): Promise<RetentionCampaign | null> {
    try {
      const churnAssessment = await this.assessChurnRisk()
      
      if (churnAssessment.riskLevel === 'low') {
        return null // No action needed
      }

      // Select appropriate campaign type
      const campaignType = this.selectCampaignType(churnAssessment)
      
      // Generate personalized campaign content
      const campaignContent = await this.generateCampaignContent(campaignType, churnAssessment)
      
      // Create campaign execution
      const campaign = await this.createCampaignExecution(campaignType, campaignContent)
      
      // Track campaign trigger
      trackEvent('retention_campaign_triggered', {
        user_id: this.userId,
        campaign_type: campaignType,
        churn_risk_level: churnAssessment.riskLevel,
        churn_score: churnAssessment.score
      })

      return campaign
    } catch (error) {
      console.error('Error triggering retention campaign:', error)
      return null
    }
  }

  /**
   * Send automated renewal reminders
   */
  async sendRenewalReminder(): Promise<boolean> {
    try {
      // Check if user has active subscription
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'active')
        .single()

      if (!subscription) {
        return false
      }

      // Check if renewal is due soon (within 7 days)
      const renewalDate = new Date(subscription.current_period_end)
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      if (daysUntilRenewal > 7) {
        return false
      }

      // Generate personalized renewal message
      const message = await this.generateRenewalMessage(daysUntilRenewal, subscription)
      
      // Send renewal reminder
      await this.sendNotification('renewal_reminder', message, 'email')
      
      // Track renewal reminder
      trackEvent('renewal_reminder_sent', {
        user_id: this.userId,
        days_until_renewal: daysUntilRenewal,
        subscription_tier: subscription.tier
      })

      return true
    } catch (error) {
      console.error('Error sending renewal reminder:', error)
      return false
    }
  }

  /**
   * Send refinancing prompts based on market conditions
   */
  async sendRefinancingPrompt(): Promise<boolean> {
    try {
      // Check if user has existing mortgage data
      const { data: mortgageData } = await supabaseAdmin
        .from('mortgage_calculations')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!mortgageData) {
        return false
      }

      // Check current market rates
      const currentRates = await this.getCurrentMarketRates()
      const userRate = mortgageData.interest_rate
      
      // Calculate potential savings
      const potentialSavings = await this.calculateRefinancingSavings(userRate, currentRates, mortgageData)
      
      if (potentialSavings.monthlySavings < 100) {
        return false // Not worth refinancing
      }

      // Generate refinancing prompt
      const message = await this.generateRefinancingMessage(potentialSavings, currentRates)
      
      // Send refinancing prompt
      await this.sendNotification('refinancing_prompt', message, 'email')
      
      // Track refinancing prompt
      trackEvent('refinancing_prompt_sent', {
        user_id: this.userId,
        current_rate: userRate,
        market_rate: currentRates.average,
        potential_savings: potentialSavings.monthlySavings
      })

      return true
    } catch (error) {
      console.error('Error sending refinancing prompt:', error)
      return false
    }
  }

  /**
   * Monitor and respond to user inactivity
   */
  async monitorInactivity(): Promise<void> {
    try {
      const { data: lastActivity } = await supabaseAdmin
        .from('user_engagement_metrics')
        .select('recorded_at')
        .eq('user_id', this.userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single()

      if (!lastActivity) {
        return
      }

      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(lastActivity.recorded_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Trigger re-engagement campaigns based on inactivity duration
      if (daysSinceActivity >= 7 && daysSinceActivity < 14) {
        await this.triggerReEngagementCampaign('early_inactivity')
      } else if (daysSinceActivity >= 14 && daysSinceActivity < 30) {
        await this.triggerReEngagementCampaign('moderate_inactivity')
      } else if (daysSinceActivity >= 30) {
        await this.triggerReEngagementCampaign('high_inactivity')
      }
    } catch (error) {
      console.error('Error monitoring inactivity:', error)
    }
  }

  private async getUserEngagementProfile(): Promise<UserEngagementProfile> {
    // Gather comprehensive engagement data
    const { data: metrics } = await supabaseAdmin
      .from('user_engagement_metrics')
      .select('*')
      .eq('user_id', this.userId)
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    const sessionCount = metrics?.filter(m => m.metric_type === 'page_view').length || 0
    const lastActiveAt = metrics?.[0]?.recorded_at ? new Date(metrics[0].recorded_at) : new Date(0)
    
    // Calculate feature usage
    const featureUsage: Record<string, number> = {}
    metrics?.forEach(metric => {
      if (metric.metric_type === 'feature_usage' && metric.context?.feature) {
        featureUsage[metric.context.feature] = (featureUsage[metric.context.feature] || 0) + 1
      }
    })

    // Calculate engagement trend
    const recentMetrics = metrics?.slice(0, 7) || []
    const olderMetrics = metrics?.slice(7, 14) || []
    const recentAvg = recentMetrics.reduce((sum, m) => sum + (m.metric_value || 0), 0) / recentMetrics.length
    const olderAvg = olderMetrics.reduce((sum, m) => sum + (m.metric_value || 0), 0) / olderMetrics.length
    
    const engagementTrend = recentAvg > olderAvg * 1.1 ? 'increasing' : 
                           recentAvg < olderAvg * 0.9 ? 'decreasing' : 'stable'

    return {
      userId: this.userId,
      lastActiveAt,
      sessionCount,
      featureUsage,
      conversionEvents: metrics?.filter(m => m.metric_type === 'conversion').map(m => m.context?.event) || [],
      churnRiskScore: 0, // Will be calculated
      preferredChannels: ['email', 'in_app'], // Default
      engagementTrend
    }
  }

  private async analyzeBehavioralPatterns(): Promise<string[]> {
    const factors: string[] = []
    
    // Analyze session patterns
    const { data: sessions } = await supabaseAdmin
      .from('user_engagement_metrics')
      .select('*')
      .eq('user_id', this.userId)
      .eq('metric_type', 'page_view')
      .gte('recorded_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())

    if (!sessions || sessions.length === 0) {
      factors.push('no_recent_activity')
      return factors
    }

    // Check for decreasing engagement
    const recentSessions = sessions.slice(0, 7)
    const olderSessions = sessions.slice(7, 14)
    
    if (recentSessions.length < olderSessions.length * 0.5) {
      factors.push('decreasing_engagement')
    }

    // Check for incomplete onboarding
    const { data: onboarding } = await supabaseAdmin
      .from('user_onboarding_flows')
      .select('completion_percentage')
      .eq('user_id', this.userId)
      .single()

    if (onboarding && onboarding.completion_percentage < 50) {
      factors.push('incomplete_onboarding')
    }

    // Check for feature adoption
    const { data: featureUsage } = await supabaseAdmin
      .from('user_engagement_metrics')
      .select('context')
      .eq('user_id', this.userId)
      .eq('metric_type', 'feature_usage')
      .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (!featureUsage || featureUsage.length < 3) {
      factors.push('low_feature_adoption')
    }

    return factors
  }

  private async calculateChurnRiskScore(profile: UserEngagementProfile, factors: string[]): Promise<number> {
    let score = 0.5 // Base score

    // Adjust based on factors
    factors.forEach(factor => {
      switch (factor) {
        case 'no_recent_activity':
          score += 0.3
          break
        case 'decreasing_engagement':
          score += 0.2
          break
        case 'incomplete_onboarding':
          score += 0.15
          break
        case 'low_feature_adoption':
          score += 0.1
          break
      }
    })

    // Adjust based on engagement trend
    switch (profile.engagementTrend) {
      case 'increasing':
        score -= 0.2
        break
      case 'decreasing':
        score += 0.2
        break
    }

    // Adjust based on session count
    if (profile.sessionCount < 5) {
      score += 0.15
    } else if (profile.sessionCount > 20) {
      score -= 0.1
    }

    return Math.max(0, Math.min(1, score))
  }

  private categorizeRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 0.3) return 'low'
    if (score < 0.6) return 'medium'
    if (score < 0.8) return 'high'
    return 'critical'
  }

  private async generateRetentionRecommendations(score: number, factors: string[]): Promise<string[]> {
    const recommendations: string[] = []

    if (factors.includes('incomplete_onboarding')) {
      recommendations.push('Complete your profile setup to unlock personalized features')
    }

    if (factors.includes('low_feature_adoption')) {
      recommendations.push('Try our affordability calculator to see how much you can afford')
      recommendations.push('Check current mortgage rates in your area')
    }

    if (factors.includes('decreasing_engagement')) {
      recommendations.push('We\'ve added new features - come check them out!')
    }

    if (score > 0.7) {
      recommendations.push('Connect with a mortgage expert for personalized guidance')
      recommendations.push('Get a free rate check to see current market conditions')
    }

    return recommendations
  }

  private determineNextAction(score: number): string {
    if (score < 0.3) return 'monitor'
    if (score < 0.6) return 'gentle_nudge'
    if (score < 0.8) return 'retention_campaign'
    return 'urgent_intervention'
  }

  private async storeChurnRiskAssessment(score: number, factors: string[], recommendations: string[]): Promise<void> {
    await supabaseAdmin
      .from('ai_agent_interactions')
      .insert({
        user_id: this.userId,
        agent_type: 'retainbot',
        interaction_type: 'churn_assessment',
        content: {
          churn_score: score,
          risk_factors: factors,
          recommendations
        },
        effectiveness_score: null,
        learning_data: {
          assessment_timestamp: new Date().toISOString()
        }
      })
  }

  private selectCampaignType(assessment: ChurnRiskAssessment): string {
    if (assessment.factors.includes('incomplete_onboarding')) {
      return 'welcome_series'
    }
    if (assessment.riskLevel === 'high' || assessment.riskLevel === 'critical') {
      return 'churn_prevention'
    }
    if (assessment.factors.includes('low_feature_adoption')) {
      return 'feature_adoption'
    }
    return 're_engagement'
  }

  private async generateCampaignContent(campaignType: string, assessment: ChurnRiskAssessment): Promise<any> {
    const prompt = `
      Generate personalized retention campaign content for a mortgage platform.
      Campaign Type: ${campaignType}
      User Segment: ${this.userSegment}
      Churn Risk: ${assessment.riskLevel} (${assessment.score})
      Risk Factors: ${assessment.factors.join(', ')}
      
      Create engaging, helpful content that addresses their specific situation.
      Include a clear call-to-action.
      
      Return as JSON with subject, message, and cta fields.
    `

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300
      })

      return JSON.parse(completion.choices[0].message.content || '{}')
    } catch (error) {
      console.error('Error generating campaign content:', error)
      return {
        subject: 'Don\'t miss out on great mortgage opportunities!',
        message: 'We noticed you haven\'t been active lately. Check out our latest rates and tools.',
        cta: 'Explore Now'
      }
    }
  }

  private async createCampaignExecution(campaignType: string, content: any): Promise<RetentionCampaign> {
    const campaign: RetentionCampaign = {
      id: `campaign_${Date.now()}`,
      type: campaignType as any,
      trigger: 'churn_risk',
      content,
      deliveryMethod: 'email',
      priority: 1
    }

    // Store campaign execution
    await supabaseAdmin
      .from('campaign_executions')
      .insert({
        campaign_id: campaign.id,
        user_id: this.userId,
        status: 'scheduled',
        sent_at: new Date().toISOString()
      })

    return campaign
  }

  private async generateRenewalMessage(daysUntilRenewal: number, subscription: any): Promise<string> {
    return `Your ${subscription.tier} subscription renews in ${daysUntilRenewal} days. Continue enjoying unlimited access to our mortgage tools and rates.`
  }

  private async sendNotification(type: string, message: string, method: string): Promise<void> {
    // Implementation would depend on the notification service (email, SMS, push)
    console.log(`Sending ${type} notification via ${method}:`, message)
  }

  private async getCurrentMarketRates(): Promise<any> {
    // Implementation would fetch current market rates from rate APIs
    return { average: 5.5, range: { min: 5.2, max: 5.8 } }
  }

  private async calculateRefinancingSavings(currentRate: number, marketRates: any, mortgageData: any): Promise<any> {
    const newRate = marketRates.average
    const monthlySavings = (currentRate - newRate) / 100 * mortgageData.property_price / 12
    return { monthlySavings, newRate, currentRate }
  }

  private async generateRefinancingMessage(savings: any, rates: any): Promise<string> {
    return `Great news! Current rates are ${rates.average}% - you could save $${Math.round(savings.monthlySavings)}/month by refinancing your ${savings.currentRate}% mortgage.`
  }

  private async triggerReEngagementCampaign(inactivityLevel: string): Promise<void> {
    const campaigns = {
      early_inactivity: {
        subject: 'We miss you!',
        message: 'Come back and check out our latest mortgage rates and tools.',
        cta: 'Return to Platform'
      },
      moderate_inactivity: {
        subject: 'Don\'t miss out on great opportunities',
        message: 'The mortgage market is changing fast. Stay updated with our latest insights.',
        cta: 'Stay Updated'
      },
      high_inactivity: {
        subject: 'Last chance to save',
        message: 'We\'re offering exclusive rates for returning users. Don\'t miss out!',
        cta: 'Claim Offer'
      }
    }

    const campaign = campaigns[inactivityLevel as keyof typeof campaigns]
    await this.sendNotification('re_engagement', campaign.message, 'email')
  }
}