import { performance } from 'perf_hooks'

// Performance metrics
export interface PerformanceMetrics {
  timestamp: number
  endpoint: string
  method: string
  duration: number
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage
  requestSize: number
  responseSize: number
  statusCode: number
  error?: string
}

// Performance thresholds
export interface PerformanceThresholds {
  maxDuration: number
  maxMemoryUsage: number
  maxCpuUsage: number
  maxRequestSize: number
  maxResponseSize: number
}

// Performance monitor
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private thresholds: PerformanceThresholds
  private maxMetrics: number = 1000
  private isMonitoring: boolean = false

  constructor(thresholds: PerformanceThresholds = {
    maxDuration: 5000, // 5 seconds
    maxMemoryUsage: 100 * 1024 * 1024, // 100 MB
    maxCpuUsage: 80, // 80%
    maxRequestSize: 10 * 1024 * 1024, // 10 MB
    maxResponseSize: 10 * 1024 * 1024 // 10 MB
  }) {
    this.thresholds = thresholds
  }

  // Start monitoring
  startMonitoring(): void {
    this.isMonitoring = true
  }

  // Stop monitoring
  stopMonitoring(): void {
    this.isMonitoring = false
  }

  // Record performance metric
  recordMetric(metric: Omit<PerformanceMetrics, 'timestamp' | 'memoryUsage' | 'cpuUsage'>): void {
    if (!this.isMonitoring) {
      return
    }

    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }

    this.metrics.push(fullMetric)

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Check thresholds
    this.checkThresholds(fullMetric)
  }

  // Check performance thresholds
  private checkThresholds(metric: PerformanceMetrics): void {
    const violations: string[] = []

    if (metric.duration > this.thresholds.maxDuration) {
      violations.push(`Duration exceeded: ${metric.duration}ms > ${this.thresholds.maxDuration}ms`)
    }

    if (metric.memoryUsage.heapUsed > this.thresholds.maxMemoryUsage) {
      violations.push(`Memory usage exceeded: ${metric.memoryUsage.heapUsed} bytes > ${this.thresholds.maxMemoryUsage} bytes`)
    }

    if (metric.requestSize > this.thresholds.maxRequestSize) {
      violations.push(`Request size exceeded: ${metric.requestSize} bytes > ${this.thresholds.maxRequestSize} bytes`)
    }

    if (metric.responseSize > this.thresholds.maxResponseSize) {
      violations.push(`Response size exceeded: ${metric.responseSize} bytes > ${this.thresholds.maxResponseSize} bytes`)
    }

    if (violations.length > 0) {
      console.warn(`Performance threshold violations for ${metric.endpoint}:`, violations)
    }
  }

  // Get performance statistics
  getStatistics(): {
    totalRequests: number
    averageDuration: number
    maxDuration: number
    minDuration: number
    averageMemoryUsage: number
    maxMemoryUsage: number
    averageRequestSize: number
    maxRequestSize: number
    averageResponseSize: number
    maxResponseSize: number
    errorRate: number
    thresholdViolations: number
  } {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        averageMemoryUsage: 0,
        maxMemoryUsage: 0,
        averageRequestSize: 0,
        maxRequestSize: 0,
        averageResponseSize: 0,
        maxResponseSize: 0,
        errorRate: 0,
        thresholdViolations: 0
      }
    }

    const durations = this.metrics.map(m => m.duration)
    const memoryUsages = this.metrics.map(m => m.memoryUsage.heapUsed)
    const requestSizes = this.metrics.map(m => m.requestSize)
    const responseSizes = this.metrics.map(m => m.responseSize)
    const errors = this.metrics.filter(m => m.error).length

    return {
      totalRequests: this.metrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      averageMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      maxMemoryUsage: Math.max(...memoryUsages),
      averageRequestSize: requestSizes.reduce((a, b) => a + b, 0) / requestSizes.length,
      maxRequestSize: Math.max(...requestSizes),
      averageResponseSize: responseSizes.reduce((a, b) => a + b, 0) / responseSizes.length,
      maxResponseSize: Math.max(...responseSizes),
      errorRate: (errors / this.metrics.length) * 100,
      thresholdViolations: this.metrics.filter(m => this.checkThresholds(m)).length
    }
  }

  // Get metrics by endpoint
  getMetricsByEndpoint(endpoint: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.endpoint === endpoint)
  }

  // Get metrics by time range
  getMetricsByTimeRange(startTime: number, endTime: number): PerformanceMetrics[] {
    return this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime)
  }

  // Get top slowest endpoints
  getSlowestEndpoints(limit: number = 10): Array<{ endpoint: string; averageDuration: number; maxDuration: number }> {
    const endpointStats = new Map<string, { totalDuration: number; count: number; maxDuration: number }>()

    this.metrics.forEach(metric => {
      const stats = endpointStats.get(metric.endpoint) || { totalDuration: 0, count: 0, maxDuration: 0 }
      stats.totalDuration += metric.duration
      stats.count += 1
      stats.maxDuration = Math.max(stats.maxDuration, metric.duration)
      endpointStats.set(metric.endpoint, stats)
    })

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        averageDuration: stats.totalDuration / stats.count,
        maxDuration: stats.maxDuration
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit)
  }

  // Get memory usage trends
  getMemoryUsageTrends(): Array<{ timestamp: number; heapUsed: number; heapTotal: number; external: number }> {
    return this.metrics.map(m => ({
      timestamp: m.timestamp,
      heapUsed: m.memoryUsage.heapUsed,
      heapTotal: m.memoryUsage.heapTotal,
      external: m.memoryUsage.external
    }))
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = []
  }

  // Export metrics
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  // Import metrics
  importMetrics(metrics: PerformanceMetrics[]): void {
    this.metrics = [...metrics]
  }
}

// Performance monitoring middleware
export function createPerformanceMonitoringMiddleware(
  monitor: PerformanceMonitor,
  getEndpoint: (req: any) => string = (req) => req.route?.path || req.path
) {
  return (req: any, res: any, next: any) => {
    const startTime = performance.now()
    const startMemory = process.memoryUsage()
    const startCpu = process.cpuUsage()

    const originalSend = res.send
    res.send = function(data: any) {
      const endTime = performance.now()
      const duration = endTime - startTime
      const requestSize = JSON.stringify(req.body || {}).length
      const responseSize = JSON.stringify(data).length

      monitor.recordMetric({
        endpoint: getEndpoint(req),
        method: req.method,
        duration,
        requestSize,
        responseSize,
        statusCode: res.statusCode,
        error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined
      })

      originalSend.call(this, data)
    }

    next()
  }
}

// Export default instance
export const performanceMonitor = new PerformanceMonitor()