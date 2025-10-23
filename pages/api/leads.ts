import { NextApiRequest, NextApiResponse } from 'next'
import { LeadRoutingAgent } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'
import twilio from 'twilio'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      userId,
      name,
      email,
      phone,
      leadData,
    } = req.body

    // Validate required fields
    if (!name || !email || !phone || !leadData) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Process lead using AI agent
    const agent = new LeadRoutingAgent()
    const leadResult = await agent.processLead({
      name,
      email,
      phone,
      leadData,
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
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
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
      console.error('SMS notification error:', smsError)
      // Don't fail the request if SMS fails
    }

    res.status(200).json({
      ...leadResult,
      leadId: savedLead.id,
      message: 'Lead submitted successfully'
    })
  } catch (error) {
    console.error('Lead processing error:', error)
    res.status(500).json({ 
      error: 'Failed to process lead',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}