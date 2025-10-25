import { DistributedRateLimiter } from '../../lib/rate-limiting/distributed-rate-limiter'
import { CostOptimizer, costOptimizer } from '../../lib/optimization/cost-optimizer'
import { createApiClient, makeRequest } from '../../lib/api/request-manager'

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

// Mock Axios
const mockAxios = {
  request: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
}

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxios),
  isAxiosError: jest.fn(() => false)
}))

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis)
})

describe('Operational Optimization Integration', () => {
  let rateLimiter: DistributedRateLimiter
  let costOptimizer: CostOptimizer
  let apiClient: any

  beforeEach(() => {
    rateLimiter = new DistributedRateLimiter(mockRedis as any)
    costOptimizer = new CostOptimizer()
    apiClient = createApiClient('https://api.example.com', 'test-key')
    
    jest.clearAllMocks()
  })

  describe('Rate Limiting + Cost Optimization', () => {
    it('should integrate rate limiting with cost optimization', async () => {
      // Mock rate limiter to allow request
      mockRedis.zcard.mockResolvedValue(5)
      mockRedis.pipeline().exec.mockResolvedValue([
        [null, 1], [null, 0], [null, 6], [null, 1]
      ])

      // Mock API response
      mockAxios.request.mockResolvedValue({
        data: { result: 'success' },
        status: 200
      })

      // Check rate limit first
      const rateLimitResult = await rateLimiter.checkLimit('user123', 'openai', 10, 60000)
      expect(rateLimitResult.allowed).toBe(true)

      // Optimize request for cost
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        max_tokens: 100
      }

      const optimizedRequest = costOptimizer.optimizeOpenAIRequest(request)
      expect(optimizedRequest.model).toBe('gpt-4o-mini') // Should be optimized to cheaper model

      // Track cost
      const estimatedCost = costOptimizer.estimateOpenAICost(optimizedRequest)
      costOptimizer.trackCost('openai', 'chat_completion', estimatedCost)

      // Make API request
      const response = await makeRequest(apiClient, {
        method: 'POST',
        url: '/chat/completions',
        data: optimizedRequest
      })

      expect(response.data.result).toBe('success')
      expect(costOptimizer.getDailyCost()).toBeGreaterThan(0)
    })

    it('should handle rate limit exceeded with cost tracking', async () => {
      // Mock rate limiter to deny request
      mockRedis.zcard.mockResolvedValue(10)
      mockRedis.pipeline().exec.mockResolvedValue([
        [null, 1], [null, 0], [null, 10], [null, 1]
      ])

      const rateLimitResult = await rateLimiter.checkLimit('user123', 'openai', 10, 60000)
      expect(rateLimitResult.allowed).toBe(false)

      // Should not make API request when rate limited
      expect(mockAxios.request).not.toHaveBeenCalled()
    })
  })

  describe('Cost Optimization Strategies', () => {
    it('should apply multiple optimization strategies', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'Please make sure to provide accurate information. It is important to note that you should be helpful.' 
          },
          { 
            role: 'user', 
            content: 'Please kindly help me with this. Thank you very much!' 
          }
        ],
        max_tokens: 1000
      }

      const optimized = costOptimizer.optimizeOpenAIRequest(request)

      // Should optimize model selection
      expect(optimized.model).toBe('gpt-4o-mini')
      
      // Should optimize prompts
      expect(optimized.messages[0].content).not.toContain('Please make sure to')
      expect(optimized.messages[1].content).not.toContain('Please kindly')
      
      // Should add cache key
      expect(optimized.cacheKey).toBeDefined()
      
      // Should mark as batchable
      expect(optimized.batchable).toBe(true)
    })

    it('should provide cost recommendations', () => {
      // Set low budget to trigger recommendations
      costOptimizer.setBudget(10, 100)
      costOptimizer.trackCost('openai', 'chat_completion', 8) // 80% of daily budget

      const recommendations = costOptimizer.getOptimizationRecommendations()
      expect(recommendations).toContain('Daily budget is 80% used. Consider reducing request frequency.')
    })
  })

  describe('Budget Management', () => {
    it('should track costs across multiple services', () => {
      costOptimizer.trackCost('openai', 'chat_completion', 0.05)
      costOptimizer.trackCost('openai', 'embedding', 0.02)
      costOptimizer.trackCost('supabase', 'query', 0.01)
      costOptimizer.trackCost('stripe', 'payment', 0.30)

      const breakdown = costOptimizer.getCostBreakdown()
      
      expect(breakdown.openai.total).toBe(0.07)
      expect(breakdown.openai.operations.chat_completion).toBe(0.05)
      expect(breakdown.openai.operations.embedding).toBe(0.02)
      expect(breakdown.supabase.total).toBe(0.01)
      expect(breakdown.stripe.total).toBe(0.30)
    })

    it('should detect budget exceeded', () => {
      costOptimizer.setBudget(10, 100)
      costOptimizer.trackCost('openai', 'chat_completion', 11) // Exceed daily budget

      expect(costOptimizer.isBudgetExceeded()).toBe(true)
    })
  })

  describe('API Request Management', () => {
    it('should handle API requests with retry logic', async () => {
      // Mock first request to fail, second to succeed
      mockAxios.request
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { result: 'success' }, status: 200 })

      const response = await makeRequest(apiClient, {
        method: 'GET',
        url: '/test'
      })

      expect(response.data.result).toBe('success')
      expect(mockAxios.request).toHaveBeenCalledTimes(2)
    })

    it('should handle API errors gracefully', async () => {
      mockAxios.request.mockRejectedValue(new Error('API error'))

      await expect(makeRequest(apiClient, {
        method: 'GET',
        url: '/test'
      })).rejects.toThrow('API error')
    })
  })

  describe('End-to-End Workflow', () => {
    it('should complete full request workflow with optimizations', async () => {
      // 1. Rate limiting check
      mockRedis.zcard.mockResolvedValue(5)
      mockRedis.pipeline().exec.mockResolvedValue([
        [null, 1], [null, 0], [null, 6], [null, 1]
      ])

      const rateLimitResult = await rateLimiter.checkLimit('user123', 'openai', 10, 60000)
      expect(rateLimitResult.allowed).toBe(true)

      // 2. Request optimization
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Simple question' }],
        max_tokens: 100
      }

      const optimizedRequest = costOptimizer.optimizeOpenAIRequest(request)
      expect(optimizedRequest.model).toBe('gpt-4o-mini')

      // 3. Cost estimation
      const estimatedCost = costOptimizer.estimateOpenAICost(optimizedRequest)
      expect(estimatedCost).toBeGreaterThan(0)

      // 4. API request
      mockAxios.request.mockResolvedValue({
        data: { choices: [{ message: { content: 'Answer' } }] },
        status: 200
      })

      const response = await makeRequest(apiClient, {
        method: 'POST',
        url: '/chat/completions',
        data: optimizedRequest
      })

      expect(response.data.choices[0].message.content).toBe('Answer')

      // 5. Cost tracking
      costOptimizer.trackCost('openai', 'chat_completion', estimatedCost)

      // 6. Verify cost tracking
      const dailyCost = costOptimizer.getDailyCost()
      expect(dailyCost).toBe(estimatedCost)

      // 7. Check recommendations
      const recommendations = costOptimizer.getOptimizationRecommendations()
      expect(Array.isArray(recommendations)).toBe(true)
    })
  })

  describe('Performance Monitoring', () => {
    it('should track performance metrics', () => {
      const startTime = Date.now()
      
      // Simulate some processing
      const request = { model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: 'Test' }] }
      const optimized = costOptimizer.optimizeOpenAIRequest(request)
      const cost = costOptimizer.estimateOpenAICost(optimized)
      
      const endTime = Date.now()
      const processingTime = endTime - startTime

      expect(processingTime).toBeLessThan(100) // Should be fast
      expect(cost).toBeGreaterThan(0)
    })
  })
})
