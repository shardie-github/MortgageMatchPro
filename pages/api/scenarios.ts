import { NextApiRequest, NextApiResponse } from 'next'
import { ScenarioAnalysisAgent } from '@/lib/openai'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { scenarios } = req.body

    // Validate required fields
    if (!scenarios || !Array.isArray(scenarios) || scenarios.length < 2) {
      return res.status(400).json({ error: 'At least 2 scenarios are required' })
    }

    // Validate each scenario
    for (const scenario of scenarios) {
      if (!scenario.name || !scenario.rate || !scenario.term || !scenario.type || !scenario.propertyPrice || !scenario.downPayment) {
        return res.status(400).json({ error: 'Each scenario must have name, rate, term, type, propertyPrice, and downPayment' })
      }
    }

    // Compare scenarios using AI agent
    const agent = new ScenarioAnalysisAgent()
    const comparison = await agent.compareScenarios({ scenarios })

    res.status(200).json(comparison)
  } catch (error) {
    console.error('Scenario comparison error:', error)
    res.status(500).json({ 
      error: 'Failed to compare scenarios',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}