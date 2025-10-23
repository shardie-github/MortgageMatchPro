import { NextApiRequest, NextApiResponse } from 'next'
import { ScenarioAnalysisAgent } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  withSecurity, 
  withRateLimit, 
  logAuditEvent,
  handleError
} from '@/lib/security'
import { analytics, errorTracking } from '@/lib/monitoring'
import { z } from 'zod'

const ScenarioInputSchema = z.object({
  scenarios: z.array(z.object({
    name: z.string(),
    rate: z.number(),
    term: z.number(),
    type: z.enum(['fixed', 'variable']),
    propertyPrice: z.number(),
    downPayment: z.number(),
  })),
  userId: z.string().optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { scenarios, userId } = ScenarioInputSchema.parse(req.body)

    // Log the scenario comparison request
    if (userId) {
      await logAuditEvent('scenario_comparison', userId, {
        scenarioCount: scenarios.length,
        propertyPrice: Math.floor(scenarios[0]?.propertyPrice / 50000) * 50000, // Round for privacy
      })
    }

    // Compare scenarios using AI agent
    const agent = new ScenarioAnalysisAgent()
    const result = await agent.compareScenarios({ scenarios })

    // Track analytics
    analytics.trackScenarioComparison({
      scenarioCount: scenarios.length,
      bestOption: result.recommendation.bestOption,
    })

    res.status(200).json(result)
  } catch (error) {
    errorTracking.captureException(error as Error, {
      context: 'scenario_comparison',
      userId: req.body.userId,
    })
    handleError(res, error as Error, 'scenario_comparison')
  }
}

export default withSecurity(
  withRateLimit('scenarios')(handler)
)