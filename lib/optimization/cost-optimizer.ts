import { getOpenAIKey, isProduction } from '../config/keys'

// Cost tracking interface
interface CostTracking {
  service: string
  operation: string
  cost: number
  timestamp: number
  metadata?: Record<string, any>
}

// Cost optimization strategies
interface CostOptimizationStrategy {
  name: string
  description: string
  apply: (request: any) => any
  priority: number
}

// Cost optimizer class
export class CostOptimizer {
  private costHistory: CostTracking[] = []
  private strategies: CostOptimizationStrategy[] = []
  private dailyBudget: number = 100 // USD
  private monthlyBudget: number = 3000 // USD

  constructor() {
    this.initializeStrategies()
  }

  // Initialize cost optimization strategies
  private initializeStrategies() {
    this.strategies = [
      {
        name: 'model_selection',
        description: 'Select most cost-effective model for the task',
        priority: 1,
        apply: this.optimizeModelSelection.bind(this)
      },
      {
        name: 'prompt_optimization',
        description: 'Optimize prompts to reduce token usage',
        priority: 2,
        apply: this.optimizePrompt.bind(this)
      },
      {
        name: 'caching',
        description: 'Implement intelligent caching for repeated requests',
        priority: 3,
        apply: this.optimizeCaching.bind(this)
      },
      {
        name: 'batch_processing',
        description: 'Batch multiple requests together',
        priority: 4,
        apply: this.optimizeBatching.bind(this)
      },
      {
        name: 'rate_limiting',
        description: 'Implement intelligent rate limiting',
        priority: 5,
        apply: this.optimizeRateLimiting.bind(this)
      }
    ]
  }

  // Track cost for an operation
  trackCost(service: string, operation: string, cost: number, metadata?: Record<string, any>) {
    const costEntry: CostTracking = {
      service,
      operation,
      cost,
      timestamp: Date.now(),
      metadata
    }

    this.costHistory.push(costEntry)

    // Keep only last 1000 entries to prevent memory issues
    if (this.costHistory.length > 1000) {
      this.costHistory = this.costHistory.slice(-1000)
    }

    // Log cost in production
    if (isProduction) {
      console.log(`Cost tracked: ${service}.${operation} = $${cost.toFixed(4)}`)
    }
  }

  // Get daily cost
  getDailyCost(): number {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    return this.costHistory
      .filter(entry => entry.timestamp >= todayTimestamp)
      .reduce((total, entry) => total + entry.cost, 0)
  }

  // Get monthly cost
  getMonthlyCost(): number {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayTimestamp = firstDayOfMonth.getTime()

    return this.costHistory
      .filter(entry => entry.timestamp >= firstDayTimestamp)
      .reduce((total, entry) => total + entry.cost, 0)
  }

  // Check if budget is exceeded
  isBudgetExceeded(): boolean {
    const dailyCost = this.getDailyCost()
    const monthlyCost = this.getMonthlyCost()

    return dailyCost > this.dailyBudget || monthlyCost > this.monthlyBudget
  }

  // Get cost breakdown by service
  getCostBreakdown(period: 'daily' | 'monthly' = 'daily') {
    const cutoff = period === 'daily' 
      ? new Date().setHours(0, 0, 0, 0)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()

    const relevantCosts = this.costHistory.filter(entry => entry.timestamp >= cutoff)
    
    const breakdown = relevantCosts.reduce((acc, entry) => {
      if (!acc[entry.service]) {
        acc[entry.service] = { total: 0, operations: {} }
      }
      
      acc[entry.service].total += entry.cost
      
      if (!acc[entry.service].operations[entry.operation]) {
        acc[entry.service].operations[entry.operation] = 0
      }
      
      acc[entry.service].operations[entry.operation] += entry.cost
      
      return acc
    }, {} as Record<string, { total: number; operations: Record<string, number> }>)

    return breakdown
  }

  // Optimize OpenAI request
  optimizeOpenAIRequest(request: any): any {
    let optimizedRequest = { ...request }

    // Apply strategies in priority order
    for (const strategy of this.strategies.sort((a, b) => a.priority - b.priority)) {
      try {
        optimizedRequest = strategy.apply(optimizedRequest)
      } catch (error) {
        console.error(`Error applying strategy ${strategy.name}:`, error)
      }
    }

    return optimizedRequest
  }

  // Strategy: Optimize model selection
  private optimizeModelSelection(request: any): any {
    if (!request.model) return request

    const modelCosts = {
      'gpt-4': 0.03,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.002,
      'gpt-4o-mini': 0.00015
    }

    // For simple tasks, use cheaper models
    if (request.messages && request.messages.length === 1) {
      const message = request.messages[0].content
      
      // Simple calculations or basic queries
      if (message.length < 100 && !message.includes('complex') && !message.includes('detailed')) {
        request.model = 'gpt-4o-mini'
      }
    }

    return request
  }

  // Strategy: Optimize prompts
  private optimizePrompt(request: any): any {
    if (!request.messages) return request

    const optimizedMessages = request.messages.map((message: any) => {
      if (message.role === 'system') {
        // Optimize system prompts
        message.content = this.optimizeSystemPrompt(message.content)
      } else if (message.role === 'user') {
        // Optimize user prompts
        message.content = this.optimizeUserPrompt(message.content)
      }
      
      return message
    })

    return { ...request, messages: optimizedMessages }
  }

  // Optimize system prompt
  private optimizeSystemPrompt(prompt: string): string {
    // Remove redundant instructions
    let optimized = prompt
      .replace(/\s+/g, ' ') // Remove extra whitespace
      .replace(/\.\s*\./g, '.') // Remove double periods
      .trim()

    // Remove common redundant phrases
    const redundantPhrases = [
      'Please make sure to',
      'It is important to note that',
      'Keep in mind that',
      'Remember to',
      'Be sure to'
    ]

    for (const phrase of redundantPhrases) {
      optimized = optimized.replace(new RegExp(phrase, 'gi'), '')
    }

    return optimized
  }

  // Optimize user prompt
  private optimizeUserPrompt(prompt: string): string {
    // Remove unnecessary words and phrases
    let optimized = prompt
      .replace(/\s+/g, ' ')
      .replace(/\b(please|kindly|would you|could you)\b/gi, '')
      .replace(/\b(thank you|thanks)\b/gi, '')
      .trim()

    return optimized
  }

  // Strategy: Implement caching
  private optimizeCaching(request: any): any {
    // Add cache key for identical requests
    if (request.messages) {
      const cacheKey = this.generateCacheKey(request)
      request.cacheKey = cacheKey
    }

    return request
  }

  // Generate cache key for request
  private generateCacheKey(request: any): string {
    const content = JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens
    })

    return Buffer.from(content).toString('base64').slice(0, 32)
  }

  // Strategy: Optimize batching
  private optimizeBatching(request: any): any {
    // For multiple similar requests, suggest batching
    if (request.messages && request.messages.length > 1) {
      request.batchable = true
    }

    return request
  }

  // Strategy: Optimize rate limiting
  private optimizeRateLimiting(request: any): any {
    // Add intelligent delays based on cost
    const modelCosts = {
      'gpt-4': 0.03,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.002,
      'gpt-4o-mini': 0.00015
    }

    const modelCost = modelCosts[request.model as keyof typeof modelCosts] || 0.01
    
    if (modelCost > 0.01) {
      request.priority = 'low'
    }

    return request
  }

  // Estimate cost for OpenAI request
  estimateOpenAICost(request: any): number {
    const modelCosts = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.002, output: 0.002 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
    }

    const model = request.model || 'gpt-3.5-turbo'
    const costs = modelCosts[model as keyof typeof modelCosts] || modelCosts['gpt-3.5-turbo']

    // Estimate token count (rough approximation)
    const inputTokens = this.estimateTokens(request.messages || [])
    const outputTokens = request.max_tokens || 1000

    const inputCost = (inputTokens / 1000) * costs.input
    const outputCost = (outputTokens / 1000) * costs.output

    return inputCost + outputCost
  }

  // Estimate token count
  private estimateTokens(messages: any[]): number {
    const text = messages.map(m => m.content).join(' ')
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }

  // Get optimization recommendations
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = []
    const dailyCost = this.getDailyCost()
    const monthlyCost = this.getMonthlyCost()

    if (dailyCost > this.dailyBudget * 0.8) {
      recommendations.push('Daily budget is 80% used. Consider reducing request frequency.')
    }

    if (monthlyCost > this.monthlyBudget * 0.8) {
      recommendations.push('Monthly budget is 80% used. Consider optimizing model selection.')
    }

    const breakdown = this.getCostBreakdown()
    const openaiCost = breakdown.openai?.total || 0
    const totalCost = Object.values(breakdown).reduce((sum, service) => sum + service.total, 0)

    if (openaiCost / totalCost > 0.8) {
      recommendations.push('OpenAI costs are 80% of total. Consider implementing caching.')
    }

    return recommendations
  }

  // Set budget limits
  setBudget(daily: number, monthly: number) {
    this.dailyBudget = daily
    this.monthlyBudget = monthly
  }

  // Get cost statistics
  getCostStatistics() {
    const dailyCost = this.getDailyCost()
    const monthlyCost = this.getMonthlyCost()
    const breakdown = this.getCostBreakdown()

    return {
      daily: {
        cost: dailyCost,
        budget: this.dailyBudget,
        remaining: this.dailyBudget - dailyCost,
        percentage: (dailyCost / this.dailyBudget) * 100
      },
      monthly: {
        cost: monthlyCost,
        budget: this.monthlyBudget,
        remaining: this.monthlyBudget - monthlyCost,
        percentage: (monthlyCost / this.monthlyBudget) * 100
      },
      breakdown,
      recommendations: this.getOptimizationRecommendations()
    }
  }
}

// Export singleton instance
export const costOptimizer = new CostOptimizer()

// Export cost tracking utilities
export function trackOpenAICost(operation: string, request: any, response?: any) {
  const cost = costOptimizer.estimateOpenAICost(request)
  costOptimizer.trackCost('openai', operation, cost, {
    model: request.model,
    tokens: response?.usage?.total_tokens || 0
  })
}

export function trackSupabaseCost(operation: string, cost: number, metadata?: Record<string, any>) {
  costOptimizer.trackCost('supabase', operation, cost, metadata)
}

export function trackStripeCost(operation: string, cost: number, metadata?: Record<string, any>) {
  costOptimizer.trackCost('stripe', operation, cost, metadata)
}
