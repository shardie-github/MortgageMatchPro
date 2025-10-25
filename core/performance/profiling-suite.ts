/**
 * Enhanced Performance Profiling Suite v1.4.0
 * Comprehensive performance monitoring, optimization, and analysis
 */

import { performance } from 'perf_hooks';
import { getPerformanceMonitor, trackPerformance, trackOpenAIUsage } from '../performance-monitoring';

export interface TTFBMetrics {
  endpoint: string;
  ttfb: number; // Time to First Byte
  dnsLookup: number;
  tcpConnection: number;
  sslHandshake?: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  timestamp: string;
}

export interface AILatencyMetrics {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latency: number;
  cost: number;
  temperature: number;
  maxTokens: number;
  timestamp: string;
  userId?: string;
}

export interface ColdStartMetrics {
  functionName: string;
  coldStartDuration: number;
  warmStartDuration?: number;
  memoryUsed: number;
  timestamp: string;
  environment: 'development' | 'production';
}

export interface HotPathMetrics {
  path: string;
  duration: number;
  cacheHit: boolean;
  databaseQueries: number;
  externalCalls: number;
  memoryDelta: number;
  timestamp: string;
}

export interface EndpointPerformance {
  endpoint: string;
  method: string;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  requestCount: number;
  throughput: number; // requests per second
  slowestQueries: string[];
  optimizationOpportunities: string[];
}

export interface CacheMetrics {
  key: string;
  hit: boolean;
  responseTime: number;
  ttl: number;
  size: number;
  timestamp: string;
  userId?: string;
}

export interface ConnectionPoolMetrics {
  poolName: string;
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  waitingRequests: number;
  averageWaitTime: number;
  timestamp: string;
}

class PerformanceProfilingSuite {
  private ttfbMetrics: TTFBMetrics[] = [];
  private aiLatencyMetrics: AILatencyMetrics[] = [];
  private coldStartMetrics: ColdStartMetrics[] = [];
  private hotPathMetrics: HotPathMetrics[] = [];
  private cacheMetrics: CacheMetrics[] = [];
  private connectionPoolMetrics: ConnectionPoolMetrics[] = [];
  private endpointPerformance: Map<string, EndpointPerformance> = new Map();
  
  private readonly maxMetrics = 10000;
  private readonly performanceThresholds = {
    ttfb: 200, // ms
    aiLatency: 2000, // ms
    coldStart: 1000, // ms
    hotPath: 500, // ms
    errorRate: 0.05, // 5%
    p95ResponseTime: 1000, // ms
  };

  // TTFB Measurement
  trackTTFB(endpoint: string, metrics: Omit<TTFBMetrics, 'endpoint' | 'timestamp'>): void {
    const ttfbMetric: TTFBMetrics = {
      endpoint,
      timestamp: new Date().toISOString(),
      ...metrics,
    };

    this.ttfbMetrics.push(ttfbMetric);
    this.cleanupMetrics('ttfb');

    // Alert if TTFB exceeds threshold
    if (metrics.ttfb > this.performanceThresholds.ttfb) {
      console.warn(`[Performance] TTFB exceeded threshold for ${endpoint}: ${metrics.ttfb}ms > ${this.performanceThresholds.ttfb}ms`);
    }
  }

  // AI Latency Measurement
  trackAILatency(metrics: AILatencyMetrics): void {
    this.aiLatencyMetrics.push(metrics);
    this.cleanupMetrics('ai');

    // Track in existing performance monitor
    trackOpenAIUsage(
      metrics.userId || 'system',
      metrics.model,
      metrics.promptTokens,
      metrics.completionTokens,
      metrics.latency
    );

    // Alert if latency exceeds threshold
    if (metrics.latency > this.performanceThresholds.aiLatency) {
      console.warn(`[Performance] AI latency exceeded threshold: ${metrics.latency}ms > ${this.performanceThresholds.aiLatency}ms`);
    }
  }

  // Cold Start vs Hot Path Measurement
  trackColdStart(metrics: ColdStartMetrics): void {
    this.coldStartMetrics.push(metrics);
    this.cleanupMetrics('coldStart');

    // Alert if cold start is too slow
    if (metrics.coldStartDuration > this.performanceThresholds.coldStart) {
      console.warn(`[Performance] Cold start exceeded threshold: ${metrics.coldStartDuration}ms > ${this.performanceThresholds.coldStart}ms`);
    }
  }

  trackHotPath(metrics: HotPathMetrics): void {
    this.hotPathMetrics.push(metrics);
    this.cleanupMetrics('hotPath');

    // Alert if hot path is too slow
    if (metrics.duration > this.performanceThresholds.hotPath) {
      console.warn(`[Performance] Hot path exceeded threshold: ${metrics.duration}ms > ${this.performanceThresholds.hotPath}ms`);
    }
  }

  // Cache Performance
  trackCachePerformance(metrics: CacheMetrics): void {
    this.cacheMetrics.push(metrics);
    this.cleanupMetrics('cache');
  }

  // Connection Pool Monitoring
  trackConnectionPool(metrics: ConnectionPoolMetrics): void {
    this.connectionPoolMetrics.push(metrics);
    this.cleanupMetrics('connectionPool');
  }

  // Endpoint Performance Analysis
  analyzeEndpointPerformance(endpoint: string, method: string = 'GET'): EndpointPerformance {
    const key = `${method}:${endpoint}`;
    
    // Get performance data from existing monitor
    const perfMonitor = getPerformanceMonitor();
    const performanceData = perfMonitor.getPerformanceSummary(endpoint);
    
    // Calculate percentiles
    const responseTimes = this.getResponseTimesForEndpoint(endpoint);
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    
    const p50 = this.calculatePercentile(sortedTimes, 0.5);
    const p95 = this.calculatePercentile(sortedTimes, 0.95);
    const p99 = this.calculatePercentile(sortedTimes, 0.99);
    
    // Calculate throughput (requests per second)
    const timeWindow = 60000; // 1 minute
    const recentRequests = responseTimes.filter((_, index) => 
      Date.now() - this.getTimestampForRequest(endpoint, index) < timeWindow
    );
    const throughput = (recentRequests.length / timeWindow) * 1000;
    
    // Identify slowest queries and optimization opportunities
    const slowestQueries = this.identifySlowQueries(endpoint);
    const optimizationOpportunities = this.identifyOptimizationOpportunities(endpoint, performanceData);
    
    const endpointPerf: EndpointPerformance = {
      endpoint,
      method,
      averageResponseTime: performanceData.averageResponseTime,
      p50ResponseTime: p50,
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      errorRate: performanceData.errorRate,
      requestCount: performanceData.totalRequests,
      throughput,
      slowestQueries,
      optimizationOpportunities,
    };
    
    this.endpointPerformance.set(key, endpointPerf);
    return endpointPerf;
  }

  // Get Top 10 Slowest Endpoints
  getTopSlowestEndpoints(limit: number = 10): EndpointPerformance[] {
    const allEndpoints = Array.from(this.endpointPerformance.values());
    return allEndpoints
      .sort((a, b) => b.p95ResponseTime - a.p95ResponseTime)
      .slice(0, limit);
  }

  // Performance Optimization Recommendations
  getOptimizationRecommendations(): {
    highPriority: string[];
    mediumPriority: string[];
    lowPriority: string[];
    estimatedImpact: string;
  } {
    const recommendations = {
      highPriority: [] as string[],
      mediumPriority: [] as string[],
      lowPriority: [] as string[],
      estimatedImpact: '',
    };

    // Analyze TTFB issues
    const avgTTFB = this.calculateAverageTTFB();
    if (avgTTFB > this.performanceThresholds.ttfb) {
      recommendations.highPriority.push(
        `Optimize TTFB: Current ${avgTTFB.toFixed(2)}ms exceeds ${this.performanceThresholds.ttfb}ms threshold. Consider CDN, edge caching, or server optimization.`
      );
    }

    // Analyze AI latency issues
    const avgAILatency = this.calculateAverageAILatency();
    if (avgAILatency > this.performanceThresholds.aiLatency) {
      recommendations.highPriority.push(
        `Optimize AI latency: Current ${avgAILatency.toFixed(2)}ms exceeds ${this.performanceThresholds.aiLatency}ms threshold. Consider model optimization, caching, or parallel processing.`
      );
    }

    // Analyze cold start issues
    const avgColdStart = this.calculateAverageColdStart();
    if (avgColdStart > this.performanceThresholds.coldStart) {
      recommendations.mediumPriority.push(
        `Optimize cold starts: Current ${avgColdStart.toFixed(2)}ms exceeds ${this.performanceThresholds.coldStart}ms threshold. Consider warming strategies or container optimization.`
      );
    }

    // Analyze cache performance
    const cacheHitRate = this.calculateCacheHitRate();
    if (cacheHitRate < 0.8) {
      recommendations.mediumPriority.push(
        `Improve cache hit rate: Current ${(cacheHitRate * 100).toFixed(1)}% is below 80% target. Consider cache strategy optimization.`
      );
    }

    // Analyze connection pool efficiency
    const poolEfficiency = this.calculateConnectionPoolEfficiency();
    if (poolEfficiency < 0.7) {
      recommendations.lowPriority.push(
        `Optimize connection pools: Current efficiency ${(poolEfficiency * 100).toFixed(1)}% is below 70% target.`
      );
    }

    // Calculate estimated impact
    const totalIssues = recommendations.highPriority.length + recommendations.mediumPriority.length + recommendations.lowPriority.length;
    if (totalIssues === 0) {
      recommendations.estimatedImpact = 'No performance issues detected';
    } else if (recommendations.highPriority.length > 0) {
      recommendations.estimatedImpact = 'High impact optimizations available - 20-40% performance improvement expected';
    } else if (recommendations.mediumPriority.length > 0) {
      recommendations.estimatedImpact = 'Medium impact optimizations available - 10-20% performance improvement expected';
    } else {
      recommendations.estimatedImpact = 'Low impact optimizations available - 5-10% performance improvement expected';
    }

    return recommendations;
  }

  // Generate Performance Report
  generatePerformanceReport(): {
    summary: {
      overallScore: number;
      ttfbScore: number;
      aiLatencyScore: number;
      coldStartScore: number;
      cacheScore: number;
    };
    metrics: {
      averageTTFB: number;
      averageAILatency: number;
      averageColdStart: number;
      cacheHitRate: number;
      connectionPoolEfficiency: number;
    };
    slowestEndpoints: EndpointPerformance[];
    recommendations: ReturnType<typeof this.getOptimizationRecommendations>;
    trends: {
      ttfbTrend: 'improving' | 'stable' | 'degrading';
      aiLatencyTrend: 'improving' | 'stable' | 'degrading';
      errorRateTrend: 'improving' | 'stable' | 'degrading';
    };
  } {
    const avgTTFB = this.calculateAverageTTFB();
    const avgAILatency = this.calculateAverageAILatency();
    const avgColdStart = this.calculateAverageColdStart();
    const cacheHitRate = this.calculateCacheHitRate();
    const poolEfficiency = this.calculateConnectionPoolEfficiency();

    // Calculate scores (0-100)
    const ttfbScore = Math.max(0, 100 - (avgTTFB / this.performanceThresholds.ttfb) * 100);
    const aiLatencyScore = Math.max(0, 100 - (avgAILatency / this.performanceThresholds.aiLatency) * 100);
    const coldStartScore = Math.max(0, 100 - (avgColdStart / this.performanceThresholds.coldStart) * 100);
    const cacheScore = cacheHitRate * 100;
    
    const overallScore = (ttfbScore + aiLatencyScore + coldStartScore + cacheScore) / 4;

    return {
      summary: {
        overallScore: Math.round(overallScore),
        ttfbScore: Math.round(ttfbScore),
        aiLatencyScore: Math.round(aiLatencyScore),
        coldStartScore: Math.round(coldStartScore),
        cacheScore: Math.round(cacheScore),
      },
      metrics: {
        averageTTFB: avgTTFB,
        averageAILatency: avgAILatency,
        averageColdStart: avgColdStart,
        cacheHitRate,
        connectionPoolEfficiency: poolEfficiency,
      },
      slowestEndpoints: this.getTopSlowestEndpoints(5),
      recommendations: this.getOptimizationRecommendations(),
      trends: this.calculateTrends(),
    };
  }

  // Helper methods
  private cleanupMetrics(type: string): void {
    const maxMetrics = this.maxMetrics;
    
    switch (type) {
      case 'ttfb':
        if (this.ttfbMetrics.length > maxMetrics) {
          this.ttfbMetrics = this.ttfbMetrics.slice(-maxMetrics);
        }
        break;
      case 'ai':
        if (this.aiLatencyMetrics.length > maxMetrics) {
          this.aiLatencyMetrics = this.aiLatencyMetrics.slice(-maxMetrics);
        }
        break;
      case 'coldStart':
        if (this.coldStartMetrics.length > maxMetrics) {
          this.coldStartMetrics = this.coldStartMetrics.slice(-maxMetrics);
        }
        break;
      case 'hotPath':
        if (this.hotPathMetrics.length > maxMetrics) {
          this.hotPathMetrics = this.hotPathMetrics.slice(-maxMetrics);
        }
        break;
      case 'cache':
        if (this.cacheMetrics.length > maxMetrics) {
          this.cacheMetrics = this.cacheMetrics.slice(-maxMetrics);
        }
        break;
      case 'connectionPool':
        if (this.connectionPoolMetrics.length > maxMetrics) {
          this.connectionPoolMetrics = this.connectionPoolMetrics.slice(-maxMetrics);
        }
        break;
    }
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  private getResponseTimesForEndpoint(endpoint: string): number[] {
    // This would integrate with the existing performance monitor
    const perfMonitor = getPerformanceMonitor();
    const summary = perfMonitor.getPerformanceSummary(endpoint);
    // For now, return empty array - would need to implement proper integration
    return [];
  }

  private getTimestampForRequest(endpoint: string, index: number): number {
    // This would integrate with the existing performance monitor
    return Date.now();
  }

  private identifySlowQueries(endpoint: string): string[] {
    // This would analyze database queries for the endpoint
    return [];
  }

  private identifyOptimizationOpportunities(endpoint: string, performanceData: any): string[] {
    const opportunities: string[] = [];
    
    if (performanceData.averageResponseTime > 1000) {
      opportunities.push('Consider adding response caching');
    }
    
    if (performanceData.errorRate > 0.05) {
      opportunities.push('Improve error handling and input validation');
    }
    
    return opportunities;
  }

  private calculateAverageTTFB(): number {
    if (this.ttfbMetrics.length === 0) return 0;
    return this.ttfbMetrics.reduce((sum, m) => sum + m.ttfb, 0) / this.ttfbMetrics.length;
  }

  private calculateAverageAILatency(): number {
    if (this.aiLatencyMetrics.length === 0) return 0;
    return this.aiLatencyMetrics.reduce((sum, m) => sum + m.latency, 0) / this.aiLatencyMetrics.length;
  }

  private calculateAverageColdStart(): number {
    if (this.coldStartMetrics.length === 0) return 0;
    return this.coldStartMetrics.reduce((sum, m) => sum + m.coldStartDuration, 0) / this.coldStartMetrics.length;
  }

  private calculateCacheHitRate(): number {
    if (this.cacheMetrics.length === 0) return 0;
    const hits = this.cacheMetrics.filter(m => m.hit).length;
    return hits / this.cacheMetrics.length;
  }

  private calculateConnectionPoolEfficiency(): number {
    if (this.connectionPoolMetrics.length === 0) return 0;
    const avgActive = this.connectionPoolMetrics.reduce((sum, m) => sum + m.activeConnections, 0) / this.connectionPoolMetrics.length;
    const avgTotal = this.connectionPoolMetrics.reduce((sum, m) => sum + m.totalConnections, 0) / this.connectionPoolMetrics.length;
    return avgTotal > 0 ? avgActive / avgTotal : 0;
  }

  private calculateTrends(): {
    ttfbTrend: 'improving' | 'stable' | 'degrading';
    aiLatencyTrend: 'improving' | 'stable' | 'degrading';
    errorRateTrend: 'improving' | 'stable' | 'degrading';
  } {
    // This would analyze historical data to determine trends
    // For now, return stable trends
    return {
      ttfbTrend: 'stable',
      aiLatencyTrend: 'stable',
      errorRateTrend: 'stable',
    };
  }
}

// Export singleton instance
export const performanceProfilingSuite = new PerformanceProfilingSuite();

// Export types and convenience functions
export {
  PerformanceProfilingSuite,
  TTFBMetrics,
  AILatencyMetrics,
  ColdStartMetrics,
  HotPathMetrics,
  EndpointPerformance,
  CacheMetrics,
  ConnectionPoolMetrics,
};

// Convenience functions for common operations
export const trackTTFB = (endpoint: string, metrics: Omit<TTFBMetrics, 'endpoint' | 'timestamp'>) => {
  performanceProfilingSuite.trackTTFB(endpoint, metrics);
};

export const trackAILatency = (metrics: AILatencyMetrics) => {
  performanceProfilingSuite.trackAILatency(metrics);
};

export const trackColdStart = (metrics: ColdStartMetrics) => {
  performanceProfilingSuite.trackColdStart(metrics);
};

export const trackHotPath = (metrics: HotPathMetrics) => {
  performanceProfilingSuite.trackHotPath(metrics);
};

export const getPerformanceReport = () => {
  return performanceProfilingSuite.generatePerformanceReport();
};

export const getOptimizationRecommendations = () => {
  return performanceProfilingSuite.getOptimizationRecommendations();
};

export const getTopSlowestEndpoints = (limit?: number) => {
  return performanceProfilingSuite.getTopSlowestEndpoints(limit);
};
