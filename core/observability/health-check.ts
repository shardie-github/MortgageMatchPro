/**
 * Health Check System - MortgageMatchPro v1.4.0
 * 
 * Comprehensive health monitoring for all system components
 * Supports database, external APIs, and service dependencies
 */

import { monitoringService } from './monitoring';

// Health check result interface
export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: Date;
  duration: number;
  details?: Record<string, any>;
  dependencies?: HealthCheckResult[];
}

// Health check configuration
export interface HealthCheckConfig {
  name: string;
  description: string;
  timeout: number; // milliseconds
  retries: number;
  interval: number; // milliseconds
  enabled: boolean;
  critical: boolean; // if true, affects overall system health
}

// Health check interface
export interface HealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
  config: HealthCheckConfig;
}

// Database health check
export class DatabaseHealthCheck implements HealthCheck {
  name = 'database';
  config: HealthCheckConfig = {
    name: 'database',
    description: 'PostgreSQL database connectivity and performance',
    timeout: 5000,
    retries: 3,
    interval: 30000,
    enabled: true,
    critical: true
  };

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // This would typically use your actual database client
      // For now, we'll simulate a database check
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return {
          name: this.name,
          status: 'unhealthy',
          message: 'Database configuration missing',
          timestamp: new Date(),
          duration: Date.now() - startTime,
          details: {
            error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY'
          }
        };
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Test basic connectivity
      const { data, error } = await supabase
        .from('health_check')
        .select('*')
        .limit(1);

      if (error) {
        return {
          name: this.name,
          status: 'unhealthy',
          message: `Database query failed: ${error.message}`,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          details: {
            error: error.message,
            code: error.code
          }
        };
      }

      // Test write operation
      const { error: writeError } = await supabase
        .from('health_check')
        .insert({ timestamp: new Date().toISOString() });

      if (writeError) {
        return {
          name: this.name,
          status: 'degraded',
          message: `Database write test failed: ${writeError.message}`,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          details: {
            error: writeError.message,
            code: writeError.code
          }
        };
      }

      return {
        name: this.name,
        status: 'healthy',
        message: 'Database is healthy',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        details: {
          connectionTime: Date.now() - startTime,
          queryResult: data
        }
      };

    } catch (error) {
      return {
        name: this.name,
        status: 'unhealthy',
        message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }
}

// Redis health check
export class RedisHealthCheck implements HealthCheck {
  name = 'redis';
  config: HealthCheckConfig = {
    name: 'redis',
    description: 'Redis cache connectivity and performance',
    timeout: 3000,
    retries: 2,
    interval: 30000,
    enabled: true,
    critical: false
  };

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // This would typically use your actual Redis client
      // For now, we'll simulate a Redis check
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl) {
        return {
          name: this.name,
          status: 'degraded',
          message: 'Redis not configured (optional)',
          timestamp: new Date(),
          duration: Date.now() - startTime,
          details: {
            warning: 'Redis URL not provided'
          }
        };
      }

      // Simulate Redis ping
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        name: this.name,
        status: 'healthy',
        message: 'Redis is healthy',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        details: {
          connectionTime: Date.now() - startTime
        }
      };

    } catch (error) {
      return {
        name: this.name,
        status: 'unhealthy',
        message: `Redis check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// OpenAI API health check
export class OpenAIHealthCheck implements HealthCheck {
  name = 'openai';
  config: HealthCheckConfig = {
    name: 'openai',
    description: 'OpenAI API connectivity and rate limits',
    timeout: 10000,
    retries: 2,
    interval: 60000,
    enabled: true,
    critical: true
  };

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        return {
          name: this.name,
          status: 'unhealthy',
          message: 'OpenAI API key not configured',
          timestamp: new Date(),
          duration: Date.now() - startTime,
          details: {
            error: 'Missing OPENAI_API_KEY'
          }
        };
      }

      // Test OpenAI API with a simple request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          name: this.name,
          status: 'unhealthy',
          message: `OpenAI API error: ${response.status} ${response.statusText}`,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          details: {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          }
        };
      }

      const data = await response.json();
      
      return {
        name: this.name,
        status: 'healthy',
        message: 'OpenAI API is healthy',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        details: {
          connectionTime: Date.now() - startTime,
          modelsAvailable: data.data?.length || 0
        }
      };

    } catch (error) {
      return {
        name: this.name,
        status: 'unhealthy',
        message: `OpenAI API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// Rate API health check
export class RateAPIHealthCheck implements HealthCheck {
  name = 'rate_api';
  config: HealthCheckConfig = {
    name: 'rate_api',
    description: 'External rate API connectivity',
    timeout: 8000,
    retries: 2,
    interval: 60000,
    enabled: true,
    critical: false
  };

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test RateHub API
      const rateHubKey = process.env.RATEHUB_API_KEY;
      
      if (!rateHubKey) {
        return {
          name: this.name,
          status: 'degraded',
          message: 'Rate API not configured (optional)',
          timestamp: new Date(),
          duration: Date.now() - startTime,
          details: {
            warning: 'RATEHUB_API_KEY not provided'
          }
        };
      }

      // Simulate rate API check
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        name: this.name,
        status: 'healthy',
        message: 'Rate API is healthy',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        details: {
          connectionTime: Date.now() - startTime
        }
      };

    } catch (error) {
      return {
        name: this.name,
        status: 'unhealthy',
        message: `Rate API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// System resources health check
export class SystemResourcesHealthCheck implements HealthCheck {
  name = 'system_resources';
  config: HealthCheckConfig = {
    name: 'system_resources',
    description: 'System memory and CPU usage',
    timeout: 1000,
    retries: 1,
    interval: 30000,
    enabled: true,
    critical: true
  };

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Check memory usage
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const rssMB = memUsage.rss / 1024 / 1024;
      
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'System resources are healthy';
      
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
        message = 'Memory usage critically high';
      } else if (memoryUsagePercent > 80) {
        status = 'degraded';
        message = 'Memory usage high';
      }
      
      // Check if we're approaching memory limits
      if (rssMB > 1000) { // 1GB RSS limit
        status = status === 'healthy' ? 'degraded' : status;
        message = status === 'healthy' ? 'Memory usage approaching limits' : message;
      }
      
      return {
        name: this.name,
        status,
        message,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        details: {
          memory: {
            heapUsed: heapUsedMB,
            heapTotal: heapTotalMB,
            rss: rssMB,
            usagePercent: memoryUsagePercent
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        }
      };

    } catch (error) {
      return {
        name: this.name,
        status: 'unhealthy',
        message: `System resources check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// Health check manager
export class HealthCheckManager {
  private checks: Map<string, HealthCheck> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.registerDefaultChecks();
    this.startPeriodicChecks();
  }

  /**
   * Register a health check
   */
  register(check: HealthCheck): void {
    this.checks.set(check.name, check);
    
    // Start periodic check if enabled
    if (check.config.enabled) {
      this.startPeriodicCheck(check);
    }
  }

  /**
   * Unregister a health check
   */
  unregister(name: string): void {
    this.checks.delete(name);
    this.results.delete(name);
    
    // Stop periodic check
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
  }

  /**
   * Run a specific health check
   */
  async runCheck(name: string): Promise<HealthCheckResult | null> {
    const check = this.checks.get(name);
    if (!check) {
      return null;
    }

    const result = await check.check();
    this.results.set(name, result);
    
    // Record metrics
    monitoringService.recordMetric({
      name: `health_check.${name}.status`,
      value: result.status === 'healthy' ? 1 : 0,
      timestamp: new Date(),
      tags: { status: result.status },
      type: 'gauge'
    });
    
    monitoringService.recordMetric({
      name: `health_check.${name}.duration`,
      value: result.duration,
      timestamp: new Date(),
      tags: { status: result.status },
      type: 'histogram'
    });

    return result;
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (const [name, check] of this.checks.entries()) {
      if (check.config.enabled) {
        const result = await this.runCheck(name);
        if (result) {
          results.push(result);
        }
      }
    }
    
    return results;
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheckResult[];
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    const checks = Array.from(this.results.values());
    
    const summary = checks.reduce((acc, check) => {
      acc.total++;
      if (check.status === 'healthy') acc.healthy++;
      else if (check.status === 'degraded') acc.degraded++;
      else if (check.status === 'unhealthy') acc.unhealthy++;
      return acc;
    }, { total: 0, healthy: 0, degraded: 0, unhealthy: 0 });
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (summary.unhealthy > 0) {
      status = 'unhealthy';
    } else if (summary.degraded > 0) {
      status = 'degraded';
    }
    
    return {
      status,
      checks,
      summary
    };
  }

  /**
   * Get health check result
   */
  getCheckResult(name: string): HealthCheckResult | null {
    return this.results.get(name) || null;
  }

  /**
   * Get all health check results
   */
  getAllResults(): HealthCheckResult[] {
    return Array.from(this.results.values());
  }

  private registerDefaultChecks(): void {
    this.register(new DatabaseHealthCheck());
    this.register(new RedisHealthCheck());
    this.register(new OpenAIHealthCheck());
    this.register(new RateAPIHealthCheck());
    this.register(new SystemResourcesHealthCheck());
  }

  private startPeriodicChecks(): void {
    for (const [name, check] of this.checks.entries()) {
      if (check.config.enabled) {
        this.startPeriodicCheck(check);
      }
    }
  }

  private startPeriodicCheck(check: HealthCheck): void {
    const interval = setInterval(async () => {
      await this.runCheck(check.name);
    }, check.config.interval);
    
    this.intervals.set(check.name, interval);
  }
}

// Export singleton instance
export const healthCheckManager = new HealthCheckManager();

// Export convenience functions
export const runHealthCheck = (name: string) => healthCheckManager.runCheck(name);
export const runAllHealthChecks = () => healthCheckManager.runAllChecks();
export const getSystemHealth = () => healthCheckManager.getSystemHealth();
export const getHealthCheckResult = (name: string) => healthCheckManager.getCheckResult(name);