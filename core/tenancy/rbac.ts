import { UserRole, Action, Resource, Permission, PermissionError } from '../types/tenancy'

// Permission matrix defining what each role can do
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    // Full access to everything
    { action: 'admin', resource: 'organization' },
    { action: 'write', resource: 'organization' },
    { action: 'read', resource: 'organization' },
    { action: 'delete', resource: 'organization' },
    
    // User management
    { action: 'users:invite', resource: 'users' },
    { action: 'users:manage', resource: 'users' },
    { action: 'users:remove', resource: 'users' },
    { action: 'write', resource: 'users' },
    { action: 'read', resource: 'users' },
    
    // Billing management
    { action: 'billing:admin', resource: 'billing' },
    { action: 'billing:write', resource: 'billing' },
    { action: 'billing:read', resource: 'billing' },
    
    // API key management
    { action: 'api:create', resource: 'api_keys' },
    { action: 'api:manage', resource: 'api_keys' },
    { action: 'api:delete', resource: 'api_keys' },
    
    // Webhook management
    { action: 'webhooks:create', resource: 'webhooks' },
    { action: 'webhooks:manage', resource: 'webhooks' },
    { action: 'webhooks:delete', resource: 'webhooks' },
    
    // Branding and settings
    { action: 'branding:manage', resource: 'branding' },
    { action: 'settings:manage', resource: 'settings' },
    
    // AI and data access
    { action: 'ai:call', resource: 'ai_models' },
    { action: 'ai:fine_tune', resource: 'ai_models' },
    { action: 'ai:export', resource: 'ai_models' },
    { action: 'write', resource: 'scenarios' },
    { action: 'read', resource: 'scenarios' },
    { action: 'write', resource: 'rates' },
    { action: 'read', resource: 'rates' },
    { action: 'write', resource: 'leads' },
    { action: 'read', resource: 'leads' },
    { action: 'write', resource: 'integrations' },
    { action: 'read', resource: 'integrations' },
    { action: 'write', resource: 'exports' },
    { action: 'read', resource: 'exports' }
  ],
  
  ADMIN: [
    // Organization management (limited)
    { action: 'write', resource: 'organization' },
    { action: 'read', resource: 'organization' },
    
    // User management
    { action: 'users:invite', resource: 'users' },
    { action: 'users:manage', resource: 'users' },
    { action: 'write', resource: 'users' },
    { action: 'read', resource: 'users' },
    
    // Billing (read-only)
    { action: 'billing:read', resource: 'billing' },
    
    // API key management
    { action: 'api:create', resource: 'api_keys' },
    { action: 'api:manage', resource: 'api_keys' },
    { action: 'api:delete', resource: 'api_keys' },
    
    // Webhook management
    { action: 'webhooks:create', resource: 'webhooks' },
    { action: 'webhooks:manage', resource: 'webhooks' },
    { action: 'webhooks:delete', resource: 'webhooks' },
    
    // Branding and settings
    { action: 'branding:manage', resource: 'branding' },
    { action: 'settings:manage', resource: 'settings' },
    
    // AI and data access
    { action: 'ai:call', resource: 'ai_models' },
    { action: 'ai:export', resource: 'ai_models' },
    { action: 'write', resource: 'scenarios' },
    { action: 'read', resource: 'scenarios' },
    { action: 'write', resource: 'rates' },
    { action: 'read', resource: 'rates' },
    { action: 'write', resource: 'leads' },
    { action: 'read', resource: 'leads' },
    { action: 'write', resource: 'integrations' },
    { action: 'read', resource: 'integrations' },
    { action: 'write', resource: 'exports' },
    { action: 'read', resource: 'exports' }
  ],
  
  ANALYST: [
    // Read-only organization access
    { action: 'read', resource: 'organization' },
    
    // Limited user access
    { action: 'read', resource: 'users' },
    
    // AI and data access
    { action: 'ai:call', resource: 'ai_models' },
    { action: 'ai:export', resource: 'ai_models' },
    { action: 'write', resource: 'scenarios' },
    { action: 'read', resource: 'scenarios' },
    { action: 'write', resource: 'rates' },
    { action: 'read', resource: 'rates' },
    { action: 'write', resource: 'leads' },
    { action: 'read', resource: 'leads' },
    { action: 'read', resource: 'integrations' },
    { action: 'write', resource: 'exports' },
    { action: 'read', resource: 'exports' }
  ],
  
  VIEWER: [
    // Read-only access
    { action: 'read', resource: 'organization' },
    { action: 'read', resource: 'users' },
    { action: 'read', resource: 'scenarios' },
    { action: 'read', resource: 'rates' },
    { action: 'read', resource: 'leads' },
    { action: 'read', resource: 'integrations' },
    { action: 'read', resource: 'exports' }
  ]
}

// Permission checking utilities
export class PermissionChecker {
  /**
   * Check if a user with a given role can perform an action on a resource
   */
  static can(role: UserRole, action: Action, resource: Resource): boolean {
    const permissions = ROLE_PERMISSIONS[role] || []
    return permissions.some(permission => 
      permission.action === action && permission.resource === resource
    )
  }

  /**
   * Check if a user can perform an action on a resource with conditions
   */
  static canWithConditions(
    role: UserRole, 
    action: Action, 
    resource: Resource, 
    conditions?: Record<string, any>
  ): boolean {
    const permissions = ROLE_PERMISSIONS[role] || []
    const matchingPermission = permissions.find(permission => 
      permission.action === action && permission.resource === resource
    )

    if (!matchingPermission) {
      return false
    }

    // Check conditions if they exist
    if (matchingPermission.conditions && conditions) {
      return Object.entries(matchingPermission.conditions).every(([key, value]) => 
        conditions[key] === value
      )
    }

    return true
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || []
  }

  /**
   * Check if a role has admin privileges
   */
  static isAdmin(role: UserRole): boolean {
    return role === 'OWNER' || role === 'ADMIN'
  }

  /**
   * Check if a role can manage users
   */
  static canManageUsers(role: UserRole): boolean {
    return this.can(role, 'users:manage', 'users')
  }

  /**
   * Check if a role can manage billing
   */
  static canManageBilling(role: UserRole): boolean {
    return this.can(role, 'billing:admin', 'billing') || this.can(role, 'billing:write', 'billing')
  }

  /**
   * Check if a role can access AI features
   */
  static canAccessAI(role: UserRole): boolean {
    return this.can(role, 'ai:call', 'ai_models')
  }

  /**
   * Check if a role can manage API keys
   */
  static canManageApiKeys(role: UserRole): boolean {
    return this.can(role, 'api:manage', 'api_keys')
  }

  /**
   * Check if a role can manage webhooks
   */
  static canManageWebhooks(role: UserRole): boolean {
    return this.can(role, 'webhooks:manage', 'webhooks')
  }

  /**
   * Check if a role can manage branding
   */
  static canManageBranding(role: UserRole): boolean {
    return this.can(role, 'branding:manage', 'branding')
  }

  /**
   * Check if a role can manage settings
   */
  static canManageSettings(role: UserRole): boolean {
    return this.can(role, 'settings:manage', 'settings')
  }
}

// Guard functions for use in components and API routes
export function requirePermission(
  role: UserRole, 
  action: Action, 
  resource: Resource,
  organizationId: string
): void {
  if (!PermissionChecker.can(role, action, resource)) {
    throw new PermissionError(
      `Insufficient permissions: ${role} cannot ${action} ${resource}`,
      action,
      resource,
      organizationId
    )
  }
}

export function requireAdmin(role: UserRole, organizationId: string): void {
  if (!PermissionChecker.isAdmin(role)) {
    throw new PermissionError(
      `Admin privileges required`,
      'admin',
      'organization',
      organizationId
    )
  }
}

export function requireUserManagement(role: UserRole, organizationId: string): void {
  if (!PermissionChecker.canManageUsers(role)) {
    throw new PermissionError(
      `User management privileges required`,
      'users:manage',
      'users',
      organizationId
    )
  }
}

export function requireBillingAccess(role: UserRole, organizationId: string): void {
  if (!PermissionChecker.canManageBilling(role)) {
    throw new PermissionError(
      `Billing access required`,
      'billing:read',
      'billing',
      organizationId
    )
  }
}

export function requireAIAccess(role: UserRole, organizationId: string): void {
  if (!PermissionChecker.canAccessAI(role)) {
    throw new PermissionError(
      `AI access required`,
      'ai:call',
      'ai_models',
      organizationId
    )
  }
}

// React hook for permission checking
export function usePermissions(role: UserRole) {
  return {
    can: (action: Action, resource: Resource) => PermissionChecker.can(role, action, resource),
    canWithConditions: (action: Action, resource: Resource, conditions?: Record<string, any>) => 
      PermissionChecker.canWithConditions(role, action, resource, conditions),
    isAdmin: () => PermissionChecker.isAdmin(role),
    canManageUsers: () => PermissionChecker.canManageUsers(role),
    canManageBilling: () => PermissionChecker.canManageBilling(role),
    canAccessAI: () => PermissionChecker.canAccessAI(role),
    canManageApiKeys: () => PermissionChecker.canManageApiKeys(role),
    canManageWebhooks: () => PermissionChecker.canManageWebhooks(role),
    canManageBranding: () => PermissionChecker.canManageBranding(role),
    canManageSettings: () => PermissionChecker.canManageSettings(role),
    getPermissions: () => PermissionChecker.getRolePermissions(role)
  }
}