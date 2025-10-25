import { NextApiRequest, NextApiResponse } from 'next'
import { WebhookService } from '@/lib/webhooks/webhook-service'
import { PermissionChecker } from '@/lib/tenancy/rbac'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { organizationId, userId, userRole } = req.query

    if (!organizationId || !userId || !userRole) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Check permissions
    if (!PermissionChecker.can(userRole as string, 'read', 'manage_webhooks', organizationId as string)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'GET':
        // Get webhook endpoints or deliveries
        const { type, webhookId } = req.query

        if (type === 'deliveries') {
          const deliveries = await WebhookService.getWebhookDeliveries(
            organizationId as string,
            webhookId as string
          )
          return res.status(200).json({ deliveries })
        } else {
          const endpoints = await WebhookService.getWebhookEndpoints(
            organizationId as string,
            userId as string,
            userRole as string
          )
          return res.status(200).json({ endpoints })
        }

      case 'POST':
        // Create webhook endpoint or retry delivery
        const { action, data } = req.body

        if (action === 'create_endpoint') {
          const { url, events } = data
          if (!url || !events) {
            return res.status(400).json({ error: 'Missing url or events' })
          }

          const endpoint = await WebhookService.createWebhookEndpoint(
            organizationId as string,
            url,
            events,
            userId as string,
            userRole as string
          )
          return res.status(201).json({ endpoint })
        } else if (action === 'retry_delivery') {
          const { deliveryId } = data
          if (!deliveryId) {
            return res.status(400).json({ error: 'Missing deliveryId' })
          }

          await WebhookService.retryWebhookDelivery(
            deliveryId,
            organizationId as string,
            userId as string,
            userRole as string
          )
          return res.status(200).json({ success: true })
        } else {
          return res.status(400).json({ error: 'Invalid action' })
        }

      case 'PUT':
        // Update webhook endpoint
        const { webhookId: updateWebhookId, updates } = req.body
        if (!updateWebhookId || !updates) {
          return res.status(400).json({ error: 'Missing webhookId or updates' })
        }

        const updatedEndpoint = await WebhookService.updateWebhookEndpoint(
          updateWebhookId,
          organizationId as string,
          updates,
          userId as string,
          userRole as string
        )
        return res.status(200).json({ endpoint: updatedEndpoint })

      case 'DELETE':
        // Delete webhook endpoint
        const { webhookId: deleteWebhookId } = req.body
        if (!deleteWebhookId) {
          return res.status(400).json({ error: 'Missing webhookId' })
        }

        await WebhookService.deleteWebhookEndpoint(
          deleteWebhookId,
          organizationId as string,
          userId as string,
          userRole as string
        )
        return res.status(200).json({ success: true })

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Admin webhooks API error:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}