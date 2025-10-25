import { TenantScope, TenantFilter, TenantError } from '../types/tenancy'
import { supabaseAdmin } from '../supabase'

/**
 * Tenant scoping utilities to ensure data isolation
 */
export class TenantScoping {
  /**
   * Add organization filter to a Supabase query
   */
  static withOrgContext<T>(
    query: any,
    organizationId: string,
    additionalFilters?: Record<string, any>
  ) {
    let scopedQuery = query.eq('organization_id', organizationId)
    
    if (additionalFilters) {
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          scopedQuery = scopedQuery.eq(key, value)
        }
      })
    }
    
    return scopedQuery
  }

  /**
   * Add user filter to a Supabase query (for user-specific data)
   */
  static withUserContext<T>(
    query: any,
    organizationId: string,
    userId: string,
    additionalFilters?: Record<string, any>
  ) {
    let scopedQuery = query
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
    
    if (additionalFilters) {
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          scopedQuery = scopedQuery.eq(key, value)
        }
      })
    }
    
    return scopedQuery
  }

  /**
   * Validate that a user belongs to an organization
   */
  static async validateUserMembership(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single()

      if (error) {
        console.error('Membership validation error:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('Membership validation error:', error)
      return false
    }
  }

  /**
   * Get user's role in an organization
   */
  static async getUserRole(
    userId: string,
    organizationId: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('memberships')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single()

      if (error) {
        console.error('Role lookup error:', error)
        return null
      }

      return data?.role || null
    } catch (error) {
      console.error('Role lookup error:', error)
      return null
    }
  }

  /**
   * Get all organizations a user belongs to
   */
  static async getUserOrganizations(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('memberships')
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            slug,
            status,
            plan
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')

      if (error) {
        throw new Error(`Failed to get user organizations: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Get user organizations error:', error)
      throw error
    }
  }

  /**
   * Get user's primary organization
   */
  static async getPrimaryOrganization(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select(`
          primary_organization_id,
          organizations (
            id,
            name,
            slug,
            status,
            plan
          )
        `)
        .eq('id', userId)
        .single()

      if (error) {
        throw new Error(`Failed to get primary organization: ${error.message}`)
      }

      return data?.organizations || null
    } catch (error) {
      console.error('Get primary organization error:', error)
      throw error
    }
  }

  /**
   * Create a tenant filter object
   */
  static createFilter(
    organizationId: string,
    userId?: string,
    includeDeleted = false
  ): TenantFilter {
    return {
      organizationId,
      userId,
      includeDeleted
    }
  }

  /**
   * Apply tenant filter to a query
   */
  static applyFilter(query: any, filter: TenantFilter) {
    let scopedQuery = query.eq('organization_id', filter.organizationId)
    
    if (filter.userId) {
      scopedQuery = scopedQuery.eq('user_id', filter.userId)
    }
    
    if (!filter.includeDeleted) {
      scopedQuery = scopedQuery.is('deleted_at', null)
    }
    
    return scopedQuery
  }

  /**
   * Validate tenant context before operations
   */
  static async validateContext(context: TenantScope): Promise<boolean> {
    try {
      // Validate organization exists and is active
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id, status')
        .eq('id', context.organizationId)
        .single()

      if (orgError || !org) {
        throw new TenantError('Organization not found', 'ORG_NOT_FOUND', context.organizationId)
      }

      if (org.status !== 'active') {
        throw new TenantError('Organization is not active', 'ORG_INACTIVE', context.organizationId)
      }

      // Validate user membership
      if (context.userId) {
        const isValidMember = await this.validateUserMembership(
          context.userId,
          context.organizationId
        )

        if (!isValidMember) {
          throw new TenantError('User is not a member of this organization', 'INVALID_MEMBERSHIP', context.organizationId)
        }
      }

      return true
    } catch (error) {
      console.error('Context validation error:', error)
      throw error
    }
  }

  /**
   * Get organization limits
   */
  static async getOrganizationLimits(organizationId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('limits, plan')
        .eq('id', organizationId)
        .single()

      if (error) {
        throw new Error(`Failed to get organization limits: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Get organization limits error:', error)
      throw error
    }
  }

  /**
   * Check if organization has reached a limit
   */
  static async checkLimit(
    organizationId: string,
    limitType: keyof import('../types/tenancy').OrganizationLimits
  ): Promise<{ current: number; limit: number; exceeded: boolean }> {
    try {
      const { limits } = await this.getOrganizationLimits(organizationId)
      const limit = limits[limitType]
      
      if (limit === -1) {
        // Unlimited
        return { current: 0, limit: -1, exceeded: false }
      }

      // Get current usage based on limit type
      let current = 0
      const today = new Date().toISOString().split('T')[0]

      switch (limitType) {
        case 'maxUsers':
          const { count: userCount } = await supabaseAdmin
            .from('memberships')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'active')
          current = userCount || 0
          break

        case 'maxAiCallsPerDay':
          const { data: usageData } = await supabaseAdmin
            .from('usage_snapshots')
            .select('ai_calls')
            .eq('organization_id', organizationId)
            .eq('date', today)
            .single()
          current = usageData?.ai_calls || 0
          break

        case 'maxSavedScenarios':
          const { count: scenarioCount } = await supabaseAdmin
            .from('mortgage_calculations')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
          current = scenarioCount || 0
          break

        case 'maxIntegrations':
          const { count: integrationCount } = await supabaseAdmin
            .from('integrations')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
          current = integrationCount || 0
          break

        case 'maxWebhooks':
          const { count: webhookCount } = await supabaseAdmin
            .from('webhook_events')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
          current = webhookCount || 0
          break

        case 'maxApiKeys':
          const { count: apiKeyCount } = await supabaseAdmin
            .from('api_keys')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
          current = apiKeyCount || 0
          break

        default:
          throw new Error(`Unknown limit type: ${limitType}`)
      }

      return {
        current,
        limit,
        exceeded: limit !== -1 && current >= limit
      }
    } catch (error) {
      console.error('Check limit error:', error)
      throw error
    }
  }

  /**
   * Enforce tenant isolation in API responses
   */
  static sanitizeResponse<T>(data: T, organizationId: string): T {
    // Remove any sensitive data that shouldn't be exposed
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeResponse(item, organizationId)) as T
    }

    if (data && typeof data === 'object') {
      const sanitized = { ...data } as any
      
      // Remove organization_id from response (it's implicit in the context)
      delete sanitized.organization_id
      
      // Sanitize nested objects
      Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizeResponse(sanitized[key], organizationId)
        }
      })
      
      return sanitized
    }

    return data
  }
}