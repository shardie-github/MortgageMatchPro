/**
 * Retry Service
 * Implements retry logic with exponential backoff and jitter
 */

import { z } from 'zod';

// Retry configuration schema
export const RetryConfigSchema = z.object({
  maxAttempts: z.number().min(1).default(3),
  baseDelay: z.number().min(100).default(1000), // milliseconds
  maxDelay: z.number().min(1000).default(30000), // milliseconds
  backoffMultiplier: z.number().min(1).default(2),
  jitter: z.boolean().default(true),
  retryCondition: z.function().optional()
});

export type RetryConfig = z.infer<typeof RetryConfigSchema>;

// Retry result schema
export const RetryResultSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.any().optional(),
  attempts: z.number(),
  totalTime: z.number(),
  lastError: z.any().optional()
});

export type RetryResult<T> = {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalTime: number;
  lastError?: any;
};

export class RetryService {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = RetryConfigSchema.parse(config);
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = { ...this.config, ...customConfig };
    const startTime = Date.now();
    let lastError: any;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await fn();
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error;
        
        // Check if we should retry this error
        if (config.retryCondition && !config.retryCondition(error)) {
          break;
        }
        
        // Don't retry on the last attempt
        if (attempt === config.maxAttempts) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config);
        await this.sleep(delay);
      }
    }
    
    return {
      success: false,
      error: lastError,
      lastError,
      attempts: config.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Execute a function with retry logic and return the result or throw
   */
  async executeOrThrow<T>(
    fn: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const result = await this.execute(fn, customConfig);
    
    if (result.success) {
      return result.result!;
    }
    
    throw result.error || result.lastError;
  }

  /**
   * Execute a function with retry logic and fallback
   */
  async executeWithFallback<T>(
    fn: () => Promise<T>,
    fallback: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const result = await this.execute(fn, customConfig);
    
    if (result.success) {
      return result.result!;
    }
    
    return await fallback();
  }

  /**
   * Calculate delay for retry attempt
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Calculate exponential backoff
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterRange = delay * 0.1; // 10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay += jitter;
    }
    
    return Math.max(0, delay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Create a retry function with specific configuration
   */
  createRetryFunction<T>(
    fn: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): () => Promise<RetryResult<T>> {
    return () => this.execute(fn, customConfig);
  }

  /**
   * Create a retry function that throws on failure
   */
  createRetryFunctionOrThrow<T>(
    fn: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): () => Promise<T> {
    return () => this.executeOrThrow(fn, customConfig);
  }

  /**
   * Create a retry function with fallback
   */
  createRetryFunctionWithFallback<T>(
    fn: () => Promise<T>,
    fallback: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): () => Promise<T> {
    return () => this.executeWithFallback(fn, fallback, customConfig);
  }
}

// Predefined retry configurations
export const RetryConfigs = {
  // Fast retry for transient errors
  fast: {
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2,
    jitter: true
  },
  
  // Standard retry for most operations
  standard: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  },
  
  // Slow retry for expensive operations
  slow: {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true
  },
  
  // Aggressive retry for critical operations
  aggressive: {
    maxAttempts: 10,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    jitter: true
  }
};

// Singleton instance
export const retryService = new RetryService();