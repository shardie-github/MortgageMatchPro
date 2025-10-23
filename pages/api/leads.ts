import { NextApiRequest, NextApiResponse } from 'next'
import { leadQualificationService, LeadQualificationInput } from '@/lib/lead-qualification'
import { brokerNotificationService, BrokerNotificationData } from '@/lib/broker-notifications'
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
    const {
      name,
      email,
      phone,
      propertyValue,
      downPayment,
      income,
      employmentType,
      creditScore,
      preferredLender,
      additionalInfo,
      consentToShare,
      consentToContact,
    } = req.body

    // Validate consent
    if (!consentToShare || !consentToContact) {
      return res.status(400).json({
        error: 'Consent required',
        message: 'You must consent to share your information and be contacted by lenders'
      })
    }

    // Get user ID from auth header if available
    const authHeader = req.headers.authorization
    let userId: string | null = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const { data: { user } } = await supabaseAdmin.auth.getUser(token)
        userId = user?.id || null
      } catch (error) {
        // Continue without user ID if auth fails
        console.warn('Auth token validation failed:', error)
      }
    }

    // Log the lead submission
    if (userId) {
      await logAuditEvent('lead_submission', userId, {
        leadScore: 0, // Will be calculated by service
        income: Math.floor(income / 10000) * 10000, // Round for privacy
        propertyValue: Math.floor(propertyValue / 10000) * 10000, // Round for privacy
      })
    }

    // Prepare lead input
    const leadInput: LeadQualificationInput = {
      name,
      email,
      phone,
      propertyValue,
      downPayment,
      income,
      employmentType,
      creditScore,
      preferredLender,
      additionalInfo,
      consentToShare,
      consentToContact,
    }

    // Process lead qualification
    const qualificationResult = await leadQualificationService.processLeadQualification(leadInput)

    // Save lead to database
    let leadId: string
    if (userId) {
      leadId = await leadQualificationService.saveLead(userId, leadInput, qualificationResult)
    } else {
      // Generate temporary ID for anonymous leads
      leadId = qualificationResult.leadId
    }

    // Send notifications to assigned brokers
    const notificationPromises = qualificationResult.brokerRecommendations.map(broker => {
      const notificationData: BrokerNotificationData = {
        brokerId: broker.brokerId,
        brokerName: broker.name,
        brokerEmail: broker.email,
        brokerPhone: broker.phone,
        company: broker.company,
        leadId,
        leadName: name,
        leadEmail: email,
        leadPhone: phone,
        leadScore: qualificationResult.leadScore,
        qualificationTier: qualificationResult.qualificationTier,
        propertyValue,
        downPayment,
        income,
        creditScore,
        additionalInfo,
      }

      return brokerNotificationService.sendNotifications(notificationData)
    })

    // Wait for all notifications to be sent (don't fail the request if notifications fail)
    try {
      await Promise.allSettled(notificationPromises)
    } catch (error) {
      console.error('Some broker notifications failed:', error)
      // Continue with response even if notifications fail
    }

    // Track analytics
    analytics.trackLeadSubmission({
      leadScore: qualificationResult.leadScore,
      brokerCount: qualificationResult.brokerRecommendations.length,
      qualificationTier: qualificationResult.qualificationTier,
    })

    // Return comprehensive result
    res.status(200).json({
      success: true,
      leadId,
      leadScore: qualificationResult.leadScore,
      qualificationTier: qualificationResult.qualificationTier,
      brokerRecommendations: qualificationResult.brokerRecommendations,
      routingDecision: qualificationResult.routingDecision,
      nextSteps: qualificationResult.nextSteps,
      disclaimers: qualificationResult.disclaimers,
      message: 'Lead submitted successfully. You will be contacted by qualified mortgage professionals.'
    })

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