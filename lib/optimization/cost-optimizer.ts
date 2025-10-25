import { ApiService } from '../api/api-service'
import { keyManager } from '../config/keys'

// Cost optimization strategies
export enum CostOptimizationStrategy {
  CACHING = 'caching',
  BATCHING = 'batching',
  COMPRESSION = 'compression',
  DEDUPLICATION = 'deduplication',
  PRIORITIZATION = 'prioritization',
  THROTTLING = 'throttling',
  RESOURCE_POOLING = 'resource_pooling'
}

// Cost metrics
export interface CostMetrics {
  totalCost: number
  costPerRequest: number
  costPerUser: number
  costPerEndpoint: Map<string, number>
  optimizationSavings: number
  savingsPercentage: number
}

// Request cost configuration
export interface RequestCostConfig {
  endpoint: string
  baseCost: number
  costPerMB: number
  costPerSecond: number
  priority: number
  maxCost: number
  optimizationEnabled: boolean
}

// Cache configuration
export interface CacheConfig {
  ttl: number
  maxSize: number
  strategy: 'LRU' | 'LFU' | 'TTL'
  compressionEnabled: boolean
}

// Batch configuration
export interface BatchConfig {
  maxBatchSize: number
  maxWaitTime: number
  enabled: boolean
}

// Cost Optimizer
export class CostOptimizer {
  private apiService: ApiService
  private requestCosts: Map<string, RequestCostConfig> = new Map()
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()
  private batchQueue: Map<string, Array<{ request: any; resolve: Function; reject: Function }>> = new Map()
  private batchTimers: Map<string, NodeJS.Timeout> = new Map()
  private metrics: CostMetrics
  private cacheConfig: CacheConfig
  private batchConfig: BatchConfig

  constructor(
    apiService: ApiService,
    cacheConfig: CacheConfig = {
      ttl: 300000, // 5 minutes
      maxSize: 1000,
      strategy: 'LRU',
      compressionEnabled: true
    },
    batchConfig: BatchConfig = {
      maxBatchSize: 10,
      maxWaitTime: 1000, // 1 second
      enabled: true
    }
  ) {
    this.apiService = apiService
    this.cacheConfig = cacheConfig
    this.batchConfig = batchConfig
    this.metrics = {
      totalCost: 0,
      costPerRequest: 0,
      costPerUser: 0,
      costPerEndpoint: new Map(),
      optimizationSavings: 0,
      savingsPercentage: 0
    }

    // Initialize default cost configurations
    this.initializeDefaultCosts()
  }

  // Initialize default cost configurations
  private initializeDefaultCosts(): void {
    const defaultCosts: RequestCostConfig[] = [
      {
        endpoint: '/openai/chat',
        baseCost: 0.002,
        costPerMB: 0.001,
        costPerSecond: 0.0001,
        priority: 1,
        maxCost: 0.1,
        optimizationEnabled: true
      },
      {
        endpoint: '/openai/embeddings',
        baseCost: 0.0001,
        costPerMB: 0.0005,
        costPerSecond: 0.00005,
        priority: 2,
        maxCost: 0.05,
        optimizationEnabled: true
      },
      {
        endpoint: '/supabase/query',
        baseCost: 0.00001,
        costPerMB: 0.000001,
        costPerSecond: 0.000001,
        priority: 3,
        maxCost: 0.01,
        optimizationEnabled: true
      }
    ]

    defaultCosts.forEach(config => {
      this.requestCosts.set(config.endpoint, config)
    })
  }

  // Register cost configuration for an endpoint
  registerEndpointCost(endpoint: string, config: RequestCostConfig): void {
    this.requestCosts.set(endpoint, config)
  }

  // Calculate request cost
  private calculateRequestCost(
    endpoint: string,
    dataSize: number,
    duration: number
  ): number {
    const config = this.requestCosts.get(endpoint)
    if (!config) {
      return 0
    }

    const sizeCost = (dataSize / (1024 * 1024)) * config.costPerMB
    const timeCost = (duration / 1000) * config.costPerSecond
    const totalCost = config.baseCost + sizeCost + timeCost

    return Math.min(totalCost, config.maxCost)
  }

  // Cache management
  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params)}`
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) {
      return null
    }

    const now = Date.now()
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  private setCache(key: string, data: any, ttl?: number): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.cacheConfig.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.cacheConfig.ttl
    })
  }

  // Batch processing
  private addToBatch(endpoint: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(endpoint)) {
        this.batchQueue.set(endpoint, [])
      }

      const queue = this.batchQueue.get(endpoint)!
      queue.push({ request, resolve, reject })

      // Process batch if it's full
      if (queue.length >= this.batchConfig.maxBatchSize) {
        this.processBatch(endpoint)
      } else {
        // Set timer for batch processing
        if (!this.batchTimers.has(endpoint)) {
          const timer = setTimeout(() => {
            this.processBatch(endpoint)
          }, this.batchConfig.maxWaitTime)
          this.batchTimers.set(endpoint, timer)
        }
      }
    })
  }

  private async processBatch(endpoint: string): Promise<void> {
    const queue = this.batchQueue.get(endpoint)
    if (!queue || queue.length === 0) {
      return
    }

    // Clear the queue
    this.batchQueue.set(endpoint, [])
    
    // Clear the timer
    const timer = this.batchTimers.get(endpoint)
    if (timer) {
      clearTimeout(timer)
      this.batchTimers.delete(endpoint)
    }

    try {
      // Process batch request
      const batchData = queue.map(item => item.request)
      const response = await this.apiService.post(`${endpoint}/batch`, batchData)

      // Resolve all promises
      queue.forEach((item, index) => {
        if (response.success) {
          item.resolve(response.data[index] || response.data)
        } else {
          item.reject(new Error(response.message))
        }
      })
    } catch (error) {
      // Reject all promises
      queue.forEach(item => {
        item.reject(error)
      })
    }
  }

  // Optimized request method
  async optimizedRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    options: {
      useCache?: boolean
      useBatch?: boolean
      priority?: number
      userId?: string
    } = {}
  ): Promise<T> {
    const startTime = Date.now()
    const cacheKey = this.getCacheKey(endpoint, data)
    
    // Check cache first
    if (options.useCache !== false && method === 'GET') {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        this.updateMetrics(endpoint, 0, 0, true)
        return cached
      }
    }

    // Use batching for compatible requests
    if (options.useBatch !== false && this.batchConfig.enabled && method === 'POST') {
      try {
        const result = await this.addToBatch(endpoint, data)
        this.updateMetrics(endpoint, 0, Date.now() - startTime, false)
        return result
      } catch (error) {
        // Fall back to individual request
      }
    }

    // Make individual request
    const response = await this.apiService.request(method, endpoint, data)
    const duration = Date.now() - startTime
    const dataSize = JSON.stringify(response.data || {}).length

    // Calculate cost
    const cost = this.calculateRequestCost(endpoint, dataSize, duration)
    this.updateMetrics(endpoint, cost, duration, false)

    // Cache successful GET requests
    if (response.success && method === 'GET' && options.useCache !== false) {
      this.setCache(cacheKey, response.data)
    }

    if (!response.success) {
      throw new Error(response.message || 'Request failed')
    }

    return response.data
  }

  // Update cost metrics
  private updateMetrics(
    endpoint: string,
    cost: number,
    duration: number,
    fromCache: boolean
  ): void {
    this.metrics.totalCost += cost
    this.metrics.costPerRequest = this.metrics.totalCost / (this.metrics.costPerRequest + 1)

    const endpointCost = this.metrics.costPerEndpoint.get(endpoint) || 0
    this.metrics.costPerEndpoint.set(endpoint, endpointCost + cost)

    if (fromCache) {
      // Estimate savings from cache hit
      const config = this.requestCosts.get(endpoint)
      if (config) {
        const estimatedCost = this.calculateRequestCost(endpoint, 0, duration)
        this.metrics.optimizationSavings += estimatedCost
      }
    }
  }

  // Get cost metrics
  getMetrics(): CostMetrics {
    const totalRequests = this.metrics.costPerRequest > 0 ? this.metrics.totalCost / this.metrics.costPerRequest : 0
    this.metrics.savingsPercentage = totalRequests > 0 ? (this.metrics.optimizationSavings / this.metrics.totalCost) * 100 : 0

    return { ...this.metrics }
  }

  // Get cost breakdown by endpoint
  getCostBreakdown(): Array<{ endpoint: string; cost: number; percentage: number }> {
    const total = this.metrics.totalCost
    const breakdown: Array<{ endpoint: string; cost: number; percentage: number }> = []

    this.metrics.costPerEndpoint.forEach((cost, endpoint) => {
      breakdown.push({
        endpoint,
        cost,
        percentage: total > 0 ? (cost / total) * 100 : 0
      })
    })

    return breakdown.sort((a, b) => b.cost - a.cost)
  }

  // Optimize cache configuration
  optimizeCache(): void {
    const hitRate = this.calculateCacheHitRate()
    
    if (hitRate < 0.3) {
      // Low hit rate - increase TTL
      this.cacheConfig.ttl = Math.min(this.cacheConfig.ttl * 1.5, 1800000) // Max 30 minutes
    } else if (hitRate > 0.8) {
      // High hit rate - decrease TTL to save memory
      this.cacheConfig.ttl = Math.max(this.cacheConfig.ttl * 0.8, 60000) // Min 1 minute
    }
  }

  // Calculate cache hit rate
  private calculateCacheHitRate(): number {
    // This would need to be tracked in a real implementation
    return 0.5 // Placeholder
  }

  // Cleanup expired cache entries
  cleanupCache(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  // Get optimization recommendations
  getOptimizationRecommendations(): Array<{
    strategy: CostOptimizationStrategy
    description: string
    potentialSavings: number
    priority: 'high' | 'medium' | 'low'
  }> {
    const recommendations: Array<{
      strategy: CostOptimizationStrategy
      description: string
      potentialSavings: number
      priority: 'high' | 'medium' | 'low'
    }> = []

    const breakdown = this.getCostBreakdown()
    const totalCost = this.metrics.totalCost

    // High-cost endpoint recommendations
    const highCostEndpoints = breakdown.filter(item => item.percentage > 20)
    if (highCostEndpoints.length > 0) {
      recommendations.push({
        strategy: CostOptimizationStrategy.CACHING,
        description: `Enable aggressive caching for high-cost endpoints: ${highCostEndpoints.map(e => e.endpoint).join(', ')}`,
        potentialSavings: totalCost * 0.3,
        priority: 'high'
      })
    }

    // Batch processing recommendations
    if (this.batchQueue.size > 0) {
      recommendations.push({
        strategy: CostOptimizationStrategy.BATCHING,
        description: 'Enable batch processing for similar requests',
        potentialSavings: totalCost * 0.2,
        priority: 'medium'
      })
    }

    // Compression recommendations
    if (totalCost > 100) {
      recommendations.push({
        strategy: CostOptimizationStrategy.COMPRESSION,
        description: 'Enable response compression to reduce data transfer costs',
        potentialSavings: totalCost * 0.15,
        priority: 'medium'
      })
    }

    return recommendations
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = {
      totalCost: 0,
      costPerRequest: 0,
      costPerUser: 0,
      costPerEndpoint: new Map(),
      optimizationSavings: 0,
      savingsPercentage: 0
    }
  }

  // Close and cleanup
  async close(): Promise<void> {
    // Process any remaining batches
    for (const endpoint of this.batchQueue.keys()) {
      await this.processBatch(endpoint)
    }

    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer)
    }

    // Clear cache
    this.cache.clear()
  }
}

// Cost optimization middleware
export function createCostOptimizationMiddleware(
  costOptimizer: CostOptimizer,
  getUserId: (req: any) => string = (req) => req.user?.id || 'anonymous'
) {
  return (req: any, res: any, next: any) => {
    const originalSend = res.send
    const startTime = Date.now()

    res.send = function(data: any) {
      const duration = Date.now() - startTime
      const dataSize = JSON.stringify(data).length
      const endpoint = req.route?.path || req.path
      const userId = getUserId(req)

      // Update metrics
      const cost = costOptimizer['calculateRequestCost'](endpoint, dataSize, duration)
      costOptimizer['updateMetrics'](endpoint, cost, duration, false)

      // Add cost headers
      res.setHeader('X-Request-Cost', cost.toFixed(6))
      res.setHeader('X-Request-Duration', duration)

      originalSend.call(this, data)
    }

    next()
  }
}

// Export default configurations
export const DEFAULT_COST_CONFIGS = {
  CACHE: {
    ttl: 300000, // 5 minutes
    maxSize: 1000,
    strategy: 'LRU' as const,
    compressionEnabled: true
  },
  BATCH: {
    maxBatchSize: 10,
    maxWaitTime: 1000, // 1 second
    enabled: true
  }
} as const