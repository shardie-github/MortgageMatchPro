import Redis from 'ioredis'
import { keyManager } from '../config/keys'

// Rate limiting algorithms
export enum RateLimitAlgorithm {
  FIXED_WINDOW = 'fixed_window',
  SLIDING_WINDOW = 'sliding_window',
  TOKEN_BUCKET = 'token_bucket',
  LEAKY_BUCKET = 'leaky_bucket'
}

// Rate limit configuration
export interface RateLimitConfig {
  algorithm: RateLimitAlgorithm
  windowSizeMs: number
  maxRequests: number
  burstLimit?: number
  refillRate?: number
  bucketSize?: number
  leakRate?: number
}

// Rate limit result
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
  totalHits: number
  windowStart: number
}

// Rate limit key generator
export interface KeyGenerator {
  generateKey(identifier: string, endpoint: string): string
}

// Default key generator
export class DefaultKeyGenerator implements KeyGenerator {
  generateKey(identifier: string, endpoint: string): string {
    return `rate_limit:${endpoint}:${identifier}`
  }
}

// Distributed Rate Limiter
export class DistributedRateLimiter {
  private redis: Redis
  private keyGenerator: KeyGenerator
  private configs: Map<string, RateLimitConfig> = new Map()

  constructor(
    redisUrl?: string,
    keyGenerator: KeyGenerator = new DefaultKeyGenerator()
  ) {
    this.redis = new Redis(redisUrl || keyManager.getKey('redis') || 'redis://localhost:6379')
    this.keyGenerator = keyGenerator
  }

  // Register rate limit configuration for an endpoint
  registerEndpoint(endpoint: string, config: RateLimitConfig): void {
    this.configs.set(endpoint, config)
  }

  // Check if request is allowed
  async checkLimit(
    identifier: string,
    endpoint: string,
    customConfig?: RateLimitConfig
  ): Promise<RateLimitResult> {
    const config = customConfig || this.configs.get(endpoint)
    if (!config) {
      throw new Error(`No rate limit configuration found for endpoint: ${endpoint}`)
    }

    const key = this.keyGenerator.generateKey(identifier, endpoint)
    const now = Date.now()

    switch (config.algorithm) {
      case RateLimitAlgorithm.FIXED_WINDOW:
        return this.fixedWindowCheck(key, config, now)
      case RateLimitAlgorithm.SLIDING_WINDOW:
        return this.slidingWindowCheck(key, config, now)
      case RateLimitAlgorithm.TOKEN_BUCKET:
        return this.tokenBucketCheck(key, config, now)
      case RateLimitAlgorithm.LEAKY_BUCKET:
        return this.leakyBucketCheck(key, config, now)
      default:
        throw new Error(`Unsupported rate limit algorithm: ${config.algorithm}`)
    }
  }

  // Fixed window rate limiting
  private async fixedWindowCheck(
    key: string,
    config: RateLimitConfig,
    now: number
  ): Promise<RateLimitResult> {
    const windowStart = Math.floor(now / config.windowSizeMs) * config.windowSizeMs
    const windowKey = `${key}:${windowStart}`
    const resetTime = windowStart + config.windowSizeMs

    const pipeline = this.redis.pipeline()
    pipeline.incr(windowKey)
    pipeline.expire(windowKey, Math.ceil(config.windowSizeMs / 1000))
    pipeline.get(windowKey)

    const results = await pipeline.exec()
    const currentCount = parseInt(results?.[2]?.[1] as string || '0')

    return {
      allowed: currentCount <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - currentCount),
      resetTime,
      totalHits: currentCount,
      windowStart
    }
  }

  // Sliding window rate limiting
  private async slidingWindowCheck(
    key: string,
    config: RateLimitConfig,
    now: number
  ): Promise<RateLimitResult> {
    const windowStart = now - config.windowSizeMs
    const resetTime = now + config.windowSizeMs

    const pipeline = this.redis.pipeline()
    
    // Remove old entries
    pipeline.zremrangebyscore(key, '-inf', windowStart)
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`)
    
    // Count requests in window
    pipeline.zcard(key)
    
    // Set expiration
    pipeline.expire(key, Math.ceil(config.windowSizeMs / 1000))

    const results = await pipeline.exec()
    const currentCount = results?.[2]?.[1] as number || 0

    return {
      allowed: currentCount <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - currentCount),
      resetTime,
      totalHits: currentCount,
      windowStart
    }
  }

  // Token bucket rate limiting
  private async tokenBucketCheck(
    key: string,
    config: RateLimitConfig,
    now: number
  ): Promise<RateLimitResult> {
    const bucketSize = config.bucketSize || config.maxRequests
    const refillRate = config.refillRate || 1
    const lastRefillKey = `${key}:last_refill`
    const tokensKey = `${key}:tokens`

    const pipeline = this.redis.pipeline()
    pipeline.hmget(key, 'tokens', 'lastRefill')
    pipeline.hset(key, 'tokens', bucketSize, 'lastRefill', now)
    pipeline.expire(key, Math.ceil(config.windowSizeMs / 1000))

    const results = await pipeline.exec()
    const [tokens, lastRefill] = results?.[0]?.[1] as [string, string] || ['0', '0']

    let currentTokens = parseInt(tokens)
    const lastRefillTime = parseInt(lastRefill)

    // Refill tokens based on time passed
    if (lastRefillTime > 0) {
      const timePassed = now - lastRefillTime
      const tokensToAdd = Math.floor((timePassed / 1000) * refillRate)
      currentTokens = Math.min(bucketSize, currentTokens + tokensToAdd)
    } else {
      currentTokens = bucketSize
    }

    const allowed = currentTokens > 0
    if (allowed) {
      currentTokens--
    }

    // Update tokens
    await this.redis.hset(key, 'tokens', currentTokens, 'lastRefill', now)

    return {
      allowed,
      remaining: currentTokens,
      resetTime: now + config.windowSizeMs,
      totalHits: bucketSize - currentTokens,
      windowStart: now
    }
  }

  // Leaky bucket rate limiting
  private async leakyBucketCheck(
    key: string,
    config: RateLimitConfig,
    now: number
  ): Promise<RateLimitResult> {
    const bucketSize = config.bucketSize || config.maxRequests
    const leakRate = config.leakRate || 1
    const lastLeakKey = `${key}:last_leak`
    const levelKey = `${key}:level`

    const pipeline = this.redis.pipeline()
    pipeline.hmget(key, 'level', 'lastLeak')
    pipeline.hset(key, 'level', 0, 'lastLeak', now)
    pipeline.expire(key, Math.ceil(config.windowSizeMs / 1000))

    const results = await pipeline.exec()
    const [level, lastLeak] = results?.[0]?.[1] as [string, string] || ['0', '0']

    let currentLevel = parseInt(level)
    const lastLeakTime = parseInt(lastLeak)

    // Leak water based on time passed
    if (lastLeakTime > 0) {
      const timePassed = now - lastLeakTime
      const waterToLeak = Math.floor((timePassed / 1000) * leakRate)
      currentLevel = Math.max(0, currentLevel - waterToLeak)
    }

    const allowed = currentLevel < bucketSize
    if (allowed) {
      currentLevel++
    }

    // Update level
    await this.redis.hset(key, 'level', currentLevel, 'lastLeak', now)

    return {
      allowed,
      remaining: bucketSize - currentLevel,
      resetTime: now + config.windowSizeMs,
      totalHits: currentLevel,
      windowStart: now
    }
  }

  // Reset rate limit for an identifier
  async resetLimit(identifier: string, endpoint: string): Promise<void> {
    const key = this.keyGenerator.generateKey(identifier, endpoint)
    await this.redis.del(key)
  }

  // Get current rate limit status
  async getStatus(identifier: string, endpoint: string): Promise<RateLimitResult | null> {
    const config = this.configs.get(endpoint)
    if (!config) {
      return null
    }

    const key = this.keyGenerator.generateKey(identifier, endpoint)
    const now = Date.now()

    try {
      return await this.checkLimit(identifier, endpoint, config)
    } catch (error) {
      console.error('Error getting rate limit status:', error)
      return null
    }
  }

  // Batch check multiple identifiers
  async batchCheck(
    requests: Array<{ identifier: string; endpoint: string }>
  ): Promise<Map<string, RateLimitResult>> {
    const results = new Map<string, RateLimitResult>()
    
    const promises = requests.map(async (request) => {
      try {
        const result = await this.checkLimit(request.identifier, request.endpoint)
        results.set(`${request.identifier}:${request.endpoint}`, result)
      } catch (error) {
        console.error(`Error checking rate limit for ${request.identifier}:${request.endpoint}:`, error)
      }
    })

    await Promise.all(promises)
    return results
  }

  // Cleanup expired keys
  async cleanup(): Promise<number> {
    const pattern = 'rate_limit:*'
    const keys = await this.redis.keys(pattern)
    
    if (keys.length === 0) {
      return 0
    }

    const pipeline = this.redis.pipeline()
    keys.forEach(key => {
      pipeline.ttl(key)
    })

    const results = await pipeline.exec()
    const expiredKeys = keys.filter((key, index) => {
      const ttl = results?.[index]?.[1] as number
      return ttl === -1 || ttl === -2 // -1: no expiration, -2: key doesn't exist
    })

    if (expiredKeys.length > 0) {
      await this.redis.del(...expiredKeys)
    }

    return expiredKeys.length
  }

  // Get rate limit statistics
  async getStats(): Promise<{
    totalEndpoints: number
    totalKeys: number
    memoryUsage: string
  }> {
    const pattern = 'rate_limit:*'
    const keys = await this.redis.keys(pattern)
    
    const memoryInfo = await this.redis.memory('usage', 'rate_limit:*')
    
    return {
      totalEndpoints: this.configs.size,
      totalKeys: keys.length,
      memoryUsage: `${Math.round(parseInt(memoryInfo) / 1024 / 1024 * 100) / 100} MB`
    }
  }

  // Close Redis connection
  async close(): Promise<void> {
    await this.redis.quit()
  }
}

// Rate limit middleware factory
export function createRateLimitMiddleware(
  rateLimiter: DistributedRateLimiter,
  getIdentifier: (req: any) => string = (req) => req.ip || 'unknown'
) {
  return (endpoint: string, customConfig?: RateLimitConfig) => {
    return async (req: any, res: any, next: any) => {
      try {
        const identifier = getIdentifier(req)
        const result = await rateLimiter.checkLimit(identifier, endpoint, customConfig)

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', result.totalHits + result.remaining)
        res.setHeader('X-RateLimit-Remaining', result.remaining)
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000))

        if (!result.allowed) {
          res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000))
          return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
            limit: result.totalHits + result.remaining,
            remaining: result.remaining,
            resetTime: result.resetTime
          })
        }

        next()
      } catch (error) {
        console.error('Rate limit middleware error:', error)
        // Fail open - allow request if rate limiting fails
        next()
      }
    }
  }
}

// Export default configurations
export const DEFAULT_CONFIGS = {
  API: {
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    windowSizeMs: 60 * 1000, // 1 minute
    maxRequests: 100
  },
  AUTH: {
    algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
    windowSizeMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    bucketSize: 10,
    refillRate: 1
  },
  UPLOAD: {
    algorithm: RateLimitAlgorithm.LEAKY_BUCKET,
    windowSizeMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    bucketSize: 5,
    leakRate: 0.1
  }
} as const