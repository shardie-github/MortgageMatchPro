/**
 * SRE (Site Reliability Engineering) Metrics and Monitoring
 * Implements enterprise-scale SRE practices with MTTR < 10min and error budget ≤ 1%
 */

import { supabaseAdmin } from '../supabase'
import { captureException, captureMessage } from '../monitoring'

export interface SREMetric {
  id: string
  name: string
  value: number
  unit: string
  timestamp: Date
  tags: Record<string, string>
  service: string
  environment: 'development' | 'staging' | 'production'
}

export interface ErrorBudget {
  service: string
  total_requests: number
  error_requests: number
  error_rate: number
  budget_remaining: number
  budget_consumed: number
  time_window: string
  last_updated: Date
}

export interface SLI {
  name: string
  description: string
  measurement: 'availability' | 'latency' | 'throughput' | 'error_rate'
  target: number
  current_value: number
  status: 'healthy' | 'warning' | 'critical'
  last_updated: Date
}

export interface SLO {
  name: string
  description: string
  sli_name: string
  target_percentage: number
  measurement_window: string
  current_percentage: number
  status: 'meeting' | 'at_risk' | 'breach'
  last_updated: Date
}

export class SREMetricsCollector {
  private metricsBuffer: SREMetric[] = []
  private readonly bufferSize = 100
  private readonly flushInterval = 30000 // 30 seconds

  constructor() {
    // Start periodic flushing
    setInterval(() => this.flushMetrics(), this.flushInterval)
  }

  /**
   * Record a system metric
   */
  async recordMetric(metric: Omit<SREMetric, 'id' | 'timestamp'>): Promise<void> {
    const fullMetric: SREMetric = {
      ...metric,
      id: this.generateId(),
      timestamp: new Date(),
    }

    this.metricsBuffer.push(fullMetric)

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.bufferSize) {
      await this.flushMetrics()
    }
  }

  /**
   * Record API response time
   */
  async recordApiLatency(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    service: string = 'api'
  ): Promise<void> {
    await this.recordMetric({
      name: 'api_latency',
      value: duration,
      unit: 'ms',
      tags: {
        endpoint,
        method,
        status_code: statusCode.toString(),
        service,
      },
      service,
      environment: (process.env.NODE_ENV as any) || 'development',
    })
  }

  /**
   * Record error rate
   */
  async recordErrorRate(
    service: string,
    errorCount: number,
    totalRequests: number,
    timeWindow: string = '1m'
  ): Promise<void> {
    const errorRate = (errorCount / totalRequests) * 100

    await this.recordMetric({
      name: 'error_rate',
      value: errorRate,
      unit: 'percent',
      tags: {
        service,
        time_window: timeWindow,
        error_count: errorCount.toString(),
        total_requests: totalRequests.toString(),
      },
      service,
      environment: (process.env.NODE_ENV as any) || 'development',
    })

    // Check error budget
    await this.checkErrorBudget(service, errorRate)
  }

  /**
   * Record availability metric
   */
  async recordAvailability(
    service: string,
    isAvailable: boolean,
    checkType: string = 'health_check'
  ): Promise<void> {
    await this.recordMetric({
      name: 'availability',
      value: isAvailable ? 1 : 0,
      unit: 'boolean',
      tags: {
        service,
        check_type: checkType,
      },
      service,
      environment: (process.env.NODE_ENV as any) || 'development',
    })
  }

  /**
   * Record throughput metric
   */
  async recordThroughput(
    service: string,
    requestsPerSecond: number,
    endpoint?: string
  ): Promise<void> {
    await this.recordMetric({
      name: 'throughput',
      value: requestsPerSecond,
      unit: 'rps',
      tags: {
        service,
        ...(endpoint && { endpoint }),
      },
      service,
      environment: (process.env.NODE_ENV as any) || 'development',
    })
  }

  /**
   * Calculate and record MTTR (Mean Time To Recovery)
   */
  async recordMTTR(
    service: string,
    incidentStart: Date,
    incidentEnd: Date,
    incidentId: string
  ): Promise<void> {
    const mttr = incidentEnd.getTime() - incidentStart.getTime()

    await this.recordMetric({
      name: 'mttr',
      value: mttr,
      unit: 'ms',
      tags: {
        service,
        incident_id: incidentId,
      },
      service,
      environment: (process.env.NODE_ENV as any) || 'development',
    })

    // Alert if MTTR exceeds 10 minutes
    if (mttr > 10 * 60 * 1000) {
      await captureMessage(
        `MTTR exceeded 10 minutes for service ${service}: ${mttr}ms`,
        'warning',
        { service, mttr, incidentId }
      )
    }
  }

  /**
   * Check error budget compliance
   */
  private async checkErrorBudget(service: string, errorRate: number): Promise<void> {
    try {
      const errorBudget = await this.getErrorBudget(service)
      
      if (errorRate > 1.0) { // 1% error budget
        await captureMessage(
          `Error budget exceeded for service ${service}: ${errorRate}% (budget: 1%)`,
          'error',
          { service, errorRate, budget: 1.0 }
        )
      }
    } catch (error) {
      captureException(error as Error, { context: 'error_budget_check', service })
    }
  }

  /**
   * Get current error budget for a service
   */
  async getErrorBudget(service: string): Promise<ErrorBudget | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('error_budgets')
        .select('*')
        .eq('service', service)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single()

      if (error) return null
      return data
    } catch (error) {
      captureException(error as Error, { context: 'get_error_budget', service })
      return null
    }
  }

  /**
   * Update error budget
   */
  async updateErrorBudget(service: string, errorCount: number, totalRequests: number): Promise<void> {
    const errorRate = (errorCount / totalRequests) * 100
    const budgetConsumed = Math.min(errorRate, 1.0) // Cap at 1%
    const budgetRemaining = Math.max(1.0 - budgetConsumed, 0)

    try {
      await supabaseAdmin
        .from('error_budgets')
        .upsert({
          service,
          total_requests: totalRequests,
          error_requests: errorCount,
          error_rate: errorRate,
          budget_remaining: budgetRemaining,
          budget_consumed: budgetConsumed,
          time_window: '1h',
          last_updated: new Date().toISOString(),
        })
    } catch (error) {
      captureException(error as Error, { context: 'update_error_budget', service })
    }
  }

  /**
   * Get SLI (Service Level Indicator) data
   */
  async getSLI(service: string, measurement: string): Promise<SLI | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('slis')
        .select('*')
        .eq('service', service)
        .eq('measurement', measurement)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single()

      if (error) return null
      return data
    } catch (error) {
      captureException(error as Error, { context: 'get_sli', service, measurement })
      return null
    }
  }

  /**
   * Update SLI
   */
  async updateSLI(sli: Omit<SLI, 'last_updated'>): Promise<void> {
    try {
      await supabaseAdmin
        .from('slis')
        .upsert({
          ...sli,
          last_updated: new Date().toISOString(),
        })
    } catch (error) {
      captureException(error as Error, { context: 'update_sli', sli })
    }
  }

  /**
   * Get SLO (Service Level Objective) data
   */
  async getSLO(service: string): Promise<SLO | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('slos')
        .select('*')
        .eq('service', service)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single()

      if (error) return null
      return data
    } catch (error) {
      captureException(error as Error, { context: 'get_slo', service })
      return null
    }
  }

  /**
   * Update SLO
   */
  async updateSLO(slo: Omit<SLO, 'last_updated'>): Promise<void> {
    try {
      await supabaseAdmin
        .from('slos')
        .upsert({
          ...slo,
          last_updated: new Date().toISOString(),
        })
    } catch (error) {
      captureException(error as Error, { context: 'update_slo', slo })
    }
  }

  /**
   * Flush metrics buffer to database
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return

    const metricsToFlush = [...this.metricsBuffer]
    this.metricsBuffer = []

    try {
      await supabaseAdmin
        .from('sre_metrics')
        .insert(metricsToFlush.map(metric => ({
          ...metric,
          timestamp: metric.timestamp.toISOString(),
        })))
    } catch (error) {
      captureException(error as Error, { context: 'flush_metrics' })
      // Re-add metrics to buffer if flush failed
      this.metricsBuffer.unshift(...metricsToFlush)
    }
  }

  /**
   * Generate unique ID for metrics
   */
  private generateId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get metrics summary for dashboard
   */
  async getMetricsSummary(service?: string, timeRange: string = '1h'): Promise<{
    availability: number
    errorRate: number
    avgLatency: number
    throughput: number
    mttr: number
  }> {
    try {
      const timeAgo = new Date(Date.now() - this.parseTimeRange(timeRange))
      
      let query = supabaseAdmin
        .from('sre_metrics')
        .select('name, value, tags')
        .gte('timestamp', timeAgo.toISOString())

      if (service) {
        query = query.eq('service', service)
      }

      const { data, error } = await query

      if (error) throw error

      const metrics = data || []
      const summary = {
        availability: 0,
        errorRate: 0,
        avgLatency: 0,
        throughput: 0,
        mttr: 0,
      }

      // Calculate summary metrics
      const availabilityMetrics = metrics.filter(m => m.name === 'availability')
      summary.availability = availabilityMetrics.length > 0 
        ? (availabilityMetrics.reduce((sum, m) => sum + m.value, 0) / availabilityMetrics.length) * 100
        : 0

      const errorRateMetrics = metrics.filter(m => m.name === 'error_rate')
      summary.errorRate = errorRateMetrics.length > 0
        ? errorRateMetrics.reduce((sum, m) => sum + m.value, 0) / errorRateMetrics.length
        : 0

      const latencyMetrics = metrics.filter(m => m.name === 'api_latency')
      summary.avgLatency = latencyMetrics.length > 0
        ? latencyMetrics.reduce((sum, m) => sum + m.value, 0) / latencyMetrics.length
        : 0

      const throughputMetrics = metrics.filter(m => m.name === 'throughput')
      summary.throughput = throughputMetrics.length > 0
        ? throughputMetrics.reduce((sum, m) => sum + m.value, 0) / throughputMetrics.length
        : 0

      const mttrMetrics = metrics.filter(m => m.name === 'mttr')
      summary.mttr = mttrMetrics.length > 0
        ? mttrMetrics.reduce((sum, m) => sum + m.value, 0) / mttrMetrics.length
        : 0

      return summary
    } catch (error) {
      captureException(error as Error, { context: 'get_metrics_summary', service, timeRange })
      return {
        availability: 0,
        errorRate: 0,
        avgLatency: 0,
        throughput: 0,
        mttr: 0,
      }
    }
  }

  /**
   * Parse time range string to milliseconds
   */
  private parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/^(\d+)([hmd])$/)
    if (!match) return 60 * 60 * 1000 // Default to 1 hour

    const value = parseInt(match[1])
    const unit = match[2]

    switch (unit) {
      case 'm': return value * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'd': return value * 24 * 60 * 60 * 1000
      default: return 60 * 60 * 1000
    }
  }
}

// Initialize global SRE metrics collector
export const sreMetrics = new SREMetricsCollector()

// Export utility functions
export const recordApiLatency = sreMetrics.recordApiLatency.bind(sreMetrics)
export const recordErrorRate = sreMetrics.recordErrorRate.bind(sreMetrics)
export const recordAvailability = sreMetrics.recordAvailability.bind(sreMetrics)
export const recordThroughput = sreMetrics.recordThroughput.bind(sreMetrics)
export const recordMTTR = sreMetrics.recordMTTR.bind(sreMetrics)