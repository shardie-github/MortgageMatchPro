import { NextApiRequest, NextApiResponse } from 'next'
import { OptimizationManager, OptimizationStrategy } from '../../lib/optimization/optimization-manager'

// Initialize optimization manager
const optimizationManager = new OptimizationManager(
  new (require('../../lib/optimization/cost-optimizer').CostOptimizer)(
    new (require('../../lib/api/api-service').ApiService)()
  ),
  new (require('../../lib/optimization/performance-monitor').PerformanceMonitor)(),
  new (require('../../lib/optimization/resource-manager').ResourceManager)(),
  new (require('../../lib/rate-limiting/distributed-rate-limiter').DistributedRateLimiter)({
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    },
    defaultConfig: {
      windowMs: 60000,
      maxRequests: 100,
      algorithm: 'sliding-window'
    }
  })
)

// Start optimization
optimizationManager.startOptimization(30000) // Run every 30 seconds

// Test endpoint
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const action = req.query.action as string || 'status'

    switch (action) {
      case 'status':
        // Get optimization status
        const statistics = optimizationManager.getStatistics()
        const recommendations = optimizationManager.getRecommendations()
        const results = optimizationManager.getResults()

        res.status(200).json({
          message: 'Optimization status retrieved',
          statistics,
          recommendations,
          recentResults: results.slice(-10) // Last 10 results
        })
        break

      case 'configure':
        // Configure optimization strategy
        const strategy = req.query.strategy as OptimizationStrategy
        const enabled = req.query.enabled === 'true'
        const priority = parseInt(req.query.priority as string) || 5
        const threshold = parseFloat(req.query.threshold as string) || 0.1

        if (!strategy) {
          return res.status(400).json({ error: 'Strategy is required' })
        }

        optimizationManager.configureStrategy(strategy, {
          enabled,
          strategy,
          priority,
          threshold,
          parameters: {}
        })

        res.status(200).json({
          message: 'Optimization strategy configured',
          strategy,
          enabled,
          priority,
          threshold
        })
        break

      case 'run':
        // Run optimization manually
        optimizationManager['runOptimization']()
        res.status(200).json({
          message: 'Optimization run triggered'
        })
        break

      case 'stop':
        // Stop optimization
        optimizationManager.stopOptimization()
        res.status(200).json({
          message: 'Optimization stopped'
        })
        break

      case 'start':
        // Start optimization
        const interval = parseInt(req.query.interval as string) || 30000
        optimizationManager.startOptimization(interval)
        res.status(200).json({
          message: 'Optimization started',
          interval
        })
        break

      default:
        res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Optimization test error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}