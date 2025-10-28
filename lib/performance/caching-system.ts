/**
 * Advanced Caching System v1.4.0
 * Multi-layer caching with TTL, invalidation, and performance tracking
 */

import { trackCachePerformance, CacheMetrics } from './profiling-suite';

export interface CacheConfig {
  defaultTTL: number; // seconds
  maxSize: number; // bytes
  cleanupInterval: number; // milliseconds
  enableMetrics: boolean;
}

export interface CacheEntry<T = any> {
  value: T;
  ttl: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
  evictions: number;
  averageResponseTime: number;
}

class CachingSystem {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 300, // 5 minutes
      maxSize: 100 * 1024 * 1024, // 100MB
      cleanupInterval: 60000, // 1 minute
      enableMetrics: true,
      ...config,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0,
      evictions: 0,
      averageResponseTime: 0,
    };

    this.startCleanupTimer();
  }

  // Get value from cache
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        this.updateHitRate();
        this.trackCacheMetrics(key, false, Date.now() - startTime);
        return null;
      }

      // Check if expired
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        this.trackCacheMetrics(key, false, Date.now() - startTime);
        return null;
      }

      // Update access stats
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.stats.hits++;
      this.updateHitRate();

      const responseTime = Date.now() - startTime;
      this.trackCacheMetrics(key, true, responseTime);
      
      return entry.value as T;
    } catch (error) {
      console.error(`[Cache] Error getting key ${key}:`, error);
      this.trackCacheMetrics(key, false, Date.now() - startTime);
      return null;
    }
  }

  // Set value in cache
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const serializedValue = JSON.stringify(value);
      const size = Buffer.byteLength(serializedValue, 'utf8');
      const entryTTL = ttl || this.config.defaultTTL;

      // Check if we need to evict entries
      if (this.config.totalSize + size > this.config.maxSize) {
        this.evictEntries(size);
      }

      const entry: CacheEntry<T> = {
        value,
        ttl: entryTTL * 1000, // Convert to milliseconds
        createdAt: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        size,
      };

      this.cache.set(key, entry);
      this.stats.totalSize += size;
      this.stats.entryCount++;

      const responseTime = Date.now() - startTime;
      this.trackCacheMetrics(key, true, responseTime);
      
      return true;
    } catch (error) {
      console.error(`[Cache] Error setting key ${key}:`, error);
      this.trackCacheMetrics(key, false, Date.now() - startTime);
      return false;
    }
  }

  // Delete value from cache
  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      return true;
    }
    return false;
  }

  // Clear all cache entries
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0,
      evictions: 0,
      averageResponseTime: 0,
    };
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Get cache keys
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  // Get cache size in bytes
  getSize(): number {
    return this.stats.totalSize;
  }

  // Get entry count
  getEntryCount(): number {
    return this.stats.entryCount;
  }

  // Private methods
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.createdAt > entry.ttl;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private evictEntries(requiredSize: number): void {
    // Sort entries by access count and last accessed time
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      const [keyA, entryA] = a;
      const [keyB, entryB] = b;
      
      // First sort by access count (ascending)
      if (entryA.accessCount !== entryB.accessCount) {
        return entryA.accessCount - entryB.accessCount;
      }
      
      // Then by last accessed time (ascending)
      return entryA.lastAccessed - entryB.lastAccessed;
    });

    let freedSize = 0;
    for (const [key, entry] of entries) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      this.stats.evictions++;
      freedSize += entry.size;
      
      if (freedSize >= requiredSize) {
        break;
      }
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupInterval);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.stats.totalSize -= entry.size;
        this.stats.entryCount--;
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[Cache] Cleaned up ${cleanedCount} expired entries`);
    }
  }

  private trackCacheMetrics(key: string, hit: boolean, responseTime: number): void {
    if (this.config.enableMetrics) {
      trackCachePerformance({
        key,
        hit,
        responseTime,
        ttl: this.config.defaultTTL,
        size: this.getSize(),
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Cleanup on destroy
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const cachingSystem = new CachingSystem();

// Export types and convenience functions
export { CachingSystem, CacheConfig, CacheEntry, CacheStats };

// Convenience functions
export const getCache = <T>(key: string): Promise<T | null> => {
  return cachingSystem.get<T>(key);
};

export const setCache = <T>(key: string, value: T, ttl?: number): Promise<boolean> => {
  return cachingSystem.set(key, value, ttl);
};

export const deleteCache = (key: string): Promise<boolean> => {
  return cachingSystem.delete(key);
};

export const clearCache = (): Promise<void> => {
  return cachingSystem.clear();
};

export const getCacheStats = (): CacheStats => {
  return cachingSystem.getStats();
};

export const hasCache = (key: string): boolean => {
  return cachingSystem.has(key);
};
