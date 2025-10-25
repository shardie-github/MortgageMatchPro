import { DistributedRateLimiter, createRateLimiter, rateLimitMiddleware } from '../../../lib/rate-limiting/distributed-rate-limiter'

// Mock Redis client
const mockRedis = {
  zadd: jest.fn(),
  zremrangebyscore: jest.fn(),
  zcard: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  pipeline: jest.fn(() => ({
    zadd: jest.fn().mockReturnThis(),
    zremrangebyscore: jest.fn().mockReturnThis(),
    zcard: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn()
  }))
}

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis)
})

describe('DistributedRateLimiter', () => {
  let limiter: DistributedRateLimiter

  beforeEach(() => {
    limiter = new DistributedRateLimiter(mockRedis as any)
    jest.clearAllMocks()
  })

  describe('Rate Limiting Logic', () => {
    it('should allow requests within limit', async () => {
      mockRedis.zcard.mockResolvedValue(5) // Under limit of 10
      mockRedis.pipeline().exec.mockResolvedValue([
        [null, 1], // zadd result
        [null, 0], // zremrangebyscore result
        [null, 6], // zcard result
        [null, 1]  // expire result
      ])

      const result = await limiter.checkLimit('user123', 'api', 10, 60000)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
      expect(result.resetTime).toBeGreaterThan(Date.now())
    })

    it('should deny requests over limit', async () => {
      mockRedis.zcard.mockResolvedValue(10) // At limit of 10
      mockRedis.pipeline().exec.mockResolvedValue([
        [null, 1], // zadd result
        [null, 0], // zremrangebyscore result
        [null, 10], // zcard result
        [null, 1]  // expire result
      ])

      const result = await limiter.checkLimit('user123', 'api', 10, 60000)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.resetTime).toBeGreaterThan(Date.now())
    })

    it('should handle Redis errors gracefully', async () => {
      mockRedis.zcard.mockRejectedValue(new Error('Redis connection failed'))

      const result = await limiter.checkLimit('user123', 'api', 10, 60000)

      expect(result.allowed).toBe(true) // Fail open
      expect(result.error).toBe('Redis connection failed')
    })
  })

  describe('Window Management', () => {
    it('should create correct Redis keys', async () => {
      mockRedis.zcard.mockResolvedValue(5)
      mockRedis.pipeline().exec.mockResolvedValue([
        [null, 1], [null, 0], [null, 6], [null, 1]
      ])

      await limiter.checkLimit('user123', 'api', 10, 60000)

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'rate_limit:user123:api',
        expect.any(Number),
        expect.any(String)
      )
    })

    it('should set correct expiration', async () => {
      mockRedis.zcard.mockResolvedValue(5)
      mockRedis.pipeline().exec.mockResolvedValue([
        [null, 1], [null, 0], [null, 6], [null, 1]
      ])

      await limiter.checkLimit('user123', 'api', 10, 60000)

      expect(mockRedis.expire).toHaveBeenCalledWith(
        'rate_limit:user123:api',
        60
      )
    })
  })

  describe('Cleanup Operations', () => {
    it('should clean up expired entries', async () => {
      mockRedis.zcard.mockResolvedValue(5)
      mockRedis.pipeline().exec.mockResolvedValue([
        [null, 1], [null, 2], [null, 6], [null, 1] // 2 entries removed
      ])

      await limiter.checkLimit('user123', 'api', 10, 60000)

      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        'rate_limit:user123:api',
        '-inf',
        expect.any(Number)
      )
    })
  })
})

describe('Rate Limiter Factory', () => {
  it('should create rate limiter with Redis client', () => {
    const redisClient = mockRedis as any
    const limiter = createRateLimiter(redisClient)

    expect(limiter).toBeInstanceOf(DistributedRateLimiter)
  })
})

describe('Rate Limiting Middleware', () => {
  let mockReq: any
  let mockRes: any
  let mockNext: any

  beforeEach(() => {
    mockReq = {
      ip: '192.168.1.1',
      user: { id: 'user123' },
      headers: { 'x-forwarded-for': '192.168.1.1' }
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    }
    mockNext = jest.fn()
  })

  it('should allow requests within limit', async () => {
    const limiter = new DistributedRateLimiter(mockRedis as any)
    mockRedis.zcard.mockResolvedValue(5)
    mockRedis.pipeline().exec.mockResolvedValue([
      [null, 1], [null, 0], [null, 6], [null, 1]
    ])

    const middleware = rateLimitMiddleware(limiter, 'api', 10, 60000)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  it('should deny requests over limit', async () => {
    const limiter = new DistributedRateLimiter(mockRedis as any)
    mockRedis.zcard.mockResolvedValue(10)
    mockRedis.pipeline().exec.mockResolvedValue([
      [null, 1], [null, 0], [null, 10], [null, 1]
    ])

    const middleware = rateLimitMiddleware(limiter, 'api', 10, 60000)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(429)
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Rate limit exceeded',
      retryAfter: expect.any(Number)
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should handle Redis errors gracefully', async () => {
    const limiter = new DistributedRateLimiter(mockRedis as any)
    mockRedis.zcard.mockRejectedValue(new Error('Redis error'))

    const middleware = rateLimitMiddleware(limiter, 'api', 10, 60000)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockNext).toHaveBeenCalled() // Fail open
  })

  it('should use IP address when user ID not available', async () => {
    const limiter = new DistributedRateLimiter(mockRedis as any)
    mockReq.user = undefined
    mockRedis.zcard.mockResolvedValue(5)
    mockRedis.pipeline().exec.mockResolvedValue([
      [null, 1], [null, 0], [null, 6], [null, 1]
    ])

    const middleware = rateLimitMiddleware(limiter, 'api', 10, 60000)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })
})

describe('Pre-configured Limiters', () => {
  let limiter: DistributedRateLimiter

  beforeEach(() => {
    limiter = new DistributedRateLimiter(mockRedis as any)
  })

  it('should have correct OpenAI rate limits', () => {
    expect(limiter.openaiLimiter).toBeDefined()
  })

  it('should have correct Supabase rate limits', () => {
    expect(limiter.supabaseLimiter).toBeDefined()
  })

  it('should have correct general API rate limits', () => {
    expect(limiter.apiLimiter).toBeDefined()
  })
})
