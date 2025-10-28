import { supabaseAdmin } from '../supabase'
import { WebhookEvent, TenantError } from '../types/tenancy'
import { MeteringService } from '../billing/metering-service'
import crypto from 'crypto'

export interface WebhookEndpoint {
  id: string
  organizationId: string
  url: string
  secret: string
  events: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  eventId: string
  url: string
  status: 'pending' | 'delivered' | 'failed' | 'retrying'
  attempts: number
  maxAttempts: number
  nextRetryAt?: string
  deliveredAt?: string
  errorMessage?: string
  responseCode?: number
  responseBody?: string
  createdAt: string
  updatedAt: string
}

export class WebhookService {
  /**
   * Create a webhook endpoint
   */
  static async createWebhookEndpoint(
    organizationId: string,
    url: string,
    events: string[],
    userId: string,
    userRole: string
  ): Promise<WebhookEndpoint> {
    try {
      // Check permissions
      if (!this.canManageWebhooks(userRole)) {
        throw new TenantError(
          'Insufficient permissions to create webhook',
          'INSUFFICIENT_PERMISSIONS',
          organizationId
        )
      }

      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new TenantError('Invalid webhook URL', 'INVALID_URL', organizationId)
      }

      // Generate secret
      const secret = this.generateWebhookSecret()

      const webhookEndpoint: WebhookEndpoint = {
        id: crypto.randomUUID(),
        organizationId,
        url,
        secret,
        events,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Store in database
      const { error } = await supabaseAdmin
        .from('webhook_endpoints')
        .insert(webhookEndpoint)

      if (error) {
        throw new Error(`Failed to create webhook endpoint: ${error.message}`)
      }

      return webhookEndpoint
    } catch (error) {
      console.error('Create webhook endpoint error:', error)
      throw error
    }
  }

  /**
   * Get webhook endpoints for an organization
   */
  static async getWebhookEndpoints(
    organizationId: string,
    userId: string,
    userRole: string
  ): Promise<WebhookEndpoint[]> {
    try {
      // Check permissions
      if (!this.canManageWebhooks(userRole)) {
        throw new TenantError(
          'Insufficient permissions to view webhooks',
          'INSUFFICIENT_PERMISSIONS',
          organizationId
        )
      }

      const { data, error } = await supabaseAdmin
        .from('webhook_endpoints')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get webhook endpoints: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Get webhook endpoints error:', error)
      throw error
    }
  }

  /**
   * Update a webhook endpoint
   */
  static async updateWebhookEndpoint(
    webhookId: string,
    organizationId: string,
    updates: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'isActive'>>,
    userId: string,
    userRole: string
  ): Promise<WebhookEndpoint> {
    try {
      // Check permissions
      if (!this.canManageWebhooks(userRole)) {
        throw new TenantError(
          'Insufficient permissions to update webhook',
          'INSUFFICIENT_PERMISSIONS',
          organizationId
        )
      }

      // Validate URL if provided
      if (updates.url && !this.isValidUrl(updates.url)) {
        throw new TenantError('Invalid webhook URL', 'INVALID_URL', organizationId)
      }

      const { data, error } = await supabaseAdmin
        .from('webhook_endpoints')
        .update({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .eq('id', webhookId)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update webhook endpoint: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Update webhook endpoint error:', error)
      throw error
    }
  }

  /**
   * Delete a webhook endpoint
   */
  static async deleteWebhookEndpoint(
    webhookId: string,
    organizationId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    try {
      // Check permissions
      if (!this.canManageWebhooks(userRole)) {
        throw new TenantError(
          'Insufficient permissions to delete webhook',
          'INSUFFICIENT_PERMISSIONS',
          organizationId
        )
      }

      const { error } = await supabaseAdmin
        .from('webhook_endpoints')
        .delete()
        .eq('id', webhookId)
        .eq('organization_id', organizationId)

      if (error) {
        throw new Error(`Failed to delete webhook endpoint: ${error.message}`)
      }
    } catch (error) {
      console.error('Delete webhook endpoint error:', error)
      throw error
    }
  }

  /**
   * Send a webhook event
   */
  static async sendWebhookEvent(
    organizationId: string,
    eventType: string,
    payload: Record<string, any>
  ): Promise<WebhookEvent[]> {
    try {
      // Get active webhook endpoints for this organization
      const { data: endpoints, error } = await supabaseAdmin
        .from('webhook_endpoints')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .contains('events', [eventType])

      if (error) {
        throw new Error(`Failed to get webhook endpoints: ${error.message}`)
      }

      if (!endpoints || endpoints.length === 0) {
        return []
      }

      // Create webhook event
      const webhookEvent: WebhookEvent = {
        id: crypto.randomUUID(),
        organizationId,
        eventType,
        payload,
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString()
      }

      // Store webhook event
      const { error: eventError } = await supabaseAdmin
        .from('webhook_events')
        .insert(webhookEvent)

      if (eventError) {
        throw new Error(`Failed to store webhook event: ${eventError.message}`)
      }

      // Send to all matching endpoints
      const deliveries = await Promise.all(
        endpoints.map(endpoint => this.deliverWebhook(webhookEvent, endpoint))
      )

      return deliveries
    } catch (error) {
      console.error('Send webhook event error:', error)
      throw error
    }
  }

  /**
   * Deliver a webhook to a specific endpoint
   */
  private static async deliverWebhook(
    webhookEvent: WebhookEvent,
    endpoint: WebhookEndpoint
  ): Promise<WebhookEvent> {
    try {
      // Create delivery record
      const delivery: WebhookDelivery = {
        id: crypto.randomUUID(),
        webhookId: endpoint.id,
        eventId: webhookEvent.id,
        url: endpoint.url,
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const { error: deliveryError } = await supabaseAdmin
        .from('webhook_deliveries')
        .insert(delivery)

      if (deliveryError) {
        throw new Error(`Failed to create delivery record: ${deliveryError.message}`)
      }

      // Attempt delivery
      await this.attemptDelivery(delivery, webhookEvent, endpoint)

      return webhookEvent
    } catch (error) {
      console.error('Deliver webhook error:', error)
      throw error
    }
  }

  /**
   * Attempt to deliver a webhook
   */
  private static async attemptDelivery(
    delivery: WebhookDelivery,
    webhookEvent: WebhookEvent,
    endpoint: WebhookEndpoint
  ): Promise<void> {
    try {
      const signature = this.generateSignature(
        JSON.stringify(webhookEvent.payload),
        endpoint.secret
      )

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': webhookEvent.eventType,
          'X-Webhook-Signature': signature,
          'X-Webhook-Delivery': delivery.id,
          'User-Agent': 'MortgageMatchPro-Webhooks/1.0'
        },
        body: JSON.stringify({
          id: webhookEvent.id,
          event: webhookEvent.eventType,
          data: webhookEvent.payload,
          created: webhookEvent.createdAt
        })
      })

      const responseBody = await response.text()
      const isSuccess = response.ok

      // Update delivery record
      await supabaseAdmin
        .from('webhook_deliveries')
        .update({
          status: isSuccess ? 'delivered' : 'failed',
          attempts: delivery.attempts + 1,
          deliveredAt: isSuccess ? new Date().toISOString() : undefined,
          errorMessage: isSuccess ? undefined : `HTTP ${response.status}: ${responseBody}`,
          responseCode: response.status,
          responseBody: responseBody.substring(0, 1000), // Limit response body
          updatedAt: new Date().toISOString()
        })
        .eq('id', delivery.id)

      // Update webhook event status
      if (isSuccess) {
        await supabaseAdmin
          .from('webhook_events')
          .update({
            status: 'delivered',
            deliveredAt: new Date().toISOString()
          })
          .eq('id', webhookEvent.id)
      } else {
        await this.scheduleRetry(delivery, webhookEvent)
      }

      // Record usage
      await MeteringService.recordWebhookDelivery(
        webhookEvent.organizationId,
        delivery.id,
        isSuccess,
        0.01
      )
    } catch (error) {
      console.error('Webhook delivery attempt error:', error)
      
      // Update delivery record with error
      await supabaseAdmin
        .from('webhook_deliveries')
        .update({
          status: 'failed',
          attempts: delivery.attempts + 1,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date().toISOString()
        })
        .eq('id', delivery.id)

      // Schedule retry if not exceeded max attempts
      if (delivery.attempts < delivery.maxAttempts) {
        await this.scheduleRetry(delivery, webhookEvent)
      }
    }
  }

  /**
   * Schedule a retry for failed webhook delivery
   */
  private static async scheduleRetry(
    delivery: WebhookDelivery,
    webhookEvent: WebhookEvent
  ): Promise<void> {
    const retryDelay = Math.pow(2, delivery.attempts) * 1000 // Exponential backoff
    const nextRetryAt = new Date(Date.now() + retryDelay)

    await supabaseAdmin
      .from('webhook_deliveries')
      .update({
        status: 'retrying',
        nextRetryAt: nextRetryAt.toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('id', delivery.id)

    // Update webhook event status
    await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'retrying',
        nextRetryAt: nextRetryAt.toISOString()
      })
      .eq('id', webhookEvent.id)
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.generateSignature(payload, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Generate webhook signature
   */
  private static generateSignature(payload: string, secret: string): string {
    return `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')}`
  }

  /**
   * Generate webhook secret
   */
  private static generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Validate URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if user can manage webhooks
   */
  private static canManageWebhooks(userRole: string): boolean {
    return ['OWNER', 'ADMIN'].includes(userRole)
  }

  /**
   * Get webhook delivery history
   */
  static async getWebhookDeliveries(
    organizationId: string,
    webhookId?: string,
    limit = 50
  ): Promise<WebhookDelivery[]> {
    try {
      let query = supabaseAdmin
        .from('webhook_deliveries')
        .select(`
          *,
          webhook_endpoints (
            id,
            url,
            events
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (webhookId) {
        query = query.eq('webhook_id', webhookId)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to get webhook deliveries: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Get webhook deliveries error:', error)
      throw error
    }
  }

  /**
   * Retry failed webhook delivery
   */
  static async retryWebhookDelivery(
    deliveryId: string,
    organizationId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    try {
      // Check permissions
      if (!this.canManageWebhooks(userRole)) {
        throw new TenantError(
          'Insufficient permissions to retry webhook',
          'INSUFFICIENT_PERMISSIONS',
          organizationId
        )
      }

      // Get delivery record
      const { data: delivery, error: deliveryError } = await supabaseAdmin
        .from('webhook_deliveries')
        .select('*')
        .eq('id', deliveryId)
        .eq('organization_id', organizationId)
        .single()

      if (deliveryError) {
        throw new Error(`Failed to get delivery record: ${deliveryError.message}`)
      }

      // Get webhook event
      const { data: webhookEvent, error: eventError } = await supabaseAdmin
        .from('webhook_events')
        .select('*')
        .eq('id', delivery.eventId)
        .single()

      if (eventError) {
        throw new Error(`Failed to get webhook event: ${eventError.message}`)
      }

      // Get webhook endpoint
      const { data: endpoint, error: endpointError } = await supabaseAdmin
        .from('webhook_endpoints')
        .select('*')
        .eq('id', delivery.webhookId)
        .single()

      if (endpointError) {
        throw new Error(`Failed to get webhook endpoint: ${endpointError.message}`)
      }

      // Reset delivery status
      await supabaseAdmin
        .from('webhook_deliveries')
        .update({
          status: 'pending',
          errorMessage: undefined,
          updatedAt: new Date().toISOString()
        })
        .eq('id', deliveryId)

      // Attempt delivery
      await this.attemptDelivery(delivery, webhookEvent, endpoint)
    } catch (error) {
      console.error('Retry webhook delivery error:', error)
      throw error
    }
  }
}