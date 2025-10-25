/**
 * Feature Flags System
 * v1.2.0 - Manages feature toggles and enterprise readiness
 */

import { z } from 'zod'

// Feature flag schemas
export const FeatureFlagSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100).default(100),
  targetUsers: z.array(z.string()).optional(),
  targetSegments: z.array(z.string()).optional(),
  conditions: z.record(z.any()).optional(),
  dependencies: z.array(z.string()).optional(),
  metadata: z.object({
    category: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    owner: z.string(),
    created: z.string(),
    updated: z.string(),
    version: z.string()
  })
})

export const FeatureToggleSchema = z.object({
  featureId: z.string(),
  userId: z.string(),
  enabled: z.boolean(),
  reason: z.string(),
  timestamp: z.string()
})

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>
export type FeatureToggle = z.infer<typeof FeatureToggleSchema>

export class FeatureFlagsService {
  private static instance: FeatureFlagsService
  private flags: Map<string, FeatureFlag> = new Map()
  private toggles: Map<string, FeatureToggle[]> = new Map()

  private constructor() {
    this.initializeDefaultFlags()
  }

  static getInstance(): FeatureFlagsService {
    if (!FeatureFlagsService.instance) {
      FeatureFlagsService.instance = new FeatureFlagsService()
    }
    return FeatureFlagsService.instance
  }

  /**
   * Check if a feature is enabled for a user
   */
  isFeatureEnabled(featureId: string, userId: string): boolean {
    try {
      const flag = this.flags.get(featureId)
      if (!flag) {
        console.warn(`Feature flag ${featureId} not found`)
        return false
      }

      // Check if feature is globally disabled
      if (!flag.enabled) {
        return false
      }

      // Check rollout percentage
      if (flag.rolloutPercentage < 100) {
        const userHash = this.hashUserId(userId)
        const userPercentage = userHash % 100
        if (userPercentage >= flag.rolloutPercentage) {
          return false
        }
      }

      // Check target users
      if (flag.targetUsers && flag.targetUsers.length > 0) {
        if (!flag.targetUsers.includes(userId)) {
          return false
        }
      }

      // Check target segments
      if (flag.targetSegments && flag.targetSegments.length > 0) {
        // In a real implementation, this would check user segments
        // For now, we'll assume all users are in the 'general' segment
        if (!flag.targetSegments.includes('general')) {
          return false
        }
      }

      // Check conditions
      if (flag.conditions) {
        if (!this.evaluateConditions(flag.conditions, userId)) {
          return false
        }
      }

      // Check dependencies
      if (flag.dependencies && flag.dependencies.length > 0) {
        for (const depId of flag.dependencies) {
          if (!this.isFeatureEnabled(depId, userId)) {
            return false
          }
        }
      }

      return true

    } catch (error) {
      console.error('Error checking feature flag:', error)
      return false
    }
  }

  /**
   * Get feature configuration for a user
   */
  getFeatureConfig(featureId: string, userId: string): Record<string, any> {
    try {
      const flag = this.flags.get(featureId)
      if (!flag) {
        return {}
      }

      if (!this.isFeatureEnabled(featureId, userId)) {
        return {}
      }

      return {
        enabled: true,
        rolloutPercentage: flag.rolloutPercentage,
        metadata: flag.metadata,
        conditions: flag.conditions
      }

    } catch (error) {
      console.error('Error getting feature config:', error)
      return {}
    }
  }

  /**
   * Get all enabled features for a user
   */
  getEnabledFeatures(userId: string): string[] {
    const enabledFeatures: string[] = []

    for (const [featureId] of this.flags) {
      if (this.isFeatureEnabled(featureId, userId)) {
        enabledFeatures.push(featureId)
      }
    }

    return enabledFeatures
  }

  /**
   * Create or update a feature flag
   */
  async createFeatureFlag(flag: Omit<FeatureFlag, 'metadata'> & {
    category: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    owner: string
  }): Promise<string> {
    try {
      const now = new Date().toISOString()
      const fullFlag: FeatureFlag = {
        ...flag,
        metadata: {
          category: flag.category,
          priority: flag.priority,
          owner: flag.owner,
          created: now,
          updated: now,
          version: '1.2.0'
        }
      }

      const validatedFlag = FeatureFlagSchema.parse(fullFlag)
      this.flags.set(flag.id, validatedFlag)

      console.log(`✅ Created feature flag: ${flag.name}`)
      return flag.id

    } catch (error) {
      console.error('Error creating feature flag:', error)
      throw error
    }
  }

  /**
   * Update feature flag
   */
  async updateFeatureFlag(
    featureId: string,
    updates: Partial<Omit<FeatureFlag, 'id' | 'metadata'>>
  ): Promise<void> {
    try {
      const flag = this.flags.get(featureId)
      if (!flag) {
        throw new Error(`Feature flag ${featureId} not found`)
      }

      const updatedFlag: FeatureFlag = {
        ...flag,
        ...updates,
        metadata: {
          ...flag.metadata,
          updated: new Date().toISOString()
        }
      }

      const validatedFlag = FeatureFlagSchema.parse(updatedFlag)
      this.flags.set(featureId, validatedFlag)

      console.log(`✅ Updated feature flag: ${featureId}`)

    } catch (error) {
      console.error('Error updating feature flag:', error)
      throw error
    }
  }

  /**
   * Toggle feature for a specific user
   */
  async toggleFeatureForUser(
    featureId: string,
    userId: string,
    enabled: boolean,
    reason: string
  ): Promise<void> {
    try {
      const toggle: FeatureToggle = {
        featureId,
        userId,
        enabled,
        reason,
        timestamp: new Date().toISOString()
      }

      if (!this.toggles.has(userId)) {
        this.toggles.set(userId, [])
      }

      this.toggles.get(userId)!.push(toggle)

      console.log(`🔄 Toggled feature ${featureId} for user ${userId}: ${enabled}`)

    } catch (error) {
      console.error('Error toggling feature for user:', error)
      throw error
    }
  }

  /**
   * Get feature flag status
   */
  getFeatureStatus(featureId: string): {
    exists: boolean
    enabled: boolean
    rolloutPercentage: number
    targetUsers: number
    targetSegments: string[]
    dependencies: string[]
    metadata: FeatureFlag['metadata'] | null
  } {
    const flag = this.flags.get(featureId)

    if (!flag) {
      return {
        exists: false,
        enabled: false,
        rolloutPercentage: 0,
        targetUsers: 0,
        targetSegments: [],
        dependencies: [],
        metadata: null
      }
    }

    return {
      exists: true,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      targetUsers: flag.targetUsers?.length || 0,
      targetSegments: flag.targetSegments || [],
      dependencies: flag.dependencies || [],
      metadata: flag.metadata
    }
  }

  /**
   * Get all feature flags
   */
  getAllFeatureFlags(): FeatureFlag[] {
    return Array.from(this.flags.values())
  }

  /**
   * Get feature flags by category
   */
  getFeatureFlagsByCategory(category: string): FeatureFlag[] {
    return Array.from(this.flags.values())
      .filter(flag => flag.metadata.category === category)
  }

  /**
   * Get feature usage statistics
   */
  getFeatureUsageStats(): {
    totalFlags: number
    enabledFlags: number
    disabledFlags: number
    byCategory: Record<string, number>
    byPriority: Record<string, number>
  } {
    const flags = Array.from(this.flags.values())
    const totalFlags = flags.length
    const enabledFlags = flags.filter(f => f.enabled).length
    const disabledFlags = totalFlags - enabledFlags

    const byCategory: Record<string, number> = {}
    const byPriority: Record<string, number> = {}

    flags.forEach(flag => {
      byCategory[flag.metadata.category] = (byCategory[flag.metadata.category] || 0) + 1
      byPriority[flag.metadata.priority] = (byPriority[flag.metadata.priority] || 0) + 1
    })

    return {
      totalFlags,
      enabledFlags,
      disabledFlags,
      byCategory,
      byPriority
    }
  }

  /**
   * Export feature flags configuration
   */
  exportConfiguration(): {
    version: string
    exportedAt: string
    flags: FeatureFlag[]
  } {
    return {
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      flags: Array.from(this.flags.values())
    }
  }

  /**
   * Import feature flags configuration
   */
  async importConfiguration(config: {
    version: string
    flags: FeatureFlag[]
  }): Promise<void> {
    try {
      for (const flag of config.flags) {
        const validatedFlag = FeatureFlagSchema.parse(flag)
        this.flags.set(flag.id, validatedFlag)
      }

      console.log(`✅ Imported ${config.flags.length} feature flags`)

    } catch (error) {
      console.error('Error importing configuration:', error)
      throw error
    }
  }

  // Private helper methods

  private initializeDefaultFlags(): void {
    const defaultFlags: Array<Omit<FeatureFlag, 'metadata'> & {
      category: string
      priority: 'low' | 'medium' | 'high' | 'critical'
      owner: string
    }> = [
      {
        id: 'personalization',
        name: 'Personalization Engine',
        description: 'Enable AI-powered personalization features',
        enabled: true,
        rolloutPercentage: 100,
        category: 'ai',
        priority: 'high',
        owner: 'ai-team'
      },
      {
        id: 'crm_export',
        name: 'CRM Export',
        description: 'Enable lead export to CRM systems',
        enabled: true,
        rolloutPercentage: 100,
        category: 'integrations',
        priority: 'medium',
        owner: 'integrations-team'
      },
      {
        id: 'fine_tune',
        name: 'Fine-Tuning',
        description: 'Enable AI model fine-tuning capabilities',
        enabled: false,
        rolloutPercentage: 0,
        category: 'ai',
        priority: 'high',
        owner: 'ai-team'
      },
      {
        id: 'regional_rates',
        name: 'Regional Rates',
        description: 'Enable regional rate feeds and benchmarks',
        enabled: true,
        rolloutPercentage: 100,
        category: 'data',
        priority: 'medium',
        owner: 'data-team'
      },
      {
        id: 'explainability',
        name: 'AI Explainability',
        description: 'Enable detailed AI explanations and reasoning',
        enabled: true,
        rolloutPercentage: 100,
        category: 'ai',
        priority: 'high',
        owner: 'ai-team'
      },
      {
        id: 'confidence_indicators',
        name: 'Confidence Indicators',
        description: 'Show confidence levels and trust indicators',
        enabled: true,
        rolloutPercentage: 100,
        category: 'ui',
        priority: 'medium',
        owner: 'ui-team'
      },
      {
        id: 'developer_playground',
        name: 'Developer Playground',
        description: 'Enable developer testing and experimentation tools',
        enabled: false,
        rolloutPercentage: 0,
        category: 'developer',
        priority: 'low',
        owner: 'dev-team'
      },
      {
        id: 'advanced_analytics',
        name: 'Advanced Analytics',
        description: 'Enable advanced analytics and reporting features',
        enabled: true,
        rolloutPercentage: 50,
        category: 'analytics',
        priority: 'medium',
        owner: 'analytics-team'
      }
    ]

    defaultFlags.forEach(flag => {
      this.createFeatureFlag(flag)
    })
  }

  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  private evaluateConditions(conditions: Record<string, any>, userId: string): boolean {
    // In a real implementation, this would evaluate complex conditions
    // For now, we'll do simple checks
    return true
  }
}

// Export singleton instance
export const featureFlagsService = FeatureFlagsService.getInstance()

// Convenience functions
export const isFeatureEnabled = (featureId: string, userId: string) =>
  featureFlagsService.isFeatureEnabled(featureId, userId)

export const getFeatureConfig = (featureId: string, userId: string) =>
  featureFlagsService.getFeatureConfig(featureId, userId)

export const getEnabledFeatures = (userId: string) =>
  featureFlagsService.getEnabledFeatures(userId)

export const createFeatureFlag = (flag: Parameters<typeof featureFlagsService.createFeatureFlag>[0]) =>
  featureFlagsService.createFeatureFlag(flag)

export const updateFeatureFlag = (featureId: string, updates: Parameters<typeof featureFlagsService.updateFeatureFlag>[1]) =>
  featureFlagsService.updateFeatureFlag(featureId, updates)

export const toggleFeatureForUser = (
  featureId: string,
  userId: string,
  enabled: boolean,
  reason: string
) => featureFlagsService.toggleFeatureForUser(featureId, userId, enabled, reason)

export const getFeatureStatus = (featureId: string) =>
  featureFlagsService.getFeatureStatus(featureId)

export const getAllFeatureFlags = () =>
  featureFlagsService.getAllFeatureFlags()

export const getFeatureUsageStats = () =>
  featureFlagsService.getFeatureUsageStats()