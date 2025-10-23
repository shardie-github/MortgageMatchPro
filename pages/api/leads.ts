import { NextApiRequest, NextApiResponse } from 'next'
import { LeadRoutingAgent } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'
import twilio from 'twilio'
import { 
  withSecurity, 
  withRateLimit, 
  withValidation, 
  LeadInputSchema,
  logAuditEvent,
  handleError
} from '@/lib/security'
import { analytics, errorTracking } from '@/lib/monitoring'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      userId,
      name,
      email,
      phone,
      leadData,
    } = req.body

    // Log the lead submission
    if (userId) {
      await logAuditEvent('lead_submission', userId, {
        name: name.substring(0, 3) + '***', // Partial name for privacy
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Masked email
        phone: phone.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2'), // Masked phone
        leadScore: 'pending',
      })
    }

    // Process lead using AI agent
    const agent = new LeadRoutingAgent()
    const leadResult = await agent.processLead({
      name,
      email,
      phone,
      leadData,
    })

    // Track analytics
    analytics.trackLeadSubmission({
      leadScore: leadResult.leadScore,
      brokerCount: leadResult.brokerRecommendations.length,
      country: leadData.location?.includes('CA') ? 'CA' : 'US',
    })

    // Save lead to database
    const { data: savedLead, error: dbError } = await supabaseAdmin
      .from('leads')
      .insert({
        user_id: userId || 'anonymous',
        name,
        email,
        phone,
        lead_data: leadData,
        lead_score: leadResult.leadScore,
        status: 'pending',
        broker_id: leadResult.brokerRecommendations[0]?.brokerId || null,
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        session_id: req.headers['x-session-id'],
      })
      .select()
      .single()

    if (dbError) {
      errorTracking.captureException(new Error('Database save failed'), {
        context: 'lead_submission',
        userId,
        error: dbError.message,
      })
      return res.status(500).json({ error: 'Failed to save lead' })
    }

    // Send SMS notification to recommended brokers
    try {
      for (const broker of leadResult.brokerRecommendations.slice(0, 2)) { // Notify top 2 brokers
        const message = `New mortgage lead: ${name} (${email}) - Score: ${leadResult.leadScore}/100. Contact: ${phone}`
        
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: broker.phone || process.env.DEFAULT_BROKER_PHONE,
        })
      }
    } catch (smsError) {
      errorTracking.captureException(smsError as Error, {
        context: 'sms_notification',
        leadId: savedLead.id,
      })
      // Don't fail the request if SMS fails
    }

    res.status(200).json({
      ...leadResult,
      leadId: savedLead.id,
      message: 'Lead submitted successfully'
    })
  } catch (error) {
    errorTracking.captureException(error as Error, {
      context: 'lead_processing',
      userId: req.body.userId,
    })
    handleError(res, error as Error, 'lead_processing')
  }
}

export default withSecurity(
  withRateLimit('leads')(
    withValidation(LeadInputSchema)(handler)
  )
)