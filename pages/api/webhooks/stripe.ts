import { NextApiRequest, NextApiResponse } from 'next'
import { verifyWebhookSignature } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { analytics } from '@/lib/monitoring'
import Stripe from 'stripe'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const signature = req.headers['stripe-signature'] as string
  const payload = JSON.stringify(req.body)

  // Verify webhook signature
  const { success, event, error } = verifyWebhookSignature(payload, signature)
  
  if (!success) {
    console.error('Webhook signature verification failed:', error)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object)
        break
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object)
        break
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { userId, type, description } = paymentIntent.metadata
  
  try {
    // Create billing history record
    const { data: billingRecord, error: billingError } = await supabaseAdmin
      .from('billing_history')
      .insert({
        user_id: userId,
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency as 'cad' | 'usd',
        status: 'succeeded',
        payment_type: type as 'rate_check' | 'subscription' | 'broker_license' | 'renewal',
        description: description || `Payment for ${type}`,
        metadata: paymentIntent.metadata,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (billingError) {
      console.error('Failed to create billing history:', billingError)
      return
    }

    // Handle different payment types
    if (type === 'rate_check') {
      // Grant rate check tokens
      const { error: tokenError } = await supabaseAdmin
        .from('rate_check_tokens')
        .insert({
          user_id: userId,
          billing_history_id: billingRecord.id,
          token_count: 1,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })

      if (tokenError) {
        console.error('Failed to create rate check token:', tokenError)
      }
    } else if (type === 'premium_subscription') {
      // Update user subscription tier
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ 
          subscription_tier: 'premium',
          stripe_customer_id: paymentIntent.customer
        })
        .eq('id', userId)

      if (userError) {
        console.error('Failed to update user subscription:', userError)
      }

      // Grant premium entitlements
      await grantUserEntitlements(userId, 'premium')
    } else if (type === 'broker_license') {
      // Update user subscription tier
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ 
          subscription_tier: 'broker',
          stripe_customer_id: paymentIntent.customer
        })
        .eq('id', userId)

      if (userError) {
        console.error('Failed to update user subscription:', userError)
      }

      // Grant broker entitlements
      await grantUserEntitlements(userId, 'broker')
    }

    // Track payment analytics
    analytics.trackPayment({
      type,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      success: true,
    })
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error)
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { userId, tier } = subscription.metadata
  
  try {
    // Create subscription record
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        status: subscription.status as any,
        tier: tier as 'premium' | 'broker',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      })

    if (subError) {
      console.error('Failed to create subscription record:', subError)
      return
    }

    // Update user subscription tier
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({ 
        subscription_tier: tier,
        stripe_customer_id: subscription.customer
      })
      .eq('id', userId)
    
    if (userError) {
      console.error('Failed to update user subscription:', userError)
    }

    // Grant entitlements based on tier
    await grantUserEntitlements(userId, tier as 'premium' | 'broker')
  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { userId, tier } = subscription.metadata
  
  try {
    // Update subscription record
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: subscription.status as any,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      })
      .eq('stripe_subscription_id', subscription.id)

    if (subError) {
      console.error('Failed to update subscription record:', subError)
    }

    // Handle subscription status changes
    if (subscription.status === 'active') {
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ subscription_tier: tier })
        .eq('id', userId)
      
      if (userError) {
        console.error('Failed to update user subscription:', userError)
      }

      // Grant entitlements
      await grantUserEntitlements(userId, tier as 'premium' | 'broker')
    } else if (subscription.status === 'canceled' || subscription.status === 'past_due') {
      // Revoke entitlements
      await revokeUserEntitlements(userId)
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const { userId } = subscription.metadata
  
  const { error } = await supabaseAdmin
    .from('users')
    .update({ subscription_tier: 'free' })
    .eq('id', userId)
  
  if (error) {
    console.error('Failed to update user subscription:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  // Handle successful recurring payments
  console.log('Invoice payment succeeded:', invoice.id)
}

async function handleInvoicePaymentFailed(invoice: any) {
  // Handle failed recurring payments
  console.log('Invoice payment failed:', invoice.id)
  
  // You might want to send a notification to the user
  // or update their subscription status
}