import { supabaseAdmin } from '../supabase'
import { z } from 'zod'

// Payment Provider Types
export type PaymentProvider = 'stripe' | 'vopay' | 'wise' | 'stripe_connect'

export interface PaymentConfig {
  provider: PaymentProvider
  apiKey: string
  secretKey: string
  environment: 'sandbox' | 'development' | 'production'
  baseUrl: string
  webhookSecret?: string
}

// Payment Processing Schemas
export const PaymentIntentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string().length(3),
  status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'canceled']),
  payment_method: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const PaymentMethodSchema = z.object({
  id: z.string(),
  type: z.enum(['card', 'bank_account', 'ach', 'wire', 'crypto']),
  last_four: z.string().optional(),
  brand: z.string().optional(),
  exp_month: z.number().optional(),
  exp_year: z.number().optional(),
  is_default: z.boolean().default(false),
  created_at: z.string().datetime(),
})

export const RevenueShareSchema = z.object({
  id: z.string(),
  partner_id: z.string(),
  user_id: z.string(),
  amount: z.number(),
  currency: z.string().length(3),
  percentage: z.number(),
  transaction_id: z.string(),
  status: z.enum(['pending', 'paid', 'failed']),
  created_at: z.string().datetime(),
  paid_at: z.string().datetime().optional(),
})

export type PaymentIntent = z.infer<typeof PaymentIntentSchema>
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>
export type RevenueShare = z.infer<typeof RevenueShareSchema>

// Embedded Payment Service Class
export class EmbeddedPaymentService {
  private config: PaymentConfig

  constructor(config: PaymentConfig) {
    this.config = config
  }

  // Create payment intent for embedded payments
  async createPaymentIntent(data: {
    amount: number
    currency: string
    userId: string
    paymentType: 'commission' | 'referral' | 'api_usage' | 'subscription' | 'broker_fee'
    metadata?: Record<string, any>
  }): Promise<{
    success: boolean
    paymentIntent?: PaymentIntent
    clientSecret?: string
    error?: string
  }> {
    try {
      switch (this.config.provider) {
        case 'stripe':
          return await this.createStripePaymentIntent(data)
        case 'stripe_connect':
          return await this.createStripeConnectPaymentIntent(data)
        case 'vopay':
          return await this.createVoPayPaymentIntent(data)
        case 'wise':
          return await this.createWisePaymentIntent(data)
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`)
      }
    } catch (error) {
      console.error('Payment intent creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment intent creation failed',
      }
    }
  }

  // Process payment with instant settlement
  async processPayment(data: {
    paymentIntentId: string
    paymentMethodId: string
    userId: string
    instantSettlement?: boolean
  }): Promise<{
    success: boolean
    transactionId?: string
    status?: string
    error?: string
  }> {
    try {
      switch (this.config.provider) {
        case 'stripe':
          return await this.processStripePayment(data)
        case 'stripe_connect':
          return await this.processStripeConnectPayment(data)
        case 'vopay':
          return await this.processVoPayPayment(data)
        case 'wise':
          return await this.processWisePayment(data)
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`)
      }
    } catch (error) {
      console.error('Payment processing failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      }
    }
  }

  // Create secure holdback for broker commissions
  async createSecureHoldback(data: {
    amount: number
    currency: string
    brokerId: string
    loanId: string
    releaseConditions: string[]
    expiresAt: string
  }): Promise<{
    success: boolean
    holdbackId?: string
    error?: string
  }> {
    try {
      switch (this.config.provider) {
        case 'stripe':
          return await this.createStripeHoldback(data)
        case 'stripe_connect':
          return await this.createStripeConnectHoldback(data)
        case 'vopay':
          return await this.createVoPayHoldback(data)
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`)
      }
    } catch (error) {
      console.error('Secure holdback creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Secure holdback creation failed',
      }
    }
  }

  // Release holdback when conditions are met
  async releaseHoldback(holdbackId: string, conditions: string[]): Promise<{
    success: boolean
    transactionId?: string
    error?: string
  }> {
    try {
      // This would check conditions and release funds
      // For now, return mock success
      return {
        success: true,
        transactionId: `txn_${Date.now()}`,
      }
    } catch (error) {
      console.error('Holdback release failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Holdback release failed',
      }
    }
  }

  // Calculate revenue share
  async calculateRevenueShare(data: {
    amount: number
    currency: string
    partnerId: string
    revenueType: 'api_usage' | 'transaction_fee' | 'subscription' | 'referral'
  }): Promise<{
    success: boolean
    revenueShare?: RevenueShare
    error?: string
  }> {
    try {
      // Get partner revenue share percentage
      const { data: partner, error: partnerError } = await supabaseAdmin
        .from('partner_integrations')
        .select('revenue_share_percentage')
        .eq('id', data.partnerId)
        .single()

      if (partnerError || !partner) {
        throw new Error('Partner not found')
      }

      const shareAmount = (data.amount * partner.revenue_share_percentage) / 100

      const revenueShare: RevenueShare = {
        id: `rev_${Date.now()}`,
        partner_id: data.partnerId,
        user_id: '', // Will be set by caller
        amount: shareAmount,
        currency: data.currency,
        percentage: partner.revenue_share_percentage,
        transaction_id: `txn_${Date.now()}`,
        status: 'pending',
        created_at: new Date().toISOString(),
      }

      return {
        success: true,
        revenueShare,
      }
    } catch (error) {
      console.error('Revenue share calculation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Revenue share calculation failed',
      }
    }
  }

  // Stripe-specific implementations
  private async createStripePaymentIntent(data: any) {
    // This would integrate with Stripe API
    // For now, return mock data
    const paymentIntent: PaymentIntent = {
      id: `pi_${Date.now()}`,
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
      metadata: data.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return {
      success: true,
      paymentIntent,
      clientSecret: `pi_${Date.now()}_secret`,
    }
  }

  private async createStripeConnectPaymentIntent(data: any) {
    // This would integrate with Stripe Connect for marketplace payments
    const paymentIntent: PaymentIntent = {
      id: `pi_connect_${Date.now()}`,
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
      metadata: { ...data.metadata, platform: 'stripe_connect' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return {
      success: true,
      paymentIntent,
      clientSecret: `pi_connect_${Date.now()}_secret`,
    }
  }

  private async processStripePayment(data: any) {
    // This would process payment with Stripe
    return {
      success: true,
      transactionId: `stripe_txn_${Date.now()}`,
      status: 'succeeded',
    }
  }

  private async processStripeConnectPayment(data: any) {
    // This would process payment with Stripe Connect
    return {
      success: true,
      transactionId: `stripe_connect_txn_${Date.now()}`,
      status: 'succeeded',
    }
  }

  private async createStripeHoldback(data: any) {
    // This would create holdback with Stripe
    return {
      success: true,
      holdbackId: `stripe_holdback_${Date.now()}`,
    }
  }

  private async createStripeConnectHoldback(data: any) {
    // This would create holdback with Stripe Connect
    return {
      success: true,
      holdbackId: `stripe_connect_holdback_${Date.now()}`,
    }
  }

  // VoPay-specific implementations (Canadian)
  private async createVoPayPaymentIntent(data: any) {
    // This would integrate with VoPay API
    const paymentIntent: PaymentIntent = {
      id: `vopay_${Date.now()}`,
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
      metadata: { ...data.metadata, provider: 'vopay' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return {
      success: true,
      paymentIntent,
      clientSecret: `vopay_${Date.now()}_secret`,
    }
  }

  private async processVoPayPayment(data: any) {
    // This would process payment with VoPay
    return {
      success: true,
      transactionId: `vopay_txn_${Date.now()}`,
      status: 'succeeded',
    }
  }

  private async createVoPayHoldback(data: any) {
    // This would create holdback with VoPay
    return {
      success: true,
      holdbackId: `vopay_holdback_${Date.now()}`,
    }
  }

  // Wise-specific implementations
  private async createWisePaymentIntent(data: any) {
    // This would integrate with Wise API
    const paymentIntent: PaymentIntent = {
      id: `wise_${Date.now()}`,
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
      metadata: { ...data.metadata, provider: 'wise' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return {
      success: true,
      paymentIntent,
      clientSecret: `wise_${Date.now()}_secret`,
    }
  }

  private async processWisePayment(data: any) {
    // This would process payment with Wise
    return {
      success: true,
      transactionId: `wise_txn_${Date.now()}`,
      status: 'succeeded',
    }
  }

  // Store payment in database
  async storePayment(payment: PaymentIntent, userId: string): Promise<{
    success: boolean
    paymentId?: string
    error?: string
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('payment_processing')
        .insert({
          user_id: userId,
          payment_provider: this.config.provider,
          provider_transaction_id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          payment_type: payment.metadata?.paymentType || 'api_usage',
          status: payment.status,
          metadata: payment.metadata,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return {
        success: true,
        paymentId: data.id,
      }
    } catch (error) {
      console.error('Payment storage failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment storage failed',
      }
    }
  }

  // Get payment history
  async getPaymentHistory(userId: string, limit = 50): Promise<{
    success: boolean
    payments?: any[]
    error?: string
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('payment_processing')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return {
        success: true,
        payments: data || [],
      }
    } catch (error) {
      console.error('Get payment history failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get payment history failed',
      }
    }
  }

  // Calculate fees based on payment type and volume
  calculateFees(amount: number, paymentType: string, volume: number): {
    baseFee: number
    percentageFee: number
    totalFee: number
    netAmount: number
  } {
    const feeStructure = {
      commission: { base: 0.30, percentage: 0.029 },
      referral: { base: 0.25, percentage: 0.025 },
      api_usage: { base: 0.10, percentage: 0.015 },
      subscription: { base: 0.50, percentage: 0.035 },
      broker_fee: { base: 1.00, percentage: 0.045 },
    }

    const fees = feeStructure[paymentType as keyof typeof feeStructure] || feeStructure.api_usage

    // Volume discount
    let volumeDiscount = 0
    if (volume > 10000) volumeDiscount = 0.005
    else if (volume > 5000) volumeDiscount = 0.003
    else if (volume > 1000) volumeDiscount = 0.001

    const adjustedPercentage = Math.max(0.005, fees.percentage - volumeDiscount)
    const percentageFee = amount * adjustedPercentage
    const baseFee = fees.base
    const totalFee = baseFee + percentageFee
    const netAmount = amount - totalFee

    return {
      baseFee,
      percentageFee,
      totalFee,
      netAmount,
    }
  }
}

// Factory function to create Embedded Payment service
export function createEmbeddedPaymentService(provider: PaymentProvider): EmbeddedPaymentService {
  const configs: Record<PaymentProvider, PaymentConfig> = {
    stripe: {
      provider: 'stripe',
      apiKey: process.env.STRIPE_PUBLISHABLE_KEY!,
      secretKey: process.env.STRIPE_SECRET_KEY!,
      environment: (process.env.STRIPE_ENVIRONMENT as any) || 'sandbox',
      baseUrl: process.env.STRIPE_BASE_URL || 'https://api.stripe.com',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    stripe_connect: {
      provider: 'stripe_connect',
      apiKey: process.env.STRIPE_CONNECT_PUBLISHABLE_KEY!,
      secretKey: process.env.STRIPE_CONNECT_SECRET_KEY!,
      environment: (process.env.STRIPE_ENVIRONMENT as any) || 'sandbox',
      baseUrl: process.env.STRIPE_BASE_URL || 'https://api.stripe.com',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    vopay: {
      provider: 'vopay',
      apiKey: process.env.VOPAY_API_KEY!,
      secretKey: process.env.VOPAY_SECRET_KEY!,
      environment: (process.env.VOPAY_ENVIRONMENT as any) || 'sandbox',
      baseUrl: process.env.VOPAY_BASE_URL || 'https://api.vopay.com',
    },
    wise: {
      provider: 'wise',
      apiKey: process.env.WISE_API_KEY!,
      secretKey: process.env.WISE_SECRET_KEY!,
      environment: (process.env.WISE_ENVIRONMENT as any) || 'sandbox',
      baseUrl: process.env.WISE_BASE_URL || 'https://api.wise.com',
    },
  }

  return new EmbeddedPaymentService(configs[provider])
}
