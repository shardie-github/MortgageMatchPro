import { supabaseAdmin } from '../supabase'
import { 
  Organization, 
  Membership, 
  OrganizationBranding, 
  OrganizationSettings,
  OrganizationLimits,
  UserRole,
  TenantError,
  QuotaExceededError
} from '../types/tenancy'
import { TenantScoping } from './scoping'
import { PermissionChecker } from './rbac'

export class OrganizationService {
  /**
   * Create a new organization
   */
  static async createOrganization(
    name: string,
    slug: string,
    ownerId: string,
    plan: 'free' | 'pro' | 'enterprise' = 'free'
  ): Promise<Organization> {
    try {
      // Validate slug uniqueness
      const { data: existingOrg } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single()

      if (existingOrg) {
        throw new TenantError('Organization slug already exists', 'SLUG_EXISTS')
      }

      // Create organization
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name,
          slug,
          plan,
          status: 'trial',
          limits: this.getDefaultLimits(plan),
          branding: this.getDefaultBranding(),
          settings: this.getDefaultSettings()
        })
        .select()
        .single()

      if (orgError) {
        throw new Error(`Failed to create organization: ${orgError.message}`)
      }

      // Create owner membership
      const { error: membershipError } = await supabaseAdmin
        .from('memberships')
        .insert({
          user_id: ownerId,
          organization_id: org.id,
          role: 'OWNER',
          status: 'active',
          joined_at: new Date().toISOString()
        })

      if (membershipError) {
        // Clean up organization if membership creation fails
        await supabaseAdmin.from('organizations').delete().eq('id', org.id)
        throw new Error(`Failed to create owner membership: ${membershipError.message}`)
      }

      // Update user's primary organization
      await supabaseAdmin
        .from('users')
        .update({ primary_organization_id: org.id })
        .eq('id', ownerId)

      return org
    } catch (error) {
      console.error('Create organization error:', error)
      throw error
    }
  }

  /**
   * Get organization by ID
   */
  static async getOrganization(organizationId: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new Error(`Failed to get organization: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Get organization error:', error)
      throw error
    }
  }

  /**
   * Update organization
   */
  static async updateOrganization(
    organizationId: string,
    updates: Partial<Organization>,
    userId: string,
    userRole: UserRole
  ): Promise<Organization> {
    try {
      // Check permissions
      if (!PermissionChecker.can(userRole, 'write', 'organization')) {
        throw new TenantError('Insufficient permissions to update organization', 'INSUFFICIENT_PERMISSIONS', organizationId)
      }

      // Validate user membership
      const isValidMember = await TenantScoping.validateUserMembership(userId, organizationId)
      if (!isValidMember) {
        throw new TenantError('User is not a member of this organization', 'INVALID_MEMBERSHIP', organizationId)
      }

      const { data, error } = await supabaseAdmin
        .from('organizations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update organization: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Update organization error:', error)
      throw error
    }
  }

  /**
   * Update organization branding
   */
  static async updateBranding(
    organizationId: string,
    branding: Partial<OrganizationBranding>,
    userId: string,
    userRole: UserRole
  ): Promise<Organization> {
    try {
      // Check permissions
      if (!PermissionChecker.can(userRole, 'branding:manage', 'branding')) {
        throw new TenantError('Insufficient permissions to update branding', 'INSUFFICIENT_PERMISSIONS', organizationId)
      }

      // Get current branding
      const { data: currentOrg } = await supabaseAdmin
        .from('organizations')
        .select('branding')
        .eq('id', organizationId)
        .single()

      if (!currentOrg) {
        throw new TenantError('Organization not found', 'ORG_NOT_FOUND', organizationId)
      }

      // Merge with existing branding
      const updatedBranding = {
        ...currentOrg.branding,
        ...branding
      }

      return await this.updateOrganization(
        organizationId,
        { branding: updatedBranding },
        userId,
        userRole
      )
    } catch (error) {
      console.error('Update branding error:', error)
      throw error
    }
  }

  /**
   * Update organization settings
   */
  static async updateSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>,
    userId: string,
    userRole: UserRole
  ): Promise<Organization> {
    try {
      // Check permissions
      if (!PermissionChecker.can(userRole, 'settings:manage', 'settings')) {
        throw new TenantError('Insufficient permissions to update settings', 'INSUFFICIENT_PERMISSIONS', organizationId)
      }

      // Get current settings
      const { data: currentOrg } = await supabaseAdmin
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single()

      if (!currentOrg) {
        throw new TenantError('Organization not found', 'ORG_NOT_FOUND', organizationId)
      }

      // Merge with existing settings
      const updatedSettings = {
        ...currentOrg.settings,
        ...settings
      }

      return await this.updateOrganization(
        organizationId,
        { settings: updatedSettings },
        userId,
        userRole
      )
    } catch (error) {
      console.error('Update settings error:', error)
      throw error
    }
  }

  /**
   * Get organization members
   */
  static async getMembers(
    organizationId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Membership[]> {
    try {
      // Check permissions
      if (!PermissionChecker.can(userRole, 'read', 'users')) {
        throw new TenantError('Insufficient permissions to view members', 'INSUFFICIENT_PERMISSIONS', organizationId)
      }

      const { data, error } = await supabaseAdmin
        .from('memberships')
        .select(`
          *,
          users (
            id,
            email,
            created_at
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get members: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Get members error:', error)
      throw error
    }
  }

  /**
   * Invite user to organization
   */
  static async inviteUser(
    organizationId: string,
    email: string,
    role: UserRole,
    invitedBy: string,
    userRole: UserRole
  ): Promise<Membership> {
    try {
      // Check permissions
      if (!PermissionChecker.can(userRole, 'users:invite', 'users')) {
        throw new TenantError('Insufficient permissions to invite users', 'INSUFFICIENT_PERMISSIONS', organizationId)
      }

      // Check user limit
      const limitCheck = await TenantScoping.checkLimit(organizationId, 'maxUsers')
      if (limitCheck.exceeded) {
        throw new QuotaExceededError(
          'User limit exceeded',
          'maxUsers',
          limitCheck.current,
          limitCheck.limit,
          organizationId
        )
      }

      // Check if user exists
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (!user) {
        throw new TenantError('User not found', 'USER_NOT_FOUND', organizationId)
      }

      // Check if user is already a member
      const { data: existingMembership } = await supabaseAdmin
        .from('memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single()

      if (existingMembership) {
        throw new TenantError('User is already a member', 'USER_ALREADY_MEMBER', organizationId)
      }

      // Create membership
      const { data: membership, error } = await supabaseAdmin
        .from('memberships')
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          role,
          status: 'pending',
          invited_by: invitedBy,
          invited_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to invite user: ${error.message}`)
      }

      return membership
    } catch (error) {
      console.error('Invite user error:', error)
      throw error
    }
  }

  /**
   * Accept invitation
   */
  static async acceptInvitation(
    organizationId: string,
    userId: string
  ): Promise<Membership> {
    try {
      const { data: membership, error } = await supabaseAdmin
        .from('memberships')
        .update({
          status: 'active',
          joined_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to accept invitation: ${error.message}`)
      }

      return membership
    } catch (error) {
      console.error('Accept invitation error:', error)
      throw error
    }
  }

  /**
   * Remove user from organization
   */
  static async removeUser(
    organizationId: string,
    userId: string,
    removedBy: string,
    userRole: UserRole
  ): Promise<void> {
    try {
      // Check permissions
      if (!PermissionChecker.can(userRole, 'users:remove', 'users')) {
        throw new TenantError('Insufficient permissions to remove users', 'INSUFFICIENT_PERMISSIONS', organizationId)
      }

      // Don't allow removing the owner
      const { data: membership } = await supabaseAdmin
        .from('memberships')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .single()

      if (membership?.role === 'OWNER') {
        throw new TenantError('Cannot remove organization owner', 'CANNOT_REMOVE_OWNER', organizationId)
      }

      const { error } = await supabaseAdmin
        .from('memberships')
        .update({ status: 'suspended' })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to remove user: ${error.message}`)
      }
    } catch (error) {
      console.error('Remove user error:', error)
      throw error
    }
  }

  /**
   * Get default limits for a plan
   */
  private static getDefaultLimits(plan: string): OrganizationLimits {
    const limits = {
      free: {
        maxUsers: 5,
        maxAiCallsPerDay: 100,
        maxSavedScenarios: 10,
        maxIntegrations: 2,
        maxWebhooks: 5,
        maxApiKeys: 3
      },
      pro: {
        maxUsers: 25,
        maxAiCallsPerDay: 1000,
        maxSavedScenarios: 100,
        maxIntegrations: 10,
        maxWebhooks: 20,
        maxApiKeys: 10
      },
      enterprise: {
        maxUsers: -1,
        maxAiCallsPerDay: -1,
        maxSavedScenarios: -1,
        maxIntegrations: -1,
        maxWebhooks: -1,
        maxApiKeys: -1
      }
    }

    return limits[plan as keyof typeof limits] || limits.free
  }

  /**
   * Get default branding
   */
  private static getDefaultBranding(): OrganizationBranding {
    return {
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      accentColor: '#F59E0B',
      fontFamily: 'Inter'
    }
  }

  /**
   * Get default settings
   */
  private static getDefaultSettings(): OrganizationSettings {
    return {
      timezone: 'UTC',
      currency: 'CAD',
      locale: 'en-CA',
      features: {},
      apiKeyRotationDays: 90,
      requireMfa: false,
      allowApiAccess: true
    }
  }
}