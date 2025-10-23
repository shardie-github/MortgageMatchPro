import { NextApiRequest, NextApiResponse } from 'next'
import { verifyWebhookSignature } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { analytics } from '@/lib/monitoring'

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

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  const { userId, type, description } = paymentIntent.metadata
  
  // Update user subscription tier if needed
  if (type === 'premium_subscription' || type === 'broker_white_label') {
    const tier = type === 'premium_subscription' ? 'premium' : 'broker'
    
    const { error } = await supabaseAdmin
      .from('users')
      .update({ 
        subscription_tier: tier,
        stripe_customer_id: paymentIntent.customer
      })
      .eq('id', userId)
    
    if (error) {
      console.error('Failed to update user subscription:', error)
    }
  }

  // Track payment analytics
  analytics.trackPayment({
    type,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    success: true,
  })
}

async function handleSubscriptionCreated(subscription: any) {
  const { userId, tier } = subscription.metadata
  
  const { error } = await supabaseAdmin
    .from('users')
    .update({ 
      subscription_tier: tier,
      stripe_customer_id: subscription.customer
    })
    .eq('id', userId)
  
  if (error) {
    console.error('Failed to update user subscription:', error)
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  const { userId, tier } = subscription.metadata
  
  // Handle subscription status changes
  if (subscription.status === 'active') {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ subscription_tier: tier })
      .eq('id', userId)
    
    if (error) {
      console.error('Failed to update user subscription:', error)
    }
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