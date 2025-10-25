# Webhooks Documentation

## Overview

MortgageMatchPro v1.3.0 includes comprehensive webhook support for real-time event notifications. Webhooks allow your application to receive instant updates about important events without polling the API.

## Architecture

### Webhook Flow

1. **Event Occurs**: An event happens in the system (e.g., scenario created)
2. **Webhook Triggered**: The system identifies webhook endpoints for the organization
3. **HTTP Request**: A POST request is sent to each configured endpoint
4. **Signature Verification**: The endpoint verifies the request signature
5. **Response Handling**: The system processes the response and retries if needed

### Event Types

| Event | Description | Triggered When |
|-------|-------------|----------------|
| `scenario.created` | New mortgage scenario created | User creates a scenario |
| `match.created` | New mortgage match generated | AI generates matches for a scenario |
| `report.completed` | Report generation completed | Report finishes processing |
| `api.request.completed` | API request completed | External API call finishes |
| `usage.updated` | Usage metrics updated | Usage limits or quotas change |
| `invoice.ready` | New invoice generated | Monthly billing invoice created |
| `api.key.rotated` | API key rotated | API key is regenerated |
| `webhook.delivery.failed` | Webhook delivery failed | Webhook endpoint returns error |

## Webhook Configuration

### Creating Webhook Endpoints

Webhook endpoints are configured through the admin console:

1. Navigate to Admin → Webhooks
2. Click "Create Webhook Endpoint"
3. Provide endpoint URL and select events
4. Save the configuration

### Endpoint Requirements

- **HTTPS Required**: All webhook endpoints must use HTTPS
- **POST Method**: Webhooks are sent via POST requests
- **JSON Content**: Request body contains JSON event data
- **Signature Verification**: Verify the `X-Webhook-Signature` header

### Event Selection

Select which events to receive:

```typescript
const webhookEndpoint = {
  url: 'https://your-app.com/webhooks/mortgagematch',
  events: [
    'scenario.created',
    'match.created',
    'report.completed'
  ]
}
```

## Webhook Payload

### Standard Format

All webhook payloads follow this format:

```json
{
  "id": "evt_1234567890",
  "event": "scenario.created",
  "data": {
    // Event-specific data
  },
  "created": "2024-01-15T10:30:00Z"
}
```

### Event-Specific Payloads

#### scenario.created

```json
{
  "id": "evt_1234567890",
  "event": "scenario.created",
  "data": {
    "id": "scenario_123",
    "organizationId": "org_123",
    "propertyValue": 500000,
    "downPayment": 100000,
    "loanAmount": 400000,
    "loanTerm": 30,
    "interestRate": 0.035,
    "propertyType": "single_family",
    "occupancy": "primary",
    "creditScore": 750,
    "income": 120000,
    "debts": 2000,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "created": "2024-01-15T10:30:00Z"
}
```

#### match.created

```json
{
  "id": "evt_1234567890",
  "event": "match.created",
  "data": {
    "id": "match_123",
    "scenarioId": "scenario_123",
    "brokerId": "broker_456",
    "score": 95,
    "interestRate": 0.032,
    "monthlyPayment": 1850,
    "totalCost": 666000,
    "broker": {
      "id": "broker_456",
      "name": "John Smith",
      "company": "Premier Mortgage",
      "contactInfo": {
        "email": "john@premiermortgage.com",
        "phone": "+1-555-0123",
        "website": "https://premiermortgage.com"
      }
    },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "created": "2024-01-15T10:30:00Z"
}
```

#### report.completed

```json
{
  "id": "evt_1234567890",
  "event": "report.completed",
  "data": {
    "id": "report_123",
    "organizationId": "org_123",
    "type": "market_analysis",
    "status": "completed",
    "data": {
      "summary": "Market analysis for Q1 2024",
      "trends": ["Rising rates", "Increased demand"],
      "recommendations": ["Consider fixed rates", "Lock in rates soon"]
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:35:00Z"
  },
  "created": "2024-01-15T10:30:00Z"
}
```

#### usage.updated

```json
{
  "id": "evt_1234567890",
  "event": "usage.updated",
  "data": {
    "organizationId": "org_123",
    "date": "2024-01-15",
    "apiCalls": 150,
    "aiRequests": 25,
    "aiTokens": 5000,
    "webhookDeliveries": 10,
    "exports": 2,
    "totalCost": 12.50,
    "limits": {
      "apiCallsPerDay": 10000,
      "aiRequestsPerDay": 1000,
      "dailyBudget": 50.00
    },
    "warnings": [
      "Approaching daily API call limit (85% used)"
    ]
  },
  "created": "2024-01-15T10:30:00Z"
}
```

#### invoice.ready

```json
{
  "id": "evt_1234567890",
  "event": "invoice.ready",
  "data": {
    "id": "inv_123",
    "organizationId": "org_123",
    "amount": 99.00,
    "currency": "USD",
    "dueDate": "2024-02-15",
    "items": [
      {
        "description": "Pro Plan - January 2024",
        "quantity": 1,
        "unitPrice": 99.00,
        "total": 99.00
      }
    ],
    "status": "open",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "created": "2024-01-15T10:30:00Z"
}
```

## Security

### Signature Verification

All webhook requests include a signature header for verification:

```
X-Webhook-Signature: sha256=abc123def456...
```

### Verification Process

1. **Extract Signature**: Get the signature from the `X-Webhook-Signature` header
2. **Compute Expected Signature**: Create HMAC-SHA256 of the request body using your webhook secret
3. **Compare Signatures**: Use constant-time comparison to prevent timing attacks

### Implementation Examples

#### Node.js

```javascript
const crypto = require('crypto')

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// Express.js middleware
app.use('/webhooks', express.raw({ type: 'application/json' }))

app.post('/webhooks/mortgagematch', (req, res) => {
  const signature = req.headers['x-webhook-signature']
  const payload = req.body
  
  if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
    return res.status(401).send('Invalid signature')
  }
  
  const event = JSON.parse(payload)
  // Process event...
  
  res.status(200).send('OK')
})
```

#### Python

```python
import hmac
import hashlib
import json

def verify_webhook_signature(payload, signature, secret):
    expected_signature = f"sha256={hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()}"
    return hmac.compare_digest(signature, expected_signature)

# Flask example
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/mortgagematch', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data()
    
    if not verify_webhook_signature(payload, signature, webhook_secret):
        return 'Invalid signature', 401
    
    event = json.loads(payload)
    # Process event...
    
    return 'OK', 200
```

#### PHP

```php
function verifyWebhookSignature($payload, $signature, $secret) {
    $expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    return hash_equals($signature, $expectedSignature);
}

// Handle webhook
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'];
$payload = file_get_contents('php://input');

if (!verifyWebhookSignature($payload, $signature, $webhookSecret)) {
    http_response_code(401);
    exit('Invalid signature');
}

$event = json_decode($payload, true);
// Process event...
```

## Delivery and Retries

### Delivery Process

1. **Immediate Delivery**: Webhook is sent immediately when event occurs
2. **Response Required**: Endpoint must return 2xx status code
3. **Timeout**: 30-second timeout for response
4. **Retry Logic**: Automatic retries with exponential backoff

### Retry Schedule

| Attempt | Delay | Total Time |
|---------|-------|------------|
| 1 | Immediate | 0s |
| 2 | 1s | 1s |
| 3 | 2s | 3s |
| 4 | 4s | 7s |
| 5 | 8s | 15s |

### Retry Conditions

Webhooks are retried for:
- HTTP status codes 5xx (server errors)
- Network timeouts
- Connection failures
- Invalid JSON responses

Webhooks are NOT retried for:
- HTTP status codes 2xx (success)
- HTTP status codes 4xx (client errors)
- Maximum retry attempts exceeded

### Dead Letter Queue

After 5 failed attempts, webhooks are moved to a dead letter queue for manual review and retry.

## Webhook Management

### Admin Console

Manage webhooks through the admin console:

1. **View Endpoints**: See all configured webhook endpoints
2. **Delivery History**: View delivery attempts and status
3. **Retry Failed**: Manually retry failed deliveries
4. **Test Webhooks**: Send test events to endpoints

### API Management

```typescript
import { WebhookService } from '@/lib/webhooks/webhook-service'

// Create webhook endpoint
const endpoint = await WebhookService.createWebhookEndpoint(
  organizationId,
  'https://your-app.com/webhooks',
  ['scenario.created', 'match.created'],
  userId,
  userRole
)

// Get webhook endpoints
const endpoints = await WebhookService.getWebhookEndpoints(
  organizationId,
  userId,
  userRole
)

// Update webhook endpoint
await WebhookService.updateWebhookEndpoint(
  endpointId,
  organizationId,
  { events: ['scenario.created'] },
  userId,
  userRole
)

// Delete webhook endpoint
await WebhookService.deleteWebhookEndpoint(
  endpointId,
  organizationId,
  userId,
  userRole
)
```

### Delivery Monitoring

```typescript
// Get delivery history
const deliveries = await WebhookService.getWebhookDeliveries(
  organizationId,
  webhookId
)

// Retry failed delivery
await WebhookService.retryWebhookDelivery(
  deliveryId,
  organizationId,
  userId,
  userRole
)
```

## Testing

### Test Events

Send test events to verify webhook configuration:

```bash
curl -X POST https://api.mortgagematchpro.com/v1/webhooks/test \
  -H "X-API-Key: your-api-key" \
  -H "X-Organization-ID: org_123" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookId": "webhook_123",
    "eventType": "scenario.created",
    "testData": {
      "id": "test_scenario_123",
      "propertyValue": 500000
    }
  }'
```

### Local Development

Use ngrok or similar tools for local webhook testing:

```bash
# Install ngrok
npm install -g ngrok

# Start your local server
npm start

# Expose local server
ngrok http 3000

# Use ngrok URL for webhook endpoint
# https://abc123.ngrok.io/webhooks/mortgagematch
```

### Webhook Testing Tools

- **ngrok**: Expose local servers for webhook testing
- **webhook.site**: Temporary webhook endpoints for testing
- **Postman**: Test webhook endpoints and payloads
- **Insomnia**: API testing with webhook support

## Best Practices

### Endpoint Design

1. **Idempotent**: Handle duplicate events gracefully
2. **Fast Response**: Return 2xx status quickly
3. **Async Processing**: Process events asynchronously
4. **Error Handling**: Log errors and return appropriate status codes
5. **Security**: Always verify webhook signatures

### Event Processing

```javascript
// Idempotent event processing
const processedEvents = new Set()

function processEvent(event) {
  if (processedEvents.has(event.id)) {
    console.log('Event already processed:', event.id)
    return
  }
  
  try {
    // Process event
    switch (event.event) {
      case 'scenario.created':
        handleScenarioCreated(event.data)
        break
      case 'match.created':
        handleMatchCreated(event.data)
        break
      // ... other events
    }
    
    // Mark as processed
    processedEvents.add(event.id)
  } catch (error) {
    console.error('Error processing event:', error)
    throw error // This will cause a retry
  }
}
```

### Error Handling

```javascript
function handleWebhook(req, res) {
  try {
    // Verify signature
    if (!verifyWebhookSignature(req.body, req.headers['x-webhook-signature'], webhookSecret)) {
      return res.status(401).send('Invalid signature')
    }
    
    const event = JSON.parse(req.body)
    
    // Process event asynchronously
    processEventAsync(event)
      .then(() => {
        res.status(200).send('OK')
      })
      .catch((error) => {
        console.error('Event processing failed:', error)
        res.status(500).send('Processing failed')
      })
      
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(400).send('Bad request')
  }
}
```

### Monitoring

```javascript
// Webhook delivery monitoring
function logWebhookDelivery(event, status, responseTime) {
  console.log({
    eventId: event.id,
    eventType: event.event,
    status: status,
    responseTime: responseTime,
    timestamp: new Date().toISOString()
  })
}

// Health check endpoint
app.get('/webhooks/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})
```

## Troubleshooting

### Common Issues

1. **Webhook Not Received**: Check endpoint URL and HTTPS
2. **Invalid Signature**: Verify webhook secret and signature calculation
3. **Timeout Errors**: Ensure endpoint responds within 30 seconds
4. **Duplicate Events**: Implement idempotent processing
5. **Retry Loops**: Check for 5xx status codes in responses

### Debug Tools

- **Webhook Logs**: Check delivery history in admin console
- **Signature Validator**: Verify signature calculation
- **Response Inspector**: Check endpoint response codes
- **Network Monitor**: Monitor webhook delivery attempts
- **Error Alerts**: Set up alerts for failed deliveries

### Support

For webhook-related issues:

- **Documentation**: https://docs.mortgagematchpro.com/webhooks
- **Support Email**: webhooks@mortgagematchpro.com
- **Status Page**: https://status.mortgagematchpro.com
- **API Reference**: https://api.mortgagematchpro.com/docs