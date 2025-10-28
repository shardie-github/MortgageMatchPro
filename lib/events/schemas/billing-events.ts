/**
 * Billing Domain Event Schemas v1.4.0
 * Type-safe event contracts for billing-related events
 */

export interface BillingSubscriptionCreatedEvent {
  subscriptionId: string;
  tenantId: string;
  planId: string;
  planName: string;
  pricing: {
    amount: number;
    currency: string;
    interval: 'monthly' | 'yearly';
    trialEndsAt?: string;
  };
  customer: {
    id: string;
    email: string;
    name: string;
  };
  timestamp: string;
}

export interface BillingSubscriptionUpdatedEvent {
  subscriptionId: string;
  tenantId: string;
  changes: {
    planId?: string;
    planName?: string;
    pricing?: {
      amount: number;
      currency: string;
      interval: 'monthly' | 'yearly';
    };
    status?: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  };
  previousState: any;
  timestamp: string;
}

export interface BillingSubscriptionCancelledEvent {
  subscriptionId: string;
  tenantId: string;
  reason: 'user_request' | 'payment_failed' | 'admin_action' | 'trial_ended';
  cancellationDate: string;
  effectiveDate: string;
  refundAmount?: number;
  timestamp: string;
}

export interface BillingPaymentSucceededEvent {
  paymentId: string;
  subscriptionId: string;
  tenantId: string;
  amount: number;
  currency: string;
  paymentMethod: {
    type: string;
    last4: string;
    brand: string;
  };
  invoiceId: string;
  timestamp: string;
}

export interface BillingPaymentFailedEvent {
  paymentId: string;
  subscriptionId: string;
  tenantId: string;
  amount: number;
  currency: string;
  error: {
    code: string;
    message: string;
    type: string;
  };
  retryCount: number;
  nextRetryAt?: string;
  timestamp: string;
}

export interface BillingUsageRecordedEvent {
  tenantId: string;
  metric: string;
  quantity: number;
  unit: string;
  period: {
    start: string;
    end: string;
  };
  cost: number;
  currency: string;
  timestamp: string;
}

export interface BillingInvoiceGeneratedEvent {
  invoiceId: string;
  tenantId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  dueDate: string;
  status: 'draft' | 'open' | 'paid' | 'void';
  timestamp: string;
}

export interface BillingInvoicePaidEvent {
  invoiceId: string;
  tenantId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  paymentId: string;
  paidAt: string;
  timestamp: string;
}

export interface BillingRefundProcessedEvent {
  refundId: string;
  paymentId: string;
  tenantId: string;
  amount: number;
  currency: string;
  reason: 'requested_by_customer' | 'duplicate' | 'fraudulent' | 'other';
  status: 'succeeded' | 'pending' | 'failed';
  timestamp: string;
}

export interface BillingTrialEndingEvent {
  subscriptionId: string;
  tenantId: string;
  trialEndsAt: string;
  daysRemaining: number;
  planId: string;
  planName: string;
  timestamp: string;
}

export interface BillingQuotaExceededEvent {
  tenantId: string;
  metric: string;
  currentUsage: number;
  quota: number;
  period: 'daily' | 'monthly';
  action: 'throttle' | 'block' | 'notify';
  timestamp: string;
}

// Event type constants
export const BILLING_EVENT_TYPES = {
  SUBSCRIPTION_CREATED: 'billing.subscription.created',
  SUBSCRIPTION_UPDATED: 'billing.subscription.updated',
  SUBSCRIPTION_CANCELLED: 'billing.subscription.cancelled',
  PAYMENT_SUCCEEDED: 'billing.payment.succeeded',
  PAYMENT_FAILED: 'billing.payment.failed',
  USAGE_RECORDED: 'billing.usage.recorded',
  INVOICE_GENERATED: 'billing.invoice.generated',
  INVOICE_PAID: 'billing.invoice.paid',
  REFUND_PROCESSED: 'billing.refund.processed',
  TRIAL_ENDING: 'billing.trial.ending',
  QUOTA_EXCEEDED: 'billing.quota.exceeded',
} as const;

export type BillingEventType = typeof BILLING_EVENT_TYPES[keyof typeof BILLING_EVENT_TYPES];
