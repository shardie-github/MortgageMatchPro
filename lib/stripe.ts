import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export interface PaymentIntentData {
  amount: number
  currency: 'cad' | 'usd'
  metadata: {
    userId: string
    type: 'rate_check' | 'premium_subscription' | 'broker_white_label'
    description: string
  }
}

export interface SubscriptionData {
  customerId: string
  priceId: string
  metadata: {
    userId: string
    tier: 'premium' | 'broker'
  }
}

// Create payment intent for one-time payments
export async function createPaymentIntent(data: PaymentIntentData) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency,
      metadata: data.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    }
  } catch (error) {
    console.error('Stripe payment intent error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    }
  }
}

// Create subscription
export async function createSubscription(data: SubscriptionData) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: data.customerId,
      items: [{ price: data.priceId }],
      metadata: data.metadata,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })

    return {
      success: true,
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as Stripe.Invoice)?.payment_intent?.client_secret,
    }
  } catch (error) {
    console.error('Stripe subscription error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Subscription failed',
    }
  }
}

// Create customer
export async function createCustomer(email: string, name?: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
    })

    return {
      success: true,
      customerId: customer.id,
    }
  } catch (error) {
    console.error('Stripe customer creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Customer creation failed',
    }
  }
}

// Get customer by ID
export async function getCustomer(customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return {
      success: true,
      customer: customer as Stripe.Customer,
    }
  } catch (error) {
    console.error('Stripe customer retrieval error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Customer retrieval failed',
    }
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId)
    return {
      success: true,
      subscription,
    }
  } catch (error) {
    console.error('Stripe subscription cancellation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Subscription cancellation failed',
    }
  }
}

// Get subscription
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return {
      success: true,
      subscription,
    }
  } catch (error) {
    console.error('Stripe subscription retrieval error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Subscription retrieval failed',
    }
  }
}

// Webhook signature verification
export function verifyWebhookSignature(payload: string, signature: string) {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    return { success: true, event }
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Signature verification failed',
    }
  }
}

// Price configuration
export const PRICES = {
  RATE_CHECK: {
    CAD: 299, // $2.99 CAD
    USD: 299, // $2.99 USD
  },
  PREMIUM_MONTHLY: {
    CAD: 999, // $9.99 CAD
    USD: 999, // $9.99 USD
  },
  BROKER_YEARLY: {
    CAD: 120000, // $1,200 CAD
    USD: 120000, // $1,200 USD
  },
} as const

export { stripe }