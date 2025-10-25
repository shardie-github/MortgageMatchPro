/**
 * Adaptive AI Prompting System
 * v1.2.0 - Context-aware prompting with feedback loops and explanation transparency
 */

import { z } from 'zod'
import { openai } from '../openai'
import { profileContextService } from '../context/ProfileContext'
import { personalizationEngine } from '../experimentation/personalization-engine'

// Prompt template schema
export const PromptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  basePrompt: z.string(),
  variables: z.array(z.string()),
  contextRequirements: z.array(z.string()),
  version: z.string(),
  effectiveness: z.number().min(0).max(1).default(0.5),
  usageCount: z.number().default(0),
  lastUpdated: z.string()
})

export type PromptTemplate = z.infer<typeof PromptTemplateSchema>

// Prompt chain step
export const PromptChainStepSchema = z.object({
  stepId: z.string(),
  templateId: z.string(),
  condition: z.string().optional(),
  fallbackTemplateId: z.string().optional(),
  maxRetries: z.number().default(3),
  timeout: z.number().default(30000)
})

export type PromptChainStep = z.infer<typeof PromptChainStepSchema>

// AI response with explanation
export const AIResponseSchema = z.object({
  content: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  factors: z.array(z.string()),
  suggestions: z.array(z.string()).optional(),
  metadata: z.object({
    model: z.string(),
    tokens: z.number(),
    latency: z.number(),
    templateId: z.string(),
    chainStep: z.string().optional()
  })
})

export type AIResponse = z.infer<typeof AIResponseSchema>

// Feedback for prompt optimization
export const PromptFeedbackSchema = z.object({
  userId: z.string(),
  templateId: z.string(),
  responseId: z.string(),
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
  factors: z.array(z.string()).optional(),
  timestamp: z.string()
})

export type PromptFeedback = z.infer<typeof PromptFeedbackSchema>

export class AdaptivePromptingService {
  private static instance: AdaptivePromptingService
  private templates: Map<string, PromptTemplate> = new Map()
  private promptChains: Map<string, PromptChainStep[]> = new Map()
  private feedbackHistory: PromptFeedback[] = []

  private constructor() {
    this.initializeDefaultTemplates()
  }

  static getInstance(): AdaptivePromptingService {
    if (!AdaptivePromptingService.instance) {
      AdaptivePromptingService.instance = new AdaptivePromptingService()
    }
    return AdaptivePromptingService.instance
  }

  /**
   * Generate AI response with adaptive prompting
   */
  async generateResponse(
    userId: string,
    promptType: string,
    context: Record<string, any> = {},
    options: {
      useChain?: boolean
      includeExplanation?: boolean
      maxRetries?: number
    } = {}
  ): Promise<AIResponse> {
    const startTime = Date.now()
    
    try {
      // Get user profile context
      const profileContext = await profileContextService.getProfileContext(userId)
      
      // Select appropriate template
      const template = await this.selectTemplate(promptType, profileContext, context)
      
      // Build personalized prompt
      const personalizedPrompt = await this.buildPersonalizedPrompt(
        template,
        profileContext,
        context
      )

      // Generate response
      let response: AIResponse
      
      if (options.useChain) {
        response = await this.executePromptChain(
          userId,
          promptType,
          personalizedPrompt,
          context,
          options.maxRetries || 3
        )
      } else {
        response = await this.executeSinglePrompt(
          template,
          personalizedPrompt,
          context,
          options.includeExplanation !== false
        )
      }

      // Add metadata
      response.metadata = {
        ...response.metadata,
        latency: Date.now() - startTime,
        templateId: template.id
      }

      // Update template usage
      await this.updateTemplateUsage(template.id)

      // Track for learning
      await this.trackResponse(userId, template.id, response, context)

      return response

    } catch (error) {
      console.error('Error generating adaptive response:', error)
      
      // Return fallback response
      return {
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        confidence: 0.1,
        reasoning: 'Error occurred during response generation',
        factors: ['system_error'],
        metadata: {
          model: 'gpt-4o-mini',
          tokens: 0,
          latency: Date.now() - startTime,
          templateId: 'error_fallback'
        }
      }
    }
  }

  /**
   * Add feedback to improve prompting
   */
  async addFeedback(
    userId: string,
    templateId: string,
    responseId: string,
    rating: number,
    feedback?: string,
    factors?: string[]
  ): Promise<void> {
    try {
      const promptFeedback: PromptFeedback = {
        userId,
        templateId,
        responseId,
        rating,
        feedback,
        factors,
        timestamp: new Date().toISOString()
      }

      this.feedbackHistory.push(promptFeedback)

      // Update template effectiveness
      await this.updateTemplateEffectiveness(templateId, rating)

      // If rating is low, trigger prompt optimization
      if (rating <= 2) {
        await this.optimizePrompt(templateId, promptFeedback)
      }

    } catch (error) {
      console.error('Error adding feedback:', error)
    }
  }

  /**
   * Get explanation for a response
   */
  async getResponseExplanation(
    responseId: string,
    userId: string
  ): Promise<{
    reasoning: string
    factors: string[]
    confidence: number
    alternativeApproaches: string[]
  }> {
    try {
      // In a real implementation, this would fetch from a database
      // For now, return a mock explanation
      return {
        reasoning: 'This response was generated based on your profile preferences and the specific context of your request.',
        factors: ['user_preferences', 'context_analysis', 'risk_assessment'],
        confidence: 0.85,
        alternativeApproaches: [
          'More conservative approach with lower risk',
          'More aggressive approach with higher potential returns',
          'Alternative loan structure consideration'
        ]
      }
    } catch (error) {
      console.error('Error getting response explanation:', error)
      return {
        reasoning: 'Unable to retrieve explanation',
        factors: [],
        confidence: 0,
        alternativeApproaches: []
      }
    }
  }

  /**
   * Create new prompt template
   */
  async createTemplate(template: Omit<PromptTemplate, 'id' | 'lastUpdated' | 'usageCount' | 'effectiveness'>): Promise<string> {
    try {
      const id = this.generateId()
      const newTemplate: PromptTemplate = {
        ...template,
        id,
        lastUpdated: new Date().toISOString(),
        usageCount: 0,
        effectiveness: 0.5
      }

      this.templates.set(id, newTemplate)
      return id

    } catch (error) {
      console.error('Error creating template:', error)
      throw error
    }
  }

  /**
   * Create prompt chain
   */
  async createPromptChain(
    chainId: string,
    steps: Omit<PromptChainStep, 'stepId'>[]
  ): Promise<void> {
    try {
      const chainSteps: PromptChainStep[] = steps.map((step, index) => ({
        ...step,
        stepId: `${chainId}_step_${index}`
      }))

      this.promptChains.set(chainId, chainSteps)

    } catch (error) {
      console.error('Error creating prompt chain:', error)
      throw error
    }
  }

  // Private helper methods

  private async initializeDefaultTemplates(): Promise<void> {
    const defaultTemplates: Omit<PromptTemplate, 'id' | 'lastUpdated' | 'usageCount' | 'effectiveness'>[] = [
      {
        name: 'mortgage_recommendation',
        description: 'Generate mortgage recommendations based on user profile',
        basePrompt: `You are a mortgage expert. Analyze the user's financial situation and provide personalized mortgage recommendations.

User Context:
- Income: {income}
- Down Payment: {downPayment}
- Property Price: {propertyPrice}
- Credit Score: {creditScore}
- Risk Tolerance: {riskTolerance}
- Loan Type Preference: {loanType}

Provide recommendations that consider:
1. Affordability based on GDS/TDS ratios
2. Risk profile alignment
3. Market conditions
4. Long-term financial impact

Include specific lender suggestions and reasoning.`,
        variables: ['income', 'downPayment', 'propertyPrice', 'creditScore', 'riskTolerance', 'loanType'],
        contextRequirements: ['financial_data', 'user_preferences'],
        version: '1.2.0'
      },
      {
        name: 'rate_explanation',
        description: 'Explain mortgage rates and market conditions',
        basePrompt: `Explain current mortgage rates and market conditions in a {tone} tone.

Current Context:
- Market Rates: {currentRates}
- User's Target Rate: {targetRate}
- Market Trend: {marketTrend}

Provide explanation at {explanationLevel} level, covering:
1. Why rates are at current levels
2. Factors affecting rate changes
3. What this means for the user
4. Future outlook and recommendations`,
        variables: ['tone', 'currentRates', 'targetRate', 'marketTrend', 'explanationLevel'],
        contextRequirements: ['market_data', 'user_preferences'],
        version: '1.2.0'
      },
      {
        name: 'scenario_comparison',
        description: 'Compare different mortgage scenarios',
        basePrompt: `Compare mortgage scenarios and provide detailed analysis.

Scenarios to Compare:
{scenarios}

User Profile:
- Risk Tolerance: {riskTolerance}
- Timeline: {timeline}
- Goals: {goals}

Provide:
1. Side-by-side comparison
2. Pros and cons of each option
3. Recommendation with reasoning
4. Alternative considerations`,
        variables: ['scenarios', 'riskTolerance', 'timeline', 'goals'],
        contextRequirements: ['scenario_data', 'user_preferences'],
        version: '1.2.0'
      }
    ]

    for (const template of defaultTemplates) {
      await this.createTemplate(template)
    }
  }

  private async selectTemplate(
    promptType: string,
    profileContext: any,
    context: Record<string, any>
  ): Promise<PromptTemplate> {
    // Find templates that match the prompt type
    const matchingTemplates = Array.from(this.templates.values())
      .filter(template => template.name.includes(promptType))

    if (matchingTemplates.length === 0) {
      throw new Error(`No template found for prompt type: ${promptType}`)
    }

    // Select template based on effectiveness and context match
    const bestTemplate = matchingTemplates.reduce((best, current) => {
      const currentScore = this.calculateTemplateScore(current, profileContext, context)
      const bestScore = this.calculateTemplateScore(best, profileContext, context)
      return currentScore > bestScore ? current : best
    })

    return bestTemplate
  }

  private calculateTemplateScore(
    template: PromptTemplate,
    profileContext: any,
    context: Record<string, any>
  ): number {
    let score = template.effectiveness

    // Boost score for templates that match user preferences
    if (profileContext.aiPromptStyle === 'conversational' && template.name.includes('conversational')) {
      score += 0.2
    }

    if (profileContext.explanationLevel === 'detailed' && template.name.includes('detailed')) {
      score += 0.2
    }

    // Boost score for templates with required context available
    const availableContext = Object.keys(context)
    const requiredContext = template.contextRequirements
    const contextMatch = requiredContext.filter(req => availableContext.includes(req)).length / requiredContext.length
    score += contextMatch * 0.3

    return Math.min(score, 1.0)
  }

  private async buildPersonalizedPrompt(
    template: PromptTemplate,
    profileContext: any,
    context: Record<string, any>
  ): Promise<string> {
    let personalizedPrompt = template.basePrompt

    // Replace template variables with actual values
    for (const variable of template.variables) {
      const value = this.getVariableValue(variable, profileContext, context)
      const placeholder = `{${variable}}`
      personalizedPrompt = personalizedPrompt.replace(new RegExp(placeholder, 'g'), value)
    }

    // Add personalization context
    const personalizationContext = await profileContextService.getPersonalizedPrompt(
      profileContext.userId,
      personalizedPrompt,
      context
    )

    return personalizationContext
  }

  private getVariableValue(variable: string, profileContext: any, context: Record<string, any>): string {
    // Check context first
    if (context[variable] !== undefined) {
      return String(context[variable])
    }

    // Check profile context
    if (profileContext[variable] !== undefined) {
      return String(profileContext[variable])
    }

    // Return default values
    const defaults: Record<string, string> = {
      tone: profileContext.copyTone || 'professional',
      explanationLevel: profileContext.explanationLevel || 'standard',
      riskTolerance: profileContext.riskComfort || 'moderate',
      loanType: profileContext.loanTypeFocus || 'fixed',
      income: 'Not specified',
      downPayment: 'Not specified',
      propertyPrice: 'Not specified',
      creditScore: 'Not specified',
      currentRates: 'Current market rates',
      targetRate: 'User target rate',
      marketTrend: 'Stable',
      scenarios: 'Multiple scenarios to compare',
      timeline: 'Not specified',
      goals: 'Not specified'
    }

    return defaults[variable] || 'Not specified'
  }

  private async executeSinglePrompt(
    template: PromptTemplate,
    prompt: string,
    context: Record<string, any>,
    includeExplanation: boolean
  ): Promise<AIResponse> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: includeExplanation 
              ? 'Provide detailed explanations for your recommendations, including reasoning and key factors considered.'
              : 'Provide clear, concise recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })

      const content = completion.choices[0].message.content || ''
      const tokens = completion.usage?.total_tokens || 0

      // Extract reasoning and factors (simplified)
      const reasoning = this.extractReasoning(content)
      const factors = this.extractFactors(content)
      const confidence = this.calculateConfidence(content, context)

      return {
        content,
        confidence,
        reasoning,
        factors,
        suggestions: this.extractSuggestions(content),
        metadata: {
          model: 'gpt-4o-mini',
          tokens,
          latency: 0, // Will be set by caller
          templateId: template.id
        }
      }

    } catch (error) {
      console.error('Error executing prompt:', error)
      throw error
    }
  }

  private async executePromptChain(
    userId: string,
    promptType: string,
    initialPrompt: string,
    context: Record<string, any>,
    maxRetries: number
  ): Promise<AIResponse> {
    // Simplified chain execution - in production, this would be more sophisticated
    return this.executeSinglePrompt(
      this.templates.get('mortgage_recommendation')!,
      initialPrompt,
      context,
      true
    )
  }

  private extractReasoning(content: string): string {
    // Extract reasoning from AI response (simplified)
    const reasoningMatch = content.match(/reasoning[:\s]+(.*?)(?:\n\n|\n$|$)/i)
    return reasoningMatch ? reasoningMatch[1].trim() : 'Analysis based on provided context and user profile.'
  }

  private extractFactors(content: string): string[] {
    // Extract key factors from AI response (simplified)
    const factors: string[] = []
    
    if (content.includes('income') || content.includes('affordability')) factors.push('income_analysis')
    if (content.includes('credit') || content.includes('score')) factors.push('credit_assessment')
    if (content.includes('risk') || content.includes('tolerance')) factors.push('risk_evaluation')
    if (content.includes('rate') || content.includes('interest')) factors.push('rate_consideration')
    if (content.includes('market') || content.includes('trend')) factors.push('market_conditions')

    return factors.length > 0 ? factors : ['general_analysis']
  }

  private calculateConfidence(content: string, context: Record<string, any>): number {
    // Calculate confidence based on content quality and context completeness
    let confidence = 0.5

    // Boost confidence for longer, more detailed responses
    if (content.length > 500) confidence += 0.2
    if (content.length > 1000) confidence += 0.1

    // Boost confidence for complete context
    const requiredFields = ['income', 'downPayment', 'propertyPrice']
    const availableFields = requiredFields.filter(field => context[field] !== undefined)
    confidence += (availableFields.length / requiredFields.length) * 0.3

    return Math.min(confidence, 1.0)
  }

  private extractSuggestions(content: string): string[] {
    // Extract suggestions from AI response (simplified)
    const suggestions: string[] = []
    const lines = content.split('\n')
    
    for (const line of lines) {
      if (line.includes('recommend') || line.includes('suggest') || line.includes('consider')) {
        suggestions.push(line.trim())
      }
    }

    return suggestions.slice(0, 3) // Limit to 3 suggestions
  }

  private async updateTemplateUsage(templateId: string): Promise<void> {
    const template = this.templates.get(templateId)
    if (template) {
      template.usageCount++
      template.lastUpdated = new Date().toISOString()
      this.templates.set(templateId, template)
    }
  }

  private async updateTemplateEffectiveness(templateId: string, rating: number): Promise<void> {
    const template = this.templates.get(templateId)
    if (template) {
      // Update effectiveness using exponential moving average
      const alpha = 0.1
      const normalizedRating = (rating - 1) / 4 // Convert 1-5 to 0-1
      template.effectiveness = alpha * normalizedRating + (1 - alpha) * template.effectiveness
      template.lastUpdated = new Date().toISOString()
      this.templates.set(templateId, template)
    }
  }

  private async optimizePrompt(templateId: string, feedback: PromptFeedback): Promise<void> {
    // In production, this would use more sophisticated optimization
    console.log(`Optimizing prompt ${templateId} based on feedback:`, feedback)
  }

  private async trackResponse(
    userId: string,
    templateId: string,
    response: AIResponse,
    context: Record<string, any>
  ): Promise<void> {
    // Track response for learning and optimization
    console.log(`Tracked response for user ${userId}, template ${templateId}`)
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }
}

// Export singleton instance
export const adaptivePromptingService = AdaptivePromptingService.getInstance()

// Convenience functions
export const generateResponse = (
  userId: string,
  promptType: string,
  context?: Record<string, any>,
  options?: any
) => adaptivePromptingService.generateResponse(userId, promptType, context, options)

export const addFeedback = (
  userId: string,
  templateId: string,
  responseId: string,
  rating: number,
  feedback?: string,
  factors?: string[]
) => adaptivePromptingService.addFeedback(userId, templateId, responseId, rating, feedback, factors)

export const getResponseExplanation = (responseId: string, userId: string) =>
  adaptivePromptingService.getResponseExplanation(responseId, userId)