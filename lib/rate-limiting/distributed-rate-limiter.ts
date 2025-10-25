import Redis from 'ioredis'
import { getRedisUrl, isProduction } from '../config/keys'

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator: (identifier: string) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  onLimitReached?: (identifier: string, limit: number) => void
}

// Rate limit result
interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  totalHits: number
}

// Distributed rate limiter class
export class DistributedRateLimiter {
  private redis: Redis
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    this.redis = new Redis(getRedisUrl(), {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })

    // Handle Redis connection errors
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error)
    })
  }

  // Check if request is allowed
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(identifier)
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline()
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart)
      
      // Count current requests
      pipeline.zcard(key)
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`)
      
      // Set expiration
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000))
      
      const results = await pipeline.exec()
      
      if (!results) {
        throw new Error('Redis pipeline execution failed')
      }

      const currentCount = results[1][1] as number
      const isAllowed = currentCount < this.config.maxRequests

      if (!isAllowed && this.config.onLimitReached) {
        this.config.onLimitReached(identifier, this.config.maxRequests)
      }

      return {
        allowed: isAllowed,
        remaining: Math.max(0, this.config.maxRequests - currentCount - 1),
        resetTime: now + this.config.windowMs,
        totalHits: currentCount + 1
      }
    } catch (error) {
      console.error('Rate limiting error:', error)
      
      // Fallback to allowing request if Redis is unavailable
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
        totalHits: 1
      }
    }
  }

  // Reset rate limit for identifier
  async resetLimit(identifier: string): Promise<void> {
    const key = this.config.keyGenerator(identifier)
    await this.redis.del(key)
  }

  // Get current rate limit status
  async getStatus(identifier: string): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(identifier)
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    try {
      // Remove expired entries
      await this.redis.zremrangebyscore(key, 0, windowStart)
      
      // Count current requests
      const count = await this.redis.zcard(key)
      
      return {
        allowed: count < this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - count),
        resetTime: now + this.config.windowMs,
        totalHits: count
      }
    } catch (error) {
      console.error('Rate limit status error:', error)
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        totalHits: 0
      }
    }
  }

  // Close Redis connection
  async close(): Promise<void> {
    await this.redis.quit()
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  // API rate limiter
  api: new DistributedRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (identifier) => `rate_limit:api:${identifier}`,
    onLimitReached: (identifier, limit) => {
      console.warn(`API rate limit reached for ${identifier}: ${limit} requests per minute`)
    }
  }),

  // OpenAI API rate limiter
  openai: new DistributedRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
    keyGenerator: (identifier) => `rate_limit:openai:${identifier}`,
    onLimitReached: (identifier, limit) => {
      console.warn(`OpenAI rate limit reached for ${identifier}: ${limit} requests per minute`)
    }
  }),

  // Affordability calculation rate limiter
  affordability: new DistributedRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (identifier) => `rate_limit:affordability:${identifier}`,
    onLimitReached: (identifier, limit) => {
      console.warn(`Affordability rate limit reached for ${identifier}: ${limit} requests per minute`)
    }
  }),

  // Rate check limiter
  rateCheck: new DistributedRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyGenerator: (identifier) => `rate_limit:rate_check:${identifier}`,
    onLimitReached: (identifier, limit) => {
      console.warn(`Rate check limit reached for ${identifier}: ${limit} requests per minute`)
    }
  }),

  // Lead submission limiter
  leadSubmission: new DistributedRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    keyGenerator: (identifier) => `rate_limit:lead:${identifier}`,
    onLimitReached: (identifier, limit) => {
      console.warn(`Lead submission limit reached for ${identifier}: ${limit} requests per minute`)
    }
  })
}

// Rate limiting middleware
export function createRateLimitMiddleware(limiter: DistributedRateLimiter) {
  return async (req: any, res: any, next: any) => {
    try {
      const identifier = req.ip || req.connection.remoteAddress || 'unknown'
      const result = await limiter.checkLimit(identifier)

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limiter['config'].maxRequests)
      res.setHeader('X-RateLimit-Remaining', result.remaining)
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000))

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          limit: limiter['config'].maxRequests,
          remaining: result.remaining
        })
      }

      next()
    } catch (error) {
      console.error('Rate limiting middleware error:', error)
      next() // Allow request to proceed if rate limiting fails
    }
  }
}

// Utility function to get client identifier
export function getClientIdentifier(req: any): string {
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.connection.remoteAddress || req.socket.remoteAddress
  
  return ip || 'unknown'
}

// Rate limit status endpoint
export async function getRateLimitStatus(identifier: string): Promise<{
  [key: string]: RateLimitResult
}> {
  const status: { [key: string]: RateLimitResult } = {}
  
  for (const [name, limiter] of Object.entries(rateLimiters)) {
    status[name] = await limiter.getStatus(identifier)
  }
  
  return status
}
