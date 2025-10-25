/**
 * Lender Integration Registry
 * v1.2.0 - Manages lender API adapters and integration status
 */

import { z } from 'zod'
import fs from 'fs'
import path from 'path'

// Integration status schema
export const IntegrationStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['api', 'feed', 'webhook']),
  status: z.enum(['active', 'inactive', 'maintenance', 'error']),
  lastChecked: z.string(),
  errorMessage: z.string().optional(),
  configuration: z.record(z.any()),
  capabilities: z.array(z.string()),
  rateLimit: z.object({
    requestsPerMinute: z.number(),
    requestsPerDay: z.number(),
    currentUsage: z.number().default(0)
  }),
  health: z.object({
    uptime: z.number().min(0).max(1),
    responseTime: z.number(),
    errorRate: z.number().min(0).max(1)
  })
})

export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>

// Integration registry schema
export const IntegrationRegistrySchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  integrations: z.array(IntegrationStatusSchema)
})

export type IntegrationRegistry = z.infer<typeof IntegrationRegistrySchema>

export class LenderIntegrationRegistry {
  private static instance: LenderIntegrationRegistry
  private registry: IntegrationRegistry
  private registryPath: string

  private constructor() {
    this.registryPath = path.join(__dirname, 'integrationRegistry.json')
    this.registry = this.loadRegistry()
  }

  static getInstance(): LenderIntegrationRegistry {
    if (!LenderIntegrationRegistry.instance) {
      LenderIntegrationRegistry.instance = new LenderIntegrationRegistry()
    }
    return LenderIntegrationRegistry.instance
  }

  /**
   * Get all integrations
   */
  getIntegrations(): IntegrationStatus[] {
    return this.registry.integrations
  }

  /**
   * Get active integrations
   */
  getActiveIntegrations(): IntegrationStatus[] {
    return this.registry.integrations.filter(integration => integration.status === 'active')
  }

  /**
   * Get integration by ID
   */
  getIntegration(id: string): IntegrationStatus | undefined {
    return this.registry.integrations.find(integration => integration.id === id)
  }

  /**
   * Register new integration
   */
  async registerIntegration(integration: Omit<IntegrationStatus, 'lastChecked' | 'health'>): Promise<void> {
    try {
      const newIntegration: IntegrationStatus = {
        ...integration,
        lastChecked: new Date().toISOString(),
        health: {
          uptime: 1.0,
          responseTime: 0,
          errorRate: 0
        }
      }

      // Check if integration already exists
      const existingIndex = this.registry.integrations.findIndex(i => i.id === integration.id)
      
      if (existingIndex >= 0) {
        this.registry.integrations[existingIndex] = newIntegration
      } else {
        this.registry.integrations.push(newIntegration)
      }

      await this.saveRegistry()
      console.log(`✅ Registered integration: ${integration.name}`)

    } catch (error) {
      console.error('Error registering integration:', error)
      throw error
    }
  }

  /**
   * Update integration status
   */
  async updateIntegrationStatus(
    id: string, 
    status: IntegrationStatus['status'],
    errorMessage?: string
  ): Promise<void> {
    try {
      const integration = this.getIntegration(id)
      if (!integration) {
        throw new Error(`Integration ${id} not found`)
      }

      integration.status = status
      integration.lastChecked = new Date().toISOString()
      
      if (errorMessage) {
        integration.errorMessage = errorMessage
      } else {
        delete integration.errorMessage
      }

      await this.saveRegistry()
      console.log(`✅ Updated integration ${id} status to ${status}`)

    } catch (error) {
      console.error('Error updating integration status:', error)
      throw error
    }
  }

  /**
   * Update integration health metrics
   */
  async updateIntegrationHealth(
    id: string,
    health: Partial<IntegrationStatus['health']>
  ): Promise<void> {
    try {
      const integration = this.getIntegration(id)
      if (!integration) {
        throw new Error(`Integration ${id} not found`)
      }

      integration.health = {
        ...integration.health,
        ...health
      }
      integration.lastChecked = new Date().toISOString()

      await this.saveRegistry()

    } catch (error) {
      console.error('Error updating integration health:', error)
      throw error
    }
  }

  /**
   * Check integration health
   */
  async checkIntegrationHealth(id: string): Promise<{
    isHealthy: boolean
    issues: string[]
    recommendations: string[]
  }> {
    try {
      const integration = this.getIntegration(id)
      if (!integration) {
        return {
          isHealthy: false,
          issues: [`Integration ${id} not found`],
          recommendations: ['Register the integration first']
        }
      }

      const issues: string[] = []
      const recommendations: string[] = []

      // Check status
      if (integration.status !== 'active') {
        issues.push(`Integration is ${integration.status}`)
        if (integration.status === 'error') {
          recommendations.push('Check error message and fix configuration')
        } else if (integration.status === 'maintenance') {
          recommendations.push('Wait for maintenance to complete')
        }
      }

      // Check health metrics
      if (integration.health.uptime < 0.95) {
        issues.push(`Uptime is ${(integration.health.uptime * 100).toFixed(1)}% (below 95%)`)
        recommendations.push('Investigate downtime causes')
      }

      if (integration.health.responseTime > 5000) {
        issues.push(`Response time is ${integration.health.responseTime}ms (above 5s)`)
        recommendations.push('Optimize API performance or check network')
      }

      if (integration.health.errorRate > 0.05) {
        issues.push(`Error rate is ${(integration.health.errorRate * 100).toFixed(1)}% (above 5%)`)
        recommendations.push('Investigate error causes and improve error handling')
      }

      // Check rate limits
      if (integration.rateLimit.currentUsage > integration.rateLimit.requestsPerMinute * 0.9) {
        issues.push('Approaching rate limit for requests per minute')
        recommendations.push('Implement rate limiting or request batching')
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        recommendations
      }

    } catch (error) {
      console.error('Error checking integration health:', error)
      return {
        isHealthy: false,
        issues: [`Health check failed: ${error.message}`],
        recommendations: ['Check integration configuration and try again']
      }
    }
  }

  /**
   * Get integrations by capability
   */
  getIntegrationsByCapability(capability: string): IntegrationStatus[] {
    return this.registry.integrations.filter(integration => 
      integration.capabilities.includes(capability)
    )
  }

  /**
   * Get integration statistics
   */
  getIntegrationStats(): {
    total: number
    active: number
    inactive: number
    maintenance: number
    error: number
    averageUptime: number
    averageResponseTime: number
    averageErrorRate: number
  } {
    const integrations = this.registry.integrations
    const total = integrations.length
    const active = integrations.filter(i => i.status === 'active').length
    const inactive = integrations.filter(i => i.status === 'inactive').length
    const maintenance = integrations.filter(i => i.status === 'maintenance').length
    const error = integrations.filter(i => i.status === 'error').length

    const averageUptime = integrations.reduce((sum, i) => sum + i.health.uptime, 0) / total
    const averageResponseTime = integrations.reduce((sum, i) => sum + i.health.responseTime, 0) / total
    const averageErrorRate = integrations.reduce((sum, i) => sum + i.health.errorRate, 0) / total

    return {
      total,
      active,
      inactive,
      maintenance,
      error,
      averageUptime,
      averageResponseTime,
      averageErrorRate
    }
  }

  /**
   * Export registry for external use
   */
  exportRegistry(): IntegrationRegistry {
    return { ...this.registry }
  }

  /**
   * Import registry from external source
   */
  async importRegistry(registry: IntegrationRegistry): Promise<void> {
    try {
      const validatedRegistry = IntegrationRegistrySchema.parse(registry)
      this.registry = validatedRegistry
      await this.saveRegistry()
      console.log('✅ Registry imported successfully')

    } catch (error) {
      console.error('Error importing registry:', error)
      throw error
    }
  }

  // Private helper methods

  private loadRegistry(): IntegrationRegistry {
    try {
      if (fs.existsSync(this.registryPath)) {
        const content = fs.readFileSync(this.registryPath, 'utf8')
        const parsed = JSON.parse(content)
        return IntegrationRegistrySchema.parse(parsed)
      }
    } catch (error) {
      console.warn('Error loading registry, using default:', error.message)
    }

    // Return default registry
    return {
      version: '1.2.0',
      lastUpdated: new Date().toISOString(),
      integrations: []
    }
  }

  private async saveRegistry(): Promise<void> {
    try {
      this.registry.lastUpdated = new Date().toISOString()
      const content = JSON.stringify(this.registry, null, 2)
      fs.writeFileSync(this.registryPath, content)
    } catch (error) {
      console.error('Error saving registry:', error)
      throw error
    }
  }
}

// Export singleton instance
export const lenderIntegrationRegistry = LenderIntegrationRegistry.getInstance()

// Convenience functions
export const getIntegrations = () => lenderIntegrationRegistry.getIntegrations()
export const getActiveIntegrations = () => lenderIntegrationRegistry.getActiveIntegrations()
export const getIntegration = (id: string) => lenderIntegrationRegistry.getIntegration(id)
export const registerIntegration = (integration: Omit<IntegrationStatus, 'lastChecked' | 'health'>) =>
  lenderIntegrationRegistry.registerIntegration(integration)
export const updateIntegrationStatus = (id: string, status: IntegrationStatus['status'], errorMessage?: string) =>
  lenderIntegrationRegistry.updateIntegrationStatus(id, status, errorMessage)
export const checkIntegrationHealth = (id: string) => lenderIntegrationRegistry.checkIntegrationHealth(id)
export const getIntegrationsByCapability = (capability: string) => lenderIntegrationRegistry.getIntegrationsByCapability(capability)
export const getIntegrationStats = () => lenderIntegrationRegistry.getIntegrationStats()