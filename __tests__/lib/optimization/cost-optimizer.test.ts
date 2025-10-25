import { CostOptimizer, costOptimizer, trackOpenAICost, trackSupabaseCost, trackStripeCost } from '../../../lib/optimization/cost-optimizer'

describe('CostOptimizer', () => {
  let optimizer: CostOptimizer

  beforeEach(() => {
    optimizer = new CostOptimizer()
  })

  describe('Cost Tracking', () => {
    it('should track costs correctly', () => {
      optimizer.trackCost('openai', 'chat_completion', 0.05, { model: 'gpt-4' })
      optimizer.trackCost('supabase', 'query', 0.01, { table: 'users' })

      const dailyCost = optimizer.getDailyCost()
      expect(dailyCost).toBe(0.06)
    })

    it('should maintain cost history with limits', () => {
      // Add more than 1000 entries
      for (let i = 0; i < 1001; i++) {
        optimizer.trackCost('test', 'operation', 0.001)
      }

      expect(optimizer['costHistory'].length).toBe(1000)
    })

    it('should calculate monthly costs correctly', () => {
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      // Mock timestamp for first day of month
      const firstDayTimestamp = firstDayOfMonth.getTime()
      
      optimizer.trackCost('openai', 'chat_completion', 0.1, { timestamp: firstDayTimestamp })
      optimizer.trackCost('openai', 'chat_completion', 0.2, { timestamp: Date.now() })

      const monthlyCost = optimizer.getMonthlyCost()
      expect(monthlyCost).toBe(0.3)
    })
  })

  describe('Budget Management', () => {
    it('should detect budget exceeded', () => {
      optimizer.setBudget(10, 100) // $10 daily, $100 monthly
      
      optimizer.trackCost('openai', 'chat_completion', 11) // Exceed daily budget
      
      expect(optimizer.isBudgetExceeded()).toBe(true)
    })

    it('should not exceed budget when within limits', () => {
      optimizer.setBudget(100, 1000)
      
      optimizer.trackCost('openai', 'chat_completion', 50)
      
      expect(optimizer.isBudgetExceeded()).toBe(false)
    })
  })

  describe('Cost Breakdown', () => {
    it('should provide cost breakdown by service', () => {
      optimizer.trackCost('openai', 'chat_completion', 0.1)
      optimizer.trackCost('openai', 'embedding', 0.05)
      optimizer.trackCost('supabase', 'query', 0.02)

      const breakdown = optimizer.getCostBreakdown()
      
      expect(breakdown.openai.total).toBe(0.15)
      expect(breakdown.openai.operations.chat_completion).toBe(0.1)
      expect(breakdown.openai.operations.embedding).toBe(0.05)
      expect(breakdown.supabase.total).toBe(0.02)
    })
  })

  describe('OpenAI Request Optimization', () => {
    it('should optimize model selection for simple tasks', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'What is 2+2?' }]
      }

      const optimized = optimizer.optimizeOpenAIRequest(request)
      
      expect(optimized.model).toBe('gpt-4o-mini')
    })

    it('should not change model for complex tasks', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Please provide a detailed analysis of complex financial scenarios' }]
      }

      const optimized = optimizer.optimizeOpenAIRequest(request)
      
      expect(optimized.model).toBe('gpt-4')
    })

    it('should optimize prompts by removing redundant phrases', () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'Please make sure to provide accurate information. It is important to note that you should be helpful.' 
          },
          { 
            role: 'user', 
            content: 'Please kindly help me with this. Thank you very much!' 
          }
        ]
      }

      const optimized = optimizer.optimizeOpenAIRequest(request)
      
      expect(optimized.messages[0].content).not.toContain('Please make sure to')
      expect(optimized.messages[0].content).not.toContain('It is important to note that')
      expect(optimized.messages[1].content).not.toContain('Please kindly')
      expect(optimized.messages[1].content).not.toContain('Thank you')
    })

    it('should add cache key for requests', () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7
      }

      const optimized = optimizer.optimizeOpenAIRequest(request)
      
      expect(optimized.cacheKey).toBeDefined()
      expect(typeof optimized.cacheKey).toBe('string')
    })

    it('should mark batchable requests', () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Question 1' },
          { role: 'user', content: 'Question 2' }
        ]
      }

      const optimized = optimizer.optimizeOpenAIRequest(request)
      
      expect(optimized.batchable).toBe(true)
    })
  })

  describe('Cost Estimation', () => {
    it('should estimate OpenAI costs correctly', () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello world' }],
        max_tokens: 100
      }

      const cost = optimizer.estimateOpenAICost(request)
      
      expect(cost).toBeGreaterThan(0)
      expect(typeof cost).toBe('number')
    })

    it('should estimate different model costs', () => {
      const gpt4Request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 100
      }

      const gpt35Request = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 100
      }

      const gpt4Cost = optimizer.estimateOpenAICost(gpt4Request)
      const gpt35Cost = optimizer.estimateOpenAICost(gpt35Request)
      
      expect(gpt4Cost).toBeGreaterThan(gpt35Cost)
    })
  })

  describe('Optimization Recommendations', () => {
    it('should provide recommendations when budget is high', () => {
      optimizer.setBudget(10, 100)
      optimizer.trackCost('openai', 'chat_completion', 8) // 80% of daily budget

      const recommendations = optimizer.getOptimizationRecommendations()
      
      expect(recommendations).toContain('Daily budget is 80% used. Consider reducing request frequency.')
    })

    it('should provide recommendations for OpenAI-heavy usage', () => {
      optimizer.trackCost('openai', 'chat_completion', 80)
      optimizer.trackCost('supabase', 'query', 10)

      const recommendations = optimizer.getOptimizationRecommendations()
      
      expect(recommendations).toContain('OpenAI costs are 80% of total. Consider implementing caching.')
    })
  })

  describe('Cost Statistics', () => {
    it('should provide comprehensive cost statistics', () => {
      optimizer.setBudget(100, 1000)
      optimizer.trackCost('openai', 'chat_completion', 50)
      optimizer.trackCost('supabase', 'query', 10)

      const stats = optimizer.getCostStatistics()
      
      expect(stats.daily.cost).toBe(60)
      expect(stats.daily.budget).toBe(100)
      expect(stats.daily.remaining).toBe(40)
      expect(stats.daily.percentage).toBe(60)
      
      expect(stats.monthly.cost).toBe(60)
      expect(stats.monthly.budget).toBe(1000)
      expect(stats.monthly.remaining).toBe(940)
      expect(stats.monthly.percentage).toBe(6)
      
      expect(stats.breakdown.openai.total).toBe(50)
      expect(stats.breakdown.supabase.total).toBe(10)
      
      expect(Array.isArray(stats.recommendations)).toBe(true)
    })
  })

  describe('Budget Setting', () => {
    it('should set budget limits correctly', () => {
      optimizer.setBudget(50, 500)
      
      expect(optimizer['dailyBudget']).toBe(50)
      expect(optimizer['monthlyBudget']).toBe(500)
    })
  })
})

describe('Cost Tracking Utilities', () => {
  beforeEach(() => {
    // Reset the singleton instance
    costOptimizer['costHistory'] = []
  })

  it('should track OpenAI costs', () => {
    const request = {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }]
    }

    const response = {
      usage: { total_tokens: 100 }
    }

    trackOpenAICost('chat_completion', request, response)

    const dailyCost = costOptimizer.getDailyCost()
    expect(dailyCost).toBeGreaterThan(0)
  })

  it('should track Supabase costs', () => {
    trackSupabaseCost('query', 0.05, { table: 'users' })

    const dailyCost = costOptimizer.getDailyCost()
    expect(dailyCost).toBe(0.05)
  })

  it('should track Stripe costs', () => {
    trackStripeCost('payment', 0.30, { amount: 1000 })

    const dailyCost = costOptimizer.getDailyCost()
    expect(dailyCost).toBe(0.30)
  })
})
