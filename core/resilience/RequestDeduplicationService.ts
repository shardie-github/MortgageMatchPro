/**
 * Request Deduplication Service
 * Prevents duplicate requests and implements request deduplication
 */

import { z } from 'zod';
import { createHash } from 'crypto';

// Request deduplication configuration schema
export const DeduplicationConfigSchema = z.object({
  ttl: z.number().min(1000).default(300000), // 5 minutes
  maxCacheSize: z.number().min(100).default(1000),
  keyGenerator: z.function().optional(),
  cleanupInterval: z.number().min(1000).default(60000) // 1 minute
});

export type DeduplicationConfig = z.infer<typeof DeduplicationConfigSchema>;

// Request cache item schema
export const RequestCacheItemSchema = z.object({
  key: z.string(),
  promise: z.any(), // Promise<any>
  timestamp: z.date(),
  ttl: z.number(),
  requestCount: z.number().default(1)
});

export type RequestCacheItem = z.infer<typeof RequestCacheItemSchema>;

// Request deduplication result schema
export const DeduplicationResultSchema = z.object({
  isDuplicate: z.boolean(),
  result: z.any().optional(),
  fromCache: z.boolean().default(false),
  requestCount: z.number().default(1)
});

export type DeduplicationResult<T> = {
  isDuplicate: boolean;
  result?: T;
  fromCache: boolean;
  requestCount: number;
};

export class RequestDeduplicationService {
  private cache: Map<string, RequestCacheItem> = new Map();
  private config: DeduplicationConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = DeduplicationConfigSchema.parse(config);
    this.startCleanupInterval();
  }

  /**
   * Execute a function with request deduplication
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    customConfig?: Partial<DeduplicationConfig>
  ): Promise<DeduplicationResult<T>> {
    const config = { ...this.config, ...customConfig };
    const cacheKey = this.generateCacheKey(key, config);
    
    // Check if request is already in progress
    const existingItem = this.cache.get(cacheKey);
    if (existingItem && !this.isExpired(existingItem)) {
      existingItem.requestCount++;
      const result = await existingItem.promise;
      return {
        isDuplicate: true,
        result,
        fromCache: true,
        requestCount: existingItem.requestCount
      };
    }
    
    // Create new request
    const promise = fn();
    const cacheItem: RequestCacheItem = {
      key: cacheKey,
      promise,
      timestamp: new Date(),
      ttl: config.ttl,
      requestCount: 1
    };
    
    this.cache.set(cacheKey, cacheItem);
    
    // Clean up cache if it's too large
    if (this.cache.size > config.maxCacheSize) {
      this.cleanupCache();
    }
    
    try {
      const result = await promise;
      return {
        isDuplicate: false,
        result,
        fromCache: false,
        requestCount: 1
      };
    } catch (error) {
      // Remove failed request from cache
      this.cache.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Execute a function with request deduplication and return the result
   */
  async executeOrThrow<T>(
    key: string,
    fn: () => Promise<T>,
    customConfig?: Partial<DeduplicationConfig>
  ): Promise<T> {
    const result = await this.execute(key, fn, customConfig);
    return result.result!;
  }

  /**
   * Generate cache key for a request
   */
  private generateCacheKey(key: string, config: DeduplicationConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(key);
    }
    
    // Default key generation using hash
    return createHash('md5').update(key).digest('hex');
  }

  /**
   * Check if a cache item has expired
   */
  private isExpired(item: RequestCacheItem): boolean {
    const now = new Date();
    const expirationTime = new Date(item.timestamp.getTime() + item.ttl);
    return now > expirationTime;
  }

  /**
   * Clean up expired cache items
   */
  private cleanupCache(): void {
    const now = new Date();
    const expiredKeys: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup interval
   */
  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all cached requests
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear specific request from cache
   */
  clearRequest(key: string): boolean {
    const cacheKey = this.generateCacheKey(key, this.config);
    return this.cache.delete(cacheKey);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    averageRequestCount: number;
  } {
    const totalRequests = Array.from(this.cache.values())
      .reduce((sum, item) => sum + item.requestCount, 0);
    
    const averageRequestCount = this.cache.size > 0 
      ? totalRequests / this.cache.size 
      : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate: totalRequests > 0 ? (totalRequests - this.cache.size) / totalRequests : 0,
      averageRequestCount
    };
  }

  /**
   * Get cache keys
   */
  getCacheKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DeduplicationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.startCleanupInterval();
  }

  /**
   * Get configuration
   */
  getConfig(): DeduplicationConfig {
    return { ...this.config };
  }

  /**
   * Create a deduplication function with specific configuration
   */
  createDeduplicationFunction<T>(
    keyGenerator: (args: any[]) => string,
    customConfig?: Partial<DeduplicationConfig>
  ): (fn: () => Promise<T>, ...args: any[]) => Promise<DeduplicationResult<T>> {
    return (fn: () => Promise<T>, ...args: any[]) => {
      const key = keyGenerator(args);
      return this.execute(key, fn, customConfig);
    };
  }

  /**
   * Create a deduplication function that returns the result
   */
  createDeduplicationFunctionOrThrow<T>(
    keyGenerator: (args: any[]) => string,
    customConfig?: Partial<DeduplicationConfig>
  ): (fn: () => Promise<T>, ...args: any[]) => Promise<T> {
    return async (fn: () => Promise<T>, ...args: any[]) => {
      const key = keyGenerator(args);
      return await this.executeOrThrow(key, fn, customConfig);
    };
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy(): void {
    this.stopCleanupInterval();
    this.clear();
  }
}

// Predefined key generators
export const KeyGenerators = {
  // Generate key from function name and arguments
  functionAndArgs: (fn: Function, ...args: any[]): string => {
    const argsString = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join('|');
    return `${fn.name}:${argsString}`;
  },
  
  // Generate key from arguments only
  argsOnly: (...args: any[]): string => {
    return args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join('|');
  },
  
  // Generate key from specific fields
  fields: (fields: string[]) => (...args: any[]): string => {
    const values = fields.map(field => {
      const value = args.find(arg => 
        typeof arg === 'object' && arg.hasOwnProperty(field)
      );
      return value ? value[field] : '';
    });
    return values.join('|');
  }
};

// Singleton instance
export const requestDeduplicationService = new RequestDeduplicationService();