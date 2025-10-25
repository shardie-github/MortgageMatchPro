/**
 * Circuit Breaker Service
 * Implements circuit breaker pattern for external service calls
 */

import { z } from 'zod';

// Circuit breaker configuration schema
export const CircuitBreakerConfigSchema = z.object({
  failureThreshold: z.number().min(1).default(5),
  timeout: z.number().min(1000).default(60000), // 1 minute
  resetTimeout: z.number().min(1000).default(30000), // 30 seconds
  monitoringPeriod: z.number().min(1000).default(10000), // 10 seconds
  halfOpenMaxCalls: z.number().min(1).default(3)
});

export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;

// Circuit breaker state schema
export const CircuitBreakerStateSchema = z.enum([
  'CLOSED',
  'OPEN',
  'HALF_OPEN'
]);

export type CircuitBreakerState = z.infer<typeof CircuitBreakerStateSchema>;

// Circuit breaker metrics schema
export const CircuitBreakerMetricsSchema = z.object({
  totalCalls: z.number(),
  successfulCalls: z.number(),
  failedCalls: z.number(),
  state: CircuitBreakerStateSchema,
  lastFailureTime: z.date().optional(),
  lastSuccessTime: z.date().optional(),
  failureRate: z.number().min(0).max(1),
  averageResponseTime: z.number(),
  consecutiveFailures: z.number()
});

export type CircuitBreakerMetrics = z.infer<typeof CircuitBreakerMetricsSchema>;

export class CircuitBreakerService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private config: CircuitBreakerConfig;
  private metrics: Map<string, CircuitBreakerMetrics> = new Map();

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = CircuitBreakerConfigSchema.parse(config);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.getOrCreateCircuitBreaker(serviceName);
    
    if (!circuitBreaker.isAvailable()) {
      if (fallback) {
        return await fallback();
      }
      throw new Error(`Circuit breaker is OPEN for service: ${serviceName}`);
    }

    const startTime = Date.now();
    
    try {
      const result = await operation();
      circuitBreaker.recordSuccess();
      this.updateMetrics(serviceName, true, Date.now() - startTime);
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      this.updateMetrics(serviceName, false, Date.now() - startTime);
      
      if (fallback) {
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Get or create a circuit breaker for a service
   */
  private getOrCreateCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker(this.config));
      this.initializeMetrics(serviceName);
    }
    
    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Initialize metrics for a service
   */
  private initializeMetrics(serviceName: string): void {
    this.metrics.set(serviceName, {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      state: 'CLOSED',
      failureRate: 0,
      averageResponseTime: 0,
      consecutiveFailures: 0
    });
  }

  /**
   * Update metrics for a service
   */
  private updateMetrics(serviceName: string, success: boolean, responseTime: number): void {
    const metrics = this.metrics.get(serviceName)!;
    const circuitBreaker = this.circuitBreakers.get(serviceName)!;
    
    metrics.totalCalls++;
    metrics.state = circuitBreaker.getState();
    
    if (success) {
      metrics.successfulCalls++;
      metrics.consecutiveFailures = 0;
      metrics.lastSuccessTime = new Date();
    } else {
      metrics.failedCalls++;
      metrics.consecutiveFailures++;
      metrics.lastFailureTime = new Date();
    }
    
    // Update failure rate
    metrics.failureRate = metrics.totalCalls > 0 ? metrics.failedCalls / metrics.totalCalls : 0;
    
    // Update average response time
    const totalResponseTime = metrics.averageResponseTime * (metrics.totalCalls - 1) + responseTime;
    metrics.averageResponseTime = totalResponseTime / metrics.totalCalls;
  }

  /**
   * Get metrics for a service
   */
  getMetrics(serviceName: string): CircuitBreakerMetrics | null {
    return this.metrics.get(serviceName) || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, CircuitBreakerMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get circuit breaker state for a service
   */
  getState(serviceName: string): CircuitBreakerState | null {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    return circuitBreaker ? circuitBreaker.getState() : null;
  }

  /**
   * Reset circuit breaker for a service
   */
  reset(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.reset();
      this.initializeMetrics(serviceName);
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const [serviceName, circuitBreaker] of this.circuitBreakers) {
      circuitBreaker.reset();
      this.initializeMetrics(serviceName);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update existing circuit breakers
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.updateConfig(this.config);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  /**
   * Get health status of all services
   */
  getHealthStatus(): Record<string, { state: CircuitBreakerState; healthy: boolean }> {
    const status: Record<string, { state: CircuitBreakerState; healthy: boolean }> = {};
    
    for (const [serviceName, circuitBreaker] of this.circuitBreakers) {
      const state = circuitBreaker.getState();
      status[serviceName] = {
        state,
        healthy: state === 'CLOSED' || state === 'HALF_OPEN'
      };
    }
    
    return status;
  }
}

// Circuit breaker implementation
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: CircuitBreakerState = 'CLOSED';
  private config: CircuitBreakerConfig;
  private halfOpenCalls: number = 0;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.halfOpenCalls = 0;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  isAvailable(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }
    
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
        return true;
      }
      return false;
    }
    
    // HALF_OPEN state
    if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      return false;
    }
    
    this.halfOpenCalls++;
    return true;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.halfOpenCalls = 0;
    this.lastFailureTime = 0;
  }

  updateConfig(newConfig: CircuitBreakerConfig): void {
    this.config = newConfig;
  }
}

// Singleton instance
export const circuitBreakerService = new CircuitBreakerService();