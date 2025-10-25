import { createContext, useContext, ReactNode } from 'react'
import { TenantContext, Organization, Membership, UserRole } from '../types/tenancy'

interface TenantContextValue {
  context: TenantContext | null
  organization: Organization | null
  membership: Membership | null
  isLoading: boolean
  error: string | null
  refreshContext: () => Promise<void>
}

const TenantContextProvider = createContext<TenantContextValue | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  // This would be implemented with actual state management
  // For now, returning a placeholder
  const value: TenantContextValue = {
    context: null,
    organization: null,
    membership: null,
    isLoading: false,
    error: null,
    refreshContext: async () => {}
  }

  return (
    <TenantContextProvider.Provider value={value}>
      {children}
    </TenantContextProvider.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContextProvider)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

// Tenant context utilities
export class TenantContextManager {
  private static instance: TenantContextManager
  private currentContext: TenantContext | null = null

  static getInstance(): TenantContextManager {
    if (!TenantContextManager.instance) {
      TenantContextManager.instance = new TenantContextManager()
    }
    return TenantContextManager.instance
  }

  setContext(context: TenantContext) {
    this.currentContext = context
  }

  getContext(): TenantContext | null {
    return this.currentContext
  }

  clearContext() {
    this.currentContext = null
  }

  // Helper to get organization ID from context
  getOrganizationId(): string {
    if (!this.currentContext) {
      throw new Error('No tenant context available')
    }
    return this.currentContext.organizationId
  }

  // Helper to get user ID from context
  getUserId(): string {
    if (!this.currentContext) {
      throw new Error('No tenant context available')
    }
    return this.currentContext.userId
  }

  // Helper to get user role from context
  getUserRole(): UserRole {
    if (!this.currentContext) {
      throw new Error('No tenant context available')
    }
    return this.currentContext.role
  }

  // Helper to check if user has specific permission
  hasPermission(action: string, resource: string): boolean {
    if (!this.currentContext) {
      return false
    }
    return this.currentContext.permissions.includes(`${action}:${resource}`)
  }
}

// React hook for tenant context
export function useTenantContext() {
  const manager = TenantContextManager.getInstance()
  return {
    context: manager.getContext(),
    organizationId: manager.getOrganizationId(),
    userId: manager.getUserId(),
    userRole: manager.getUserRole(),
    hasPermission: manager.hasPermission.bind(manager)
  }
}