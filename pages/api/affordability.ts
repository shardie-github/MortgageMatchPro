import { NextApiRequest, NextApiResponse } from 'next'
import { AffordabilityAgent } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      userId,
      country,
      income,
      debts,
      downPayment,
      propertyPrice,
      interestRate,
      termYears,
      location,
      taxes = 0,
      insurance = 0,
      hoa = 0,
    } = req.body

    // Validate required fields
    if (!country || !income || !debts || !downPayment || !propertyPrice || !interestRate || !termYears || !location) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Calculate affordability using AI agent
    const agent = new AffordabilityAgent()
    const result = await agent.calculateAffordability({
      country,
      income,
      debts,
      downPayment,
      propertyPrice,
      interestRate,
      termYears,
      location,
      taxes,
      insurance,
      hoa,
    })

    // Save calculation to database if userId provided
    if (userId) {
      const { error } = await supabaseAdmin
        .from('mortgage_calculations')
        .insert({
          user_id: userId,
          country,
          income,
          debts,
          down_payment: downPayment,
          property_price: propertyPrice,
          interest_rate: interestRate,
          term_years: termYears,
          gds_ratio: result.gdsRatio,
          tds_ratio: result.tdsRatio,
          dti_ratio: result.dtiRatio,
          max_affordable: result.maxAffordable,
          monthly_payment: result.monthlyPayment,
          qualifying_rate: result.qualifyingRate,
        })

      if (error) {
        console.error('Database error:', error)
        // Don't fail the request if database save fails
      }
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Affordability calculation error:', error)
    res.status(500).json({ 
      error: 'Failed to calculate affordability',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}