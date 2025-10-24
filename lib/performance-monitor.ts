/**
 * Performance Monitor for OpenAI App Compliance
 * Tracks Canvas render latency and agent response speed
 */

interface PerformanceMetrics {
  canvasRenderTime: number
  agentResponseTime: number
  totalLoadTime: number
  memoryUsage: number
  errorCount: number
}

interface PerformanceThresholds {
  maxCanvasRenderTime: number // 250ms
  maxAgentResponseTime: number // 2000ms
  maxTotalLoadTime: number // 3000ms
  maxMemoryUsage: number // 100MB
  maxErrorRate: number // 0.02 (2%)
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private thresholds: PerformanceThresholds = {
    maxCanvasRenderTime: 250,
    maxAgentResponseTime: 2000,
    maxTotalLoadTime: 3000,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB in bytes
    maxErrorRate: 0.02
  }

  // Track Canvas render performance
  trackCanvasRender(componentName: string, renderTime: number): void {
    console.log(`[Performance] Canvas render: ${componentName} - ${renderTime}ms`)
    
    if (renderTime > this.thresholds.maxCanvasRenderTime) {
      console.warn(`[Performance] Canvas render exceeded threshold: ${renderTime}ms > ${this.thresholds.maxCanvasRenderTime}ms`)
    }

    this.metrics.push({
      canvasRenderTime: renderTime,
      agentResponseTime: 0,
      totalLoadTime: 0,
      memoryUsage: this.getMemoryUsage(),
      errorCount: 0
    })
  }

  // Track agent response performance
  trackAgentResponse(agentName: string, responseTime: number): void {
    console.log(`[Performance] Agent response: ${agentName} - ${responseTime}ms`)
    
    if (responseTime > this.thresholds.maxAgentResponseTime) {
      console.warn(`[Performance] Agent response exceeded threshold: ${responseTime}ms > ${this.thresholds.maxAgentResponseTime}ms`)
    }

    this.metrics.push({
      canvasRenderTime: 0,
      agentResponseTime: responseTime,
      totalLoadTime: 0,
      memoryUsage: this.getMemoryUsage(),
      errorCount: 0
    })
  }

  // Track total page load performance
  trackPageLoad(loadTime: number): void {
    console.log(`[Performance] Page load: ${loadTime}ms`)
    
    if (loadTime > this.thresholds.maxTotalLoadTime) {
      console.warn(`[Performance] Page load exceeded threshold: ${loadTime}ms > ${this.thresholds.maxTotalLoadTime}ms`)
    }

    this.metrics.push({
      canvasRenderTime: 0,
      agentResponseTime: 0,
      totalLoadTime: loadTime,
      memoryUsage: this.getMemoryUsage(),
      errorCount: 0
    })
  }

  // Track errors
  trackError(error: Error, context: string): void {
    console.error(`[Performance] Error in ${context}:`, error)
    
    this.metrics.push({
      canvasRenderTime: 0,
      agentResponseTime: 0,
      totalLoadTime: 0,
      memoryUsage: this.getMemoryUsage(),
      errorCount: 1
    })
  }

  // Get current memory usage
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  // Get performance summary
  getPerformanceSummary(): {
    averageCanvasRenderTime: number
    averageAgentResponseTime: number
    averageTotalLoadTime: number
    averageMemoryUsage: number
    totalErrors: number
    errorRate: number
    complianceStatus: 'PASS' | 'FAIL'
    recommendations: string[]
  } {
    const canvasTimes = this.metrics.filter(m => m.canvasRenderTime > 0).map(m => m.canvasRenderTime)
    const agentTimes = this.metrics.filter(m => m.agentResponseTime > 0).map(m => m.agentResponseTime)
    const loadTimes = this.metrics.filter(m => m.totalLoadTime > 0).map(m => m.totalLoadTime)
    const memoryUsages = this.metrics.map(m => m.memoryUsage)
    const totalErrors = this.metrics.reduce((sum, m) => sum + m.errorCount, 0)
    const totalMetrics = this.metrics.length

    const averageCanvasRenderTime = canvasTimes.length > 0 
      ? canvasTimes.reduce((a, b) => a + b, 0) / canvasTimes.length 
      : 0

    const averageAgentResponseTime = agentTimes.length > 0 
      ? agentTimes.reduce((a, b) => a + b, 0) / agentTimes.length 
      : 0

    const averageTotalLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length 
      : 0

    const averageMemoryUsage = memoryUsages.length > 0 
      ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length 
      : 0

    const errorRate = totalMetrics > 0 ? totalErrors / totalMetrics : 0

    const recommendations: string[] = []
    
    if (averageCanvasRenderTime > this.thresholds.maxCanvasRenderTime) {
      recommendations.push('Optimize Canvas component rendering - consider lazy loading or code splitting')
    }
    
    if (averageAgentResponseTime > this.thresholds.maxAgentResponseTime) {
      recommendations.push('Optimize agent response times - consider caching or parallel processing')
    }
    
    if (averageTotalLoadTime > this.thresholds.maxTotalLoadTime) {
      recommendations.push('Optimize page load times - consider reducing bundle size or implementing preloading')
    }
    
    if (averageMemoryUsage > this.thresholds.maxMemoryUsage) {
      recommendations.push('Optimize memory usage - check for memory leaks or excessive object creation')
    }
    
    if (errorRate > this.thresholds.maxErrorRate) {
      recommendations.push('Reduce error rate - improve error handling and input validation')
    }

    const complianceStatus = (
      averageCanvasRenderTime <= this.thresholds.maxCanvasRenderTime &&
      averageAgentResponseTime <= this.thresholds.maxAgentResponseTime &&
      averageTotalLoadTime <= this.thresholds.maxTotalLoadTime &&
      averageMemoryUsage <= this.thresholds.maxMemoryUsage &&
      errorRate <= this.thresholds.maxErrorRate
    ) ? 'PASS' : 'FAIL'

    return {
      averageCanvasRenderTime,
      averageAgentResponseTime,
      averageTotalLoadTime,
      averageMemoryUsage,
      totalErrors,
      errorRate,
      complianceStatus,
      recommendations
    }
  }

  // Generate performance report
  generateReport(): string {
    const summary = this.getPerformanceSummary()
    
    return `
# Performance Report - MortgageMatch Pro
Generated: ${new Date().toISOString()}

## Summary
- **Compliance Status:** ${summary.complianceStatus}
- **Total Metrics Collected:** ${this.metrics.length}

## Performance Metrics
- **Average Canvas Render Time:** ${summary.averageCanvasRenderTime.toFixed(2)}ms (Threshold: ${this.thresholds.maxCanvasRenderTime}ms)
- **Average Agent Response Time:** ${summary.averageAgentResponseTime.toFixed(2)}ms (Threshold: ${this.thresholds.maxAgentResponseTime}ms)
- **Average Total Load Time:** ${summary.averageTotalLoadTime.toFixed(2)}ms (Threshold: ${this.thresholds.maxTotalLoadTime}ms)
- **Average Memory Usage:** ${(summary.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB (Threshold: ${this.thresholds.maxMemoryUsage / 1024 / 1024}MB)
- **Error Rate:** ${(summary.errorRate * 100).toFixed(2)}% (Threshold: ${this.thresholds.maxErrorRate * 100}%)

## Recommendations
${summary.recommendations.length > 0 
  ? summary.recommendations.map(rec => `- ${rec}`).join('\n')
  : '- No performance optimizations needed'
}

## OpenAI App Store Compliance
- Canvas render latency: ${summary.averageCanvasRenderTime <= this.thresholds.maxCanvasRenderTime ? '✅ PASS' : '❌ FAIL'}
- Agent response speed: ${summary.averageAgentResponseTime <= this.thresholds.maxAgentResponseTime ? '✅ PASS' : '❌ FAIL'}
- Overall performance: ${summary.complianceStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}
    `.trim()
  }

  // Clear metrics (for testing)
  clearMetrics(): void {
    this.metrics = []
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const trackCanvasRender = (componentName: string, renderTime: number) => {
    performanceMonitor.trackCanvasRender(componentName, renderTime)
  }

  const trackAgentResponse = (agentName: string, responseTime: number) => {
    performanceMonitor.trackAgentResponse(agentName, responseTime)
  }

  const trackPageLoad = (loadTime: number) => {
    performanceMonitor.trackPageLoad(loadTime)
  }

  const trackError = (error: Error, context: string) => {
    performanceMonitor.trackError(error, context)
  }

  const getSummary = () => {
    return performanceMonitor.getPerformanceSummary()
  }

  const generateReport = () => {
    return performanceMonitor.generateReport()
  }

  return {
    trackCanvasRender,
    trackAgentResponse,
    trackPageLoad,
    trackError,
    getSummary,
    generateReport
  }
}