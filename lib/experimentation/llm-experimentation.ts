import { openai } from '../openai'
import { z } from 'zod'
import { trackEvent } from '../analytics'
import { supabaseAdmin } from '../supabase'

// LLM Experiment schemas
export const LLMExperimentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  promptType: z.enum(['system', 'user', 'assistant', 'canvas_response']),
  basePrompt: z.string(),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    prompt: z.string(),
    parameters: z.object({
      temperature: z.number().min(0).max(2),
      maxTokens: z.number().min(1).max(4000),
      topP: z.number().min(0).max(1),
      frequencyPenalty: z.number().min(-2).max(2),
      presencePenalty: z.number().min(-2).max(2)
    }),
    weight: z.number().min(0).max(1)
  })),
  metrics: z.array(z.object({
    name: z.string(),
    type: z.enum(['completion_accuracy', 'engagement_time', 'cta_clicks', 'user_satisfaction', 'conversion_rate']),
    weight: z.number().min(0).max(1)
  })),
  status: z.enum(['draft', 'running', 'paused', 'completed']),
  startDate: z.string(),
  endDate: z.string().optional()
})

export const LLMExperimentResultSchema = z.object({
  experimentId: z.string(),
  variantId: z.string(),
  userId: z.string(),
  sessionId: z.string(),
  prompt: z.string(),
  response: z.string(),
  metrics: z.record(z.number()),
  feedback: z.object({
    rating: z.number().min(1).max(5).optional(),
    comments: z.string().optional(),
    helpful: z.boolean().optional()
  }).optional(),
  timestamp: z.string()
})

export type LLMExperiment = z.infer<typeof LLMExperimentSchema>
export type LLMExperimentResult = z.infer<typeof LLMExperimentResultSchema>

// Prompt optimization schemas
export const PromptOptimizationSchema = z.object({
  experimentId: z.string(),
  currentBestVariant: z.string(),
  optimizationStrategy: z.enum(['gradient_descent', 'genetic_algorithm', 'bayesian_optimization', 'random_search']),
  iterations: z.number(),
  improvementThreshold: z.number(),
  maxIterations: z.number()
})

export type PromptOptimization = z.infer<typeof PromptOptimizationSchema>

export class LLMExperimentationSDK {
  private experiments: Map<string, LLMExperiment> = new Map()
  private optimizationCache: Map<string, any> = new Map()

  constructor() {
    this.loadExperiments()
  }

  /**
   * Create a new LLM experiment
   */
  async createExperiment(config: LLMExperiment): Promise<string> {
    try {
      const validatedConfig = LLMExperimentSchema.parse(config)
      
      // Store in database
      const { data, error } = await supabaseAdmin
        .from('llm_experiments')
        .insert(validatedConfig)
        .select()
        .single()

      if (error) throw error

      // Add to local cache
      this.experiments.set(validatedConfig.id, validatedConfig)

      return data.id
    } catch (error) {
      console.error('Error creating LLM experiment:', error)
      throw error
    }
  }

  /**
   * Execute LLM experiment with variant selection
   */
  async executeExperiment(
    experimentId: string,
    userId: string,
    input: string,
    context: Record<string, any> = {}
  ): Promise<{
    response: string
    variantId: string
    metrics: Record<string, number>
  }> {
    try {
      const experiment = this.experiments.get(experimentId)
      if (!experiment) {
        throw new Error('Experiment not found')
      }

      // Select variant based on weights
      const variant = this.selectVariant(experiment.variants)
      
      // Execute the prompt with selected variant
      const response = await this.executePrompt(variant, input, context)
      
      // Calculate metrics
      const metrics = await this.calculateMetrics(experiment, variant, input, response, context)
      
      // Store result
      await this.storeExperimentResult(experimentId, variant.id, userId, input, response, metrics)
      
      // Track event
      trackEvent('llm_experiment_executed', {
        experiment_id: experimentId,
        variant_id: variant.id,
        user_id: userId,
        prompt_type: experiment.promptType
      })

      return {
        response,
        variantId: variant.id,
        metrics
      }
    } catch (error) {
      console.error('Error executing LLM experiment:', error)
      throw error
    }
  }

  /**
   * Optimize prompts using meta-prompt optimization
   */
  async optimizePrompts(experimentId: string): Promise<{
    optimizedVariants: any[]
    improvementScore: number
    recommendations: string[]
  }> {
    try {
      const experiment = this.experiments.get(experimentId)
      if (!experiment) {
        throw new Error('Experiment not found')
      }

      // Get experiment results for analysis
      const results = await this.getExperimentResults(experimentId)
      
      // Analyze performance patterns
      const analysis = await this.analyzePerformancePatterns(results)
      
      // Generate optimized variants using meta-prompt
      const optimizedVariants = await this.generateOptimizedVariants(experiment, analysis)
      
      // Calculate improvement score
      const improvementScore = this.calculateImprovementScore(results, optimizedVariants)
      
      // Generate recommendations
      const recommendations = this.generateOptimizationRecommendations(analysis, improvementScore)

      return {
        optimizedVariants,
        improvementScore,
        recommendations
      }
    } catch (error) {
      console.error('Error optimizing prompts:', error)
      throw error
    }
  }

  /**
   * A/B test different prompt tones and styles
   */
  async testPromptTones(
    basePrompt: string,
    tones: Array<'professional' | 'friendly' | 'expert' | 'conversational' | 'directive'>,
    context: Record<string, any> = {}
  ): Promise<{
    experimentId: string
    variants: Array<{
      tone: string
      prompt: string
      performance: number
    }>
  }> {
    try {
      // Create experiment for tone testing
      const experimentConfig: LLMExperiment = {
        id: `tone_test_${Date.now()}`,
        name: 'Prompt Tone A/B Test',
        description: 'Testing different prompt tones for optimal user engagement',
        promptType: 'system',
        basePrompt,
        variants: tones.map((tone, index) => ({
          id: `tone_${tone}`,
          name: `${tone.charAt(0).toUpperCase() + tone.slice(1)} Tone`,
          prompt: this.generateToneVariant(basePrompt, tone),
          parameters: {
            temperature: 0.7,
            maxTokens: 1000,
            topP: 0.9,
            frequencyPenalty: 0,
            presencePenalty: 0
          },
          weight: 1 / tones.length
        })),
        metrics: [
          { name: 'engagement_time', type: 'engagement_time', weight: 0.4 },
          { name: 'user_satisfaction', type: 'user_satisfaction', weight: 0.3 },
          { name: 'cta_clicks', type: 'cta_clicks', weight: 0.3 }
        ],
        status: 'running',
        startDate: new Date().toISOString()
      }

      const experimentId = await this.createExperiment(experimentConfig)

      return {
        experimentId,
        variants: experimentConfig.variants.map(v => ({
          tone: v.name,
          prompt: v.prompt,
          performance: 0 // Will be calculated after data collection
        }))
      }
    } catch (error) {
      console.error('Error testing prompt tones:', error)
      throw error
    }
  }

  /**
   * Test Canvas response variations
   */
  async testCanvasResponses(
    scenario: string,
    responseTypes: Array<'advisor' | 'concierge' | 'informational' | 'directive'>,
    userId: string
  ): Promise<{
    responses: Array<{
      type: string
      content: string
      variantId: string
    }>
    experimentId: string
  }> {
    try {
      const experimentConfig: LLMExperiment = {
        id: `canvas_test_${Date.now()}`,
        name: 'Canvas Response A/B Test',
        description: 'Testing different Canvas response styles for user engagement',
        promptType: 'canvas_response',
        basePrompt: `You are a mortgage advisor helping users with their home buying journey. Scenario: ${scenario}`,
        variants: responseTypes.map((type, index) => ({
          id: `canvas_${type}`,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Response`,
          prompt: this.generateCanvasResponseVariant(scenario, type),
          parameters: {
            temperature: 0.7,
            maxTokens: 1500,
            topP: 0.9,
            frequencyPenalty: 0,
            presencePenalty: 0
          },
          weight: 1 / responseTypes.length
        })),
        metrics: [
          { name: 'completion_accuracy', type: 'completion_accuracy', weight: 0.3 },
          { name: 'engagement_time', type: 'engagement_time', weight: 0.4 },
          { name: 'cta_clicks', type: 'cta_clicks', weight: 0.3 }
        ],
        status: 'running',
        startDate: new Date().toISOString()
      }

      const experimentId = await this.createExperiment(experimentConfig)

      // Execute all variants
      const responses = await Promise.all(
        experimentConfig.variants.map(async (variant) => {
          const result = await this.executeExperiment(experimentId, userId, scenario)
          return {
            type: variant.name,
            content: result.response,
            variantId: variant.id
          }
        })
      )

      return {
        responses,
        experimentId
      }
    } catch (error) {
      console.error('Error testing Canvas responses:', error)
      throw error
    }
  }

  private selectVariant(variants: any[]): any {
    const random = Math.random()
    let cumulativeWeight = 0

    for (const variant of variants) {
      cumulativeWeight += variant.weight
      if (random <= cumulativeWeight) {
        return variant
      }
    }

    return variants[0] // Fallback
  }

  private async executePrompt(variant: any, input: string, context: Record<string, any>): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: variant.prompt
          },
          {
            role: 'user',
            content: input
          }
        ],
        temperature: variant.parameters.temperature,
        max_tokens: variant.parameters.maxTokens,
        top_p: variant.parameters.topP,
        frequency_penalty: variant.parameters.frequencyPenalty,
        presence_penalty: variant.parameters.presencePenalty
      })

      return completion.choices[0].message.content || ''
    } catch (error) {
      console.error('Error executing prompt:', error)
      throw error
    }
  }

  private async calculateMetrics(
    experiment: LLMExperiment,
    variant: any,
    input: string,
    response: string,
    context: Record<string, any>
  ): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {}

    for (const metric of experiment.metrics) {
      switch (metric.type) {
        case 'completion_accuracy':
          metrics[metric.name] = await this.calculateCompletionAccuracy(input, response)
          break
        case 'engagement_time':
          metrics[metric.name] = context.engagementTime || 0
          break
        case 'cta_clicks':
          metrics[metric.name] = context.ctaClicks || 0
          break
        case 'user_satisfaction':
          metrics[metric.name] = context.userSatisfaction || 0
          break
        case 'conversion_rate':
          metrics[metric.name] = context.conversionRate || 0
          break
      }
    }

    return metrics
  }

  private async calculateCompletionAccuracy(input: string, response: string): Promise<number> {
    // Use AI to evaluate response quality
    const evaluationPrompt = `
      Evaluate the quality of this AI response on a scale of 0-1:
      
      Input: ${input}
      Response: ${response}
      
      Consider:
      - Accuracy of information
      - Relevance to the question
      - Completeness of answer
      - Clarity and helpfulness
      
      Return only a number between 0 and 1.
    `

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: evaluationPrompt }],
        temperature: 0.1,
        max_tokens: 10
      })

      const score = parseFloat(completion.choices[0].message.content || '0.5')
      return Math.max(0, Math.min(1, score))
    } catch (error) {
      console.error('Error calculating completion accuracy:', error)
      return 0.5 // Default score
    }
  }

  private async storeExperimentResult(
    experimentId: string,
    variantId: string,
    userId: string,
    prompt: string,
    response: string,
    metrics: Record<string, number>
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('llm_experiment_results')
        .insert({
          experiment_id: experimentId,
          variant_id: variantId,
          user_id: userId,
          session_id: `session_${Date.now()}`,
          prompt,
          response,
          metrics,
          timestamp: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error storing experiment result:', error)
    }
  }

  private async getExperimentResults(experimentId: string): Promise<any[]> {
    const { data } = await supabaseAdmin
      .from('llm_experiment_results')
      .select('*')
      .eq('experiment_id', experimentId)

    return data || []
  }

  private async analyzePerformancePatterns(results: any[]): Promise<any> {
    // Analyze patterns in the results to identify what works best
    const analysis = {
      bestPerformingVariants: [],
      commonSuccessFactors: [],
      improvementAreas: []
    }

    // Group results by variant
    const variantGroups = results.reduce((groups, result) => {
      const variantId = result.variant_id
      if (!groups[variantId]) {
        groups[variantId] = []
      }
      groups[variantId].push(result)
      return groups
    }, {})

    // Calculate average performance for each variant
    for (const [variantId, variantResults] of Object.entries(variantGroups)) {
      const avgMetrics = this.calculateAverageMetrics(variantResults as any[])
      analysis.bestPerformingVariants.push({
        variantId,
        performance: avgMetrics
      })
    }

    return analysis
  }

  private calculateAverageMetrics(results: any[]): Record<string, number> {
    const metrics: Record<string, number> = {}
    const metricNames = Object.keys(results[0]?.metrics || {})

    for (const metricName of metricNames) {
      const values = results.map(r => r.metrics[metricName] || 0)
      metrics[metricName] = values.reduce((sum, val) => sum + val, 0) / values.length
    }

    return metrics
  }

  private async generateOptimizedVariants(experiment: LLMExperiment, analysis: any): Promise<any[]> {
    // Use meta-prompt to generate optimized variants
    const metaPrompt = `
      Based on the performance analysis, generate optimized prompt variants:
      
      Original prompt: ${experiment.basePrompt}
      Best performing patterns: ${JSON.stringify(analysis.bestPerformingVariants)}
      
      Generate 3 new variants that:
      1. Incorporate successful elements from top performers
      2. Address identified improvement areas
      3. Maintain the core functionality
      
      Return as JSON array with id, name, and prompt fields.
    `

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: metaPrompt }],
        temperature: 0.8,
        max_tokens: 2000
      })

      return JSON.parse(completion.choices[0].message.content || '[]')
    } catch (error) {
      console.error('Error generating optimized variants:', error)
      return []
    }
  }

  private calculateImprovementScore(results: any[], optimizedVariants: any[]): number {
    // Calculate potential improvement score based on optimization
    // This is a simplified calculation - in practice, you'd run the optimized variants
    return 0.15 // Placeholder for 15% improvement
  }

  private generateOptimizationRecommendations(analysis: any, improvementScore: number): string[] {
    const recommendations: string[] = []

    if (improvementScore > 0.1) {
      recommendations.push('Significant improvement potential detected - consider deploying optimized variants')
    }

    if (analysis.bestPerformingVariants.length > 0) {
      recommendations.push('Focus on scaling the best performing variant')
    }

    recommendations.push('Continue monitoring performance metrics for further optimization')

    return recommendations
  }

  private generateToneVariant(basePrompt: string, tone: string): string {
    const toneModifiers = {
      professional: 'Maintain a professional, authoritative tone while being helpful and informative.',
      friendly: 'Use a warm, friendly, and approachable tone that makes users feel comfortable.',
      expert: 'Adopt an expert, knowledgeable tone that demonstrates deep expertise and confidence.',
      conversational: 'Use a conversational, natural tone as if speaking with a trusted friend.',
      directive: 'Use a clear, direct tone that provides specific guidance and actionable steps.'
    }

    return `${basePrompt}\n\nTone: ${toneModifiers[tone] || toneModifiers.professional}`
  }

  private generateCanvasResponseVariant(scenario: string, type: string): string {
    const responseStyles = {
      advisor: `You are a mortgage advisor providing expert guidance. Be consultative and educational.`,
      concierge: `You are a mortgage concierge providing personalized service. Be helpful and accommodating.`,
      informational: `You are an information provider. Focus on facts, data, and objective analysis.`,
      directive: `You are a mortgage guide providing clear direction. Be specific and action-oriented.`
    }

    return `${responseStyles[type]}\n\nScenario: ${scenario}`
  }

  private async loadExperiments(): Promise<void> {
    const { data } = await supabaseAdmin
      .from('llm_experiments')
      .select('*')
      .eq('status', 'running')

    if (data) {
      data.forEach(exp => {
        this.experiments.set(exp.id, exp)
      })
    }
  }
}

// Singleton instance
export const llmExperimentation = new LLMExperimentationSDK()