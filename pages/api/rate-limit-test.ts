import { NextApiRequest, NextApiResponse } from 'next'
import { DistributedRateLimiter } from '../../lib/rate-limiting/distributed-rate-limiter'
import { createRateLimitMiddleware } from '../../lib/rate-limiting/distributed-rate-limiter'

// Initialize rate limiter
const rateLimiter = new DistributedRateLimiter({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },
  defaultConfig: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    algorithm: 'sliding-window'
  }
})

// Create rate limit middleware
const rateLimitMiddleware = createRateLimitMiddleware(
  rateLimiter,
  (req) => req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
)

// Test endpoint
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Apply rate limiting
    const result = await rateLimiter.checkLimit(
      req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
      '/api/rate-limit-test'
    )

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining,
        resetTime: result.resetTime
      })
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit)
    res.setHeader('X-RateLimit-Remaining', result.remaining)
    res.setHeader('X-RateLimit-Reset', result.resetTime)

    // Return success response
    res.status(200).json({
      message: 'Rate limit test successful',
      rateLimitInfo: {
        limit: result.limit,
        remaining: result.remaining,
        resetTime: result.resetTime,
        algorithm: result.algorithm
      }
    })
  } catch (error) {
    console.error('Rate limit test error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}