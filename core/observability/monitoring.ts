/**
 * Observability and Monitoring System - MortgageMatchPro v1.4.0
 * 
 * Comprehensive monitoring, metrics, and alerting system
 * Supports performance monitoring, error tracking, and business metrics
 */

import { EventEmitter } from 'events';

// Metric types
export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface PerformanceMetric extends Metric {
  type: 'histogram';
  duration: number;
  percentile50: number;
  percentile95: number;
  percentile99: number;
}

export interface BusinessMetric extends Metric {
  type: 'gauge' | 'counter';
  category: 'conversion' | 'retention' | 'engagement' | 'revenue';
}

export interface ErrorMetric extends Metric {
  type: 'counter';
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  stackTrace?: string;
}

// Alert configuration
export interface AlertConfig {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[];
  cooldown: number; // seconds
}

// Monitoring service class
export class MonitoringService extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map();
  private alerts: Map<string, AlertConfig> = new Map();
  private alertStates: Map<string, { triggered: boolean; lastTriggered: Date }> = new Map();
  private performanceData: Map<string, number[]> = new Map();

  constructor() {
    super();
    this.setupDefaultAlerts();
    this.startMetricsCollection();
  }

  /**
   * Record a metric
   */
  recordMetric(metric: Metric): void {
    const key = this.getMetricKey(metric);
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key)!.push(metric);
    
    // Keep only last 1000 metrics per key
    const metrics = this.metrics.get(key)!;
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    // Check alerts
    this.checkAlerts(metric);
    
    // Emit metric event
    this.emit('metric', metric);
  }

  /**
   * Record performance metric
   */
  recordPerformance(operation: string, duration: number, tags: Record<string, string> = {}): void {
    const key = `performance.${operation}`;
    
    // Store raw duration data
    if (!this.performanceData.has(key)) {
      this.performanceData.set(key, []);
    }
    
    const durations = this.performanceData.get(key)!;
    durations.push(duration);
    
    // Keep only last 1000 measurements
    if (durations.length > 1000) {
      durations.splice(0, durations.length - 1000);
    }

    // Calculate percentiles
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const percentile50 = this.calculatePercentile(sortedDurations, 0.5);
    const percentile95 = this.calculatePercentile(sortedDurations, 0.95);
    const percentile99 = this.calculatePercentile(sortedDurations, 0.99);

    const metric: PerformanceMetric = {
      name: key,
      value: duration,
      timestamp: new Date(),
      tags,
      type: 'histogram',
      duration,
      percentile50,
      percentile95,
      percentile99
    };

    this.recordMetric(metric);
  }

  /**
   * Record business metric
   */
  recordBusiness(category: BusinessMetric['category'], name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: BusinessMetric = {
      name: `business.${category}.${name}`,
      value,
      timestamp: new Date(),
      tags,
      type: 'gauge',
      category
    };

    this.recordMetric(metric);
  }

  /**
   * Record error metric
   */
  recordError(errorType: string, severity: ErrorMetric['severity'], message: string, stackTrace?: string, tags: Record<string, string> = {}): void {
    const metric: ErrorMetric = {
      name: `error.${errorType}`,
      value: 1,
      timestamp: new Date(),
      tags: { ...tags, message },
      type: 'counter',
      errorType,
      severity,
      stackTrace
    };

    this.recordMetric(metric);
    this.emit('error', metric);
  }

  /**
   * Record API call metrics
   */
  recordAPICall(endpoint: string, method: string, statusCode: number, duration: number, tags: Record<string, string> = {}): void {
    // Record performance
    this.recordPerformance(`api.${method.toLowerCase()}.${endpoint}`, duration, {
      ...tags,
      endpoint,
      method,
      status_code: statusCode.toString()
    });

    // Record status code
    this.recordMetric({
      name: `api.status.${statusCode}`,
      value: 1,
      timestamp: new Date(),
      tags: { ...tags, endpoint, method },
      type: 'counter'
    });

    // Record error if status code indicates error
    if (statusCode >= 400) {
      this.recordError('api_error', this.getSeverityFromStatusCode(statusCode), 
        `API call failed: ${method} ${endpoint}`, undefined, {
          ...tags,
          endpoint,
          method,
          status_code: statusCode.toString()
        });
    }
  }

  /**
   * Record AI operation metrics
   */
  recordAIOperation(operation: string, duration: number, tokensUsed: number, cost: number, tags: Record<string, string> = {}): void {
    // Record performance
    this.recordPerformance(`ai.${operation}`, duration, tags);

    // Record token usage
    this.recordMetric({
      name: `ai.tokens.${operation}`,
      value: tokensUsed,
      timestamp: new Date(),
      tags,
      type: 'counter'
    });

    // Record cost
    this.recordMetric({
      name: `ai.cost.${operation}`,
      value: cost,
      timestamp: new Date(),
      tags,
      type: 'counter'
    });
  }

  /**
   * Get metrics for a specific time range
   */
  getMetrics(name: string, startTime?: Date, endTime?: Date): Metric[] {
    const key = name.includes('.') ? name : `*.${name}`;
    const allMetrics: Metric[] = [];
    
    for (const [metricKey, metrics] of this.metrics.entries()) {
      if (this.matchesPattern(metricKey, key)) {
        const filteredMetrics = metrics.filter(metric => {
          if (startTime && metric.timestamp < startTime) return false;
          if (endTime && metric.timestamp > endTime) return false;
          return true;
        });
        allMetrics.push(...filteredMetrics);
      }
    }
    
    return allMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(name: string, aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count', startTime?: Date, endTime?: Date): number {
    const metrics = this.getMetrics(name, startTime, endTime);
    
    if (metrics.length === 0) return 0;
    
    switch (aggregation) {
      case 'sum':
        return metrics.reduce((sum, metric) => sum + metric.value, 0);
      case 'avg':
        return metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;
      case 'min':
        return Math.min(...metrics.map(metric => metric.value));
      case 'max':
        return Math.max(...metrics.map(metric => metric.value));
      case 'count':
        return metrics.length;
      default:
        return 0;
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(operation: string, timeWindow: number = 3600): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    percentile50: number;
    percentile95: number;
    percentile99: number;
  } {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow * 1000);
    
    const metrics = this.getMetrics(`performance.${operation}`, startTime, endTime) as PerformanceMetric[];
    
    if (metrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        percentile50: 0,
        percentile95: 0,
        percentile99: 0
      };
    }

    const durations = metrics.map(m => m.duration);
    const sortedDurations = [...durations].sort((a, b) => a - b);

    return {
      count: metrics.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      percentile50: this.calculatePercentile(sortedDurations, 0.5),
      percentile95: this.calculatePercentile(sortedDurations, 0.95),
      percentile99: this.calculatePercentile(sortedDurations, 0.99)
    };
  }

  /**
   * Configure alert
   */
  configureAlert(config: AlertConfig): void {
    this.alerts.set(config.id, config);
    this.alertStates.set(config.id, { triggered: false, lastTriggered: new Date(0) });
  }

  /**
   * Get alert status
   */
  getAlertStatus(alertId: string): { triggered: boolean; lastTriggered: Date } | null {
    return this.alertStates.get(alertId) || null;
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): AlertConfig[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get system health summary
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    errorRate: number;
    responseTime: number;
    activeAlerts: number;
    metrics: {
      totalMetrics: number;
      errorCount: number;
      performanceCount: number;
      businessCount: number;
    };
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
    
    const errorMetrics = this.getMetrics('error', oneHourAgo, now);
    const performanceMetrics = this.getMetrics('performance', oneHourAgo, now);
    const businessMetrics = this.getMetrics('business', oneHourAgo, now);
    
    const totalMetrics = this.metrics.size;
    const errorCount = errorMetrics.length;
    const performanceCount = performanceMetrics.length;
    const businessCount = businessMetrics.length;
    
    const errorRate = errorCount / Math.max(totalMetrics, 1);
    const avgResponseTime = performanceMetrics.length > 0 
      ? performanceMetrics.reduce((sum, m) => sum + (m as PerformanceMetric).duration, 0) / performanceMetrics.length
      : 0;
    
    const activeAlerts = Array.from(this.alertStates.values()).filter(state => state.triggered).length;
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errorRate > 0.1 || activeAlerts > 0) status = 'degraded';
    if (errorRate > 0.2 || activeAlerts > 3) status = 'critical';
    
    return {
      status,
      uptime: this.getUptime(),
      errorRate,
      responseTime: avgResponseTime,
      activeAlerts,
      metrics: {
        totalMetrics,
        errorCount,
        performanceCount,
        businessCount
      }
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'prometheus' | 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusMetrics();
    } else {
      return JSON.stringify(Array.from(this.metrics.entries()), null, 2);
    }
  }

  private getMetricKey(metric: Metric): string {
    const tagString = Object.entries(metric.tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    
    return tagString ? `${metric.name}{${tagString}}` : metric.name;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(key);
    }
    return key === pattern;
  }

  private calculatePercentile(sortedData: number[], percentile: number): number {
    if (sortedData.length === 0) return 0;
    
    const index = Math.ceil(sortedData.length * percentile) - 1;
    return sortedData[Math.max(0, index)];
  }

  private checkAlerts(metric: Metric): void {
    for (const [alertId, alert] of this.alerts.entries()) {
      if (!alert.enabled) continue;
      
      const alertState = this.alertStates.get(alertId)!;
      const now = new Date();
      
      // Check cooldown
      if (now.getTime() - alertState.lastTriggered.getTime() < alert.cooldown * 1000) {
        continue;
      }
      
      // Check if metric matches alert
      if (!this.matchesPattern(metric.name, alert.metric)) continue;
      
      // Check condition
      let shouldTrigger = false;
      switch (alert.condition) {
        case 'gt':
          shouldTrigger = metric.value > alert.threshold;
          break;
        case 'lt':
          shouldTrigger = metric.value < alert.threshold;
          break;
        case 'eq':
          shouldTrigger = metric.value === alert.threshold;
          break;
        case 'gte':
          shouldTrigger = metric.value >= alert.threshold;
          break;
        case 'lte':
          shouldTrigger = metric.value <= alert.threshold;
          break;
      }
      
      if (shouldTrigger && !alertState.triggered) {
        alertState.triggered = true;
        alertState.lastTriggered = now;
        
        this.emit('alert', {
          alertId,
          alert,
          metric,
          timestamp: now
        });
      } else if (!shouldTrigger && alertState.triggered) {
        alertState.triggered = false;
        this.emit('alertResolved', {
          alertId,
          alert,
          metric,
          timestamp: now
        });
      }
    }
  }

  private getSeverityFromStatusCode(statusCode: number): ErrorMetric['severity'] {
    if (statusCode >= 500) return 'critical';
    if (statusCode >= 400) return 'high';
    if (statusCode >= 300) return 'medium';
    return 'low';
  }

  private getUptime(): number {
    // This would typically be calculated from process start time
    return process.uptime();
  }

  private setupDefaultAlerts(): void {
    // High error rate alert
    this.configureAlert({
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Error rate exceeds 10%',
      metric: 'error.*',
      condition: 'gt',
      threshold: 0.1,
      duration: 300, // 5 minutes
      severity: 'high',
      enabled: true,
      channels: ['slack', 'email'],
      cooldown: 300
    });

    // High response time alert
    this.configureAlert({
      id: 'high_response_time',
      name: 'High Response Time',
      description: 'API response time exceeds 2 seconds',
      metric: 'performance.api.*',
      condition: 'gt',
      threshold: 2000,
      duration: 60, // 1 minute
      severity: 'medium',
      enabled: true,
      channels: ['slack'],
      cooldown: 300
    });

    // Low conversion rate alert
    this.configureAlert({
      id: 'low_conversion_rate',
      name: 'Low Conversion Rate',
      description: 'Conversion rate below 5%',
      metric: 'business.conversion.*',
      condition: 'lt',
      threshold: 0.05,
      duration: 1800, // 30 minutes
      severity: 'medium',
      enabled: true,
      channels: ['slack', 'email'],
      cooldown: 1800
    });
  }

  private startMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
  }

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Memory usage
    this.recordMetric({
      name: 'system.memory.heap_used',
      value: memUsage.heapUsed,
      timestamp: new Date(),
      tags: {},
      type: 'gauge'
    });
    
    this.recordMetric({
      name: 'system.memory.heap_total',
      value: memUsage.heapTotal,
      timestamp: new Date(),
      tags: {},
      type: 'gauge'
    });
    
    this.recordMetric({
      name: 'system.memory.rss',
      value: memUsage.rss,
      timestamp: new Date(),
      tags: {},
      type: 'gauge'
    });
    
    // CPU usage
    this.recordMetric({
      name: 'system.cpu.user',
      value: cpuUsage.user,
      timestamp: new Date(),
      tags: {},
      type: 'gauge'
    });
    
    this.recordMetric({
      name: 'system.cpu.system',
      value: cpuUsage.system,
      timestamp: new Date(),
      tags: {},
      type: 'gauge'
    });
  }

  private exportPrometheusMetrics(): string {
    let output = '';
    
    for (const [key, metrics] of this.metrics.entries()) {
      const latestMetric = metrics[metrics.length - 1];
      if (!latestMetric) continue;
      
      const tags = Object.entries(latestMetric.tags)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      
      const tagString = tags ? `{${tags}}` : '';
      output += `# HELP ${latestMetric.name} ${latestMetric.name}\n`;
      output += `# TYPE ${latestMetric.name} ${latestMetric.type}\n`;
      output += `${latestMetric.name}${tagString} ${latestMetric.value}\n`;
    }
    
    return output;
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Export convenience functions
export const recordPerformance = (operation: string, duration: number, tags?: Record<string, string>) =>
  monitoringService.recordPerformance(operation, duration, tags);

export const recordBusiness = (category: BusinessMetric['category'], name: string, value: number, tags?: Record<string, string>) =>
  monitoringService.recordBusiness(category, name, value, tags);

export const recordError = (errorType: string, severity: ErrorMetric['severity'], message: string, stackTrace?: string, tags?: Record<string, string>) =>
  monitoringService.recordError(errorType, severity, message, stackTrace, tags);

export const recordAPICall = (endpoint: string, method: string, statusCode: number, duration: number, tags?: Record<string, string>) =>
  monitoringService.recordAPICall(endpoint, method, statusCode, duration, tags);

export const recordAIOperation = (operation: string, duration: number, tokensUsed: number, cost: number, tags?: Record<string, string>) =>
  monitoringService.recordAIOperation(operation, duration, tokensUsed, cost, tags);