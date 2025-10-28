import { supabaseAdmin } from '../supabase'
import { TenantError } from '../types/tenancy'
import { MeteringService } from '../billing/metering-service'
import { WebhookService } from '../webhooks/webhook-service'
import { ApiKeyService } from '../tenancy/api-key-service'
import { TenantScoping } from '../tenancy/scoping'
import { PermissionChecker } from '../tenancy/rbac'
import crypto from 'crypto'

export interface PublicApiRequest {
  organizationId: string
  apiKey: string
  endpoint: string
  method: string
  headers: Record<string, string>
  body?: any
  ip: string
  userAgent: string
}

export interface PublicApiResponse {
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    requestId: string
    timestamp: string
    rateLimit?: {
      limit: number
      remaining: number
      resetAt: string
    }
  }
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  resetAt: string
}

export class PublicApiService {
  /**
   * Process a public API request
   */
  static async processRequest(
    request: PublicApiRequest
  ): Promise<PublicApiResponse> {
    const requestId = crypto.randomUUID()
    const timestamp = new Date().toISOString()

    try {
      // Validate API key
      const apiKeyInfo = await this.validateApiKey(request.apiKey, request.organizationId)
      if (!apiKeyInfo) {
        return this.createErrorResponse(
          'INVALID_API_KEY',
          'Invalid or expired API key',
          requestId,
          timestamp
        )
      }

      // Check rate limits
      const rateLimitInfo = await this.checkRateLimit(
        request.organizationId,
        apiKeyInfo.scopes
      )
      if (!rateLimitInfo) {
        return this.createErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'Rate limit exceeded',
          requestId,
          timestamp,
          { rateLimit: rateLimitInfo }
        )
      }

      // Process the request based on endpoint
      const result = await this.routeRequest(request, apiKeyInfo)

      // Record usage
      await MeteringService.recordApiCall(
        request.organizationId,
        request.endpoint,
        result.success,
        0.01
      )

      // Send webhook if configured
      if (result.success && this.shouldSendWebhook(request.endpoint)) {
        await WebhookService.sendWebhookEvent(
          request.organizationId,
          'api.request.completed',
          {
            endpoint: request.endpoint,
            method: request.method,
            success: result.success,
            requestId
          }
        )
      }

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        meta: {
          requestId,
          timestamp,
          rateLimit: rateLimitInfo
        }
      }
    } catch (error) {
      console.error('Public API request error:', error)
      
      // Record error usage
      await MeteringService.recordApiCall(
        request.organizationId,
        request.endpoint,
        false,
        0.01
      )

      return this.createErrorResponse(
        'INTERNAL_ERROR',
        'Internal server error',
        requestId,
        timestamp
      )
    }
  }

  /**
   * Validate API key
   */
  private static async validateApiKey(
    apiKey: string,
    organizationId: string
  ): Promise<any> {
    try {
      const keyInfo = await ApiKeyService.validateApiKey(apiKey)
      if (!keyInfo || keyInfo.organizationId !== organizationId) {
        return null
      }

      return keyInfo
    } catch (error) {
      console.error('API key validation error:', error)
      return null
    }
  }

  /**
   * Check rate limits
   */
  private static async checkRateLimit(
    organizationId: string,
    scopes: string[]
  ): Promise<RateLimitInfo | null> {
    try {
      // Get organization limits
      const limits = await TenantScoping.getOrganizationLimits(organizationId)
      if (!limits) {
        return null
      }

      // Get current usage for today
      const today = new Date().toISOString().split('T')[0]
      const usage = await MeteringService.getUsage(
        organizationId,
        today,
        today
      )

      const apiCallsToday = usage.apiCalls || 0
      const limit = limits.apiCallsPerDay || 1000

      if (apiCallsToday >= limit) {
        return null
      }

      return {
        limit,
        remaining: Math.max(0, limit - apiCallsToday),
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    } catch (error) {
      console.error('Rate limit check error:', error)
      return null
    }
  }

  /**
   * Route request to appropriate handler
   */
  private static async routeRequest(
    request: PublicApiRequest,
    apiKeyInfo: any
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    const { endpoint, method, body } = request

    try {
      switch (endpoint) {
        case '/v1/scenarios':
          return await this.handleScenariosRequest(method, body, request.organizationId)
        
        case '/v1/matches':
          return await this.handleMatchesRequest(method, body, request.organizationId)
        
        case '/v1/reports':
          return await this.handleReportsRequest(method, body, request.organizationId)
        
        case '/v1/rates':
          return await this.handleRatesRequest(method, body, request.organizationId)
        
        default:
          return {
            success: false,
            error: {
              code: 'ENDPOINT_NOT_FOUND',
              message: `Endpoint ${endpoint} not found`
            }
          }
      }
    } catch (error) {
      console.error('Route request error:', error)
      return {
        success: false,
        error: {
          code: 'HANDLER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Handle scenarios requests
   */
  private static async handleScenariosRequest(
    method: string,
    body: any,
    organizationId: string
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      if (method === 'POST') {
        // Create new scenario
        const scenario = {
          id: crypto.randomUUID(),
          organizationId,
          ...body,
          createdAt: new Date().toISOString()
        }

        const { error } = await supabaseAdmin
          .from('mortgage_scenarios')
          .insert(scenario)

        if (error) {
          throw new Error(`Failed to create scenario: ${error.message}`)
        }

        return {
          success: true,
          data: scenario
        }
      } else if (method === 'GET') {
        // Get scenarios
        const { data, error } = await supabaseAdmin
          .from('mortgage_scenarios')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })

        if (error) {
          throw new Error(`Failed to get scenarios: ${error.message}`)
        }

        return {
          success: true,
          data: data || []
        }
      } else {
        return {
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${method} not allowed for scenarios`
          }
        }
      }
    } catch (error) {
      console.error('Handle scenarios request error:', error)
      return {
        success: false,
        error: {
          code: 'SCENARIOS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Handle matches requests
   */
  private static async handleMatchesRequest(
    method: string,
    body: any,
    organizationId: string
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      if (method === 'GET') {
        // Get matches for a scenario
        const { scenarioId } = body
        if (!scenarioId) {
          return {
            success: false,
            error: {
              code: 'MISSING_SCENARIO_ID',
              message: 'scenarioId is required'
            }
          }
        }

        const { data, error } = await supabaseAdmin
          .from('mortgage_matches')
          .select(`
            *,
            brokers (
              id,
              name,
              company,
              contact_info
            )
          `)
          .eq('organization_id', organizationId)
          .eq('scenario_id', scenarioId)
          .order('score', { ascending: false })

        if (error) {
          throw new Error(`Failed to get matches: ${error.message}`)
        }

        return {
          success: true,
          data: data || []
        }
      } else {
        return {
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${method} not allowed for matches`
          }
        }
      }
    } catch (error) {
      console.error('Handle matches request error:', error)
      return {
        success: false,
        error: {
          code: 'MATCHES_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Handle reports requests
   */
  private static async handleReportsRequest(
    method: string,
    body: any,
    organizationId: string
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      if (method === 'GET') {
        // Get reports
        const { data, error } = await supabaseAdmin
          .from('reports')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })

        if (error) {
          throw new Error(`Failed to get reports: ${error.message}`)
        }

        return {
          success: true,
          data: data || []
        }
      } else if (method === 'POST') {
        // Generate new report
        const report = {
          id: crypto.randomUUID(),
          organizationId,
          ...body,
          status: 'generating',
          createdAt: new Date().toISOString()
        }

        const { error } = await supabaseAdmin
          .from('reports')
          .insert(report)

        if (error) {
          throw new Error(`Failed to create report: ${error.message}`)
        }

        // Trigger report generation (async)
        this.generateReport(report.id, organizationId)

        return {
          success: true,
          data: report
        }
      } else {
        return {
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${method} not allowed for reports`
          }
        }
      }
    } catch (error) {
      console.error('Handle reports request error:', error)
      return {
        success: false,
        error: {
          code: 'REPORTS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Handle rates requests
   */
  private static async handleRatesRequest(
    method: string,
    body: any,
    organizationId: string
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      if (method === 'GET') {
        // Get current rates
        const { data, error } = await supabaseAdmin
          .from('rate_checks')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) {
          throw new Error(`Failed to get rates: ${error.message}`)
        }

        return {
          success: true,
          data: data?.[0] || null
        }
      } else {
        return {
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${method} not allowed for rates`
          }
        }
      }
    } catch (error) {
      console.error('Handle rates request error:', error)
      return {
        success: false,
        error: {
          code: 'RATES_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Generate report asynchronously
   */
  private static async generateReport(
    reportId: string,
    organizationId: string
  ): Promise<void> {
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Update report status
      await supabaseAdmin
        .from('reports')
        .update({
          status: 'completed',
          completedAt: new Date().toISOString()
        })
        .eq('id', reportId)
        .eq('organization_id', organizationId)

      // Send webhook
      await WebhookService.sendWebhookEvent(
        organizationId,
        'report.completed',
        {
          reportId,
          status: 'completed'
        }
      )
    } catch (error) {
      console.error('Generate report error:', error)
      
      // Update report status to failed
      await supabaseAdmin
        .from('reports')
        .update({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', reportId)
        .eq('organization_id', organizationId)
    }
  }

  /**
   * Create error response
   */
  private static createErrorResponse(
    code: string,
    message: string,
    requestId: string,
    timestamp: string,
    details?: any
  ): PublicApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      meta: {
        requestId,
        timestamp
      }
    }
  }

  /**
   * Check if webhook should be sent for endpoint
   */
  private static shouldSendWebhook(endpoint: string): boolean {
    const webhookEndpoints = [
      '/v1/scenarios',
      '/v1/matches',
      '/v1/reports'
    ]
    return webhookEndpoints.includes(endpoint)
  }
}