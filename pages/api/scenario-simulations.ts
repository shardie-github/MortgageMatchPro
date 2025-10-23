import { NextApiRequest, NextApiResponse } from 'next'
import { ScenarioSimulator } from '@/lib/agents/scenario-simulator'

const scenarioSimulator = new ScenarioSimulator()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { userId, simulationType, baseScenario } = req.body

      if (!userId || !simulationType || !baseScenario) {
        return res.status(400).json({ error: 'Missing required parameters' })
      }

      let result

      switch (simulationType) {
        case 'stress_test':
          result = await scenarioSimulator.runStressTestSimulation(userId, {
            baseScenario,
            iterations: 1000,
            rateVolatility: 0.02,
            propertyVolatility: 0.1,
            incomeVolatility: 0.05,
            timeHorizon: 60
          })
          break

        case 'rate_shock':
          result = await scenarioSimulator.runRateShockSimulation(userId, baseScenario, [
            { name: 'Mild Shock', rateIncrease: 1.0 },
            { name: 'Moderate Shock', rateIncrease: 2.0 },
            { name: 'Severe Shock', rateIncrease: 3.0 }
          ])
          break

        case 'property_decline':
          result = await scenarioSimulator.runPropertyDeclineSimulation(userId, baseScenario, [
            { name: 'Mild Decline', declinePercent: -0.05 },
            { name: 'Moderate Decline', declinePercent: -0.10 },
            { name: 'Severe Decline', declinePercent: -0.20 }
          ])
          break

        case 'income_variance':
          result = await scenarioSimulator.runIncomeVarianceSimulation(userId, baseScenario, [
            { name: 'Income Reduction', incomeChange: -0.10 },
            { name: 'Severe Income Reduction', incomeChange: -0.20 },
            { name: 'Income Growth', incomeChange: 0.10 }
          ])
          break

        case 'comprehensive':
          result = await scenarioSimulator.runComprehensiveStressTest(userId, baseScenario)
          break

        default:
          return res.status(400).json({ error: 'Invalid simulation type' })
      }

      res.status(200).json({ result })
    } catch (error) {
      console.error('Error running scenario simulation:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'GET') {
    try {
      const { userId, simulationType } = req.query

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
      }

      const results = await scenarioSimulator.getSimulationResults(
        userId as string,
        simulationType as string
      )

      res.status(200).json({ results })
    } catch (error) {
      console.error('Error fetching simulation results:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}