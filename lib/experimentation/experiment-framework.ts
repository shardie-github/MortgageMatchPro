import { GrowthBook } from '@growthbook/growthbook'
import { z } from 'zod'
import { trackEvent, identifyUser } from '../analytics'
import { supabaseAdmin } from '../supabase'

// Experiment configuration schemas
export const ExperimentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['draft', 'running', 'paused', 'completed']),
  startDate: z.string(),
  endDate: z.string().optional(),
  trafficAllocation: z.number().min(0).max(1),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    weight: z.number().min(0).max(1),
    config: z.record(z.any())
  })),
  targetingRules: z.array(z.object({
    attribute: z.string(),
    operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'in', 'notIn']),
    value: z.any()
  })),
  metrics: z.array(z.object({
    name: z.string(),
    type: z.enum(['conversion', 'engagement', 'revenue', 'retention']),
    goal: z.enum(['maximize', 'minimize']),
    primary: z.boolean().default(false)
  })),
  hypothesis: z.string(),
  successCriteria: z.object({
    minSampleSize: z.number(),
    confidenceLevel: z.number().min(0.8).max(0.99),
    minLift: z.number().min(0.01)
  })
})

export const ExperimentResultSchema = z.object({
  experimentId: z.string(),
  variantId: z.string(),
  userId: z.string(),
  sessionId: z.string(),
  timestamp: z.string(),
  metrics: z.record(z.number()),
  context: z.record(z.any())
})

export type ExperimentConfig = z.infer<typeof ExperimentConfigSchema>
export type ExperimentResult = z.infer<typeof ExperimentResultSchema>

// User segmentation schema
export const UserSegmentSchema = z.object({
  userId: z.string(),
  segments: z.array(z.string()),
  attributes: z.record(z.any()),
  lastUpdated: z.string()
})

export type UserSegment = z.infer<typeof UserSegmentSchema>

// Experiment variants for different features
export const EXPERIMENT_VARIANTS = {
  // UI/UX variants
  CTA_BUTTON_STYLE: {
    control: { style: 'primary', text: 'Get Started', size: 'lg' },
    variant_a: { style: 'secondary', text: 'Start Your Journey', size: 'lg' },
    variant_b: { style: 'outline', text: 'Calculate Now', size: 'xl' }
  },
  
  // Onboarding flow variants
  ONBOARDING_FLOW: {
    control: { steps: ['welcome', 'goals', 'budget', 'demo'], order: 'sequential' },
    variant_a: { steps: ['welcome', 'demo', 'goals', 'budget'], order: 'demo_first' },
    variant_b: { steps: ['welcome', 'budget', 'goals', 'demo'], order: 'budget_first' }
  },
  
  // Pricing display variants
  PRICING_DISPLAY: {
    control: { layout: 'cards', highlight: 'most_popular', cta: 'Choose Plan' },
    variant_a: { layout: 'table', highlight: 'best_value', cta: 'Get Started' },
    variant_b: { layout: 'comparison', highlight: 'premium', cta: 'Upgrade Now' }
  },
  
  // AI prompt tone variants
  AI_PROMPT_TONE: {
    control: { tone: 'professional', style: 'informative', length: 'medium' },
    variant_a: { tone: 'friendly', style: 'conversational', length: 'short' },
    variant_b: { tone: 'expert', style: 'detailed', length: 'long' }
  }
}

export class ExperimentFramework {
  private growthbook: GrowthBook
  private experiments: Map<string, ExperimentConfig> = new Map()
  private userSegments: Map<string, UserSegment> = new Map()

  constructor() {
    this.growthbook = new GrowthBook({
      apiHost: process.env.NEXT_PUBLIC_GROWTHBOOK_HOST || 'https://cdn.growthbook.io',
      clientKey: process.env.NEXT_PUBLIC_GROWTHBOOK_KEY || '',
      enableDevMode: process.env.NODE_ENV === 'development',
      trackingCallback: (experiment, result) => {
        this.trackExperimentEvent(experiment, result)
      }
    })
  }

  /**
   * Initialize the experiment framework
   */
  async initialize(): Promise<void> {
    try {
      // Load experiments from database
      await this.loadExperiments()
      
      // Load user segments
      await this.loadUserSegments()
      
      // Initialize GrowthBook
      await this.growthbook.loadFeatures()
      
      console.log('Experiment framework initialized')
    } catch (error) {
      console.error('Error initializing experiment framework:', error)
      throw error
    }
  }

  /**
   * Get experiment variant for a user
   */
  getVariant(experimentKey: string, userId: string, attributes: Record<string, any> = {}): {
    variant: string
    config: any
    inExperiment: boolean
  } {
    try {
      // Set user attributes for targeting
      this.growthbook.setAttributes({
        userId,
        ...attributes,
        ...this.getUserSegmentAttributes(userId)
      })

      // Get experiment result
      const result = this.growthbook.getFeatureValue(experimentKey, 'control')
      
      if (!result || result === 'control') {
        return {
          variant: 'control',
          config: this.getVariantConfig(experimentKey, 'control'),
          inExperiment: false
        }
      }

      return {
        variant: result,
        config: this.getVariantConfig(experimentKey, result),
        inExperiment: true
      }
    } catch (error) {
      console.error('Error getting experiment variant:', error)
      return {
        variant: 'control',
        config: this.getVariantConfig(experimentKey, 'control'),
        inExperiment: false
      }
    }
  }

  /**
   * Track experiment event
   */
  async trackExperimentEvent(experiment: any, result: any): Promise<void> {
    try {
      // Store experiment result in database
      await supabaseAdmin
        .from('experiment_results')
        .insert({
          experiment_id: experiment.key,
          variant_id: result.value,
          user_id: result.userId,
          session_id: result.sessionId || `session_${Date.now()}`,
          timestamp: new Date().toISOString(),
          metrics: result.metrics || {},
          context: result.context || {}
        })

      // Track in PostHog
      trackEvent('experiment_exposure', {
        experiment_id: experiment.key,
        variant_id: result.value,
        user_id: result.userId,
        experiment_name: experiment.name
      })
    } catch (error) {
      console.error('Error tracking experiment event:', error)
    }
  }

  /**
   * Track experiment conversion
   */
  async trackConversion(
    experimentId: string,
    userId: string,
    conversionType: string,
    value: number = 1,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Store conversion in database
      await supabaseAdmin
        .from('experiment_conversions')
        .insert({
          experiment_id: experimentId,
          user_id: userId,
          conversion_type: conversionType,
          value,
          metadata,
          timestamp: new Date().toISOString()
        })

      // Track in PostHog
      trackEvent('experiment_conversion', {
        experiment_id: experimentId,
        conversion_type: conversionType,
        value,
        user_id: userId,
        ...metadata
      })
    } catch (error) {
      console.error('Error tracking experiment conversion:', error)
    }
  }

  /**
   * Create a new experiment
   */
  async createExperiment(config: ExperimentConfig): Promise<string> {
    try {
      // Validate config
      const validatedConfig = ExperimentConfigSchema.parse(config)
      
      // Store in database
      const { data, error } = await supabaseAdmin
        .from('experiments')
        .insert(validatedConfig)
        .select()
        .single()

      if (error) throw error

      // Add to local cache
      this.experiments.set(validatedConfig.id, validatedConfig)

      // Update GrowthBook
      await this.updateGrowthBookExperiment(validatedConfig)

      return data.id
    } catch (error) {
      console.error('Error creating experiment:', error)
      throw error
    }
  }

  /**
   * Get experiment results and statistics
   */
  async getExperimentResults(experimentId: string): Promise<{
    summary: any
    variants: any[]
    significance: any
    recommendations: string[]
  }> {
    try {
      // Get experiment data
      const { data: experiment } = await supabaseAdmin
        .from('experiments')
        .select('*')
        .eq('id', experimentId)
        .single()

      if (!experiment) {
        throw new Error('Experiment not found')
      }

      // Get results data
      const { data: results } = await supabaseAdmin
        .from('experiment_results')
        .select('*')
        .eq('experiment_id', experimentId)

      // Get conversions data
      const { data: conversions } = await supabaseAdmin
        .from('experiment_conversions')
        .select('*')
        .eq('experiment_id', experimentId)

      // Calculate statistics
      const summary = this.calculateExperimentSummary(results, conversions)
      const variants = this.calculateVariantStats(results, conversions, experiment.variants)
      const significance = this.calculateStatisticalSignificance(variants)
      const recommendations = this.generateRecommendations(summary, significance)

      return {
        summary,
        variants,
        significance,
        recommendations
      }
    } catch (error) {
      console.error('Error getting experiment results:', error)
      throw error
    }
  }

  /**
   * Update user segmentation
   */
  async updateUserSegment(userId: string, segments: string[], attributes: Record<string, any>): Promise<void> {
    try {
      const userSegment: UserSegment = {
        userId,
        segments,
        attributes,
        lastUpdated: new Date().toISOString()
      }

      // Store in database
      await supabaseAdmin
        .from('user_segments')
        .upsert(userSegment)

      // Update local cache
      this.userSegments.set(userId, userSegment)

      // Update GrowthBook attributes
      this.growthbook.setAttributes({
        userId,
        segments,
        ...attributes
      })
    } catch (error) {
      console.error('Error updating user segment:', error)
    }
  }

  private async loadExperiments(): Promise<void> {
    const { data: experiments } = await supabaseAdmin
      .from('experiments')
      .select('*')
      .eq('status', 'running')

    if (experiments) {
      experiments.forEach(exp => {
        this.experiments.set(exp.id, exp)
      })
    }
  }

  private async loadUserSegments(): Promise<void> {
    const { data: segments } = await supabaseAdmin
      .from('user_segments')
      .select('*')

    if (segments) {
      segments.forEach(segment => {
        this.userSegments.set(segment.user_id, segment)
      })
    }
  }

  private getUserSegmentAttributes(userId: string): Record<string, any> {
    const segment = this.userSegments.get(userId)
    return segment ? { ...segment.attributes, segments: segment.segments } : {}
  }

  private getVariantConfig(experimentKey: string, variant: string): any {
    const variants = EXPERIMENT_VARIANTS[experimentKey as keyof typeof EXPERIMENT_VARIANTS]
    return variants?.[variant as keyof typeof variants] || variants?.control || {}
  }

  private async updateGrowthBookExperiment(config: ExperimentConfig): Promise<void> {
    // This would update GrowthBook with the new experiment configuration
    // Implementation depends on GrowthBook API
  }

  private calculateExperimentSummary(results: any[], conversions: any[]): any {
    const totalUsers = results.length
    const totalConversions = conversions.length
    const conversionRate = totalUsers > 0 ? totalConversions / totalUsers : 0

    return {
      totalUsers,
      totalConversions,
      conversionRate,
      duration: this.calculateExperimentDuration(results)
    }
  }

  private calculateVariantStats(results: any[], conversions: any[], variants: any[]): any[] {
    return variants.map(variant => {
      const variantResults = results.filter(r => r.variant_id === variant.id)
      const variantConversions = conversions.filter(c => 
        variantResults.some(r => r.user_id === c.user_id)
      )

      return {
        variantId: variant.id,
        variantName: variant.name,
        users: variantResults.length,
        conversions: variantConversions.length,
        conversionRate: variantResults.length > 0 ? variantConversions.length / variantResults.length : 0,
        revenue: variantConversions.reduce((sum, c) => sum + (c.value || 0), 0)
      }
    })
  }

  private calculateStatisticalSignificance(variants: any[]): any {
    // Implement statistical significance calculation
    // This would use proper statistical methods like chi-square test
    return {
      isSignificant: false,
      confidenceLevel: 0.95,
      pValue: 0.1
    }
  }

  private generateRecommendations(summary: any, significance: any): string[] {
    const recommendations: string[] = []

    if (significance.isSignificant) {
      recommendations.push('Experiment shows statistically significant results')
    } else {
      recommendations.push('Experiment needs more data for statistical significance')
    }

    if (summary.conversionRate > 0.1) {
      recommendations.push('High conversion rate detected - consider scaling')
    }

    return recommendations
  }

  private calculateExperimentDuration(results: any[]): number {
    if (results.length === 0) return 0
    
    const timestamps = results.map(r => new Date(r.timestamp).getTime())
    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)
    
    return (maxTime - minTime) / (1000 * 60 * 60 * 24) // days
  }
}

// Singleton instance
export const experimentFramework = new ExperimentFramework()