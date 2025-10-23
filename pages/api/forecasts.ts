import { NextApiRequest, NextApiResponse } from 'next'
import { ForecastingAgent } from '@/lib/agents/forecasting-agent'
import { supabaseAdmin } from '@/lib/supabase'

const forecastingAgent = new ForecastingAgent()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { modelType, userId, region } = req.query

    if (!modelType) {
      return res.status(400).json({ error: 'Model type is required' })
    }

    let forecasts = []

    switch (modelType) {
      case 'rate_forecast':
        forecasts = await forecastingAgent.forecastMortgageRates(
          region as string || 'CA',
          12 // 12 months forecast
        )
        break

      case 'property_appreciation':
        if (!region) {
          return res.status(400).json({ error: 'Region is required for property forecasts' })
        }
        forecasts = await forecastingAgent.forecastPropertyAppreciation(
          region as string,
          12
        )
        break

      case 'refinance_probability':
        if (!userId) {
          return res.status(400).json({ error: 'User ID is required for refinance probability' })
        }
        
        // Get user's latest mortgage calculation
        const { data: calculation, error: calcError } = await supabaseAdmin
          .from('mortgage_calculations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (calcError || !calculation) {
          return res.status(404).json({ error: 'No mortgage data found for user' })
        }

        const forecast = await forecastingAgent.predictRefinanceProbability(
          userId as string,
          calculation.interest_rate,
          calculation.property_price - calculation.down_payment,
          calculation.property_price,
          undefined,
          calculation.income
        )
        forecasts = [forecast]
        break

      default:
        return res.status(400).json({ error: 'Invalid model type' })
    }

    res.status(200).json({ forecasts })
  } catch (error) {
    console.error('Error fetching forecasts:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}