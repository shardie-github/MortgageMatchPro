import { supabaseAdmin } from '../supabase'
import { ApiKey, TenantError, PermissionError } from '../types/tenancy'
import { TenantScoping } from './scoping'
import { PermissionChecker } from './rbac'
import { MeteringService } from '../billing/metering-service'
import crypto from 'crypto'

export class ApiKeyService {
  /**
   * Create a new API key
   */
  static async createApiKey(
    organizationId: string,
    name: string,
    permissions: string[],
    expiresAt?: string,
    userId: string,
    userRole: string
  ): Promise<{ apiKey: ApiKey; key: string }> {
    try {
      // Check permissions
      if (!PermissionChecker.can(userRole as any, 'api:create', 'api_keys')) {
        throw new PermissionError(
          'Insufficient permissions to create API key',
          'api:create',
          'api_keys',
          organizationId
        )
      }

      // Check API key limit
      const limitCheck = await TenantScoping.checkLimit(organizationId, 'maxApiKeys')
      if (limitCheck.exceeded) {
        throw new TenantError(
          'API key limit exceeded',
          'QUOTA_EXCEEDED',
          organizationId
        )
      }

      // Generate API key
      const key = this.generateApiKey()
      const keyHash = this.hashApiKey(key)
      const keyPrefix = key.substring(0, 8)

      const apiKey: ApiKey = {
        id: crypto.randomUUID(),
        organizationId,
        name,
        keyHash,
        keyPrefix,
        permissions,
        lastUsedAt: undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Store in database
      const { error } = await supabaseAdmin
        .from('api_keys')
        .insert(apiKey)

      if (error) {
        throw new Error(`Failed to create API key: ${error.message}`)
      }

      // Record usage
      await MeteringService.recordApiCall(
        organizationId,
        'api_key.create',
        'POST',
        0.01
      )

      return { apiKey, key }
    } catch (error) {
      console.error('Create API key error:', error)
      throw error
    }
  }

  /**
   * Get API keys for an organization
   */
  static async getApiKeys(
    organizationId: string,
    userId: string,
    userRole: string
  ): Promise<ApiKey[]> {
    try {
      // Check permissions
      if (!PermissionChecker.can(userRole as any, 'read', 'api_keys')) {
        throw new PermissionError(
          'Insufficient permissions to view API keys',
          'read',
          'api_keys',
          organizationId
        )
      }

      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get API keys: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Get API keys error:', error)
      throw error
    }
  }

  /**
   * Update an API key
   */
  static async updateApiKey(
    apiKeyId: string,
    organizationId: string,
    updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'expiresAt'>>,
    userId: string,
    userRole: string
  ): Promise<ApiKey> {
    try {
      // Check permissions
      if (!PermissionChecker.can(userRole as any, 'api:manage', 'api_keys')) {
        throw new PermissionError(
          'Insufficient permissions to update API key',
          'api:manage',
          'api_keys',
          organizationId
        )
      }

      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .update({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .eq('id', apiKeyId)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update API key: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Update API key error:', error)
      throw error
    }
  }

  /**
   * Delete an API key
   */
  static async deleteApiKey(
    apiKeyId: string,
    organizationId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    try {
      // Check permissions
      if (!PermissionChecker.can(userRole as any, 'api:delete', 'api_keys')) {
        throw new PermissionError(
          'Insufficient permissions to delete API key',
          'api:delete',
          'api_keys',
          organizationId
        )
      }

      const { error } = await supabaseAdmin
        .from('api_keys')
        .delete()
        .eq('id', apiKeyId)
        .eq('organization_id', organizationId)

      if (error) {
        throw new Error(`Failed to delete API key: ${error.message}`)
      }
    } catch (error) {
      console.error('Delete API key error:', error)
      throw error
    }
  }

  /**
   * Validate API key
   */
  static async validateApiKey(apiKey: string): Promise<{
    isValid: boolean
    organizationId?: string
    permissions?: string[]
    error?: string
  }> {
    try {
      const keyHash = this.hashApiKey(apiKey)

      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .select('organization_id, permissions, expires_at')
        .eq('key_hash', keyHash)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return { isValid: false, error: 'API key not found' }
        }
        throw new Error(`Failed to validate API key: ${error.message}`)
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { isValid: false, error: 'API key expired' }
      }

      // Update last used timestamp
      await supabaseAdmin
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('key_hash', keyHash)

      return {
        isValid: true,
        organizationId: data.organization_id,
        permissions: data.permissions
      }
    } catch (error) {
      console.error('Validate API key error:', error)
      return { isValid: false, error: 'Validation failed' }
    }
  }

  /**
   * Rotate API key
   */
  static async rotateApiKey(
    apiKeyId: string,
    organizationId: string,
    userId: string,
    userRole: string
  ): Promise<{ apiKey: ApiKey; key: string }> {
    try {
      // Check permissions
      if (!PermissionChecker.can(userRole as any, 'api:manage', 'api_keys')) {
        throw new PermissionError(
          'Insufficient permissions to rotate API key',
          'api:manage',
          'api_keys',
          organizationId
        )
      }

      // Get existing API key
      const { data: existingKey, error: getError } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('id', apiKeyId)
        .eq('organization_id', organizationId)
        .single()

      if (getError) {
        throw new Error(`Failed to get API key: ${getError.message}`)
      }

      // Generate new key
      const newKey = this.generateApiKey()
      const newKeyHash = this.hashApiKey(newKey)
      const newKeyPrefix = newKey.substring(0, 8)

      // Update API key
      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .update({
          key_hash: newKeyHash,
          key_prefix: newKeyPrefix,
          updated_at: new Date().toISOString()
        })
        .eq('id', apiKeyId)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to rotate API key: ${error.message}`)
      }

      return { apiKey: data, key: newKey }
    } catch (error) {
      console.error('Rotate API key error:', error)
      throw error
    }
  }

  /**
   * Get API key usage statistics
   */
  static async getApiKeyUsage(
    apiKeyId: string,
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalCalls: number
    totalCost: number
    dailyBreakdown: Array<{
      date: string
      calls: number
      cost: number
    }>
  }> {
    try {
      // Get usage events for this API key
      const { data: usageEvents, error } = await supabaseAdmin
        .from('usage_events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('metadata->>apiKeyId', apiKeyId)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true })

      if (error) {
        throw new Error(`Failed to get API key usage: ${error.message}`)
      }

      const dailyBreakdown = this.groupUsageByDay(usageEvents || [])
      const totalCalls = usageEvents?.length || 0
      const totalCost = usageEvents?.reduce((sum, event) => sum + event.amount, 0) || 0

      return {
        totalCalls,
        totalCost,
        dailyBreakdown
      }
    } catch (error) {
      console.error('Get API key usage error:', error)
      throw error
    }
  }

  /**
   * Generate a secure API key
   */
  private static generateApiKey(): string {
    const prefix = 'mm_'
    const randomBytes = crypto.randomBytes(32)
    const key = randomBytes.toString('base64url')
    return `${prefix}${key}`
  }

  /**
   * Hash an API key for storage
   */
  private static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex')
  }

  /**
   * Group usage events by day
   */
  private static groupUsageByDay(usageEvents: any[]): Array<{
    date: string
    calls: number
    cost: number
  }> {
    const grouped = usageEvents.reduce((acc, event) => {
      const date = event.timestamp.split('T')[0]
      if (!acc[date]) {
        acc[date] = { calls: 0, cost: 0 }
      }
      acc[date].calls += 1
      acc[date].cost += event.amount
      return acc
    }, {} as Record<string, { calls: number; cost: number }>)

    return Object.entries(grouped).map(([date, stats]) => ({
      date,
      calls: stats.calls,
      cost: stats.cost
    }))
  }
}