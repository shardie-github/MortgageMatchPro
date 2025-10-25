/**
 * A/B Testing & Experimentation Framework
 * Handles feature flags, user bucketing, and experiment tracking
 */

export interface Experiment {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'paused' | 'completed'
  startDate: string
  endDate?: string
  variants: ExperimentVariant[]
  metrics: string[]
  targetAudience?: TargetAudience
  createdAt: string
  updatedAt: string
}

export interface ExperimentVariant {
  id: string
  name: string
  description: string
  weight: number // 0-1, sum should equal 1
  config: Record<string, any>
  isControl: boolean
}

export interface TargetAudience {
  userIds?: string[]
  userSegments?: string[]
  conditions?: Record<string, any>
}

export interface ExperimentResult {
  experimentId: string
  variantId: string
  userId: string
  timestamp: string
  metrics: Record<string, number>
  context?: Record<string, any>
}

export interface ExperimentSummary {
  experimentId: string
  totalUsers: number
  variantResults: Array<{
    variantId: string
    users: number
    metrics: Record<string, { mean: number; count: number }>
    conversionRate: number
  }>
  statisticalSignificance: number
  winner?: string
  confidence: number
}

class ABTestingFramework {
  private experiments: Map<string, Experiment> = new Map()
  private userAssignments: Map<string, Map<string, string>> = new Map() // userId -> experimentId -> variantId
  private experimentResults: ExperimentResult[] = []
  private randomSeed: number = Math.random()

  // Experiment management
  createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateId()
    const now = new Date().toISOString()
    
    const fullExperiment: Experiment = {
      ...experiment,
      id,
      createdAt: now,
      updatedAt: now,
    }

    this.experiments.set(id, fullExperiment)
    return id
  }

  updateExperiment(experimentId: string, updates: Partial<Experiment>): void {
    const experiment = this.experiments.get(experimentId)
    if (!experiment) throw new Error(`Experiment ${experimentId} not found`)

    const updatedExperiment = {
      ...experiment,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    this.experiments.set(experimentId, updatedExperiment)
  }

  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId)
  }

  listExperiments(status?: Experiment['status']): Experiment[] {
    const experiments = Array.from(this.experiments.values())
    return status ? experiments.filter(exp => exp.status === status) : experiments
  }

  // User assignment and bucketing
  assignUserToVariant(userId: string, experimentId: string): string | null {
    const experiment = this.experiments.get(experimentId)
    if (!experiment || experiment.status !== 'running') return null

    // Check if user is already assigned
    const userAssignments = this.userAssignments.get(userId) || new Map()
    if (userAssignments.has(experimentId)) {
      return userAssignments.get(experimentId)!
    }

    // Check target audience
    if (!this.isUserInTargetAudience(userId, experiment.targetAudience)) {
      return null
    }

    // Assign to variant based on weight
    const variantId = this.selectVariant(experiment.variants, userId)
    
    // Store assignment
    userAssignments.set(experimentId, variantId)
    this.userAssignments.set(userId, userAssignments)

    return variantId
  }

  getUserVariant(userId: string, experimentId: string): string | null {
    const userAssignments = this.userAssignments.get(userId)
    return userAssignments?.get(experimentId) || null
  }

  // Feature flag system
  isFeatureEnabled(userId: string, featureName: string): boolean {
    // Check if there's an active experiment for this feature
    const activeExperiments = this.listExperiments('running')
    const featureExperiment = activeExperiments.find(exp => 
      exp.name.toLowerCase().includes(featureName.toLowerCase())
    )

    if (!featureExperiment) {
      // No experiment, check global feature flags
      return this.getGlobalFeatureFlag(featureName)
    }

    const variantId = this.getUserVariant(userId, featureExperiment.id)
    if (!variantId) return false

    const variant = featureExperiment.variants.find(v => v.id === variantId)
    return variant?.config.enabled === true
  }

  getFeatureConfig(userId: string, featureName: string): Record<string, any> {
    const activeExperiments = this.listExperiments('running')
    const featureExperiment = activeExperiments.find(exp => 
      exp.name.toLowerCase().includes(featureName.toLowerCase())
    )

    if (!featureExperiment) {
      return this.getGlobalFeatureConfig(featureName)
    }

    const variantId = this.getUserVariant(userId, featureExperiment.id)
    if (!variantId) return {}

    const variant = featureExperiment.variants.find(v => v.id === variantId)
    return variant?.config || {}
  }

  // Results tracking
  trackExperimentResult(
    userId: string,
    experimentId: string,
    metrics: Record<string, number>,
    context?: Record<string, any>
  ): void {
    const variantId = this.getUserVariant(userId, experimentId)
    if (!variantId) return

    const result: ExperimentResult = {
      experimentId,
      variantId,
      userId,
      timestamp: new Date().toISOString(),
      metrics,
      context,
    }

    this.experimentResults.push(result)
  }

  // Analytics and reporting
  getExperimentSummary(experimentId: string): ExperimentSummary | null {
    const experiment = this.experiments.get(experimentId)
    if (!experiment) return null

    const results = this.experimentResults.filter(r => r.experimentId === experimentId)
    const totalUsers = new Set(results.map(r => r.userId)).size

    const variantResults = experiment.variants.map(variant => {
      const variantResults = results.filter(r => r.variantId === variant.id)
      const users = new Set(variantResults.map(r => r.userId)).size

      // Calculate metrics
      const metrics: Record<string, { mean: number; count: number }> = {}
      experiment.metrics.forEach(metric => {
        const values = variantResults.map(r => r.metrics[metric] || 0)
        const mean = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
        metrics[metric] = { mean, count: values.length }
      })

      // Calculate conversion rate (assuming first metric is conversion)
      const conversionRate = experiment.metrics.length > 0 
        ? metrics[experiment.metrics[0]]?.mean || 0 
        : 0

      return {
        variantId: variant.id,
        users,
        metrics,
        conversionRate,
      }
    })

    // Calculate statistical significance (simplified)
    const statisticalSignificance = this.calculateStatisticalSignificance(variantResults)
    const winner = this.determineWinner(variantResults)
    const confidence = statisticalSignificance > 0.95 ? 0.95 : statisticalSignificance

    return {
      experimentId,
      totalUsers,
      variantResults,
      statisticalSignificance,
      winner,
      confidence,
    }
  }

  // Utility methods
  private selectVariant(variants: ExperimentVariant[], userId: string): string {
    // Use deterministic hashing for consistent assignment
    const hash = this.hashString(userId + this.randomSeed)
    const random = hash % 10000 / 10000

    let cumulativeWeight = 0
    for (const variant of variants) {
      cumulativeWeight += variant.weight
      if (random <= cumulativeWeight) {
        return variant.id
      }
    }

    // Fallback to last variant
    return variants[variants.length - 1].id
  }

  private isUserInTargetAudience(userId: string, audience?: TargetAudience): boolean {
    if (!audience) return true

    if (audience.userIds && !audience.userIds.includes(userId)) {
      return false
    }

    // Add more audience filtering logic here
    return true
  }

  private calculateStatisticalSignificance(variantResults: any[]): number {
    // Simplified statistical significance calculation
    // In a real implementation, you'd use proper statistical tests
    if (variantResults.length < 2) return 0

    const control = variantResults.find(v => v.isControl)
    const treatment = variantResults.find(v => !v.isControl)

    if (!control || !treatment) return 0

    const controlRate = control.conversionRate
    const treatmentRate = treatment.conversionRate
    const controlUsers = control.users
    const treatmentUsers = treatment.users

    if (controlUsers < 30 || treatmentUsers < 30) return 0

    // Simplified z-test
    const pooledRate = (controlRate * controlUsers + treatmentRate * treatmentUsers) / (controlUsers + treatmentUsers)
    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlUsers + 1/treatmentUsers))
    const z = Math.abs(treatmentRate - controlRate) / se

    // Convert z-score to p-value (simplified)
    return z > 1.96 ? 0.95 : z > 1.645 ? 0.90 : 0.80
  }

  private determineWinner(variantResults: any[]): string | undefined {
    if (variantResults.length < 2) return undefined

    const sorted = variantResults.sort((a, b) => b.conversionRate - a.conversionRate)
    const best = sorted[0]
    const second = sorted[1]

    // Only declare winner if there's a meaningful difference
    const improvement = (best.conversionRate - second.conversionRate) / second.conversionRate
    return improvement > 0.05 ? best.variantId : undefined
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private getGlobalFeatureFlag(featureName: string): boolean {
    // Check environment variables or config
    return process.env[`FEATURE_${featureName.toUpperCase()}`] === 'true'
  }

  private getGlobalFeatureConfig(featureName: string): Record<string, any> {
    // Return global feature configuration
    return {}
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }
}

// Global AB testing instance
let abTestingInstance: ABTestingFramework | null = null

export const initABTesting = (): ABTestingFramework => {
  if (!abTestingInstance) {
    abTestingInstance = new ABTestingFramework()
  }
  return abTestingInstance
}

export const getABTesting = (): ABTestingFramework => {
  if (!abTestingInstance) {
    throw new Error('AB Testing not initialized. Call initABTesting() first.')
  }
  return abTestingInstance
}

// Convenience functions
export const createExperiment = (experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): string => {
  return getABTesting().createExperiment(experiment)
}

export const assignUserToVariant = (userId: string, experimentId: string): string | null => {
  return getABTesting().assignUserToVariant(userId, experimentId)
}

export const isFeatureEnabled = (userId: string, featureName: string): boolean => {
  return getABTesting().isFeatureEnabled(userId, featureName)
}

export const getFeatureConfig = (userId: string, featureName: string): Record<string, any> => {
  return getABTesting().getFeatureConfig(userId, featureName)
}

export const trackExperimentResult = (
  userId: string,
  experimentId: string,
  metrics: Record<string, number>,
  context?: Record<string, any>
): void => {
  getABTesting().trackExperimentResult(userId, experimentId, metrics, context)
}

export const getExperimentSummary = (experimentId: string): ExperimentSummary | null => {
  return getABTesting().getExperimentSummary(experimentId)
}

// Predefined experiments for MortgageMatchPro
export const createMortgageExperiments = (): void => {
  const abTesting = getABTesting()

  // Prompt style experiment
  abTesting.createExperiment({
    name: 'Prompt Style Experiment',
    description: 'Test different AI prompt styles for mortgage recommendations',
    status: 'running',
    startDate: new Date().toISOString(),
    variants: [
      {
        id: 'concise',
        name: 'Concise Style',
        description: 'Short, direct recommendations',
        weight: 0.5,
        config: { style: 'concise', maxLength: 100 },
        isControl: true,
      },
      {
        id: 'verbose',
        name: 'Verbose Style',
        description: 'Detailed, explanatory recommendations',
        weight: 0.5,
        config: { style: 'verbose', maxLength: 300 },
        isControl: false,
      },
    ],
    metrics: ['conversion_rate', 'satisfaction_score', 'completion_time'],
  })

  // UI explanation density experiment
  abTesting.createExperiment({
    name: 'UI Explanation Density',
    description: 'Test different levels of explanation in the UI',
    status: 'running',
    startDate: new Date().toISOString(),
    variants: [
      {
        id: 'minimal',
        name: 'Minimal Explanations',
        description: 'Basic explanations only',
        weight: 0.33,
        config: { explanationLevel: 'minimal' },
        isControl: true,
      },
      {
        id: 'standard',
        name: 'Standard Explanations',
        description: 'Moderate level of explanations',
        weight: 0.33,
        config: { explanationLevel: 'standard' },
        isControl: false,
      },
      {
        id: 'detailed',
        name: 'Detailed Explanations',
        description: 'Comprehensive explanations',
        weight: 0.34,
        config: { explanationLevel: 'detailed' },
        isControl: false,
      },
    ],
    metrics: ['engagement_time', 'helpfulness_rating', 'bounce_rate'],
  })

  // Result ordering experiment
  abTesting.createExperiment({
    name: 'Result Ordering',
    description: 'Test different ways to order mortgage results',
    status: 'running',
    startDate: new Date().toISOString(),
    variants: [
      {
        id: 'rate_asc',
        name: 'Rate Ascending',
        description: 'Order by interest rate (lowest first)',
        weight: 0.5,
        config: { sortBy: 'rate', order: 'asc' },
        isControl: true,
      },
      {
        id: 'total_cost',
        name: 'Total Cost',
        description: 'Order by total cost of loan',
        weight: 0.5,
        config: { sortBy: 'totalCost', order: 'asc' },
        isControl: false,
      },
    ],
    metrics: ['click_through_rate', 'conversion_rate', 'time_to_decision'],
  })
}

export default ABTestingFramework
