/**
 * Performance & Cost Monitoring System
 * Tracks OpenAI usage, costs, and performance metrics
 */

export interface UsageMetrics {
  userId: string
  date: string
  totalTokens: number
  promptTokens: number
  completionTokens: number
  totalCost: number
  requestCount: number
  averageResponseTime: number
  errorCount: number
  model: string
}

export interface BudgetAlert {
  id: string
  userId?: string
  type: 'daily' | 'monthly' | 'total'
  threshold: number
  currentUsage: number
  percentage: number
  status: 'active' | 'triggered' | 'resolved'
  createdAt: string
  triggeredAt?: string
}

export interface PerformanceMetrics {
  endpoint: string
  method: string
  responseTime: number
  statusCode: number
  timestamp: string
  userId?: string
  error?: string
}

export interface CacheMetrics {
  key: string
  hit: boolean
  responseTime: number
  timestamp: string
  userId?: string
}

class PerformanceMonitor {
  private usageMetrics: UsageMetrics[] = []
  private budgetAlerts: BudgetAlert[] = []
  private performanceMetrics: PerformanceMetrics[] = []
  private cacheMetrics: CacheMetrics[] = []
  private dailyBudget: number = 50 // $50/day default
  private monthlyBudget: number = 1000 // $1000/month default
  private tokenCosts: Record<string, number> = {
    'gpt-3.5-turbo': 0.002, // per 1K tokens
    'gpt-4': 0.03,
    'gpt-4-turbo': 0.01,
  }

  // OpenAI usage tracking
  trackOpenAIUsage(
    userId: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    responseTime: number,
    error?: string
  ): void {
    const totalTokens = promptTokens + completionTokens
    const costPer1K = this.tokenCosts[model] || 0.002
    const cost = (totalTokens / 1000) * costPer1K

    const today = new Date().toISOString().split('T')[0]
    const existingMetric = this.usageMetrics.find(
      m => m.userId === userId && m.date === today && m.model === model
    )

    if (existingMetric) {
      existingMetric.totalTokens += totalTokens
      existingMetric.promptTokens += promptTokens
      existingMetric.completionTokens += completionTokens
      existingMetric.totalCost += cost
      existingMetric.requestCount += 1
      existingMetric.averageResponseTime = 
        (existingMetric.averageResponseTime + responseTime) / 2
      if (error) existingMetric.errorCount += 1
    } else {
      const newMetric: UsageMetrics = {
        userId,
        date: today,
        totalTokens,
        promptTokens,
        completionTokens,
        totalCost: cost,
        requestCount: 1,
        averageResponseTime: responseTime,
        errorCount: error ? 1 : 0,
        model,
      }
      this.usageMetrics.push(newMetric)
    }

    // Check budget alerts
    this.checkBudgetAlerts(userId, cost)
  }

  // Budget management
  setBudget(type: 'daily' | 'monthly', amount: number): void {
    if (type === 'daily') {
      this.dailyBudget = amount
    } else {
      this.monthlyBudget = amount
    }
  }

  getUsageSummary(userId?: string, date?: string): {
    totalCost: number
    totalTokens: number
    requestCount: number
    averageResponseTime: number
    errorRate: number
    dailyCost: number
    monthlyCost: number
  } {
    const targetDate = date || new Date().toISOString().split('T')[0]
    const metrics = userId 
      ? this.usageMetrics.filter(m => m.userId === userId)
      : this.usageMetrics

    const todayMetrics = metrics.filter(m => m.date === targetDate)
    const monthMetrics = metrics.filter(m => 
      m.date.startsWith(targetDate.substring(0, 7))
    )

    const totalCost = metrics.reduce((sum, m) => sum + m.totalCost, 0)
    const totalTokens = metrics.reduce((sum, m) => sum + m.totalTokens, 0)
    const requestCount = metrics.reduce((sum, m) => sum + m.requestCount, 0)
    const totalResponseTime = metrics.reduce((sum, m) => sum + m.averageResponseTime * m.requestCount, 0)
    const averageResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0)
    const errorRate = requestCount > 0 ? totalErrors / requestCount : 0

    const dailyCost = todayMetrics.reduce((sum, m) => sum + m.totalCost, 0)
    const monthlyCost = monthMetrics.reduce((sum, m) => sum + m.totalCost, 0)

    return {
      totalCost,
      totalTokens,
      requestCount,
      averageResponseTime,
      errorRate,
      dailyCost,
      monthlyCost,
    }
  }

  // Performance tracking
  trackPerformance(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: string,
    error?: string
  ): void {
    const metric: PerformanceMetrics = {
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp: new Date().toISOString(),
      userId,
      error,
    }

    this.performanceMetrics.push(metric)

    // Keep only last 1000 metrics to prevent memory issues
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000)
    }
  }

  getPerformanceSummary(endpoint?: string): {
    averageResponseTime: number
    p95ResponseTime: number
    errorRate: number
    totalRequests: number
    slowestRequests: PerformanceMetrics[]
  } {
    const metrics = endpoint 
      ? this.performanceMetrics.filter(m => m.endpoint === endpoint)
      : this.performanceMetrics

    const totalRequests = metrics.length
    if (totalRequests === 0) {
      return {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        errorRate: 0,
        totalRequests: 0,
        slowestRequests: [],
      }
    }

    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b)
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests
    const p95Index = Math.floor(totalRequests * 0.95)
    const p95ResponseTime = responseTimes[p95Index] || 0

    const errorCount = metrics.filter(m => m.statusCode >= 400).length
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0

    const slowestRequests = metrics
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10)

    return {
      averageResponseTime,
      p95ResponseTime,
      errorRate,
      totalRequests,
      slowestRequests,
    }
  }

  // Cache monitoring
  trackCacheHit(key: string, hit: boolean, responseTime: number, userId?: string): void {
    const metric: CacheMetrics = {
      key,
      hit,
      responseTime,
      timestamp: new Date().toISOString(),
      userId,
    }

    this.cacheMetrics.push(metric)

    // Keep only last 1000 cache metrics
    if (this.cacheMetrics.length > 1000) {
      this.cacheMetrics = this.cacheMetrics.slice(-1000)
    }
  }

  getCacheSummary(): {
    hitRate: number
    averageResponseTime: number
    totalRequests: number
    cacheKeys: string[]
  } {
    const totalRequests = this.cacheMetrics.length
    if (totalRequests === 0) {
      return {
        hitRate: 0,
        averageResponseTime: 0,
        totalRequests: 0,
        cacheKeys: [],
      }
    }

    const hits = this.cacheMetrics.filter(m => m.hit).length
    const hitRate = totalRequests > 0 ? hits / totalRequests : 0

    const averageResponseTime = this.cacheMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests

    const cacheKeys = [...new Set(this.cacheMetrics.map(m => m.key))]

    return {
      hitRate,
      averageResponseTime,
      totalRequests,
      cacheKeys,
    }
  }

  // Budget alerts
  private checkBudgetAlerts(userId: string, additionalCost: number): void {
    const today = new Date().toISOString().split('T')[0]
    const currentMonth = today.substring(0, 7)

    // Check daily budget
    const dailyUsage = this.getUsageSummary(userId, today)
    const dailyPercentage = (dailyUsage.dailyCost / this.dailyBudget) * 100

    if (dailyPercentage >= 80 && dailyPercentage < 100) {
      this.createBudgetAlert(userId, 'daily', this.dailyBudget, dailyUsage.dailyCost, dailyPercentage)
    }

    // Check monthly budget
    const monthlyUsage = this.getUsageSummary(userId)
    const monthlyPercentage = (monthlyUsage.monthlyCost / this.monthlyBudget) * 100

    if (monthlyPercentage >= 80 && monthlyPercentage < 100) {
      this.createBudgetAlert(userId, 'monthly', this.monthlyBudget, monthlyUsage.monthlyCost, monthlyPercentage)
    }
  }

  private createBudgetAlert(
    userId: string,
    type: 'daily' | 'monthly',
    threshold: number,
    currentUsage: number,
    percentage: number
  ): void {
    const existingAlert = this.budgetAlerts.find(
      a => a.userId === userId && a.type === type && a.status === 'active'
    )

    if (!existingAlert) {
      const alert: BudgetAlert = {
        id: this.generateId(),
        userId,
        type,
        threshold,
        currentUsage,
        percentage,
        status: 'active',
        createdAt: new Date().toISOString(),
      }

      this.budgetAlerts.push(alert)
      this.sendBudgetAlert(alert)
    }
  }

  private async sendBudgetAlert(alert: BudgetAlert): Promise<void> {
    // In a real implementation, this would send an email or Slack notification
    console.log(`Budget Alert: ${alert.type} usage at ${alert.percentage.toFixed(1)}% ($${alert.currentUsage.toFixed(2)} / $${alert.threshold})`)
  }

  // Cost optimization
  optimizeCacheStrategy(): {
    recommendations: string[]
    potentialSavings: number
  } {
    const cacheSummary = this.getCacheSummary()
    const recommendations: string[] = []
    let potentialSavings = 0

    if (cacheSummary.hitRate < 0.7) {
      recommendations.push('Consider increasing cache TTL for frequently accessed data')
      potentialSavings += 0.1 // 10% cost reduction
    }

    if (cacheSummary.averageResponseTime > 100) {
      recommendations.push('Cache response times are high, consider optimizing cache implementation')
    }

    const performanceSummary = this.getPerformanceSummary()
    if (performanceSummary.averageResponseTime > 2000) {
      recommendations.push('API response times are high, consider adding more caching layers')
      potentialSavings += 0.15 // 15% cost reduction
    }

    return {
      recommendations,
      potentialSavings: potentialSavings * this.getUsageSummary().totalCost,
    }
  }

  // Daily digest
  generateDailyDigest(): {
    date: string
    totalCost: number
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    cacheHitRate: number
    budgetAlerts: BudgetAlert[]
    recommendations: string[]
  } {
    const usage = this.getUsageSummary()
    const performance = this.getPerformanceSummary()
    const cache = this.getCacheSummary()
    const optimization = this.optimizeCacheStrategy()

    const today = new Date().toISOString().split('T')[0]
    const activeAlerts = this.budgetAlerts.filter(a => a.status === 'active')

    return {
      date: today,
      totalCost: usage.totalCost,
      totalRequests: usage.requestCount,
      averageResponseTime: usage.averageResponseTime,
      errorRate: usage.errorRate,
      cacheHitRate: cache.hitRate,
      budgetAlerts: activeAlerts,
      recommendations: optimization.recommendations,
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }
}

// Global performance monitor instance
let performanceMonitorInstance: PerformanceMonitor | null = null

export const initPerformanceMonitor = (): PerformanceMonitor => {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor()
  }
  return performanceMonitorInstance
}

export const getPerformanceMonitor = (): PerformanceMonitor => {
  if (!performanceMonitorInstance) {
    throw new Error('Performance monitor not initialized. Call initPerformanceMonitor() first.')
  }
  return performanceMonitorInstance
}

// Convenience functions
export const trackOpenAIUsage = (
  userId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  responseTime: number,
  error?: string
): void => {
  getPerformanceMonitor().trackOpenAIUsage(userId, model, promptTokens, completionTokens, responseTime, error)
}

export const trackPerformance = (
  endpoint: string,
  method: string,
  responseTime: number,
  statusCode: number,
  userId?: string,
  error?: string
): void => {
  getPerformanceMonitor().trackPerformance(endpoint, method, responseTime, statusCode, userId, error)
}

export const trackCacheHit = (key: string, hit: boolean, responseTime: number, userId?: string): void => {
  getPerformanceMonitor().trackCacheHit(key, hit, responseTime, userId)
}

export const getUsageSummary = (userId?: string, date?: string) => {
  return getPerformanceMonitor().getUsageSummary(userId, date)
}

export const getPerformanceSummary = (endpoint?: string) => {
  return getPerformanceMonitor().getPerformanceSummary(endpoint)
}

export const generateDailyDigest = () => {
  return getPerformanceMonitor().generateDailyDigest()
}

// OpenAI budget monitor wrapper
export const openaiBudgetMonitor = {
  track: trackOpenAIUsage,
  getUsage: getUsageSummary,
  setBudget: (type: 'daily' | 'monthly', amount: number) => {
    getPerformanceMonitor().setBudget(type, amount)
  },
  getDigest: generateDailyDigest,
}

export default PerformanceMonitor
