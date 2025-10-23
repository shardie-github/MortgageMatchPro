import { NextApiRequest, NextApiResponse } from 'next'
import { PredictiveOrchestrator, PredictiveInsightsConfig } from '@/lib/agents/predictive-orchestrator'

const defaultConfig: PredictiveInsightsConfig = {
  enableDataIngestion: true,
  enableForecasting: true,
  enableRefinanceWatchlist: true,
  enablePrescriptiveAnalytics: true,
  enableScenarioSimulation: true,
  enableExplainability: true,
  regions: ['CA', 'US', 'Toronto', 'Vancouver', 'Montreal'],
  forecastHorizon: 12,
  simulationIterations: 1000,
  alertThresholds: {
    rateDrop: 0.75, // 0.75%
    refinanceProbability: 0.6, // 60%
    propertyAppreciation: 5.0 // 5%
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { action, userId, config } = req.body

      const orchestrator = new PredictiveOrchestrator(config || defaultConfig)

      switch (action) {
        case 'run_pipeline':
          const summary = await orchestrator.runPredictiveInsightsPipeline()
          res.status(200).json({ summary })
          break

        case 'run_user_insights':
          if (!userId) {
            return res.status(400).json({ error: 'User ID is required' })
          }
          const userInsights = await orchestrator.runUserPredictiveInsights(userId)
          res.status(200).json({ insights: userInsights })
          break

        case 'get_summary':
          const insightsSummary = await orchestrator.getPredictiveInsightsSummary()
          res.status(200).json({ summary: insightsSummary })
          break

        default:
          res.status(400).json({ error: 'Invalid action' })
      }
    } catch (error) {
      console.error('Error in predictive insights API:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'GET') {
    try {
      const { userId } = req.query

      const orchestrator = new PredictiveOrchestrator(defaultConfig)

      if (userId) {
        const userInsights = await orchestrator.runUserPredictiveInsights(userId as string)
        res.status(200).json({ insights: userInsights })
      } else {
        const summary = await orchestrator.getPredictiveInsightsSummary()
        res.status(200).json({ summary })
      }
    } catch (error) {
      console.error('Error in predictive insights API:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}