# Billing and Metering Documentation

## Overview

MortgageMatchPro v1.3.0 includes comprehensive billing and metering capabilities with usage-based pricing, plan management, and automated invoicing.

## Architecture

### Core Components

- **Billing Adapter**: Abstract interface for payment processing
- **Metering Service**: Tracks usage and enforces quotas
- **Usage Snapshots**: Daily rollups of usage data
- **Plan Management**: Defines limits and pricing tiers
- **Invoice Generation**: Automated billing based on usage

### Billing Adapter

The billing system uses an adapter pattern to support multiple payment providers.

```typescript
interface BillingAdapter {
  createCustomer(data: BillingCustomer): Promise<BillingCustomer>
  getCustomer(customerId: string): Promise<BillingCustomer | null>
  updateCustomer(customerId: string, updates: Partial<BillingCustomer>): Promise<BillingCustomer>
  deleteCustomer(customerId: string): Promise<void>
  
  createPaymentMethod(customerId: string, data: PaymentMethod): Promise<PaymentMethod>
  getPaymentMethods(customerId: string): Promise<PaymentMethod[]>
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>
  deletePaymentMethod(paymentMethodId: string): Promise<void>
  
  createSubscription(data: SubscriptionData): Promise<Subscription>
  getSubscription(subscriptionId: string): Promise<Subscription | null>
  updateSubscription(subscriptionId: string, updates: Partial<Subscription>): Promise<Subscription>
  cancelSubscription(subscriptionId: string): Promise<Subscription>
  resumeSubscription(subscriptionId: string): Promise<Subscription>
  
  createInvoice(customerId: string, data: InvoiceData): Promise<Invoice>
  getInvoice(invoiceId: string): Promise<Invoice | null>
  payInvoice(invoiceId: string, paymentMethodId: string): Promise<Invoice>
  voidInvoice(invoiceId: string): Promise<Invoice>
  
  recordUsage(organizationId: string, event: UsageEvent): Promise<void>
  getUsage(organizationId: string, startDate: string, endDate: string): Promise<UsageSnapshot>
  createUsageSnapshot(organizationId: string, date: string): Promise<UsageSnapshot>
}
```

### Stripe Integration

The default implementation uses Stripe for payment processing:

```typescript
import { StripeBillingAdapter } from '@/lib/billing/billing-service'

const billingAdapter = new StripeBillingAdapter({
  apiKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
})
```

## Plans and Pricing

### Plan Tiers

#### Free Plan
- **Price**: $0/month
- **Users**: 1
- **API Calls**: 100/day
- **AI Requests**: 10/day
- **Scenarios**: 5
- **Reports**: 1/month
- **Webhooks**: 0
- **Support**: Community

#### Pro Plan
- **Price**: $99/month
- **Users**: 10
- **API Calls**: 10,000/day
- **AI Requests**: 1,000/day
- **Scenarios**: Unlimited
- **Reports**: 50/month
- **Webhooks**: 1,000/month
- **Support**: Email

#### Enterprise Plan
- **Price**: $499/month
- **Users**: Unlimited
- **API Calls**: 100,000/day
- **AI Requests**: 10,000/day
- **Scenarios**: Unlimited
- **Reports**: Unlimited
- **Webhooks**: 10,000/month
- **Support**: Priority

### Usage-Based Pricing

Additional usage beyond plan limits is charged at:

- **API Calls**: $0.01 per call
- **AI Requests**: $0.10 per request
- **AI Tokens**: $0.00003 per token (GPT-4)
- **Reports**: $5.00 per report
- **Webhooks**: $0.001 per delivery

## Metering System

### Usage Events

The system tracks various usage events:

```typescript
interface UsageEvent {
  organizationId: string
  eventType: 'ai_call' | 'ai_token' | 'api_call' | 'webhook_delivery' | 'export' | 'storage'
  resource: string
  quantity: number
  cost: number
  metadata?: Record<string, any>
  timestamp: string
}
```

### Event Types

#### AI Calls
- **Event Type**: `ai_call`
- **Resource**: Model name (e.g., `gpt-4`, `gpt-3.5-turbo`)
- **Quantity**: Number of requests
- **Cost**: Calculated based on model pricing

#### AI Tokens
- **Event Type**: `ai_token`
- **Resource**: Model name
- **Quantity**: Number of tokens used
- **Cost**: Tokens × cost per token

#### API Calls
- **Event Type**: `api_call`
- **Resource**: Endpoint path (e.g., `/v1/scenarios`)
- **Quantity**: Number of calls
- **Cost**: Fixed cost per call

#### Webhook Deliveries
- **Event Type**: `webhook_delivery`
- **Resource**: Webhook endpoint URL
- **Quantity**: Number of deliveries
- **Cost**: Fixed cost per delivery

#### Exports
- **Event Type**: `export`
- **Resource**: Export type (e.g., `report_pdf`, `data_csv`)
- **Quantity**: Number of exports
- **Cost**: Fixed cost per export

#### Storage
- **Event Type**: `storage`
- **Resource**: Storage type (e.g., `scenarios`, `reports`)
- **Quantity**: Storage used in MB
- **Cost**: Storage × cost per MB

### Usage Recording

```typescript
import { MeteringService } from '@/lib/billing/metering-service'

// Record API call
await MeteringService.recordApiCall(
  organizationId,
  '/v1/scenarios',
  true,
  0.01
)

// Record AI usage
await MeteringService.recordAIUsage(
  organizationId,
  'gpt-4',
  1000,
  0.03
)

// Record webhook delivery
await MeteringService.recordWebhookDelivery(
  organizationId,
  webhookId,
  true,
  0.001
)
```

### Quota Enforcement

```typescript
import { TenantScoping } from '@/lib/tenancy/scoping'

// Check if organization can perform action
const canProceed = await TenantScoping.checkLimit(
  organizationId,
  'apiCallsPerDay',
  1
)

if (!canProceed) {
  throw new Error('Daily API call limit exceeded')
}

// Enforce quota with automatic blocking
await TenantScoping.enforceQuota(
  organizationId,
  'aiRequestsPerDay',
  1
)
```

## Usage Snapshots

### Daily Snapshots

Usage data is aggregated into daily snapshots:

```typescript
interface UsageSnapshot {
  id: string
  organizationId: string
  date: string
  apiCalls: number
  aiRequests: number
  aiTokens: number
  webhookDeliveries: number
  exports: number
  storageMB: number
  totalCost: number
  createdAt: string
}
```

### Snapshot Generation

Daily snapshots are generated automatically:

```typescript
// Generate snapshot for specific date
await MeteringService.createUsageSnapshot(
  organizationId,
  '2024-01-15'
)

// Get usage for date range
const usage = await MeteringService.getUsage(
  organizationId,
  '2024-01-01',
  '2024-01-31'
)
```

## Billing Workflow

### Customer Creation

```typescript
import { getBillingAdapter } from '@/lib/billing/billing-service'

const billingAdapter = getBillingAdapter()

// Create customer
const customer = await billingAdapter.createCustomer({
  organizationId: 'org_123',
  email: 'billing@acme-mortgage.com',
  name: 'Acme Mortgage LLC'
})
```

### Payment Method Management

```typescript
// Add payment method
const paymentMethod = await billingAdapter.createPaymentMethod(
  customerId,
  {
    type: 'card',
    card: {
      number: '4242424242424242',
      expMonth: 12,
      expYear: 2025,
      cvc: '123'
    }
  }
)

// Set as default
await billingAdapter.setDefaultPaymentMethod(
  customerId,
  paymentMethod.id
)
```

### Subscription Management

```typescript
// Create subscription
const subscription = await billingAdapter.createSubscription({
  customerId: customerId,
  planId: 'pro_monthly',
  paymentMethodId: paymentMethod.id
})

// Update subscription
await billingAdapter.updateSubscription(subscriptionId, {
  planId: 'enterprise_monthly'
})

// Cancel subscription
await billingAdapter.cancelSubscription(subscriptionId)
```

### Invoice Generation

```typescript
// Create invoice
const invoice = await billingAdapter.createInvoice(customerId, {
  items: [
    {
      description: 'Pro Plan - January 2024',
      quantity: 1,
      unitPrice: 99.00
    },
    {
      description: 'Additional API Calls (1,000)',
      quantity: 1000,
      unitPrice: 0.01
    }
  ],
  dueDate: '2024-02-15'
})

// Pay invoice
await billingAdapter.payInvoice(
  invoiceId,
  paymentMethodId
)
```

## Webhook Integration

### Stripe Webhooks

The system handles Stripe webhooks for payment events:

```typescript
// Webhook handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers['stripe-signature']
  const payload = req.body

  try {
    const event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailure(event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object)
        break
    }
    
    res.status(200).json({ received: true })
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
}
```

### Custom Webhooks

Organizations can receive webhooks for billing events:

```typescript
// Send webhook event
await WebhookService.sendWebhookEvent(
  organizationId,
  'billing.invoice_created',
  {
    invoiceId: 'inv_123',
    amount: 99.00,
    dueDate: '2024-02-15'
  }
)
```

## Cost Governance

### AI Cost Management

```typescript
import { AICostGovernanceService } from '@/lib/ai/cost-governance-service'

// Set daily budget
await AICostGovernanceService.updateCostConfig(organizationId, {
  dailyBudget: 50.00,
  monthlyBudget: 1500.00,
  modelAllowlist: ['gpt-3.5-turbo', 'gpt-4'],
  fallbackModel: 'gpt-3.5-turbo'
})

// Check if AI request is allowed
const { allowed, reason, fallbackModel } = await AICostGovernanceService.checkAIRequest(
  organizationId,
  'gpt-4',
  1000
)

if (!allowed) {
  // Use fallback model or block request
  console.log(`Request blocked: ${reason}`)
}
```

### Quota Predictions

```typescript
// Get quota prediction
const prediction = await AICostGovernanceService.getQuotaPrediction(organizationId)

console.log({
  remainingRequests: prediction.remainingRequests,
  remainingTokens: prediction.remainingTokens,
  estimatedCost: prediction.estimatedCost,
  willExceedBudget: prediction.willExceedBudget,
  recommendedAction: prediction.recommendedAction
})
```

## Monitoring and Analytics

### Usage Metrics

```typescript
// Get usage statistics
const stats = await AICostGovernanceService.getUsageStats(
  organizationId,
  '2024-01-01',
  '2024-01-31'
)

console.log({
  totalTokens: stats.totalTokens,
  totalCost: stats.totalCost,
  requestCount: stats.requestCount,
  modelBreakdown: stats.modelBreakdown
})
```

### Billing Analytics

```typescript
// Get billing summary
const summary = await billingAdapter.getBillingSummary(organizationId)

console.log({
  currentPlan: summary.currentPlan,
  monthlySpend: summary.monthlySpend,
  usageBreakdown: summary.usageBreakdown,
  upcomingInvoice: summary.upcomingInvoice
})
```

## Testing

### Mock Billing Adapter

For development and testing:

```typescript
import { MockBillingAdapter } from '@/lib/billing/mock-billing-adapter'

const mockAdapter = new MockBillingAdapter()

// Configure mock responses
mockAdapter.setMockResponse('createCustomer', {
  id: 'cus_mock_123',
  email: 'test@example.com',
  name: 'Test Customer'
})

// Use in tests
const customer = await mockAdapter.createCustomer({
  organizationId: 'org_123',
  email: 'test@example.com',
  name: 'Test Customer'
})
```

### Usage Simulation

```typescript
// Simulate usage for testing
await MeteringService.recordApiCall(organizationId, '/v1/scenarios', true, 0.01)
await MeteringService.recordAIUsage(organizationId, 'gpt-4', 1000, 0.03)
await MeteringService.recordWebhookDelivery(organizationId, webhookId, true, 0.001)

// Check if limits are enforced
const canProceed = await TenantScoping.checkLimit(organizationId, 'apiCallsPerDay', 1)
expect(canProceed).toBe(false)
```

## Best Practices

### Development

1. Use mock billing adapter for local development
2. Test quota enforcement thoroughly
3. Monitor usage patterns and costs
4. Implement graceful degradation when limits are reached
5. Log all billing events for debugging

### Production

1. Set up monitoring for usage spikes
2. Configure alerts for quota violations
3. Regularly review and optimize costs
4. Implement usage forecasting
5. Monitor payment failures and retry logic

### Security

1. Validate all webhook signatures
2. Encrypt sensitive billing data
3. Implement rate limiting on billing APIs
4. Audit all billing operations
5. Use secure payment method storage

## Troubleshooting

### Common Issues

1. **Quota Exceeded**: Check usage against plan limits
2. **Payment Failed**: Verify payment method and retry
3. **Webhook Failures**: Check endpoint URL and signature validation
4. **Usage Not Recorded**: Verify metering service is called
5. **Invoice Generation**: Check usage snapshots and billing rules

### Debug Tools

- Usage analytics dashboard
- Billing event logs
- Quota monitoring alerts
- Payment failure notifications
- Webhook delivery status