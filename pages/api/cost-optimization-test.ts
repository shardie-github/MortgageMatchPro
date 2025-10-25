import { NextApiRequest, NextApiResponse } from 'next'
import { CostOptimizer } from '../../lib/optimization/cost-optimizer'
import { ApiService } from '../../lib/api/api-service'
import { createCostOptimizationMiddleware } from '../../lib/optimization/cost-optimizer'

// Initialize API service and cost optimizer
const apiService = new ApiService({
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 2
})

const costOptimizer = new CostOptimizer(apiService)

// Create cost optimization middleware
const costOptimizationMiddleware = createCostOptimizationMiddleware(
  costOptimizer,
  (req) => req.headers['x-user-id'] || 'anonymous'
)

// Test endpoint
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Apply cost optimization middleware
    costOptimizationMiddleware(req, res, () => {})

    // Simulate some API calls to test cost optimization
    const testCalls = [
      { endpoint: '/openai/chat', data: { message: 'Hello, world!' } },
      { endpoint: '/openai/embeddings', data: { text: 'Test embedding' } },
      { endpoint: '/supabase/query', data: { table: 'users', limit: 10 } }
    ]

    const results = []
    for (const call of testCalls) {
      try {
        const result = await costOptimizer.optimizedRequest(
          'POST',
          call.endpoint,
          call.data,
          { useCache: true, useBatch: true }
        )
        results.push({ endpoint: call.endpoint, success: true, data: result })
      } catch (error) {
        results.push({ endpoint: call.endpoint, success: false, error: error.message })
      }
    }

    // Get cost metrics
    const metrics = costOptimizer.getMetrics()
    const breakdown = costOptimizer.getCostBreakdown()
    const recommendations = costOptimizer.getOptimizationRecommendations()

    // Add cost headers
    res.setHeader('X-Total-Cost', metrics.totalCost.toFixed(6))
    res.setHeader('X-Cost-Per-Request', metrics.costPerRequest.toFixed(6))
    res.setHeader('X-Optimization-Savings', metrics.optimizationSavings.toFixed(6))
    res.setHeader('X-Savings-Percentage', metrics.savingsPercentage.toFixed(2))

    // Return success response
    res.status(200).json({
      message: 'Cost optimization test successful',
      results,
      metrics: {
        totalCost: metrics.totalCost,
        costPerRequest: metrics.costPerRequest,
        optimizationSavings: metrics.optimizationSavings,
        savingsPercentage: metrics.savingsPercentage
      },
      breakdown,
      recommendations
    })
  } catch (error) {
    console.error('Cost optimization test error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}