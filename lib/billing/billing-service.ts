import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase'
import { 
  BillingAdapter, 
  BillingCustomer, 
  PaymentMethod, 
  Subscription, 
  Invoice, 
  UsageEvent, 
  UsageSnapshot,
  BillingError,
  PaymentError,
  QuotaExceededError
} from '../types/billing'
import { OrganizationLimits } from '../types/tenancy'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export class StripeBillingAdapter implements BillingAdapter {
  // Customer management
  async createCustomer(customer: Omit<BillingCustomer, 'id' | 'providerId' | 'createdAt' | 'updatedAt'>): Promise<BillingCustomer> {
    try {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.name,
        metadata: {
          organizationId: customer.organizationId,
        },
        address: customer.address ? {
          line1: customer.address.line1,
          line2: customer.address.line2,
          city: customer.address.city,
          state: customer.address.state,
          postal_code: customer.address.postalCode,
          country: customer.address.country,
        } : undefined,
      })

      const billingCustomer: BillingCustomer = {
        id: crypto.randomUUID(),
        organizationId: customer.organizationId,
        providerId: stripeCustomer.id,
        email: customer.email,
        name: customer.name,
        currency: customer.currency,
        taxId: customer.taxId,
        address: customer.address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Store in database
      const { error } = await supabaseAdmin
        .from('billing_customers')
        .insert(billingCustomer)

      if (error) {
        throw new BillingError(`Failed to store customer: ${error.message}`, 'DB_ERROR', customer.organizationId)
      }

      return billingCustomer
    } catch (error) {
      console.error('Create customer error:', error)
      throw new BillingError(
        error instanceof Error ? error.message : 'Failed to create customer',
        'STRIPE_ERROR',
        customer.organizationId
      )
    }
  }

  async getCustomer(organizationId: string): Promise<BillingCustomer | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('billing_customers')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new BillingError(`Failed to get customer: ${error.message}`, 'DB_ERROR', organizationId)
      }

      return data
    } catch (error) {
      console.error('Get customer error:', error)
      throw error
    }
  }

  async updateCustomer(organizationId: string, updates: Partial<BillingCustomer>): Promise<BillingCustomer> {
    try {
      const customer = await this.getCustomer(organizationId)
      if (!customer) {
        throw new BillingError('Customer not found', 'CUSTOMER_NOT_FOUND', organizationId)
      }

      // Update in Stripe
      await stripe.customers.update(customer.providerId, {
        email: updates.email,
        name: updates.name,
        metadata: {
          organizationId,
        },
      })

      // Update in database
      const { data, error } = await supabaseAdmin
        .from('billing_customers')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        throw new BillingError(`Failed to update customer: ${error.message}`, 'DB_ERROR', organizationId)
      }

      return data
    } catch (error) {
      console.error('Update customer error:', error)
      throw error
    }
  }

  async deleteCustomer(organizationId: string): Promise<void> {
    try {
      const customer = await this.getCustomer(organizationId)
      if (!customer) {
        return // Already deleted
      }

      // Delete from Stripe
      await stripe.customers.del(customer.providerId)

      // Delete from database
      const { error } = await supabaseAdmin
        .from('billing_customers')
        .delete()
        .eq('organization_id', organizationId)

      if (error) {
        throw new BillingError(`Failed to delete customer: ${error.message}`, 'DB_ERROR', organizationId)
      }
    } catch (error) {
      console.error('Delete customer error:', error)
      throw error
    }
  }

  // Payment methods
  async createPaymentMethod(organizationId: string, paymentMethodData: any): Promise<PaymentMethod> {
    try {
      const customer = await this.getCustomer(organizationId)
      if (!customer) {
        throw new BillingError('Customer not found', 'CUSTOMER_NOT_FOUND', organizationId)
      }

      const stripePaymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: paymentMethodData.card,
      })

      await stripe.paymentMethods.attach(stripePaymentMethod.id, {
        customer: customer.providerId,
      })

      const paymentMethod: PaymentMethod = {
        id: crypto.randomUUID(),
        organizationId,
        providerId: stripePaymentMethod.id,
        type: 'card',
        isDefault: false,
        last4: stripePaymentMethod.card?.last4,
        brand: stripePaymentMethod.card?.brand,
        expiryMonth: stripePaymentMethod.card?.exp_month,
        expiryYear: stripePaymentMethod.card?.exp_year,
        createdAt: new Date().toISOString(),
      }

      // Store in database
      const { error } = await supabaseAdmin
        .from('payment_methods')
        .insert(paymentMethod)

      if (error) {
        throw new BillingError(`Failed to store payment method: ${error.message}`, 'DB_ERROR', organizationId)
      }

      return paymentMethod
    } catch (error) {
      console.error('Create payment method error:', error)
      throw error
    }
  }

  async getPaymentMethods(organizationId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('payment_methods')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new BillingError(`Failed to get payment methods: ${error.message}`, 'DB_ERROR', organizationId)
      }

      return data || []
    } catch (error) {
      console.error('Get payment methods error:', error)
      throw error
    }
  }

  async setDefaultPaymentMethod(organizationId: string, paymentMethodId: string): Promise<void> {
    try {
      // Update all payment methods to not be default
      await supabaseAdmin
        .from('payment_methods')
        .update({ isDefault: false })
        .eq('organization_id', organizationId)

      // Set the specified one as default
      const { error } = await supabaseAdmin
        .from('payment_methods')
        .update({ isDefault: true })
        .eq('id', paymentMethodId)
        .eq('organization_id', organizationId)

      if (error) {
        throw new BillingError(`Failed to set default payment method: ${error.message}`, 'DB_ERROR', organizationId)
      }
    } catch (error) {
      console.error('Set default payment method error:', error)
      throw error
    }
  }

  async deletePaymentMethod(organizationId: string, paymentMethodId: string): Promise<void> {
    try {
      const { data: paymentMethod } = await supabaseAdmin
        .from('payment_methods')
        .select('provider_id')
        .eq('id', paymentMethodId)
        .eq('organization_id', organizationId)
        .single()

      if (!paymentMethod) {
        throw new BillingError('Payment method not found', 'PAYMENT_METHOD_NOT_FOUND', organizationId)
      }

      // Detach from Stripe
      await stripe.paymentMethods.detach(paymentMethod.providerId)

      // Delete from database
      const { error } = await supabaseAdmin
        .from('payment_methods')
        .delete()
        .eq('id', paymentMethodId)
        .eq('organization_id', organizationId)

      if (error) {
        throw new BillingError(`Failed to delete payment method: ${error.message}`, 'DB_ERROR', organizationId)
      }
    } catch (error) {
      console.error('Delete payment method error:', error)
      throw error
    }
  }

  // Subscriptions
  async createSubscription(subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
    try {
      const customer = await this.getCustomer(subscription.organizationId)
      if (!customer) {
        throw new BillingError('Customer not found', 'CUSTOMER_NOT_FOUND', subscription.organizationId)
      }

      // Get plan pricing
      const { data: plan } = await supabaseAdmin
        .from('plans')
        .select('pricing')
        .eq('id', subscription.planId)
        .single()

      if (!plan) {
        throw new BillingError('Plan not found', 'PLAN_NOT_FOUND', subscription.organizationId)
      }

      const stripeSubscription = await stripe.subscriptions.create({
        customer: customer.providerId,
        items: [{
          price_data: {
            currency: subscription.currency,
            product_data: {
              name: `Plan ${subscription.planId}`,
            },
            unit_amount: subscription.unitAmount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: subscription.quantity,
        }],
        metadata: {
          organizationId: subscription.organizationId,
          planId: subscription.planId,
        },
        trial_period_days: subscription.trialStart ? 
          Math.ceil((new Date(subscription.trialEnd!).getTime() - new Date(subscription.trialStart).getTime()) / (1000 * 60 * 60 * 24)) : 
          undefined,
      })

      const newSubscription: Subscription = {
        id: crypto.randomUUID(),
        organizationId: subscription.organizationId,
        planId: subscription.planId,
        status: stripeSubscription.status as any,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: stripeSubscription.canceled_at ? 
          new Date(stripeSubscription.canceled_at * 1000).toISOString() : 
          undefined,
        trialStart: stripeSubscription.trial_start ? 
          new Date(stripeSubscription.trial_start * 1000).toISOString() : 
          undefined,
        trialEnd: stripeSubscription.trial_end ? 
          new Date(stripeSubscription.trial_end * 1000).toISOString() : 
          undefined,
        quantity: subscription.quantity,
        unitAmount: subscription.unitAmount,
        currency: subscription.currency,
        metadata: subscription.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Store in database
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .insert(newSubscription)

      if (error) {
        throw new BillingError(`Failed to store subscription: ${error.message}`, 'DB_ERROR', subscription.organizationId)
      }

      return newSubscription
    } catch (error) {
      console.error('Create subscription error:', error)
      throw error
    }
  }

  async getSubscription(organizationId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new BillingError(`Failed to get subscription: ${error.message}`, 'DB_ERROR', organizationId)
      }

      return data
    } catch (error) {
      console.error('Get subscription error:', error)
      throw error
    }
  }

  async updateSubscription(organizationId: string, updates: Partial<Subscription>): Promise<Subscription> {
    try {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        throw new BillingError(`Failed to update subscription: ${error.message}`, 'DB_ERROR', organizationId)
      }

      return data
    } catch (error) {
      console.error('Update subscription error:', error)
      throw error
    }
  }

  async cancelSubscription(organizationId: string, atPeriodEnd = true): Promise<Subscription> {
    try {
      const subscription = await this.getSubscription(organizationId)
      if (!subscription) {
        throw new BillingError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND', organizationId)
      }

      const customer = await this.getCustomer(organizationId)
      if (!customer) {
        throw new BillingError('Customer not found', 'CUSTOMER_NOT_FOUND', organizationId)
      }

      // Cancel in Stripe
      await stripe.subscriptions.update(subscription.providerId || '', {
        cancel_at_period_end: atPeriodEnd,
      })

      // Update in database
      return await this.updateSubscription(organizationId, {
        cancelAtPeriodEnd: atPeriodEnd,
        canceledAt: atPeriodEnd ? undefined : new Date().toISOString(),
      })
    } catch (error) {
      console.error('Cancel subscription error:', error)
      throw error
    }
  }

  async resumeSubscription(organizationId: string): Promise<Subscription> {
    try {
      const subscription = await this.getSubscription(organizationId)
      if (!subscription) {
        throw new BillingError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND', organizationId)
      }

      const customer = await this.getCustomer(organizationId)
      if (!customer) {
        throw new BillingError('Customer not found', 'CUSTOMER_NOT_FOUND', organizationId)
      }

      // Resume in Stripe
      await stripe.subscriptions.update(subscription.providerId || '', {
        cancel_at_period_end: false,
      })

      // Update in database
      return await this.updateSubscription(organizationId, {
        cancelAtPeriodEnd: false,
        canceledAt: undefined,
      })
    } catch (error) {
      console.error('Resume subscription error:', error)
      throw error
    }
  }

  // Invoicing
  async createInvoice(invoice: Omit<Invoice, 'id' | 'providerId' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    try {
      const customer = await this.getCustomer(invoice.organizationId)
      if (!customer) {
        throw new BillingError('Customer not found', 'CUSTOMER_NOT_FOUND', invoice.organizationId)
      }

      const stripeInvoice = await stripe.invoices.create({
        customer: customer.providerId,
        description: invoice.description,
        metadata: {
          organizationId: invoice.organizationId,
        },
        collection_method: 'charge_automatically',
        auto_advance: true,
      })

      // Add line items
      for (const line of invoice.lines) {
        await stripe.invoiceItems.create({
          customer: customer.providerId,
          invoice: stripeInvoice.id,
          amount: line.amount,
          currency: line.currency,
          description: line.description,
          quantity: line.quantity,
        })
      }

      // Finalize the invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id)

      const newInvoice: Invoice = {
        id: crypto.randomUUID(),
        organizationId: invoice.organizationId,
        providerId: finalizedInvoice.id,
        number: finalizedInvoice.number || '',
        status: finalizedInvoice.status as any,
        amount: finalizedInvoice.amount_due,
        amountPaid: finalizedInvoice.amount_paid,
        amountDue: finalizedInvoice.amount_due - finalizedInvoice.amount_paid,
        currency: finalizedInvoice.currency,
        description: invoice.description,
        hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url || undefined,
        invoicePdf: finalizedInvoice.invoice_pdf || undefined,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        dueDate: new Date(finalizedInvoice.due_date! * 1000).toISOString(),
        paidAt: finalizedInvoice.status_transitions?.paid_at ? 
          new Date(finalizedInvoice.status_transitions.paid_at * 1000).toISOString() : 
          undefined,
        lines: invoice.lines,
        metadata: invoice.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Store in database
      const { error } = await supabaseAdmin
        .from('invoices')
        .insert(newInvoice)

      if (error) {
        throw new BillingError(`Failed to store invoice: ${error.message}`, 'DB_ERROR', invoice.organizationId)
      }

      return newInvoice
    } catch (error) {
      console.error('Create invoice error:', error)
      throw error
    }
  }

  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new BillingError(`Failed to get invoice: ${error.message}`, 'DB_ERROR')
      }

      return data
    } catch (error) {
      console.error('Get invoice error:', error)
      throw error
    }
  }

  async getInvoices(organizationId: string, limit = 10, startingAfter?: string): Promise<Invoice[]> {
    try {
      let query = supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (startingAfter) {
        query = query.lt('created_at', startingAfter)
      }

      const { data, error } = await query

      if (error) {
        throw new BillingError(`Failed to get invoices: ${error.message}`, 'DB_ERROR', organizationId)
      }

      return data || []
    } catch (error) {
      console.error('Get invoices error:', error)
      throw error
    }
  }

  async payInvoice(invoiceId: string, paymentMethodId?: string): Promise<Invoice> {
    try {
      const invoice = await this.getInvoice(invoiceId)
      if (!invoice) {
        throw new BillingError('Invoice not found', 'INVOICE_NOT_FOUND')
      }

      const customer = await this.getCustomer(invoice.organizationId)
      if (!customer) {
        throw new BillingError('Customer not found', 'CUSTOMER_NOT_FOUND', invoice.organizationId)
      }

      // Pay in Stripe
      await stripe.invoices.pay(invoice.providerId, {
        payment_method: paymentMethodId,
      })

      // Update in database
      const { data, error } = await supabaseAdmin
        .from('invoices')
        .update({
          status: 'paid',
          amountPaid: invoice.amount,
          amountDue: 0,
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (error) {
        throw new BillingError(`Failed to update invoice: ${error.message}`, 'DB_ERROR', invoice.organizationId)
      }

      return data
    } catch (error) {
      console.error('Pay invoice error:', error)
      throw error
    }
  }

  async voidInvoice(invoiceId: string): Promise<Invoice> {
    try {
      const invoice = await this.getInvoice(invoiceId)
      if (!invoice) {
        throw new BillingError('Invoice not found', 'INVOICE_NOT_FOUND')
      }

      // Void in Stripe
      await stripe.invoices.voidInvoice(invoice.providerId)

      // Update in database
      const { data, error } = await supabaseAdmin
        .from('invoices')
        .update({
          status: 'void',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (error) {
        throw new BillingError(`Failed to update invoice: ${error.message}`, 'DB_ERROR', invoice.organizationId)
      }

      return data
    } catch (error) {
      console.error('Void invoice error:', error)
      throw error
    }
  }

  // Usage tracking
  async recordUsage(usageEvent: Omit<UsageEvent, 'id' | 'timestamp'>): Promise<UsageEvent> {
    try {
      const event: UsageEvent = {
        id: crypto.randomUUID(),
        organizationId: usageEvent.organizationId,
        eventType: usageEvent.eventType,
        quantity: usageEvent.quantity,
        unitPrice: usageEvent.unitPrice,
        amount: usageEvent.amount,
        currency: usageEvent.currency,
        metadata: usageEvent.metadata,
        timestamp: new Date().toISOString(),
      }

      const { error } = await supabaseAdmin
        .from('usage_events')
        .insert(event)

      if (error) {
        throw new BillingError(`Failed to record usage: ${error.message}`, 'DB_ERROR', usageEvent.organizationId)
      }

      return event
    } catch (error) {
      console.error('Record usage error:', error)
      throw error
    }
  }

  async getUsage(organizationId: string, startDate: string, endDate: string): Promise<UsageEvent[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('usage_events')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: false })

      if (error) {
        throw new BillingError(`Failed to get usage: ${error.message}`, 'DB_ERROR', organizationId)
      }

      return data || []
    } catch (error) {
      console.error('Get usage error:', error)
      throw error
    }
  }

  async createUsageSnapshot(snapshot: Omit<UsageSnapshot, 'id' | 'createdAt'>): Promise<UsageSnapshot> {
    try {
      const newSnapshot: UsageSnapshot = {
        id: crypto.randomUUID(),
        organizationId: snapshot.organizationId,
        date: snapshot.date,
        events: snapshot.events,
        totalAmount: snapshot.totalAmount,
        currency: snapshot.currency,
        createdAt: new Date().toISOString(),
      }

      const { error } = await supabaseAdmin
        .from('usage_snapshots')
        .insert(newSnapshot)

      if (error) {
        throw new BillingError(`Failed to create usage snapshot: ${error.message}`, 'DB_ERROR', snapshot.organizationId)
      }

      return newSnapshot
    } catch (error) {
      console.error('Create usage snapshot error:', error)
      throw error
    }
  }
}

// Factory function to get billing adapter
export function getBillingAdapter(): BillingAdapter {
  const provider = process.env.BILLING_PROVIDER || 'stripe'
  
  switch (provider) {
    case 'stripe':
      return new StripeBillingAdapter()
    case 'mock':
      // Return mock adapter for development/testing
      throw new Error('Mock billing adapter not implemented yet')
    default:
      throw new Error(`Unsupported billing provider: ${provider}`)
  }
}