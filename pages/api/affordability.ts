import { NextApiRequest, NextApiResponse } from 'next'
import { AffordabilityAgent } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  withSecurity, 
  withRateLimit, 
  withValidation, 
  AffordabilityInputSchema,
  logAuditEvent,
  handleError
} from '@/lib/security'
import { analytics, errorTracking } from '@/lib/monitoring'

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // Log the calculation request
    if (userId) {
      await logAuditEvent('affordability_calculation', userId, {
        country,
        income: Math.floor(income / 10000) * 10000, // Round for privacy
        propertyPrice: Math.floor(propertyPrice / 50000) * 50000, // Round for privacy
        location,
      })
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

    // Track analytics
    analytics.trackAffordabilityCalculation({
      country,
      income,
      propertyPrice,
      qualificationResult: result.qualificationResult,
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
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'],
          session_id: req.headers['x-session-id'],
        })

      if (error) {
        errorTracking.captureException(new Error('Database save failed'), {
          context: 'affordability_calculation',
          userId,
          error: error.message,
        })
        // Don't fail the request if database save fails
      }
    }

    res.status(200).json(result)
  } catch (error) {
    errorTracking.captureException(error as Error, {
      context: 'affordability_calculation',
      userId: req.body.userId,
    })
    handleError(res, error as Error, 'affordability_calculation')
  }
}

export default withSecurity(
  withRateLimit('affordability')(
    withValidation(AffordabilityInputSchema)(handler)
  )
)