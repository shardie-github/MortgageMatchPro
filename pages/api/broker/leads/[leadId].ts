import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  withSecurity, 
  withAuth,
  handleError
} from '@/lib/security'
import { analytics, errorTracking } from '@/lib/monitoring'
import { z } from 'zod'

const UpdateLeadStatusSchema = z.object({
  status: z.enum(['pending', 'contacted', 'converted', 'rejected']),
  notes: z.string().optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { leadId } = req.query

    if (!leadId || typeof leadId !== 'string') {
      return res.status(400).json({ error: 'Invalid lead ID' })
    }

    // Verify user is a broker
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    if (userError || !user || user.subscription_tier !== 'broker') {
      return res.status(403).json({ error: 'Access denied. Broker subscription required.' })
    }

    // Get broker information
    const { data: broker, error: brokerError } = await supabaseAdmin
      .from('brokers')
      .select('*')
      .eq('email', req.query.email || '')
      .single()

    if (brokerError || !broker) {
      return res.status(404).json({ error: 'Broker not found' })
    }

    if (req.method === 'GET') {
      // Get lead details
      const { data: lead, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('broker_id', broker.id)
        .single()

      if (leadError || !lead) {
        return res.status(404).json({ error: 'Lead not found or not assigned to you' })
      }

      res.status(200).json({
        success: true,
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          leadScore: lead.lead_score,
          status: lead.status,
          createdAt: lead.created_at,
          updatedAt: lead.updated_at,
          leadData: lead.lead_data,
        }
      })

    } else if (req.method === 'PUT') {
      // Update lead status
      const validatedData = UpdateLeadStatusSchema.parse(req.body)

      const { data: lead, error: leadError } = await supabaseAdmin
        .from('leads')
        .update({
          status: validatedData.status,
          updated_at: new Date().toISOString(),
          // Store notes in lead_data if provided
          lead_data: validatedData.notes 
            ? { ...req.body.leadData, brokerNotes: validatedData.notes }
            : req.body.leadData
        })
        .eq('id', leadId)
        .eq('broker_id', broker.id)
        .select()
        .single()

      if (leadError || !lead) {
        return res.status(404).json({ error: 'Lead not found or not assigned to you' })
      }

      // Track analytics
      analytics.trackLeadStatusUpdate({
        brokerId: broker.id,
        leadId,
        oldStatus: req.body.oldStatus,
        newStatus: validatedData.status,
      })

      res.status(200).json({
        success: true,
        message: 'Lead status updated successfully',
        lead: {
          id: lead.id,
          status: lead.status,
          updatedAt: lead.updated_at,
        }
      })

    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      })
    }

    errorTracking.captureException(error as Error, {
      context: 'broker_lead_update',
      userId,
      leadId: req.query.leadId,
    })
    handleError(res, error as Error, 'broker_lead_update')
  }
}

export default withSecurity(withAuth(handler))