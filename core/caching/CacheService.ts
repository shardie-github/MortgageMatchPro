/**
 * Cache Service
 * Centralized caching service with multiple backends and intelligent invalidation
 */

import { z } from 'zod';

// Cache configuration schema
export const CacheConfigSchema = z.object({
  ttl: z.number().default(3600), // Time to live in seconds
  maxSize: z.number().default(1000), // Maximum number of items
  strategy: z.enum(['lru', 'lfu', 'fifo']).default('lru'),
  compression: z.boolean().default(true),
  encryption: z.boolean().default(false)
});

export type CacheConfig = z.infer<typeof CacheConfigSchema>;

// Cache item schema
export const CacheItemSchema = z.object({
  key: z.string(),
  value: z.any(),
  ttl: z.number(),
  createdAt: z.date(),
  accessCount: z.number().default(0),
  lastAccessed: z.date(),
  tags: z.array(z.string()).default([])
});

export type CacheItem = z.infer<typeof CacheItemSchema>;

// Cache statistics schema
export const CacheStatsSchema = z.object({
  hits: z.number(),
  misses: z.number(),
  evictions: z.number(),
  size: z.number(),
  hitRate: z.number(),
  memoryUsage: z.number()
});

export type CacheStats = z.infer<typeof CacheStatsSchema>;

export class CacheService {
  private cache: Map<string, CacheItem> = new Map();
  private config: CacheConfig;
  private stats: CacheStats;
  private compressionEnabled: boolean;
  private encryptionEnabled: boolean;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = CacheConfigSchema.parse(config);
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
      memoryUsage: 0
    };
    this.compressionEnabled = this.config.compression;
    this.encryptionEnabled = this.config.encryption;
  }

  /**
   * Get a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if item has expired
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = new Date();
    this.stats.hits++;
    this.updateHitRate();

    // Decrypt and decompress if needed
    let value = item.value;
    if (this.encryptionEnabled) {
      value = await this.decrypt(value);
    }
    if (this.compressionEnabled) {
      value = await this.decompress(value);
    }

    return value as T;
  }

  /**
   * Set a value in the cache
   */
  async set<T>(key: string, value: T, ttl?: number, tags: string[] = []): Promise<void> {
    // Check if cache is full
    if (this.cache.size >= this.config.maxSize) {
      await this.evict();
    }

    // Compress and encrypt if needed
    let processedValue = value;
    if (this.compressionEnabled) {
      processedValue = await this.compress(processedValue);
    }
    if (this.encryptionEnabled) {
      processedValue = await this.encrypt(processedValue);
    }

    const item: CacheItem = {
      key,
      value: processedValue,
      ttl: ttl || this.config.ttl,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessed: new Date(),
      tags
    };

    this.cache.set(key, item);
    this.stats.size = this.cache.size;
    this.updateMemoryUsage();
  }

  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size = this.cache.size;
      this.updateMemoryUsage();
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.memoryUsage = 0;
  }

  /**
   * Clear cache entries by tags
   */
  async clearByTags(tags: string[]): Promise<number> {
    let cleared = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (tags.some(tag => item.tags.includes(tag))) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    this.stats.size = this.cache.size;
    this.updateMemoryUsage();
    return cleared;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Check if an item has expired
   */
  private isExpired(item: CacheItem): boolean {
    const now = new Date();
    const expirationTime = new Date(item.createdAt.getTime() + item.ttl * 1000);
    return now > expirationTime;
  }

  /**
   * Evict items based on strategy
   */
  private async evict(): Promise<void> {
    const items = Array.from(this.cache.entries());
    let itemToEvict: [string, CacheItem] | null = null;

    switch (this.config.strategy) {
      case 'lru':
        itemToEvict = items.reduce((oldest, current) => 
          current[1].lastAccessed < oldest[1].lastAccessed ? current : oldest
        );
        break;
      
      case 'lfu':
        itemToEvict = items.reduce((least, current) => 
          current[1].accessCount < least[1].accessCount ? current : least
        );
        break;
      
      case 'fifo':
        itemToEvict = items.reduce((oldest, current) => 
          current[1].createdAt < oldest[1].createdAt ? current : oldest
        );
        break;
    }

    if (itemToEvict) {
      this.cache.delete(itemToEvict[0]);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
      this.updateMemoryUsage();
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Update memory usage estimation
   */
  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const item of this.cache.values()) {
      totalSize += JSON.stringify(item).length;
    }
    this.stats.memoryUsage = totalSize;
  }

  /**
   * Compress data
   */
  private async compress(data: any): Promise<any> {
    // In a real implementation, you would use a compression library like zlib
    // For now, we'll just return the data as-is
    return data;
  }

  /**
   * Decompress data
   */
  private async decompress(data: any): Promise<any> {
    // In a real implementation, you would use a compression library like zlib
    // For now, we'll just return the data as-is
    return data;
  }

  /**
   * Encrypt data
   */
  private async encrypt(data: any): Promise<any> {
    // In a real implementation, you would use a crypto library
    // For now, we'll just return the data as-is
    return data;
  }

  /**
   * Decrypt data
   */
  private async decrypt(data: any): Promise<any> {
    // In a real implementation, you would use a crypto library
    // For now, we'll just return the data as-is
    return data;
  }
}

// Singleton instance
export const cacheService = new CacheService();