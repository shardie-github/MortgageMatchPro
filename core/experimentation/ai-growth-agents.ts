import { z } from 'zod'
import { trackEvent } from '../analytics'
import { supabaseAdmin } from '../supabase'
import { openai } from '../openai'
import { experimentFramework } from './experiment-framework'
import { llmExperimentation } from './llm-experimentation'
import { personalizationEngine } from './personalization-engine'

// Growth agent schemas
export const GrowthHypothesisSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  hypothesis: z.string(),
  expectedImpact: z.string(),
  metrics: z.array(z.string()),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['draft', 'testing', 'validated', 'rejected']),
  createdAt: z.string(),
  createdBy: z.string()
})

export const ExperimentDesignSchema = z.object({
  id: z.string(),
  hypothesisId: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['ab_test', 'multivariate', 'llm_experiment', 'personalization']),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    config: z.record(z.any())
  })),
  trafficAllocation: z.number().min(0).max(1),
  duration: z.number(), // days
  successCriteria: z.object({
    primaryMetric: z.string(),
    minLift: z.number(),
    confidenceLevel: z.number()
  }),
  status: z.enum(['draft', 'running', 'completed', 'cancelled'])
})

export const GrowthInsightSchema = z.object({
  id: z.string(),
  type: z.enum(['performance', 'user_behavior', 'conversion', 'retention', 'revenue']),
  title: z.string(),
  description: z.string(),
  data: z.record(z.any()),
  confidence: z.number(),
  actionable: z.boolean(),
  recommendations: z.array(z.string()),
  createdAt: z.string()
})

export type GrowthHypothesis = z.infer<typeof GrowthHypothesisSchema>
export type ExperimentDesign = z.infer<typeof ExperimentDesignSchema>
export type GrowthInsight = z.infer<typeof GrowthInsightSchema>

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
   * Monitor user performance and schedule retention tests
   */
  async monitorAndScheduleRetentionTests(): Promise<{
    testsScheduled: number
    insights: GrowthInsight[]
    recommendations: string[]
  }> {
    try {
      // Analyze user performance
      const performanceAnalysis = await this.analyzeUserPerformance()
      
      // Generate insights
      const insights = await this.generateRetentionInsights(performanceAnalysis)
      
      // Schedule retention tests
      const testsScheduled = await this.scheduleRetentionTests(insights)
      
      // Generate recommendations
      const recommendations = await this.generateRetentionRecommendations(insights)

      // Track retention monitoring
      trackEvent('retention_monitoring_completed', {
        user_id: this.userId,
        tests_scheduled: testsScheduled,
        insights_generated: insights.length,
        user_segment: this.userSegment
      })

      return {
        testsScheduled,
        insights,
        recommendations
      }
    } catch (error) {
      console.error('Error in retention monitoring:', error)
      throw error
    }
  }

  /**
   * Analyze user performance patterns
   */
  private async analyzeUserPerformance(): Promise<Record<string, any>> {
    // Get user engagement data
    const { data: engagementData } = await supabaseAdmin
      .from('user_engagement_metrics')
      .select('*')
      .eq('user_id', this.userId)
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Get conversion data
    const { data: conversions } = await supabaseAdmin
      .from('experiment_conversions')
      .select('*')
      .eq('user_id', this.userId)
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Calculate performance metrics
    const sessionCount = engagementData?.filter(e => e.metric_type === 'page_view').length || 0
    const conversionCount = conversions?.length || 0
    const conversionRate = sessionCount > 0 ? conversionCount / sessionCount : 0
    const avgSessionDuration = this.calculateAverageSessionDuration(engagementData || [])
    const featureUsage = this.calculateFeatureUsage(engagementData || [])

    return {
      sessionCount,
      conversionCount,
      conversionRate,
      avgSessionDuration,
      featureUsage,
      lastActiveAt: engagementData?.[0]?.recorded_at,
      engagementTrend: this.calculateEngagementTrend(engagementData || [])
    }
  }

  /**
   * Generate retention insights using AI
   */
  private async generateRetentionInsights(performanceAnalysis: Record<string, any>): Promise<GrowthInsight[]> {
    const insights: GrowthInsight[] = []

    // Use AI to analyze performance and generate insights
    const prompt = `
      Analyze this user's performance data and generate actionable retention insights:
      
      User Data:
      - Session Count: ${performanceAnalysis.sessionCount}
      - Conversion Rate: ${performanceAnalysis.conversionRate}
      - Average Session Duration: ${performanceAnalysis.avgSessionDuration} minutes
      - Feature Usage: ${JSON.stringify(performanceAnalysis.featureUsage)}
      - Engagement Trend: ${performanceAnalysis.engagementTrend}
      - User Segment: ${this.userSegment}
      
      Generate insights about:
      1. User engagement patterns
      2. Conversion opportunities
      3. Retention risks
      4. Personalization opportunities
      
      Return as JSON array with type, title, description, data, confidence, actionable, and recommendations fields.
    `

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      })

      const aiInsights = JSON.parse(completion.choices[0].message.content || '[]')
      
      // Convert to GrowthInsight format
      aiInsights.forEach((insight: any, index: number) => {
        insights.push({
          id: `insight_${Date.now()}_${index}`,
          type: insight.type || 'user_behavior',
          title: insight.title || 'Performance Insight',
          description: insight.description || '',
          data: insight.data || {},
          confidence: insight.confidence || 0.7,
          actionable: insight.actionable || true,
          recommendations: insight.recommendations || [],
          createdAt: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Error generating retention insights:', error)
    }

    return insights
  }

  /**
   * Schedule retention tests based on insights
   */
  private async scheduleRetentionTests(insights: GrowthInsight[]): Promise<number> {
    let testsScheduled = 0

    for (const insight of insights) {
      if (insight.actionable && insight.recommendations.length > 0) {
        // Create experiment design for retention test
        const experimentDesign: ExperimentDesign = {
          id: `retention_test_${Date.now()}`,
          hypothesisId: `hypothesis_${Date.now()}`,
          name: `Retention Test: ${insight.title}`,
          description: insight.description,
          type: 'ab_test',
          variants: [
            {
              id: 'control',
              name: 'Control',
              config: { message: 'Standard retention message' }
            },
            {
              id: 'variant_a',
              name: 'Personalized Retention',
              config: { 
                message: insight.recommendations[0],
                personalization: true
              }
            }
          ],
          trafficAllocation: 0.5,
          duration: 7, // 7 days
          successCriteria: {
            primaryMetric: 'retention_rate',
            minLift: 0.1,
            confidenceLevel: 0.95
          },
          status: 'draft'
        }

        // Store experiment design
        await supabaseAdmin
          .from('experiment_designs')
          .insert(experimentDesign)

        testsScheduled++
      }
    }

    return testsScheduled
  }

  /**
   * Generate retention recommendations
   */
  private async generateRetentionRecommendations(insights: GrowthInsight[]): Promise<string[]> {
    const recommendations: string[] = []

    for (const insight of insights) {
      if (insight.actionable) {
        recommendations.push(...insight.recommendations)
      }
    }

    // Add general retention recommendations
    recommendations.push('Monitor user engagement patterns regularly')
    recommendations.push('Implement personalized retention campaigns')
    recommendations.push('A/B test different retention strategies')

    return recommendations
  }

  private calculateAverageSessionDuration(engagementData: any[]): number {
    // Calculate average session duration from engagement data
    const sessions = this.groupSessions(engagementData)
    const durations = sessions.map(session => session.duration)
    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0
  }

  private calculateFeatureUsage(engagementData: any[]): Record<string, number> {
    const featureUsage: Record<string, number> = {}
    
    engagementData
      .filter(e => e.metric_type === 'feature_usage')
      .forEach(e => {
        const feature = e.context?.feature
        if (feature) {
          featureUsage[feature] = (featureUsage[feature] || 0) + 1
        }
      })

    return featureUsage
  }

  private calculateEngagementTrend(engagementData: any[]): string {
    if (engagementData.length < 2) return 'stable'
    
    const recent = engagementData.slice(0, Math.floor(engagementData.length / 2))
    const older = engagementData.slice(Math.floor(engagementData.length / 2))
    
    const recentCount = recent.length
    const olderCount = older.length
    
    if (recentCount > olderCount * 1.1) return 'increasing'
    if (recentCount < olderCount * 0.9) return 'decreasing'
    return 'stable'
  }

  private groupSessions(engagementData: any[]): any[] {
    // Group page views into sessions
    const sessions: any[] = []
    let currentSession: any[] = []
    
    engagementData
      .filter(e => e.metric_type === 'page_view')
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .forEach(event => {
        if (currentSession.length === 0) {
          currentSession = [event]
        } else {
          const lastEvent = currentSession[currentSession.length - 1]
          const timeDiff = new Date(event.recorded_at).getTime() - new Date(lastEvent.recorded_at).getTime()
          
          if (timeDiff > 30 * 60 * 1000) { // 30 minutes
            sessions.push({
              events: currentSession,
              duration: this.calculateSessionDuration(currentSession)
            })
            currentSession = [event]
          } else {
            currentSession.push(event)
          }
        }
      })
    
    if (currentSession.length > 0) {
      sessions.push({
        events: currentSession,
        duration: this.calculateSessionDuration(currentSession)
      })
    }
    
    return sessions
  }

  private calculateSessionDuration(sessionEvents: any[]): number {
    if (sessionEvents.length < 2) return 0
    
    const startTime = new Date(sessionEvents[0].recorded_at).getTime()
    const endTime = new Date(sessionEvents[sessionEvents.length - 1].recorded_at).getTime()
    
    return (endTime - startTime) / (1000 * 60) // minutes
  }
}

export class ExperimentBotAgent {
  private userId: string
  private userEmail: string
  private userSegment: string

  constructor(userId: string, userEmail: string, userSegment: string = 'homebuyer') {
    this.userId = userId
    this.userEmail = userEmail
    this.userSegment = userSegment
  }

  /**
   * Create hypotheses and design new A/B tests automatically
   */
  async createHypothesesAndDesignTests(): Promise<{
    hypothesesCreated: number
    experimentsDesigned: number
    insights: GrowthInsight[]
  }> {
    try {
      // Analyze underperforming features
      const performanceAnalysis = await this.analyzeFeaturePerformance()
      
      // Generate growth insights
      const insights = await this.generateGrowthInsights(performanceAnalysis)
      
      // Create hypotheses based on insights
      const hypothesesCreated = await this.createGrowthHypotheses(insights)
      
      // Design experiments for hypotheses
      const experimentsDesigned = await this.designExperiments(insights)

      // Track experiment bot activity
      trackEvent('experiment_bot_activity', {
        user_id: this.userId,
        hypotheses_created: hypothesesCreated,
        experiments_designed: experimentsDesigned,
        insights_generated: insights.length,
        user_segment: this.userSegment
      })

      return {
        hypothesesCreated,
        experimentsDesigned,
        insights
      }
    } catch (error) {
      console.error('Error in experiment bot activity:', error)
      throw error
    }
  }

  /**
   * Analyze feature performance to identify optimization opportunities
   */
  private async analyzeFeaturePerformance(): Promise<Record<string, any>> {
    // Get feature usage data
    const { data: featureUsage } = await supabaseAdmin
      .from('user_engagement_metrics')
      .select('*')
      .eq('metric_type', 'feature_usage')
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Get conversion data by feature
    const { data: conversions } = await supabaseAdmin
      .from('experiment_conversions')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Calculate feature performance metrics
    const featureMetrics: Record<string, any> = {}
    
    if (featureUsage) {
      const featureGroups = featureUsage.reduce((groups, usage) => {
        const feature = usage.context?.feature
        if (feature) {
          if (!groups[feature]) {
            groups[feature] = []
          }
          groups[feature].push(usage)
        }
        return groups
      }, {} as Record<string, any[]>)

      for (const [feature, usages] of Object.entries(featureGroups)) {
        const featureConversions = conversions?.filter(c => 
          c.metadata?.feature === feature
        ) || []

        featureMetrics[feature] = {
          usageCount: usages.length,
          conversionCount: featureConversions.length,
          conversionRate: usages.length > 0 ? featureConversions.length / usages.length : 0,
          avgUsageDuration: this.calculateAverageUsageDuration(usages),
          lastUsed: usages[0]?.recorded_at
        }
      }
    }

    return featureMetrics
  }

  /**
   * Generate growth insights using AI
   */
  private async generateGrowthInsights(performanceAnalysis: Record<string, any>): Promise<GrowthInsight[]> {
    const insights: GrowthInsight[] = []

    // Use AI to analyze performance and generate insights
    const prompt = `
      Analyze this feature performance data and generate growth insights:
      
      Feature Performance:
      ${JSON.stringify(performanceAnalysis, null, 2)}
      
      User Segment: ${this.userSegment}
      
      Generate insights about:
      1. Underperforming features that need optimization
      2. High-potential features that could be improved
      3. User behavior patterns that suggest A/B test opportunities
      4. Conversion bottlenecks and optimization opportunities
      
      Return as JSON array with type, title, description, data, confidence, actionable, and recommendations fields.
    `

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })

      const aiInsights = JSON.parse(completion.choices[0].message.content || '[]')
      
      // Convert to GrowthInsight format
      aiInsights.forEach((insight: any, index: number) => {
        insights.push({
          id: `growth_insight_${Date.now()}_${index}`,
          type: insight.type || 'performance',
          title: insight.title || 'Growth Insight',
          description: insight.description || '',
          data: insight.data || {},
          confidence: insight.confidence || 0.7,
          actionable: insight.actionable || true,
          recommendations: insight.recommendations || [],
          createdAt: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Error generating growth insights:', error)
    }

    return insights
  }

  /**
   * Create growth hypotheses based on insights
   */
  private async createGrowthHypotheses(insights: GrowthInsight[]): Promise<number> {
    let hypothesesCreated = 0

    for (const insight of insights) {
      if (insight.actionable && insight.recommendations.length > 0) {
        // Generate hypothesis using AI
        const hypothesis = await this.generateHypothesis(insight)
        
        if (hypothesis) {
          // Store hypothesis
          await supabaseAdmin
            .from('growth_hypotheses')
            .insert(hypothesis)
          
          hypothesesCreated++
        }
      }
    }

    return hypothesesCreated
  }

  /**
   * Design experiments for hypotheses
   */
  private async designExperiments(insights: GrowthInsight[]): Promise<number> {
    let experimentsDesigned = 0

    for (const insight of insights) {
      if (insight.actionable) {
        // Design experiment using AI
        const experimentDesign = await this.generateExperimentDesign(insight)
        
        if (experimentDesign) {
          // Store experiment design
          await supabaseAdmin
            .from('experiment_designs')
            .insert(experimentDesign)
          
          experimentsDesigned++
        }
      }
    }

    return experimentsDesigned
  }

  /**
   * Generate hypothesis using AI
   */
  private async generateHypothesis(insight: GrowthInsight): Promise<GrowthHypothesis | null> {
    const prompt = `
      Based on this growth insight, create a testable hypothesis:
      
      Insight: ${insight.title}
      Description: ${insight.description}
      Recommendations: ${insight.recommendations.join(', ')}
      
      Create a hypothesis that:
      1. Is specific and testable
      2. Has a clear expected impact
      3. Includes measurable metrics
      4. Is prioritized appropriately
      
      Return as JSON with title, description, hypothesis, expectedImpact, metrics, and priority fields.
    `

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })

      const aiHypothesis = JSON.parse(completion.choices[0].message.content || '{}')
      
      return {
        id: `hypothesis_${Date.now()}`,
        title: aiHypothesis.title || 'Generated Hypothesis',
        description: aiHypothesis.description || '',
        hypothesis: aiHypothesis.hypothesis || '',
        expectedImpact: aiHypothesis.expectedImpact || '',
        metrics: aiHypothesis.metrics || [],
        priority: aiHypothesis.priority || 'medium',
        status: 'draft',
        createdAt: new Date().toISOString(),
        createdBy: 'experiment_bot'
      }
    } catch (error) {
      console.error('Error generating hypothesis:', error)
      return null
    }
  }

  /**
   * Generate experiment design using AI
   */
  private async generateExperimentDesign(insight: GrowthInsight): Promise<ExperimentDesign | null> {
    const prompt = `
      Based on this growth insight, design an A/B test experiment:
      
      Insight: ${insight.title}
      Description: ${insight.description}
      Recommendations: ${insight.recommendations.join(', ')}
      
      Design an experiment that:
      1. Tests the hypothesis effectively
      2. Has clear variants (control and treatment)
      3. Includes appropriate success metrics
      4. Has realistic duration and sample size
      
      Return as JSON with name, description, type, variants, trafficAllocation, duration, and successCriteria fields.
    `

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800
      })

      const aiDesign = JSON.parse(completion.choices[0].message.content || '{}')
      
      return {
        id: `experiment_${Date.now()}`,
        hypothesisId: `hypothesis_${Date.now()}`,
        name: aiDesign.name || 'Generated Experiment',
        description: aiDesign.description || '',
        type: aiDesign.type || 'ab_test',
        variants: aiDesign.variants || [
          { id: 'control', name: 'Control', config: {} },
          { id: 'variant_a', name: 'Treatment', config: {} }
        ],
        trafficAllocation: aiDesign.trafficAllocation || 0.5,
        duration: aiDesign.duration || 14,
        successCriteria: aiDesign.successCriteria || {
          primaryMetric: 'conversion_rate',
          minLift: 0.1,
          confidenceLevel: 0.95
        },
        status: 'draft'
      }
    } catch (error) {
      console.error('Error generating experiment design:', error)
      return null
    }
  }

  private calculateAverageUsageDuration(usages: any[]): number {
    // Calculate average usage duration from engagement data
    // This is a simplified calculation
    return usages.length * 2 // Placeholder: 2 minutes per usage
  }
}

// Singleton instances
export const retainBotAgent = new RetainBotAgent('system', 'system@mortgagematch.com', 'system')
export const experimentBotAgent = new ExperimentBotAgent('system', 'system@mortgagematch.com', 'system')