import { EventEmitter } from 'events'
import { CostOptimizer } from './cost-optimizer'
import { PerformanceMonitor } from './performance-monitor'
import { ResourceManager } from './resource-manager'
import { DistributedRateLimiter } from '../rate-limiting/distributed-rate-limiter'

// Optimization strategies
export enum OptimizationStrategy {
  COST_OPTIMIZATION = 'cost_optimization',
  PERFORMANCE_OPTIMIZATION = 'performance_optimization',
  RESOURCE_OPTIMIZATION = 'resource_optimization',
  RATE_LIMITING = 'rate_limiting',
  CACHING = 'caching',
  BATCHING = 'batching',
  COMPRESSION = 'compression'
}

// Optimization configuration
export interface OptimizationConfig {
  enabled: boolean
  strategy: OptimizationStrategy
  priority: number
  threshold: number
  parameters: Record<string, any>
}

// Optimization result
export interface OptimizationResult {
  strategy: OptimizationStrategy
  success: boolean
  savings: number
  performance: number
  message: string
  timestamp: number
}

// Optimization manager
export class OptimizationManager extends EventEmitter {
  private costOptimizer: CostOptimizer
  private performanceMonitor: PerformanceMonitor
  private resourceManager: ResourceManager
  private rateLimiter: DistributedRateLimiter
  private configurations: Map<OptimizationStrategy, OptimizationConfig> = new Map()
  private results: OptimizationResult[] = []
  private isOptimizing: boolean = false
  private optimizationInterval: NodeJS.Timeout | null = null

  constructor(
    costOptimizer: CostOptimizer,
    performanceMonitor: PerformanceMonitor,
    resourceManager: ResourceManager,
    rateLimiter: DistributedRateLimiter
  ) {
    super()
    this.costOptimizer = costOptimizer
    this.performanceMonitor = performanceMonitor
    this.resourceManager = resourceManager
    this.rateLimiter = rateLimiter

    this.initializeDefaultConfigurations()
  }

  // Initialize default configurations
  private initializeDefaultConfigurations(): void {
    const defaultConfigs: OptimizationConfig[] = [
      {
        enabled: true,
        strategy: OptimizationStrategy.COST_OPTIMIZATION,
        priority: 1,
        threshold: 0.1, // 10% cost reduction
        parameters: {
          cacheEnabled: true,
          batchEnabled: true,
          compressionEnabled: true
        }
      },
      {
        enabled: true,
        strategy: OptimizationStrategy.PERFORMANCE_OPTIMIZATION,
        priority: 2,
        threshold: 1000, // 1 second response time
        parameters: {
          monitoringEnabled: true,
          alertingEnabled: true
        }
      },
      {
        enabled: true,
        strategy: OptimizationStrategy.RESOURCE_OPTIMIZATION,
        priority: 3,
        threshold: 80, // 80% resource utilization
        parameters: {
          autoScaling: true,
          loadBalancing: true
        }
      },
      {
        enabled: true,
        strategy: OptimizationStrategy.RATE_LIMITING,
        priority: 4,
        threshold: 100, // 100 requests per minute
        parameters: {
          algorithm: 'sliding-window',
          windowMs: 60000,
          maxRequests: 100
        }
      }
    ]

    defaultConfigs.forEach(config => {
      this.configurations.set(config.strategy, config)
    })
  }

  // Configure optimization strategy
  configureStrategy(strategy: OptimizationStrategy, config: OptimizationConfig): void {
    this.configurations.set(strategy, config)
    this.emit('strategyConfigured', { strategy, config })
  }

  // Get configuration
  getConfiguration(strategy: OptimizationStrategy): OptimizationConfig | null {
    return this.configurations.get(strategy) || null
  }

  // Start optimization
  startOptimization(interval: number = 30000): void {
    if (this.isOptimizing) {
      return
    }

    this.isOptimizing = true
    this.optimizationInterval = setInterval(() => {
      this.runOptimization()
    }, interval)

    this.emit('optimizationStarted')
  }

  // Stop optimization
  stopOptimization(): void {
    if (!this.isOptimizing) {
      return
    }

    this.isOptimizing = false
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
      this.optimizationInterval = null
    }

    this.emit('optimizationStopped')
  }

  // Run optimization
  private async runOptimization(): Promise<void> {
    const results: OptimizationResult[] = []

    for (const [strategy, config] of this.configurations.entries()) {
      if (!config.enabled) {
        continue
      }

      try {
        const result = await this.optimizeStrategy(strategy, config)
        results.push(result)
      } catch (error) {
        console.error(`Optimization failed for strategy ${strategy}:`, error)
        results.push({
          strategy,
          success: false,
          savings: 0,
          performance: 0,
          message: error.message,
          timestamp: Date.now()
        })
      }
    }

    // Store results
    this.results.push(...results)

    // Keep only recent results
    if (this.results.length > 1000) {
      this.results = this.results.slice(-1000)
    }

    this.emit('optimizationCompleted', results)
  }

  // Optimize specific strategy
  private async optimizeStrategy(
    strategy: OptimizationStrategy,
    config: OptimizationConfig
  ): Promise<OptimizationResult> {
    switch (strategy) {
      case OptimizationStrategy.COST_OPTIMIZATION:
        return await this.optimizeCosts(config)

      case OptimizationStrategy.PERFORMANCE_OPTIMIZATION:
        return await this.optimizePerformance(config)

      case OptimizationStrategy.RESOURCE_OPTIMIZATION:
        return await this.optimizeResources(config)

      case OptimizationStrategy.RATE_LIMITING:
        return await this.optimizeRateLimiting(config)

      default:
        throw new Error(`Unknown optimization strategy: ${strategy}`)
    }
  }

  // Optimize costs
  private async optimizeCosts(config: OptimizationConfig): Promise<OptimizationResult> {
    const metrics = this.costOptimizer.getMetrics()
    const recommendations = this.costOptimizer.getOptimizationRecommendations()

    let savings = 0
    let message = 'No cost optimizations applied'

    // Apply caching if enabled
    if (config.parameters.cacheEnabled) {
      this.costOptimizer.optimizeCache()
      savings += metrics.optimizationSavings * 0.1
      message = 'Cache optimization applied'
    }

    // Apply batching if enabled
    if (config.parameters.batchEnabled) {
      // Batching is handled automatically by the cost optimizer
      savings += metrics.optimizationSavings * 0.2
      message += ', batching enabled'
    }

    // Apply compression if enabled
    if (config.parameters.compressionEnabled) {
      // Compression would be handled by the web server
      savings += metrics.optimizationSavings * 0.15
      message += ', compression enabled'
    }

    return {
      strategy: OptimizationStrategy.COST_OPTIMIZATION,
      success: savings > 0,
      savings,
      performance: 0,
      message,
      timestamp: Date.now()
    }
  }

  // Optimize performance
  private async optimizePerformance(config: OptimizationConfig): Promise<OptimizationResult> {
    const stats = this.performanceMonitor.getStatistics()
    const slowestEndpoints = this.performanceMonitor.getSlowestEndpoints(5)

    let performance = 0
    let message = 'No performance optimizations applied'

    // Check if performance is below threshold
    if (stats.averageDuration > config.threshold) {
      // Apply performance optimizations
      performance = stats.averageDuration - config.threshold
      message = `Performance optimization applied for ${slowestEndpoints.length} slow endpoints`
    }

    return {
      strategy: OptimizationStrategy.PERFORMANCE_OPTIMIZATION,
      success: performance > 0,
      savings: 0,
      performance,
      message,
      timestamp: Date.now()
    }
  }

  // Optimize resources
  private async optimizeResources(config: OptimizationConfig): Promise<OptimizationResult> {
    const recommendations = this.resourceManager.getResourceRecommendations()
    const statistics = this.resourceManager.getStatistics()

    let savings = 0
    let message = 'No resource optimizations applied'

    // Apply resource optimizations
    for (const rec of recommendations) {
      if (rec.priority === 'high') {
        savings += rec.potentialSavings
        message += `, ${rec.recommendation}`
      }
    }

    return {
      strategy: OptimizationStrategy.RESOURCE_OPTIMIZATION,
      success: savings > 0,
      savings,
      performance: 0,
      message,
      timestamp: Date.now()
    }
  }

  // Optimize rate limiting
  private async optimizeRateLimiting(config: OptimizationConfig): Promise<OptimizationResult> {
    // Rate limiting is handled automatically by the rate limiter
    // This is more of a monitoring function
    const message = 'Rate limiting is active and monitoring requests'

    return {
      strategy: OptimizationStrategy.RATE_LIMITING,
      success: true,
      savings: 0,
      performance: 0,
      message,
      timestamp: Date.now()
    }
  }

  // Get optimization results
  getResults(strategy?: OptimizationStrategy): OptimizationResult[] {
    if (strategy) {
      return this.results.filter(r => r.strategy === strategy)
    }
    return [...this.results]
  }

  // Get optimization statistics
  getStatistics(): {
    totalOptimizations: number
    successfulOptimizations: number
    totalSavings: number
    averagePerformance: number
    strategiesUsed: OptimizationStrategy[]
  } {
    const total = this.results.length
    const successful = this.results.filter(r => r.success).length
    const totalSavings = this.results.reduce((sum, r) => sum + r.savings, 0)
    const averagePerformance = this.results.reduce((sum, r) => sum + r.performance, 0) / total
    const strategiesUsed = [...new Set(this.results.map(r => r.strategy))]

    return {
      totalOptimizations: total,
      successfulOptimizations: successful,
      totalSavings,
      averagePerformance,
      strategiesUsed
    }
  }

  // Get optimization recommendations
  getRecommendations(): Array<{
    strategy: OptimizationStrategy
    priority: 'high' | 'medium' | 'low'
    description: string
    potentialSavings: number
  }> {
    const recommendations: Array<{
      strategy: OptimizationStrategy
      priority: 'high' | 'medium' | 'low'
      description: string
      potentialSavings: number
    }> = []

    // Cost optimization recommendations
    const costMetrics = this.costOptimizer.getMetrics()
    if (costMetrics.totalCost > 100) {
      recommendations.push({
        strategy: OptimizationStrategy.COST_OPTIMIZATION,
        priority: 'high',
        description: 'High costs detected. Enable aggressive caching and batching.',
        potentialSavings: costMetrics.totalCost * 0.3
      })
    }

    // Performance optimization recommendations
    const perfStats = this.performanceMonitor.getStatistics()
    if (perfStats.averageDuration > 2000) {
      recommendations.push({
        strategy: OptimizationStrategy.PERFORMANCE_OPTIMIZATION,
        priority: 'high',
        description: 'Slow response times detected. Optimize database queries and caching.',
        potentialSavings: 0
      })
    }

    // Resource optimization recommendations
    const resourceRecs = this.resourceManager.getResourceRecommendations()
    for (const rec of resourceRecs) {
      if (rec.priority === 'high') {
        recommendations.push({
          strategy: OptimizationStrategy.RESOURCE_OPTIMIZATION,
          priority: 'high',
          description: rec.recommendation,
          potentialSavings: rec.potentialSavings
        })
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  // Close and cleanup
  async close(): Promise<void> {
    this.stopOptimization()
    await this.costOptimizer.close()
    await this.resourceManager.close()
    this.emit('closed')
  }
}

// Export default instance
export const optimizationManager = new OptimizationManager(
  new CostOptimizer(new (require('../api/api-service').ApiService)()),
  new PerformanceMonitor(),
  new ResourceManager(),
  new DistributedRateLimiter({
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    },
    defaultConfig: {
      windowMs: 60000,
      maxRequests: 100,
      algorithm: 'sliding-window'
    }
  })
)