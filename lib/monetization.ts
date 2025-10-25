/**
 * Monetization & Billing System
 * Handles tiering, billing, and upgrade logic
 */

export interface UserTier {
  id: string
  name: string
  displayName: string
  description: string
  price: number
  currency: string
  billingCycle: 'monthly' | 'yearly'
  features: TierFeature[]
  limits: TierLimits
  isPopular?: boolean
  isEnterprise?: boolean
}

export interface TierFeature {
  id: string
  name: string
  description: string
  enabled: boolean
  limit?: number
  unlimited?: boolean
}

export interface TierLimits {
  monthlyQueries: number
  maxScenarios: number
  maxDocuments: number
  apiCalls: number
  storageGB: number
  supportLevel: 'basic' | 'priority' | 'dedicated'
  customIntegrations: boolean
  whiteLabeling: boolean
}

export interface Subscription {
  id: string
  userId: string
  tierId: string
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string
  createdAt: string
  updatedAt: string
}

export interface BillingEvent {
  id: string
  userId: string
  type: 'subscription_created' | 'subscription_updated' | 'payment_succeeded' | 'payment_failed' | 'subscription_cancelled'
  amount?: number
  currency?: string
  description: string
  metadata?: Record<string, any>
  timestamp: string
}

export interface ReferralProgram {
  id: string
  referrerId: string
  referredId: string
  status: 'pending' | 'completed' | 'expired'
  rewardAmount: number
  rewardType: 'credit' | 'discount' | 'feature'
  createdAt: string
  completedAt?: string
}

class MonetizationSystem {
  private userTiers: Map<string, UserTier> = new Map()
  private subscriptions: Map<string, Subscription> = new Map()
  private billingEvents: BillingEvent[] = []
  private referrals: ReferralProgram[] = []
  private billingService: BillingService

  constructor() {
    this.billingService = new BillingService()
    this.initializeTiers()
  }

  // Tier management
  initializeTiers(): void {
    const tiers: UserTier[] = [
      {
        id: 'free',
        name: 'free',
        displayName: 'Free',
        description: 'Perfect for getting started with mortgage planning',
        price: 0,
        currency: 'USD',
        billingCycle: 'monthly',
        features: [
          { id: 'basic_calculator', name: 'Basic Calculator', description: 'Affordability and rate calculations', enabled: true },
          { id: 'basic_scenarios', name: '3 Scenarios', description: 'Save up to 3 mortgage scenarios', enabled: true, limit: 3 },
          { id: 'community_support', name: 'Community Support', description: 'Access to community forums', enabled: true },
        ],
        limits: {
          monthlyQueries: 10,
          maxScenarios: 3,
          maxDocuments: 5,
          apiCalls: 100,
          storageGB: 1,
          supportLevel: 'basic',
          customIntegrations: false,
          whiteLabeling: false,
        },
      },
      {
        id: 'pro',
        name: 'pro',
        displayName: 'Pro',
        description: 'Advanced features for serious homebuyers',
        price: 29.99,
        currency: 'USD',
        billingCycle: 'monthly',
        isPopular: true,
        features: [
          { id: 'advanced_calculator', name: 'Advanced Calculator', description: 'All calculator features plus refinancing', enabled: true },
          { id: 'unlimited_scenarios', name: 'Unlimited Scenarios', description: 'Save unlimited mortgage scenarios', enabled: true, unlimited: true },
          { id: 'document_upload', name: 'Document Upload', description: 'Upload and analyze mortgage documents', enabled: true },
          { id: 'priority_support', name: 'Priority Support', description: 'Faster response times', enabled: true },
          { id: 'export_reports', name: 'Export Reports', description: 'PDF and CSV export', enabled: true },
        ],
        limits: {
          monthlyQueries: 100,
          maxScenarios: -1, // unlimited
          maxDocuments: 50,
          apiCalls: 1000,
          storageGB: 10,
          supportLevel: 'priority',
          customIntegrations: false,
          whiteLabeling: false,
        },
      },
      {
        id: 'enterprise',
        name: 'enterprise',
        displayName: 'Enterprise',
        description: 'Full-featured solution for brokers and teams',
        price: 99.99,
        currency: 'USD',
        billingCycle: 'monthly',
        isEnterprise: true,
        features: [
          { id: 'all_features', name: 'All Features', description: 'Access to all Pro features', enabled: true },
          { id: 'white_labeling', name: 'White Labeling', description: 'Custom branding and domain', enabled: true },
          { id: 'custom_integrations', name: 'Custom Integrations', description: 'API access and custom integrations', enabled: true },
          { id: 'dedicated_support', name: 'Dedicated Support', description: 'Dedicated account manager', enabled: true },
          { id: 'team_management', name: 'Team Management', description: 'Manage multiple users and permissions', enabled: true },
        ],
        limits: {
          monthlyQueries: -1, // unlimited
          maxScenarios: -1,
          maxDocuments: -1,
          apiCalls: -1,
          storageGB: 100,
          supportLevel: 'dedicated',
          customIntegrations: true,
          whiteLabeling: true,
        },
      },
    ]

    tiers.forEach(tier => {
      this.userTiers.set(tier.id, tier)
    })
  }

  getTiers(): UserTier[] {
    return Array.from(this.userTiers.values())
  }

  getTier(tierId: string): UserTier | undefined {
    return this.userTiers.get(tierId)
  }

  // Subscription management
  async createSubscription(userId: string, tierId: string, paymentMethodId?: string): Promise<Subscription> {
    const tier = this.userTiers.get(tierId)
    if (!tier) throw new Error(`Tier ${tierId} not found`)

    const subscription: Subscription = {
      id: this.generateId(),
      userId,
      tierId,
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: this.calculatePeriodEnd(tier.billingCycle),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.subscriptions.set(subscription.id, subscription)

    // Process payment
    if (tier.price > 0) {
      await this.billingService.processPayment({
        amount: tier.price,
        currency: tier.currency,
        customerId: userId,
        paymentMethodId,
        description: `${tier.displayName} subscription`,
      })
    }

    // Track billing event
    this.trackBillingEvent({
      userId,
      type: 'subscription_created',
      amount: tier.price,
      currency: tier.currency,
      description: `Subscribed to ${tier.displayName}`,
      metadata: { tierId, subscriptionId: subscription.id },
    })

    return subscription
  }

  async upgradeSubscription(userId: string, newTierId: string): Promise<Subscription> {
    const currentSubscription = this.getUserSubscription(userId)
    if (!currentSubscription) throw new Error('No active subscription found')

    const newTier = this.userTiers.get(newTierId)
    if (!newTier) throw new Error(`Tier ${newTierId} not found`)

    // Calculate prorated amount
    const proratedAmount = this.calculateProratedAmount(currentSubscription, newTier)

    // Update subscription
    const updatedSubscription: Subscription = {
      ...currentSubscription,
      tierId: newTierId,
      updatedAt: new Date().toISOString(),
    }

    this.subscriptions.set(currentSubscription.id, updatedSubscription)

    // Process payment for difference
    if (proratedAmount > 0) {
      await this.billingService.processPayment({
        amount: proratedAmount,
        currency: newTier.currency,
        customerId: userId,
        description: `Upgrade to ${newTier.displayName}`,
      })
    }

    // Track billing event
    this.trackBillingEvent({
      userId,
      type: 'subscription_updated',
      amount: proratedAmount,
      currency: newTier.currency,
      description: `Upgraded to ${newTier.displayName}`,
      metadata: { oldTierId: currentSubscription.tierId, newTierId },
    })

    return updatedSubscription
  }

  async cancelSubscription(userId: string): Promise<void> {
    const subscription = this.getUserSubscription(userId)
    if (!subscription) throw new Error('No active subscription found')

    subscription.cancelAtPeriodEnd = true
    subscription.updatedAt = new Date().toISOString()

    this.trackBillingEvent({
      userId,
      type: 'subscription_cancelled',
      description: 'Subscription cancelled',
      metadata: { subscriptionId: subscription.id },
    })
  }

  getUserSubscription(userId: string): Subscription | undefined {
    return Array.from(this.subscriptions.values())
      .find(sub => sub.userId === userId && sub.status === 'active')
  }

  getUserTier(userId: string): UserTier | undefined {
    const subscription = this.getUserSubscription(userId)
    return subscription ? this.userTiers.get(subscription.tierId) : this.userTiers.get('free')
  }

  // Feature access control
  hasFeatureAccess(userId: string, featureId: string): boolean {
    const tier = this.getUserTier(userId)
    if (!tier) return false

    const feature = tier.features.find(f => f.id === featureId)
    return feature?.enabled || false
  }

  getFeatureLimit(userId: string, featureId: string): number | null {
    const tier = this.getUserTier(userId)
    if (!tier) return null

    const feature = tier.features.find(f => f.id === featureId)
    if (!feature) return null

    if (feature.unlimited) return -1
    return feature.limit || null
  }

  // Usage tracking
  trackUsage(userId: string, featureId: string, amount: number = 1): boolean {
    const limit = this.getFeatureLimit(userId, featureId)
    if (limit === null) return false

    // In a real implementation, you'd track usage in a database
    // For now, we'll just return true if within limits
    return limit === -1 || amount <= limit
  }

  // Referral system
  async createReferral(referrerId: string, referredEmail: string): Promise<string> {
    const referral: ReferralProgram = {
      id: this.generateId(),
      referrerId,
      referredId: '', // Will be set when user signs up
      status: 'pending',
      rewardAmount: 10, // $10 credit
      rewardType: 'credit',
      createdAt: new Date().toISOString(),
    }

    this.referrals.push(referral)

    // Send referral email
    await this.sendReferralEmail(referredEmail, referral.id)

    return referral.id
  }

  async completeReferral(referralId: string, referredUserId: string): Promise<void> {
    const referral = this.referrals.find(r => r.id === referralId)
    if (!referral) throw new Error('Referral not found')

    referral.referredId = referredUserId
    referral.status = 'completed'
    referral.completedAt = new Date().toISOString()

    // Apply rewards
    await this.applyReferralReward(referral)
  }

  // Billing and payments
  private async processPayment(payment: {
    amount: number
    currency: string
    customerId: string
    paymentMethodId?: string
    description: string
  }): Promise<void> {
    // In a real implementation, this would integrate with Stripe or similar
    console.log('Processing payment:', payment)
  }

  private calculateProratedAmount(currentSubscription: Subscription, newTier: UserTier): number {
    // Simplified proration calculation
    const currentTier = this.userTiers.get(currentSubscription.tierId)
    if (!currentTier) return newTier.price

    const daysRemaining = this.getDaysRemaining(currentSubscription.currentPeriodEnd)
    const totalDays = this.getTotalDaysInPeriod(currentTier.billingCycle)

    const currentProrated = (currentTier.price * daysRemaining) / totalDays
    const newProrated = (newTier.price * daysRemaining) / totalDays

    return Math.max(0, newProrated - currentProrated)
  }

  private calculatePeriodEnd(billingCycle: string): string {
    const now = new Date()
    if (billingCycle === 'yearly') {
      now.setFullYear(now.getFullYear() + 1)
    } else {
      now.setMonth(now.getMonth() + 1)
    }
    return now.toISOString()
  }

  private getDaysRemaining(endDate: string): number {
    const end = new Date(endDate)
    const now = new Date()
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  private getTotalDaysInPeriod(billingCycle: string): number {
    return billingCycle === 'yearly' ? 365 : 30
  }

  private trackBillingEvent(event: Omit<BillingEvent, 'id' | 'timestamp'>): void {
    const billingEvent: BillingEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    }

    this.billingEvents.push(billingEvent)
  }

  private async sendReferralEmail(email: string, referralId: string): Promise<void> {
    // In a real implementation, this would send an actual email
    console.log(`Sending referral email to ${email} with ID ${referralId}`)
  }

  private async applyReferralReward(referral: ReferralProgram): Promise<void> {
    // Apply credit to referrer's account
    console.log(`Applying ${referral.rewardAmount} ${referral.rewardType} to user ${referral.referrerId}`)
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }
}

// Simple billing service interface
class BillingService {
  async processPayment(payment: {
    amount: number
    currency: string
    customerId: string
    paymentMethodId?: string
    description: string
  }): Promise<void> {
    // Mock payment processing
    console.log('Processing payment:', payment)
    
    // Simulate payment success/failure
    if (Math.random() > 0.1) { // 90% success rate
      console.log('Payment successful')
    } else {
      throw new Error('Payment failed')
    }
  }
}

// Global monetization instance
let monetizationInstance: MonetizationSystem | null = null

export const initMonetization = (): MonetizationSystem => {
  if (!monetizationInstance) {
    monetizationInstance = new MonetizationSystem()
  }
  return monetizationInstance
}

export const getMonetization = (): MonetizationSystem => {
  if (!monetizationInstance) {
    throw new Error('Monetization not initialized. Call initMonetization() first.')
  }
  return monetizationInstance
}

// Convenience functions
export const getTiers = (): UserTier[] => {
  return getMonetization().getTiers()
}

export const createSubscription = async (userId: string, tierId: string, paymentMethodId?: string): Promise<Subscription> => {
  return getMonetization().createSubscription(userId, tierId, paymentMethodId)
}

export const upgradeSubscription = async (userId: string, newTierId: string): Promise<Subscription> => {
  return getMonetization().upgradeSubscription(userId, newTierId)
}

export const hasFeatureAccess = (userId: string, featureId: string): boolean => {
  return getMonetization().hasFeatureAccess(userId, featureId)
}

export const trackUsage = (userId: string, featureId: string, amount?: number): boolean => {
  return getMonetization().trackUsage(userId, featureId, amount)
}

export const createReferral = async (referrerId: string, referredEmail: string): Promise<string> => {
  return getMonetization().createReferral(referrerId, referredEmail)
}

export default MonetizationSystem
