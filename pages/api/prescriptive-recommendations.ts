import { NextApiRequest, NextApiResponse } from 'next'
import { PrescriptiveAgent } from '@/lib/agents/prescriptive-agent'

const prescriptiveAgent = new PrescriptiveAgent()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { userId, action, baseScenario, modifications } = req.body

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
      }

      let result

      switch (action) {
        case 'what_if_analysis':
          if (!baseScenario || !modifications) {
            return res.status(400).json({ error: 'Base scenario and modifications are required' })
          }
          result = await prescriptiveAgent.analyzeWhatIfScenarios(
            userId,
            baseScenario,
            modifications
          )
          break

        case 'optimal_recommendations':
          result = await prescriptiveAgent.generateOptimalRecommendations(userId)
          break

        default:
          return res.status(400).json({ error: 'Invalid action' })
      }

      res.status(200).json({ result })
    } catch (error) {
      console.error('Error generating prescriptive recommendations:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}