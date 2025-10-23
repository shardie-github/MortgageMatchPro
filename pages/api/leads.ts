import { NextApiRequest, NextApiResponse } from 'next'
import { LeadRoutingAgent } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  withSecurity, 
  withRateLimit, 
  withValidation,
  LeadInputSchema,
  logAuditEvent,
  handleError
} from '@/lib/security'
import { analytics, errorTracking } from '@/lib/monitoring'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, email, phone, leadData, userId } = req.body

    // Log the lead submission
    if (userId) {
      await logAuditEvent('lead_submission', userId, {
        leadScore: 0, // Will be calculated by agent
        income: Math.floor(leadData.income / 10000) * 10000, // Round for privacy
      })
    }

    // Process lead using AI agent
    const agent = new LeadRoutingAgent()
    const result = await agent.processLead({
      name,
      email,
      phone,
      leadData,
    })

    // Track analytics
    analytics.trackLeadSubmission({
      leadScore: result.leadScore,
      brokerCount: result.brokerRecommendations.length,
    })

    // Save lead to database if userId provided
    if (userId) {
      const { error } = await supabaseAdmin
        .from('leads')
        .insert({
          user_id: userId,
          name,
          email,
          phone,
          lead_data: leadData,
          lead_score: result.leadScore,
          status: 'pending',
        })

      if (error) {
        errorTracking.captureException(new Error('Database save failed'), {
          context: 'lead_submission',
          userId,
          error: error.message,
        })
        // Don't fail the request if database save fails
      }
    }

    res.status(200).json(result)
  } catch (error) {
    errorTracking.captureException(error as Error, {
      context: 'lead_submission',
      userId: req.body.userId,
    })
    handleError(res, error as Error, 'lead_submission')
  }
}

export default withSecurity(
  withRateLimit('leads')(
    withValidation(LeadInputSchema)(handler)
  )
)