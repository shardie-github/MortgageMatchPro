import { NextApiRequest, NextApiResponse } from 'next'
import { WebhookService } from '@/lib/webhooks/webhook-service'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const signature = req.headers['x-webhook-signature'] as string
    const deliveryId = req.headers['x-webhook-delivery'] as string
    const eventType = req.headers['x-webhook-event'] as string

    if (!signature || !deliveryId || !eventType) {
      return res.status(400).json({ error: 'Missing required headers' })
    }

    // Get webhook delivery record
    const { data: delivery, error: deliveryError } = await supabaseAdmin
      .from('webhook_deliveries')
      .select(`
        *,
        webhook_endpoints (
          secret
        )
      `)
      .eq('id', deliveryId)
      .single()

    if (deliveryError || !delivery) {
      return res.status(404).json({ error: 'Webhook delivery not found' })
    }

    // Verify signature
    const payload = JSON.stringify(req.body)
    const isValid = WebhookService.verifyWebhookSignature(
      payload,
      signature,
      delivery.webhook_endpoints.secret
    )

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Process webhook event
    console.log(`Received webhook: ${eventType}`, req.body)

    // Update delivery status
    await supabaseAdmin
      .from('webhook_deliveries')
      .update({
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        responseCode: 200,
        responseBody: 'OK'
      })
      .eq('id', deliveryId)

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Webhook verification error:', error)
    return res.status(500).json({ 
      error: 'Internal server error'
    })
  }
}