/**
 * Post-Launch Integration System
 * Main entry point for all post-launch growth, intelligence, and monetization features
 */

import { initFeedbackSystem, getFeedbackSystem } from './feedback-system'
import { initABTesting, getABTesting, createMortgageExperiments } from './experimentation/ab-testing'
import { initMonetization, getMonetization } from './monetization'
import { initPerformanceMonitor, getPerformanceMonitor } from './performance-monitoring'
import { initHealthCheck, getHealthCheck } from './health-check'

export interface PostLaunchConfig {
  analytics: {
    provider: 'posthog' | 'plausible' | 'custom'
    apiKey?: string
    host?: string
  }
  feedback: {
    webhookUrl?: string
  }
  monetization: {
    stripeKey?: string
    webhookSecret?: string
  }
  performance: {
    dailyBudget: number
    monthlyBudget: number
  }
  health: {
    enableAutoRecovery: boolean
  }
}

class PostLaunchSystem {
  private config: PostLaunchConfig
  private initialized: boolean = false

  constructor(config: PostLaunchConfig) {
    this.config = config
  }

  // Initialize all systems
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Post-launch system already initialized')
      return
    }

    console.log('Initializing post-launch growth, intelligence, and monetization systems...')

    try {
      // Initialize feedback system
      initFeedbackSystem(this.config.feedback.webhookUrl)
      console.log('✓ Feedback system initialized')

      // Initialize A/B testing
      initABTesting()
      createMortgageExperiments()
      console.log('✓ A/B testing framework initialized')

      // Initialize monetization
      initMonetization()
      console.log('✓ Monetization system initialized')

      // Initialize performance monitoring
      initPerformanceMonitor()
      getPerformanceMonitor().setBudget('daily', this.config.performance.dailyBudget)
      getPerformanceMonitor().setBudget('monthly', this.config.performance.monthlyBudget)
      console.log('✓ Performance monitoring initialized')

      // Initialize health checks
      initHealthCheck()
      console.log('✓ Health check system initialized')

      this.initialized = true
      console.log('🎉 Post-launch system fully initialized!')
    } catch (error) {
      console.error('Failed to initialize post-launch system:', error)
      throw error
    }
  }

  // Get system status
  getSystemStatus(): {
    initialized: boolean
    systems: {
      feedback: boolean
      abTesting: boolean
      monetization: boolean
      performance: boolean
      health: boolean
    }
  } {
    return {
      initialized: this.initialized,
      systems: {
        feedback: this.initialized,
        abTesting: this.initialized,
        monetization: this.initialized,
        performance: this.initialized,
        health: this.initialized,
      },
    }
  }

  // Convenience methods for common operations
  async trackUserEvent(userId: string, event: string, properties?: Record<string, any>): Promise<void> {
    if (!this.initialized) {
      console.warn('Post-launch system not initialized')
      return
    }

    // Track with analytics (would integrate with metrics system)
    console.log(`Tracking event: ${event} for user ${userId}`, properties)

    // Track with performance monitoring
    getPerformanceMonitor().trackPerformance(
      `/api/events/${event}`,
      'POST',
      Date.now(),
      200,
      userId
    )
  }

  async trackAIQuery(userId: string, queryType: string, success: boolean, responseTime: number, error?: string): Promise<void> {
    if (!this.initialized) {
      console.warn('Post-launch system not initialized')
      return
    }

    // Track with performance monitoring
    getPerformanceMonitor().trackOpenAIUsage(
      userId,
      'gpt-4',
      100, // prompt tokens
      200, // completion tokens
      responseTime,
      error
    )

    // Track with A/B testing
    getABTesting().trackExperimentResult(
      userId,
      'prompt-style-experiment',
      {
        success: success ? 1 : 0,
        responseTime,
        queryType: queryType === 'mortgage' ? 1 : 0,
      }
    )
  }

  async collectFeedback(userId: string, type: 'recommendation' | 'feature' | 'bug' | 'general', sentiment: 'positive' | 'negative' | 'neutral', rating: number, comment?: string): Promise<string> {
    if (!this.initialized) {
      console.warn('Post-launch system not initialized')
      return ''
    }

    return getFeedbackSystem().submitFeedback(
      userId,
      type,
      sentiment,
      rating,
      comment
    )
  }

  async checkFeatureAccess(userId: string, featureId: string): Promise<boolean> {
    if (!this.initialized) {
      console.warn('Post-launch system not initialized')
      return false
    }

    return getMonetization().hasFeatureAccess(userId, featureId)
  }

  async getFeatureConfig(userId: string, featureName: string): Promise<Record<string, any>> {
    if (!this.initialized) {
      console.warn('Post-launch system not initialized')
      return {}
    }

    return getABTesting().getFeatureConfig(userId, featureName)
  }

  // Daily operations
  async generateDailyReport(): Promise<{
    date: string
    feedback: any
    experiments: any
    performance: any
    health: any
  }> {
    if (!this.initialized) {
      console.warn('Post-launch system not initialized')
      return {
        date: new Date().toISOString(),
        feedback: null,
        experiments: null,
        performance: null,
        health: null,
      }
    }

    const feedbackInsights = getFeedbackSystem().getFeedbackInsights()
    const performanceDigest = getPerformanceMonitor().generateDailyDigest()
    const healthStatus = await getHealthCheck().getHealthStatus()

    return {
      date: new Date().toISOString(),
      feedback: feedbackInsights,
      experiments: {
        activeExperiments: getABTesting().listExperiments('running').length,
        totalExperiments: getABTesting().listExperiments().length,
      },
      performance: performanceDigest,
      health: {
        status: healthStatus.status,
        uptime: healthStatus.uptime,
        errorRate: healthStatus.metrics.errorRate,
      },
    }
  }

  // System maintenance
  async performMaintenance(): Promise<void> {
    if (!this.initialized) {
      console.warn('Post-launch system not initialized')
      return
    }

    console.log('Performing system maintenance...')

    try {
      // Check health and attempt recovery if needed
      const healthStatus = await getHealthCheck().getHealthStatus()
      if (healthStatus.status === 'unhealthy') {
        console.log('System unhealthy, attempting recovery...')
        await getHealthCheck().attemptRecovery()
      }

      // Generate daily report
      const report = await this.generateDailyReport()
      console.log('Daily report generated:', report)

      console.log('System maintenance completed')
    } catch (error) {
      console.error('Maintenance failed:', error)
    }
  }
}

// Global post-launch system instance
let postLaunchInstance: PostLaunchSystem | null = null

export const initPostLaunchSystem = (config: PostLaunchConfig): PostLaunchSystem => {
  if (!postLaunchInstance) {
    postLaunchInstance = new PostLaunchSystem(config)
  }
  return postLaunchInstance
}

export const getPostLaunchSystem = (): PostLaunchSystem => {
  if (!postLaunchInstance) {
    throw new Error('Post-launch system not initialized. Call initPostLaunchSystem() first.')
  }
  return postLaunchInstance
}

// Default configuration
export const defaultPostLaunchConfig: PostLaunchConfig = {
  analytics: {
    provider: 'posthog',
    apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  feedback: {
    webhookUrl: process.env.SUPPORT_WEBHOOK_URL,
  },
  monetization: {
    stripeKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  performance: {
    dailyBudget: 50,
    monthlyBudget: 1000,
  },
  health: {
    enableAutoRecovery: true,
  },
}

// Convenience functions
export const trackUserEvent = async (userId: string, event: string, properties?: Record<string, any>): Promise<void> => {
  return getPostLaunchSystem().trackUserEvent(userId, event, properties)
}

export const trackAIQuery = async (userId: string, queryType: string, success: boolean, responseTime: number, error?: string): Promise<void> => {
  return getPostLaunchSystem().trackAIQuery(userId, queryType, success, responseTime, error)
}

export const collectFeedback = async (userId: string, type: 'recommendation' | 'feature' | 'bug' | 'general', sentiment: 'positive' | 'negative' | 'neutral', rating: number, comment?: string): Promise<string> => {
  return getPostLaunchSystem().collectFeedback(userId, type, sentiment, rating, comment)
}

export const checkFeatureAccess = async (userId: string, featureId: string): Promise<boolean> => {
  return getPostLaunchSystem().checkFeatureAccess(userId, featureId)
}

export const getFeatureConfig = async (userId: string, featureName: string): Promise<Record<string, any>> => {
  return getPostLaunchSystem().getFeatureConfig(userId, featureName)
}

export const generateDailyReport = async () => {
  return getPostLaunchSystem().generateDailyReport()
}

export const performMaintenance = async () => {
  return getPostLaunchSystem().performMaintenance()
}

export default PostLaunchSystem
