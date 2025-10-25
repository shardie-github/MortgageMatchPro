/**
 * Enhanced Monitoring and Metrics System
 * v1.2.0 - Expanded monitoring with AI metrics, regional data, and developer tools
 */

import { z } from 'zod'

// Enhanced metrics schemas
export const AIMetricsSchema = z.object({
  modelType: z.string(),
  tokensUsed: z.number(),
  cost: z.number(),
  latency: z.number(),
  accuracy: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  timestamp: z.string()
})

export const RegionalMetricsSchema = z.object({
  region: z.string(),
  country: z.enum(['CA', 'US', 'UK']),
  latency: z.number(),
  errorRate: z.number().min(0).max(1),
  throughput: z.number(),
  activeUsers: z.number(),
  timestamp: z.string()
})

export const TrainingMetricsSchema = z.object({
  modelId: z.string(),
  datasetSize: z.number(),
  trainingLoss: z.number(),
  validationLoss: z.number(),
  accuracy: z.number().min(0).max(1),
  epoch: z.number(),
  timestamp: z.string()
})

export const DeveloperPlaygroundSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number(),
  response: z.string(),
  metadata: z.record(z.any()),
  timestamp: z.string()
})

export type AIMetrics = z.infer<typeof AIMetricsSchema>
export type RegionalMetrics = z.infer<typeof RegionalMetricsSchema>
export type TrainingMetrics = z.infer<typeof TrainingMetricsSchema>
export type DeveloperPlayground = z.infer<typeof DeveloperPlaygroundSchema>

export class EnhancedMetricsService {
  private static instance: EnhancedMetricsService
  private aiMetrics: AIMetrics[] = []
  private regionalMetrics: RegionalMetrics[] = []
  private trainingMetrics: TrainingMetrics[] = []
  private playgroundSessions: DeveloperPlayground[] = []

  private constructor() {
    this.startMetricsCollection()
  }

  static getInstance(): EnhancedMetricsService {
    if (!EnhancedMetricsService.instance) {
      EnhancedMetricsService.instance = new EnhancedMetricsService()
    }
    return EnhancedMetricsService.instance
  }

  /**
   * Record AI metrics
   */
  async recordAIMetrics(metrics: Omit<AIMetrics, 'timestamp'>): Promise<void> {
    try {
      const aiMetric: AIMetrics = {
        ...metrics,
        timestamp: new Date().toISOString()
      }

      this.aiMetrics.push(aiMetric)

      // Keep only last 1000 entries
      if (this.aiMetrics.length > 1000) {
        this.aiMetrics = this.aiMetrics.slice(-1000)
      }

      console.log(`📊 Recorded AI metrics for ${metrics.modelType}`)

    } catch (error) {
      console.error('Error recording AI metrics:', error)
    }
  }

  /**
   * Record regional metrics
   */
  async recordRegionalMetrics(metrics: Omit<RegionalMetrics, 'timestamp'>): Promise<void> {
    try {
      const regionalMetric: RegionalMetrics = {
        ...metrics,
        timestamp: new Date().toISOString()
      }

      this.regionalMetrics.push(regionalMetric)

      // Keep only last 500 entries per region
      const regionEntries = this.regionalMetrics.filter(m => m.region === metrics.region)
      if (regionEntries.length > 500) {
        this.regionalMetrics = this.regionalMetrics.filter(m => m.region !== metrics.region)
        this.regionalMetrics.push(...regionEntries.slice(-500))
      }

      console.log(`🌍 Recorded regional metrics for ${metrics.region}`)

    } catch (error) {
      console.error('Error recording regional metrics:', error)
    }
  }

  /**
   * Record training metrics
   */
  async recordTrainingMetrics(metrics: Omit<TrainingMetrics, 'timestamp'>): Promise<void> {
    try {
      const trainingMetric: TrainingMetrics = {
        ...metrics,
        timestamp: new Date().toISOString()
      }

      this.trainingMetrics.push(trainingMetric)

      console.log(`🎯 Recorded training metrics for model ${metrics.modelId}`)

    } catch (error) {
      console.error('Error recording training metrics:', error)
    }
  }

  /**
   * Get AI metrics summary
   */
  getAIMetricsSummary(period: 'hour' | 'day' | 'week' = 'day'): {
    totalRequests: number
    averageLatency: number
    averageCost: number
    averageAccuracy: number
    averageConfidence: number
    totalTokens: number
    modelBreakdown: Record<string, number>
  } {
    const cutoff = this.getCutoffTime(period)
    const recentMetrics = this.aiMetrics.filter(m => new Date(m.timestamp) > cutoff)

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageLatency: 0,
        averageCost: 0,
        averageAccuracy: 0,
        averageConfidence: 0,
        totalTokens: 0,
        modelBreakdown: {}
      }
    }

    const totalRequests = recentMetrics.length
    const averageLatency = recentMetrics.reduce((sum, m) => sum + m.latency, 0) / totalRequests
    const averageCost = recentMetrics.reduce((sum, m) => sum + m.cost, 0) / totalRequests
    const averageAccuracy = recentMetrics.reduce((sum, m) => sum + m.accuracy, 0) / totalRequests
    const averageConfidence = recentMetrics.reduce((sum, m) => sum + m.confidence, 0) / totalRequests
    const totalTokens = recentMetrics.reduce((sum, m) => sum + m.tokensUsed, 0)

    const modelBreakdown: Record<string, number> = {}
    recentMetrics.forEach(m => {
      modelBreakdown[m.modelType] = (modelBreakdown[m.modelType] || 0) + 1
    })

    return {
      totalRequests,
      averageLatency: Math.round(averageLatency),
      averageCost: Math.round(averageCost * 100) / 100,
      averageAccuracy: Math.round(averageAccuracy * 1000) / 1000,
      averageConfidence: Math.round(averageConfidence * 1000) / 1000,
      totalTokens,
      modelBreakdown
    }
  }

  /**
   * Get regional metrics summary
   */
  getRegionalMetricsSummary(): {
    regions: Array<{
      region: string
      country: string
      averageLatency: number
      errorRate: number
      throughput: number
      activeUsers: number
    }>
    globalAverageLatency: number
    globalErrorRate: number
    totalActiveUsers: number
  } {
    const regionMap = new Map<string, RegionalMetrics[]>()

    this.regionalMetrics.forEach(metric => {
      if (!regionMap.has(metric.region)) {
        regionMap.set(metric.region, [])
      }
      regionMap.get(metric.region)!.push(metric)
    })

    const regions = Array.from(regionMap.entries()).map(([region, metrics]) => {
      const latest = metrics[metrics.length - 1]
      const averageLatency = metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length
      const errorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length
      const throughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length

      return {
        region,
        country: latest.country,
        averageLatency: Math.round(averageLatency),
        errorRate: Math.round(errorRate * 1000) / 1000,
        throughput: Math.round(throughput),
        activeUsers: latest.activeUsers
      }
    })

    const globalAverageLatency = regions.reduce((sum, r) => sum + r.averageLatency, 0) / regions.length
    const globalErrorRate = regions.reduce((sum, r) => sum + r.errorRate, 0) / regions.length
    const totalActiveUsers = regions.reduce((sum, r) => sum + r.activeUsers, 0)

    return {
      regions,
      globalAverageLatency: Math.round(globalAverageLatency),
      globalErrorRate: Math.round(globalErrorRate * 1000) / 1000,
      totalActiveUsers
    }
  }

  /**
   * Get training metrics for a model
   */
  getTrainingMetrics(modelId: string): {
    modelId: string
    totalEpochs: number
    finalAccuracy: number
    bestAccuracy: number
    finalLoss: number
    bestLoss: number
    learningCurve: Array<{
      epoch: number
      trainingLoss: number
      validationLoss: number
      accuracy: number
    }>
  } {
    const modelMetrics = this.trainingMetrics.filter(m => m.modelId === modelId)
    
    if (modelMetrics.length === 0) {
      return {
        modelId,
        totalEpochs: 0,
        finalAccuracy: 0,
        bestAccuracy: 0,
        finalLoss: 0,
        bestLoss: 0,
        learningCurve: []
      }
    }

    const sortedMetrics = modelMetrics.sort((a, b) => a.epoch - b.epoch)
    const finalMetrics = sortedMetrics[sortedMetrics.length - 1]
    
    const bestAccuracy = Math.max(...sortedMetrics.map(m => m.accuracy))
    const bestLoss = Math.min(...sortedMetrics.map(m => m.trainingLoss))

    return {
      modelId,
      totalEpochs: finalMetrics.epoch,
      finalAccuracy: finalMetrics.accuracy,
      bestAccuracy,
      finalLoss: finalMetrics.trainingLoss,
      bestLoss,
      learningCurve: sortedMetrics.map(m => ({
        epoch: m.epoch,
        trainingLoss: m.trainingLoss,
        validationLoss: m.validationLoss,
        accuracy: m.accuracy
      }))
    }
  }

  /**
   * Create developer playground session
   */
  async createPlaygroundSession(
    prompt: string,
    model: string = 'gpt-4o-mini',
    temperature: number = 0.7,
    maxTokens: number = 500
  ): Promise<{
    sessionId: string
    response: string
    metadata: Record<string, any>
  }> {
    try {
      const sessionId = this.generateId()
      const startTime = Date.now()

      // In a real implementation, this would call the actual AI service
      const response = await this.generateMockResponse(prompt, model, temperature)
      const latency = Date.now() - startTime

      const session: DeveloperPlayground = {
        id: sessionId,
        prompt,
        model,
        temperature,
        maxTokens,
        response,
        metadata: {
          latency,
          tokensUsed: response.length / 4, // Rough estimate
          cost: (response.length / 4) * 0.0001 // Rough estimate
        },
        timestamp: new Date().toISOString()
      }

      this.playgroundSessions.push(session)

      return {
        sessionId,
        response,
        metadata: session.metadata
      }

    } catch (error) {
      console.error('Error creating playground session:', error)
      throw error
    }
  }

  /**
   * Get playground session history
   */
  getPlaygroundHistory(limit: number = 50): DeveloperPlayground[] {
    return this.playgroundSessions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusMetrics()
    }

    return JSON.stringify({
      aiMetrics: this.aiMetrics.slice(-100),
      regionalMetrics: this.regionalMetrics.slice(-100),
      trainingMetrics: this.trainingMetrics.slice(-50),
      playgroundSessions: this.playgroundSessions.slice(-20)
    }, null, 2)
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check AI metrics
    const aiSummary = this.getAIMetricsSummary('hour')
    if (aiSummary.averageLatency > 5000) {
      issues.push('High AI response latency')
      recommendations.push('Optimize AI model performance')
    }

    if (aiSummary.averageAccuracy < 0.8) {
      issues.push('Low AI accuracy')
      recommendations.push('Review and improve AI training data')
    }

    // Check regional metrics
    const regionalSummary = this.getRegionalMetricsSummary()
    if (regionalSummary.globalErrorRate > 0.05) {
      issues.push('High error rate across regions')
      recommendations.push('Investigate and fix system errors')
    }

    if (regionalSummary.globalAverageLatency > 3000) {
      issues.push('High global latency')
      recommendations.push('Optimize system performance')
    }

    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (issues.length === 0) {
      status = 'healthy'
    } else if (issues.length <= 2) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }

    return {
      status,
      issues,
      recommendations
    }
  }

  // Private helper methods

  private startMetricsCollection(): void {
    // Start collecting metrics every minute
    setInterval(() => {
      this.collectSystemMetrics()
    }, 60000)
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      // Collect regional metrics
      const regions = ['North America', 'Europe', 'Asia Pacific']
      const countries: Array<'CA' | 'US' | 'UK'> = ['CA', 'US', 'UK']

      for (let i = 0; i < regions.length; i++) {
        await this.recordRegionalMetrics({
          region: regions[i],
          country: countries[i],
          latency: Math.random() * 1000 + 500,
          errorRate: Math.random() * 0.02,
          throughput: Math.random() * 1000 + 500,
          activeUsers: Math.floor(Math.random() * 1000) + 100
        })
      }

    } catch (error) {
      console.error('Error collecting system metrics:', error)
    }
  }

  private getCutoffTime(period: 'hour' | 'day' | 'week'): Date {
    const now = new Date()
    switch (period) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000)
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
  }

  private async generateMockResponse(prompt: string, model: string, temperature: number): Promise<string> {
    // Mock AI response generation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))
    
    return `Mock response for prompt: "${prompt.substring(0, 50)}..." using model ${model} with temperature ${temperature}`
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private exportPrometheusMetrics(): string {
    const aiSummary = this.getAIMetricsSummary('day')
    const regionalSummary = this.getRegionalMetricsSummary()
    const health = this.getSystemHealth()

    return `# HELP mortgagematch_ai_requests_total Total AI requests
# TYPE mortgagematch_ai_requests_total counter
mortgagematch_ai_requests_total ${aiSummary.totalRequests}

# HELP mortgagematch_ai_latency_seconds Average AI response latency
# TYPE mortgagematch_ai_latency_seconds gauge
mortgagematch_ai_latency_seconds ${aiSummary.averageLatency / 1000}

# HELP mortgagematch_ai_cost_dollars Total AI cost
# TYPE mortgagematch_ai_cost_dollars counter
mortgagematch_ai_cost_dollars ${aiSummary.averageCost}

# HELP mortgagematch_ai_accuracy_ratio AI accuracy ratio
# TYPE mortgagematch_ai_accuracy_ratio gauge
mortgagematch_ai_accuracy_ratio ${aiSummary.averageAccuracy}

# HELP mortgagematch_regional_latency_seconds Regional latency by region
# TYPE mortgagematch_regional_latency_seconds gauge
${regionalSummary.regions.map(r => 
  `mortgagematch_regional_latency_seconds{region="${r.region}",country="${r.country}"} ${r.averageLatency / 1000}`
).join('\n')}

# HELP mortgagematch_regional_error_rate Regional error rate
# TYPE mortgagematch_regional_error_rate gauge
${regionalSummary.regions.map(r => 
  `mortgagematch_regional_error_rate{region="${r.region}",country="${r.country}"} ${r.errorRate}`
).join('\n')}

# HELP mortgagematch_system_health System health status
# TYPE mortgagematch_system_health gauge
mortgagematch_system_health{status="${health.status}"} ${health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0}`
  }
}

// Export singleton instance
export const enhancedMetricsService = EnhancedMetricsService.getInstance()

// Convenience functions
export const recordAIMetrics = (metrics: Omit<AIMetrics, 'timestamp'>) =>
  enhancedMetricsService.recordAIMetrics(metrics)

export const recordRegionalMetrics = (metrics: Omit<RegionalMetrics, 'timestamp'>) =>
  enhancedMetricsService.recordRegionalMetrics(metrics)

export const recordTrainingMetrics = (metrics: Omit<TrainingMetrics, 'timestamp'>) =>
  enhancedMetricsService.recordTrainingMetrics(metrics)

export const createPlaygroundSession = (prompt: string, model?: string, temperature?: number, maxTokens?: number) =>
  enhancedMetricsService.createPlaygroundSession(prompt, model, temperature, maxTokens)

export const getAIMetricsSummary = (period?: 'hour' | 'day' | 'week') =>
  enhancedMetricsService.getAIMetricsSummary(period)

export const getRegionalMetricsSummary = () =>
  enhancedMetricsService.getRegionalMetricsSummary()

export const getSystemHealth = () =>
  enhancedMetricsService.getSystemHealth()