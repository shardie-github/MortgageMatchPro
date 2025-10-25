/**
 * Model Cache Service
 * Specialized caching service for AI model responses
 */

import { CacheService } from './CacheService';
import { z } from 'zod';

// Model cache configuration
export const ModelCacheConfigSchema = z.object({
  ttl: z.number().default(7200), // 2 hours for model responses
  maxSize: z.number().default(500),
  strategy: z.enum(['lru', 'lfu', 'fifo']).default('lru'),
  compression: z.boolean().default(true),
  encryption: z.boolean().default(false),
  enableConfidenceCaching: z.boolean().default(true),
  minConfidenceThreshold: z.number().min(0).max(1).default(0.7)
});

export type ModelCacheConfig = z.infer<typeof ModelCacheConfigSchema>;

// Model response cache item
export const ModelCacheItemSchema = z.object({
  prompt: z.string(),
  response: z.string(),
  confidence: z.number().min(0).max(1),
  model: z.string(),
  tokens: z.number(),
  latency: z.number(),
  createdAt: z.date(),
  accessCount: z.number().default(0),
  lastAccessed: z.date(),
  tags: z.array(z.string()).default([])
});

export type ModelCacheItem = z.infer<typeof ModelCacheItemSchema>;

export class ModelCacheService {
  private cache: CacheService;
  private config: ModelCacheConfig;

  constructor(config: Partial<ModelCacheConfig> = {}) {
    this.config = ModelCacheConfigSchema.parse(config);
    this.cache = new CacheService({
      ttl: this.config.ttl,
      maxSize: this.config.maxSize,
      strategy: this.config.strategy,
      compression: this.config.compression,
      encryption: this.config.encryption
    });
  }

  /**
   * Generate cache key for a prompt
   */
  private generateCacheKey(prompt: string, context: Record<string, any> = {}): string {
    // Normalize prompt for consistent caching
    const normalizedPrompt = prompt.toLowerCase().trim();
    
    // Create context hash
    const contextHash = this.hashContext(context);
    
    // Combine prompt and context for unique key
    return `model:${this.hashString(normalizedPrompt)}:${contextHash}`;
  }

  /**
   * Hash context object for cache key
   */
  private hashContext(context: Record<string, any>): string {
    const sortedKeys = Object.keys(context).sort();
    const contextString = sortedKeys.map(key => `${key}:${context[key]}`).join('|');
    return this.hashString(contextString);
  }

  /**
   * Simple hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached model response
   */
  async getCachedResponse(
    prompt: string, 
    context: Record<string, any> = {}
  ): Promise<ModelCacheItem | null> {
    const key = this.generateCacheKey(prompt, context);
    return await this.cache.get<ModelCacheItem>(key);
  }

  /**
   * Cache model response
   */
  async cacheResponse(
    prompt: string,
    response: string,
    confidence: number,
    model: string,
    tokens: number,
    latency: number,
    context: Record<string, any> = {},
    tags: string[] = []
  ): Promise<void> {
    // Only cache if confidence is above threshold
    if (this.config.enableConfidenceCaching && confidence < this.config.minConfidenceThreshold) {
      return;
    }

    const key = this.generateCacheKey(prompt, context);
    
    const cacheItem: ModelCacheItem = {
      prompt,
      response,
      confidence,
      model,
      tokens,
      latency,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessed: new Date(),
      tags
    };

    await this.cache.set(key, cacheItem, this.config.ttl, tags);
  }

  /**
   * Get similar cached responses
   */
  async getSimilarResponses(
    prompt: string,
    context: Record<string, any> = {},
    similarityThreshold: number = 0.8
  ): Promise<ModelCacheItem[]> {
    const normalizedPrompt = prompt.toLowerCase().trim();
    const allItems = await this.getAllCachedItems();
    
    return allItems.filter(item => {
      const similarity = this.calculateSimilarity(normalizedPrompt, item.prompt.toLowerCase().trim());
      return similarity >= similarityThreshold;
    });
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get all cached items (for similarity search)
   */
  private async getAllCachedItems(): Promise<ModelCacheItem[]> {
    // This is a simplified implementation
    // In a real implementation, you would need to iterate through the cache
    return [];
  }

  /**
   * Clear cache by tags
   */
  async clearByTags(tags: string[]): Promise<number> {
    return await this.cache.clearByTags(tags);
  }

  /**
   * Clear all model cache
   */
  async clear(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ModelCacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.cache.updateConfig({
      ttl: this.config.ttl,
      maxSize: this.config.maxSize,
      strategy: this.config.strategy,
      compression: this.config.compression,
      encryption: this.config.encryption
    });
  }

  /**
   * Get configuration
   */
  getConfig(): ModelCacheConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const modelCacheService = new ModelCacheService();