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

// Product IDs (these should be set in your Stripe dashboard)
export const PRODUCT_IDS = {
  RATE_CHECK_TOKEN: 'rate_check_token',
  PREMIUM_SUBSCRIPTION: 'premium_subscription',
  BROKER_LICENSE: 'broker_license',
} as const

// Price IDs (these should be set in your Stripe dashboard)
export const PRICE_IDS = {
  RATE_CHECK_CAD: 'price_rate_check_cad',
  RATE_CHECK_USD: 'price_rate_check_usd',
  PREMIUM_MONTHLY_CAD: 'price_premium_monthly_cad',
  PREMIUM_MONTHLY_USD: 'price_premium_monthly_usd',
  BROKER_YEARLY_CAD: 'price_broker_yearly_cad',
  BROKER_YEARLY_USD: 'price_broker_yearly_usd',
} as const

// Create checkout session for one-time payments
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    })

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    }
  } catch (error) {
    console.error('Stripe checkout session error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Checkout session creation failed',
    }
  }
}

// Create checkout session for subscriptions
export async function createSubscriptionCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      subscription_data: {
        metadata,
      },
    })

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    }
  } catch (error) {
    console.error('Stripe subscription checkout session error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Subscription checkout session creation failed',
    }
  }
}

// Create portal session for subscription management
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return {
      success: true,
      url: session.url,
    }
  } catch (error) {
    console.error('Stripe portal session error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Portal session creation failed',
    }
  }
}

// Get price by ID
export async function getPrice(priceId: string) {
  try {
    const price = await stripe.prices.retrieve(priceId)
    return {
      success: true,
      price,
    }
  } catch (error) {
    console.error('Stripe price retrieval error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Price retrieval failed',
    }
  }
}

// Create refund
export async function createRefund({
  paymentIntentId,
  amount,
  reason = 'requested_by_customer',
}: {
  paymentIntentId: string
  amount?: number
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
}) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason,
    })

    return {
      success: true,
      refund,
    }
  } catch (error) {
    console.error('Stripe refund error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refund creation failed',
    }
  }
}

// List customer payment methods
export async function listPaymentMethods(customerId: string) {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    return {
      success: true,
      paymentMethods: paymentMethods.data,
    }
  } catch (error) {
    console.error('Stripe payment methods list error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment methods retrieval failed',
    }
  }
}

// Detach payment method
export async function detachPaymentMethod(paymentMethodId: string) {
  try {
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId)
    return {
      success: true,
      paymentMethod,
    }
  } catch (error) {
    console.error('Stripe payment method detach error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment method detach failed',
    }
  }
}

export { stripe }