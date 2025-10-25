import { supabaseAdmin } from '../supabase'
import { TenantError } from '../types/tenancy'
import { MeteringService } from '../billing/metering-service'
import { TenantScoping } from '../tenancy/scoping'
import { WebhookService } from '../webhooks/webhook-service'

export interface AICostConfig {
  organizationId: string
  dailyBudget: number
  monthlyBudget: number
  modelAllowlist: string[]
  fallbackModel: string
  maxTokensPerRequest: number
  costPerToken: Record<string, number>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AIUsageStats {
  organizationId: string
  date: string
  totalTokens: number
  totalCost: number
  requestCount: number
  modelBreakdown: Record<string, {
    tokens: number
    cost: number
    requests: number
  }>
  createdAt: string
}

export interface QuotaPrediction {
  remainingRequests: number
  remainingTokens: number
  estimatedCost: number
  willExceedBudget: boolean
  recommendedAction: 'continue' | 'throttle' | 'block' | 'upgrade'
}

export class AICostGovernanceService {
  /**
   * Get AI cost configuration for organization
   */
  static async getCostConfig(organizationId: string): Promise<AICostConfig | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_cost_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No config found
        }
        throw new Error(`Failed to get AI cost config: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Get AI cost config error:', error)
      throw error
    }
  }

  /**
   * Update AI cost configuration
   */
  static async updateCostConfig(
    organizationId: string,
    config: Partial<AICostConfig>,
    userId: string,
    userRole: string
  ): Promise<AICostConfig> {
    try {
      // Check permissions
      if (!this.canManageAIConfig(userRole)) {
        throw new TenantError(
          'Insufficient permissions to manage AI configuration',
          'INSUFFICIENT_PERMISSIONS',
          organizationId
        )
      }

      // Validate configuration
      this.validateCostConfig(config)

      // Get existing config or create new one
      const existingConfig = await this.getCostConfig(organizationId)
      
      if (existingConfig) {
        // Update existing config
        const { data, error } = await supabaseAdmin
          .from('ai_cost_configs')
          .update({
            ...config,
            updatedAt: new Date().toISOString()
          })
          .eq('organization_id', organizationId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to update AI cost config: ${error.message}`)
        }

        return data
      } else {
        // Create new config
        const newConfig: AICostConfig = {
          organizationId,
          dailyBudget: config.dailyBudget || 10.0,
          monthlyBudget: config.monthlyBudget || 300.0,
          modelAllowlist: config.modelAllowlist || ['gpt-3.5-turbo', 'gpt-4'],
          fallbackModel: config.fallbackModel || 'gpt-3.5-turbo',
          maxTokensPerRequest: config.maxTokensPerRequest || 4000,
          costPerToken: config.costPerToken || {
            'gpt-3.5-turbo': 0.000002,
            'gpt-4': 0.00003
          },
          isActive: config.isActive !== undefined ? config.isActive : true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        const { data, error } = await supabaseAdmin
          .from('ai_cost_configs')
          .insert(newConfig)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create AI cost config: ${error.message}`)
        }

        return data
      }
    } catch (error) {
      console.error('Update AI cost config error:', error)
      throw error
    }
  }

  /**
   * Check if AI request is allowed
   */
  static async checkAIRequest(
    organizationId: string,
    model: string,
    estimatedTokens: number
  ): Promise<{
    allowed: boolean
    reason?: string
    fallbackModel?: string
    quotaPrediction?: QuotaPrediction
  }> {
    try {
      // Get cost configuration
      const config = await this.getCostConfig(organizationId)
      if (!config || !config.isActive) {
        return {
          allowed: true,
          quotaPrediction: await this.getQuotaPrediction(organizationId)
        }
      }

      // Check model allowlist
      if (!config.modelAllowlist.includes(model)) {
        return {
          allowed: false,
          reason: `Model ${model} not allowed. Allowed models: ${config.modelAllowlist.join(', ')}`,
          fallbackModel: config.fallbackModel
        }
      }

      // Check token limit
      if (estimatedTokens > config.maxTokensPerRequest) {
        return {
          allowed: false,
          reason: `Request exceeds maximum tokens per request (${config.maxTokensPerRequest})`,
          fallbackModel: config.fallbackModel
        }
      }

      // Check budget limits
      const quotaPrediction = await this.getQuotaPrediction(organizationId)
      if (quotaPrediction.willExceedBudget) {
        return {
          allowed: false,
          reason: 'Request would exceed daily budget',
          quotaPrediction
        }
      }

      return {
        allowed: true,
        quotaPrediction
      }
    } catch (error) {
      console.error('Check AI request error:', error)
      return {
        allowed: false,
        reason: 'Error checking AI request permissions'
      }
    }
  }

  /**
   * Record AI usage
   */
  static async recordAIUsage(
    organizationId: string,
    model: string,
    tokensUsed: number,
    cost: number
  ): Promise<void> {
    try {
      // Record usage in metering service
      await MeteringService.recordAIUsage(
        organizationId,
        model,
        tokensUsed,
        cost
      )

      // Update daily usage stats
      await this.updateDailyUsageStats(organizationId, model, tokensUsed, cost)

      // Check if budget exceeded and send webhook
      const config = await this.getCostConfig(organizationId)
      if (config && config.isActive) {
        const today = new Date().toISOString().split('T')[0]
        const usage = await MeteringService.getUsage(organizationId, today, today)
        
        if (usage.aiCost && usage.aiCost > config.dailyBudget) {
          await WebhookService.sendWebhookEvent(
            organizationId,
            'ai.budget_exceeded',
            {
              dailyBudget: config.dailyBudget,
              currentCost: usage.aiCost,
              model,
              tokensUsed
            }
          )
        }
      }
    } catch (error) {
      console.error('Record AI usage error:', error)
      throw error
    }
  }

  /**
   * Get quota prediction
   */
  static async getQuotaPrediction(organizationId: string): Promise<QuotaPrediction> {
    try {
      const config = await this.getCostConfig(organizationId)
      if (!config || !config.isActive) {
        return {
          remainingRequests: 1000,
          remainingTokens: 100000,
          estimatedCost: 0,
          willExceedBudget: false,
          recommendedAction: 'continue'
        }
      }

      const today = new Date().toISOString().split('T')[0]
      const usage = await MeteringService.getUsage(organizationId, today, today)
      
      const remainingCost = config.dailyBudget - (usage.aiCost || 0)
      const remainingRequests = Math.max(0, (config.dailyBudget - (usage.aiCost || 0)) / 0.01) // Rough estimate
      const remainingTokens = Math.max(0, remainingCost / Math.min(...Object.values(config.costPerToken)))

      const willExceedBudget = remainingCost <= 0
      const recommendedAction = this.getRecommendedAction(remainingCost, config.dailyBudget)

      return {
        remainingRequests: Math.floor(remainingRequests),
        remainingTokens: Math.floor(remainingTokens),
        estimatedCost: usage.aiCost || 0,
        willExceedBudget,
        recommendedAction
      }
    } catch (error) {
      console.error('Get quota prediction error:', error)
      return {
        remainingRequests: 0,
        remainingTokens: 0,
        estimatedCost: 0,
        willExceedBudget: true,
        recommendedAction: 'block'
      }
    }
  }

  /**
   * Get AI usage statistics
   */
  static async getUsageStats(
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<AIUsageStats[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_usage_stats')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) {
        throw new Error(`Failed to get AI usage stats: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Get AI usage stats error:', error)
      throw error
    }
  }

  /**
   * Update daily usage statistics
   */
  private static async updateDailyUsageStats(
    organizationId: string,
    model: string,
    tokensUsed: number,
    cost: number
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get existing stats for today
      const { data: existingStats, error: fetchError } = await supabaseAdmin
        .from('ai_usage_stats')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch existing stats: ${fetchError.message}`)
      }

      if (existingStats) {
        // Update existing stats
        const updatedStats = {
          ...existingStats,
          totalTokens: existingStats.totalTokens + tokensUsed,
          totalCost: existingStats.totalCost + cost,
          requestCount: existingStats.requestCount + 1,
          modelBreakdown: {
            ...existingStats.modelBreakdown,
            [model]: {
              tokens: (existingStats.modelBreakdown[model]?.tokens || 0) + tokensUsed,
              cost: (existingStats.modelBreakdown[model]?.cost || 0) + cost,
              requests: (existingStats.modelBreakdown[model]?.requests || 0) + 1
            }
          },
          updatedAt: new Date().toISOString()
        }

        const { error: updateError } = await supabaseAdmin
          .from('ai_usage_stats')
          .update(updatedStats)
          .eq('id', existingStats.id)

        if (updateError) {
          throw new Error(`Failed to update AI usage stats: ${updateError.message}`)
        }
      } else {
        // Create new stats
        const newStats: AIUsageStats = {
          organizationId,
          date: today,
          totalTokens: tokensUsed,
          totalCost: cost,
          requestCount: 1,
          modelBreakdown: {
            [model]: {
              tokens: tokensUsed,
              cost: cost,
              requests: 1
            }
          },
          createdAt: new Date().toISOString()
        }

        const { error: insertError } = await supabaseAdmin
          .from('ai_usage_stats')
          .insert(newStats)

        if (insertError) {
          throw new Error(`Failed to create AI usage stats: ${insertError.message}`)
        }
      }
    } catch (error) {
      console.error('Update daily usage stats error:', error)
      throw error
    }
  }

  /**
   * Validate cost configuration
   */
  private static validateCostConfig(config: Partial<AICostConfig>): void {
    if (config.dailyBudget !== undefined && config.dailyBudget < 0) {
      throw new Error('Daily budget must be non-negative')
    }

    if (config.monthlyBudget !== undefined && config.monthlyBudget < 0) {
      throw new Error('Monthly budget must be non-negative')
    }

    if (config.maxTokensPerRequest !== undefined && config.maxTokensPerRequest < 1) {
      throw new Error('Max tokens per request must be at least 1')
    }

    if (config.modelAllowlist !== undefined && config.modelAllowlist.length === 0) {
      throw new Error('Model allowlist cannot be empty')
    }

    if (config.fallbackModel !== undefined && !config.modelAllowlist?.includes(config.fallbackModel)) {
      throw new Error('Fallback model must be in the allowlist')
    }
  }

  /**
   * Get recommended action based on remaining budget
   */
  private static getRecommendedAction(remainingCost: number, dailyBudget: number): 'continue' | 'throttle' | 'block' | 'upgrade' {
    const percentage = (remainingCost / dailyBudget) * 100

    if (percentage <= 0) {
      return 'block'
    } else if (percentage <= 10) {
      return 'upgrade'
    } else if (percentage <= 25) {
      return 'throttle'
    } else {
      return 'continue'
    }
  }

  /**
   * Check if user can manage AI configuration
   */
  private static canManageAIConfig(userRole: string): boolean {
    return ['OWNER', 'ADMIN'].includes(userRole)
  }

  /**
   * Get cost per token for a model
   */
  static getCostPerToken(model: string): number {
    const costMap: Record<string, number> = {
      'gpt-3.5-turbo': 0.000002,
      'gpt-4': 0.00003,
      'gpt-4-turbo': 0.00001,
      'claude-3-sonnet': 0.000015,
      'claude-3-opus': 0.000075
    }

    return costMap[model] || 0.000002 // Default to gpt-3.5-turbo pricing
  }

  /**
   * Calculate estimated cost for a request
   */
  static calculateEstimatedCost(model: string, estimatedTokens: number): number {
    const costPerToken = this.getCostPerToken(model)
    return estimatedTokens * costPerToken
  }
}