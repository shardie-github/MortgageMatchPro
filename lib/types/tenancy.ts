// Multi-tenant core types and interfaces
export type OrganizationStatus = 'active' | 'suspended' | 'trial' | 'cancelled'
export type UserRole = 'OWNER' | 'ADMIN' | 'ANALYST' | 'VIEWER'
export type PlanType = 'free' | 'pro' | 'enterprise'

export interface Organization {
  id: string
  name: string
  slug: string
  status: OrganizationStatus
  plan: PlanType
  limits: OrganizationLimits
  branding?: OrganizationBranding
  settings: OrganizationSettings
  createdAt: string
  updatedAt: string
}

export interface OrganizationLimits {
  maxUsers: number
  maxAiCallsPerDay: number
  maxSavedScenarios: number
  maxIntegrations: number
  maxWebhooks: number
  maxApiKeys: number
  customDomain?: string
}

export interface OrganizationBranding {
  logo?: string
  favicon?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  customCss?: string
  heroText?: string
  legalDisclaimer?: string
  supportEmail?: string
  termsUrl?: string
  privacyUrl?: string
}

export interface OrganizationSettings {
  timezone: string
  currency: string
  locale: string
  features: Record<string, boolean>
  webhookUrl?: string
  webhookSecret?: string
  apiKeyRotationDays: number
  requireMfa: boolean
  allowApiAccess: boolean
}

export interface Membership {
  id: string
  userId: string
  organizationId: string
  role: UserRole
  status: 'active' | 'pending' | 'suspended'
  invitedBy?: string
  invitedAt?: string
  joinedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TenantContext {
  organizationId: string
  userId: string
  role: UserRole
  permissions: string[]
}

export interface ApiKey {
  id: string
  organizationId: string
  name: string
  keyHash: string
  keyPrefix: string
  permissions: string[]
  lastUsedAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface WebhookEvent {
  id: string
  organizationId: string
  eventType: string
  payload: Record<string, any>
  status: 'pending' | 'delivered' | 'failed' | 'retrying'
  attempts: number
  maxAttempts: number
  nextRetryAt?: string
  deliveredAt?: string
  errorMessage?: string
  createdAt: string
}

export interface UsageSnapshot {
  id: string
  organizationId: string
  date: string
  aiCalls: number
  aiTokens: number
  apiCalls: number
  webhookDeliveries: number
  exports: number
  storageUsed: number
  cost: number
  createdAt: string
}

export interface Plan {
  id: string
  name: string
  type: PlanType
  limits: OrganizationLimits
  pricing: {
    monthly: number
    yearly: number
    perAiCall?: number
    perToken?: number
    perUser?: number
  }
  features: string[]
  isActive: boolean
}

// RBAC/ABAC types
export type Action = 
  | 'read' | 'write' | 'delete' | 'admin'
  | 'ai:call' | 'ai:fine_tune' | 'ai:export'
  | 'billing:read' | 'billing:write' | 'billing:admin'
  | 'users:invite' | 'users:manage' | 'users:remove'
  | 'api:create' | 'api:manage' | 'api:delete'
  | 'webhooks:create' | 'webhooks:manage' | 'webhooks:delete'
  | 'branding:manage' | 'settings:manage'

export type Resource = 
  | 'organization' | 'users' | 'scenarios' | 'rates' | 'leads'
  | 'billing' | 'api_keys' | 'webhooks' | 'branding' | 'settings'
  | 'ai_models' | 'integrations' | 'exports'

export interface Permission {
  action: Action
  resource: Resource
  conditions?: Record<string, any>
}

// Tenant scoping utilities
export interface TenantScope {
  organizationId: string
  userId?: string
  role?: UserRole
}

export interface TenantFilter {
  organizationId: string
  userId?: string
  includeDeleted?: boolean
}

// Audit log types
export interface AuditLog {
  id: string
  organizationId: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  result: 'success' | 'failure'
  ip?: string
  userAgent?: string
  metadata?: Record<string, any>
  createdAt: string
}

// Error types
export class TenantError extends Error {
  constructor(
    message: string,
    public code: string,
    public organizationId?: string
  ) {
    super(message)
    this.name = 'TenantError'
  }
}

export class PermissionError extends Error {
  constructor(
    message: string,
    public action: Action,
    public resource: Resource,
    public organizationId: string
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}

export class QuotaExceededError extends Error {
  constructor(
    message: string,
    public quota: string,
    public current: number,
    public limit: number,
    public organizationId: string
  ) {
    super(message)
    this.name = 'QuotaExceededError'
  }
}