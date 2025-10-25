// Billing and metering types
export type BillingProvider = 'stripe' | 'mock' | 'custom'
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
export type PaymentMethodType = 'card' | 'bank_account' | 'paypal'
export type UsageEventType = 'ai_call' | 'ai_token' | 'api_call' | 'webhook_delivery' | 'export' | 'storage'

export interface BillingCustomer {
  id: string
  organizationId: string
  providerId: string // Stripe customer ID, etc.
  email: string
  name: string
  currency: string
  taxId?: string
  address?: BillingAddress
  createdAt: string
  updatedAt: string
}

export interface BillingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface PaymentMethod {
  id: string
  organizationId: string
  providerId: string
  type: PaymentMethodType
  isDefault: boolean
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  createdAt: string
}

export interface Subscription {
  id: string
  organizationId: string
  planId: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  canceledAt?: string
  trialStart?: string
  trialEnd?: string
  quantity: number
  unitAmount: number
  currency: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  id: string
  organizationId: string
  providerId: string
  number: string
  status: InvoiceStatus
  amount: number
  amountPaid: number
  amountDue: number
  currency: string
  description?: string
  hostedInvoiceUrl?: string
  invoicePdf?: string
  periodStart: string
  periodEnd: string
  dueDate: string
  paidAt?: string
  lines: InvoiceLine[]
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unitAmount: number
  amount: number
  currency: string
  periodStart?: string
  periodEnd?: string
  metadata: Record<string, any>
}

export interface UsageEvent {
  id: string
  organizationId: string
  eventType: UsageEventType
  quantity: number
  unitPrice: number
  amount: number
  currency: string
  metadata: Record<string, any>
  timestamp: string
}

export interface UsageSnapshot {
  id: string
  organizationId: string
  date: string
  events: Record<UsageEventType, number>
  totalAmount: number
  currency: string
  createdAt: string
}

export interface BillingAdapter {
  // Customer management
  createCustomer(customer: Omit<BillingCustomer, 'id' | 'providerId' | 'createdAt' | 'updatedAt'>): Promise<BillingCustomer>
  getCustomer(organizationId: string): Promise<BillingCustomer | null>
  updateCustomer(organizationId: string, updates: Partial<BillingCustomer>): Promise<BillingCustomer>
  deleteCustomer(organizationId: string): Promise<void>

  // Payment methods
  createPaymentMethod(organizationId: string, paymentMethodData: any): Promise<PaymentMethod>
  getPaymentMethods(organizationId: string): Promise<PaymentMethod[]>
  setDefaultPaymentMethod(organizationId: string, paymentMethodId: string): Promise<void>
  deletePaymentMethod(organizationId: string, paymentMethodId: string): Promise<void>

  // Subscriptions
  createSubscription(subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription>
  getSubscription(organizationId: string): Promise<Subscription | null>
  updateSubscription(organizationId: string, updates: Partial<Subscription>): Promise<Subscription>
  cancelSubscription(organizationId: string, atPeriodEnd?: boolean): Promise<Subscription>
  resumeSubscription(organizationId: string): Promise<Subscription>

  // Invoicing
  createInvoice(invoice: Omit<Invoice, 'id' | 'providerId' | 'createdAt' | 'updatedAt'>): Promise<Invoice>
  getInvoice(invoiceId: string): Promise<Invoice | null>
  getInvoices(organizationId: string, limit?: number, startingAfter?: string): Promise<Invoice[]>
  payInvoice(invoiceId: string, paymentMethodId?: string): Promise<Invoice>
  voidInvoice(invoiceId: string): Promise<Invoice>

  // Usage tracking
  recordUsage(usageEvent: Omit<UsageEvent, 'id' | 'timestamp'>): Promise<UsageEvent>
  getUsage(organizationId: string, startDate: string, endDate: string): Promise<UsageEvent[]>
  createUsageSnapshot(snapshot: Omit<UsageSnapshot, 'id' | 'createdAt'>): Promise<UsageSnapshot>
}

export interface PlanLimits {
  maxUsers: number
  maxAiCallsPerDay: number
  maxSavedScenarios: number
  maxIntegrations: number
  maxWebhooks: number
  maxApiKeys: number
  customDomain?: boolean
  whiteLabel?: boolean
  prioritySupport?: boolean
  sla?: boolean
}

export interface PlanPricing {
  monthly: number
  yearly: number
  perAiCall?: number
  perToken?: number
  perUser?: number
  perStorageGb?: number
}

export interface Plan {
  id: string
  name: string
  description: string
  type: 'free' | 'pro' | 'enterprise'
  limits: PlanLimits
  pricing: PlanPricing
  features: string[]
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// Error types
export class BillingError extends Error {
  constructor(
    message: string,
    public code: string,
    public organizationId?: string
  ) {
    super(message)
    this.name = 'BillingError'
  }
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public organizationId: string
  ) {
    super(message)
    this.name = 'PaymentError'
  }
}

export class QuotaExceededError extends Error {
  constructor(
    message: string,
    public quota: string,
    public current: number,
    public limit: number,
    public organizationId: string
  ) {
    super(message)
    this.name = 'QuotaExceededError'
  }
}