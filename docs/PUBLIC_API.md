# Public API Documentation

## Overview

MortgageMatchPro v1.3.0 provides a comprehensive REST API for programmatic access to mortgage matching and analysis features. The API is multi-tenant aware and requires organization-scoped authentication.

## Base URL

```
Production: https://api.mortgagematchpro.com/v1
Staging: https://staging-api.mortgagematchpro.com/v1
```

## Authentication

### API Key Authentication

All API requests require an API key in the `X-API-Key` header and organization ID in the `X-Organization-ID` header.

```bash
curl -H "X-API-Key: your-api-key" \
     -H "X-Organization-ID: org_123" \
     https://api.mortgagematchpro.com/v1/scenarios
```

### API Key Management

API keys are managed through the admin console:

1. Navigate to Admin → API Keys
2. Click "Create API Key"
3. Provide name and select scopes
4. Copy the generated key (shown only once)

### Scopes

API keys can be scoped to specific operations:

- `scenarios:read` - Read mortgage scenarios
- `scenarios:write` - Create/update scenarios
- `matches:read` - Read mortgage matches
- `reports:read` - Read reports
- `reports:write` - Generate reports
- `rates:read` - Read current rates

## Rate Limiting

API requests are rate limited per organization:

- **Free Plan**: 100 requests/day
- **Pro Plan**: 10,000 requests/day
- **Enterprise Plan**: 100,000 requests/day

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9999
X-RateLimit-Reset: 1640995200
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "propertyValue",
      "reason": "Must be greater than 0"
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_API_KEY` | API key is invalid or expired |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `VALIDATION_ERROR` | Request validation failed |
| `ENDPOINT_NOT_FOUND` | API endpoint not found |
| `METHOD_NOT_ALLOWED` | HTTP method not allowed |
| `INTERNAL_ERROR` | Internal server error |

## Endpoints

### Scenarios

#### GET /scenarios

Retrieve all mortgage scenarios for the organization.

**Response:**
```json
{
  "success": true,
  "data": [
    {
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
    }
  ],
  "meta": {
    "requestId": "req_123",
    "timestamp": "2024-01-15T10:30:00Z",
    "rateLimit": {
      "limit": 10000,
      "remaining": 9999,
      "resetAt": "2024-01-16T00:00:00Z"
    }
  }
}
```

#### POST /scenarios

Create a new mortgage scenario.

**Request:**
```json
{
  "propertyValue": 500000,
  "downPayment": 100000,
  "loanTerm": 30,
  "interestRate": 0.035,
  "propertyType": "single_family",
  "occupancy": "primary",
  "creditScore": 750,
  "income": 120000,
  "debts": 2000
}
```

**Response:**
```json
{
  "success": true,
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
  "meta": {
    "requestId": "req_123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Matches

#### GET /matches

Retrieve mortgage matches for a specific scenario.

**Query Parameters:**
- `scenarioId` (required) - ID of the scenario

**Response:**
```json
{
  "success": true,
  "data": [
    {
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
    }
  ],
  "meta": {
    "requestId": "req_123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Reports

#### GET /reports

Retrieve all reports for the organization.

**Response:**
```json
{
  "success": true,
  "data": [
    {
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
    }
  ],
  "meta": {
    "requestId": "req_123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /reports

Generate a new report.

**Request:**
```json
{
  "type": "market_analysis",
  "parameters": {
    "timeframe": "Q1_2024",
    "region": "California",
    "propertyTypes": ["single_family", "condo"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "report_123",
    "organizationId": "org_123",
    "type": "market_analysis",
    "status": "generating",
    "parameters": {
      "timeframe": "Q1_2024",
      "region": "California",
      "propertyTypes": ["single_family", "condo"]
    },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Rates

#### GET /rates

Retrieve current mortgage rates.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "rates_123",
    "organizationId": "org_123",
    "rates": {
      "conventional30": 0.035,
      "conventional15": 0.030,
      "fha30": 0.032,
      "va30": 0.031
    },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Webhooks

### Webhook Events

The API sends webhooks for various events:

- `scenario.created` - New scenario created
- `match.created` - New match generated
- `report.completed` - Report generation completed
- `api.request.completed` - API request completed
- `usage.updated` - Usage metrics updated
- `invoice.ready` - New invoice generated
- `api.key.rotated` - API key rotated

### Webhook Payload

```json
{
  "id": "evt_123",
  "event": "scenario.created",
  "data": {
    "id": "scenario_123",
    "organizationId": "org_123",
    "propertyValue": 500000
  },
  "created": "2024-01-15T10:30:00Z"
}
```

### Webhook Verification

Webhooks include a signature header for verification:

```bash
X-Webhook-Signature: sha256=abc123...
```

Verify the signature:

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
```

## SDKs and Examples

### JavaScript/Node.js

```javascript
const MortgageMatchAPI = require('@mortgagematchpro/api-client')

const client = new MortgageMatchAPI({
  apiKey: 'your-api-key',
  organizationId: 'org_123',
  baseURL: 'https://api.mortgagematchpro.com/v1'
})

// Create scenario
const scenario = await client.scenarios.create({
  propertyValue: 500000,
  downPayment: 100000,
  loanTerm: 30,
  propertyType: 'single_family',
  occupancy: 'primary',
  creditScore: 750,
  income: 120000
})

// Get matches
const matches = await client.matches.get(scenario.id)

// Generate report
const report = await client.reports.create({
  type: 'market_analysis',
  parameters: {
    timeframe: 'Q1_2024'
  }
})
```

### Python

```python
from mortgagematchpro import MortgageMatchAPI

client = MortgageMatchAPI(
    api_key='your-api-key',
    organization_id='org_123',
    base_url='https://api.mortgagematchpro.com/v1'
)

# Create scenario
scenario = client.scenarios.create({
    'propertyValue': 500000,
    'downPayment': 100000,
    'loanTerm': 30,
    'propertyType': 'single_family',
    'occupancy': 'primary',
    'creditScore': 750,
    'income': 120000
})

# Get matches
matches = client.matches.get(scenario['id'])

# Generate report
report = client.reports.create({
    'type': 'market_analysis',
    'parameters': {
        'timeframe': 'Q1_2024'
    }
})
```

### cURL Examples

#### Create Scenario

```bash
curl -X POST https://api.mortgagematchpro.com/v1/scenarios \
  -H "X-API-Key: your-api-key" \
  -H "X-Organization-ID: org_123" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyValue": 500000,
    "downPayment": 100000,
    "loanTerm": 30,
    "propertyType": "single_family",
    "occupancy": "primary",
    "creditScore": 750,
    "income": 120000
  }'
```

#### Get Matches

```bash
curl -X GET "https://api.mortgagematchpro.com/v1/matches?scenarioId=scenario_123" \
  -H "X-API-Key: your-api-key" \
  -H "X-Organization-ID: org_123"
```

#### Generate Report

```bash
curl -X POST https://api.mortgagematchpro.com/v1/reports \
  -H "X-API-Key: your-api-key" \
  -H "X-Organization-ID: org_123" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "market_analysis",
    "parameters": {
      "timeframe": "Q1_2024"
    }
  }'
```

## Testing

### Postman Collection

Import the Postman collection for easy API testing:

```json
{
  "info": {
    "name": "MortgageMatchPro API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://api.mortgagematchpro.com/v1"
    },
    {
      "key": "apiKey",
      "value": "your-api-key"
    },
    {
      "key": "organizationId",
      "value": "org_123"
    }
  ]
}
```

### Test Data

Use the provided test data for development:

```json
{
  "testScenario": {
    "propertyValue": 500000,
    "downPayment": 100000,
    "loanTerm": 30,
    "propertyType": "single_family",
    "occupancy": "primary",
    "creditScore": 750,
    "income": 120000,
    "debts": 2000
  }
}
```

## Best Practices

### Error Handling

```javascript
try {
  const scenario = await client.scenarios.create(data)
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limit
    await new Promise(resolve => setTimeout(resolve, 60000))
    return client.scenarios.create(data)
  } else if (error.code === 'VALIDATION_ERROR') {
    // Handle validation error
    console.error('Validation failed:', error.details)
  } else {
    // Handle other errors
    console.error('API error:', error.message)
  }
}
```

### Rate Limiting

```javascript
class RateLimitedClient {
  constructor(apiKey, organizationId) {
    this.client = new MortgageMatchAPI({ apiKey, organizationId })
    this.rateLimit = {
      limit: 10000,
      remaining: 10000,
      resetAt: null
    }
  }
  
  async makeRequest(endpoint, options) {
    if (this.rateLimit.remaining <= 0) {
      const waitTime = this.rateLimit.resetAt - Date.now()
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    const response = await this.client.request(endpoint, options)
    
    // Update rate limit info
    this.rateLimit = {
      limit: parseInt(response.headers['x-ratelimit-limit']),
      remaining: parseInt(response.headers['x-ratelimit-remaining']),
      resetAt: parseInt(response.headers['x-ratelimit-reset']) * 1000
    }
    
    return response
  }
}
```

### Webhook Handling

```javascript
const express = require('express')
const crypto = require('crypto')

const app = express()
app.use(express.raw({ type: 'application/json' }))

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature']
  const payload = req.body
  
  // Verify signature
  if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
    return res.status(401).send('Invalid signature')
  }
  
  const event = JSON.parse(payload)
  
  switch (event.event) {
    case 'scenario.created':
      handleScenarioCreated(event.data)
      break
    case 'match.created':
      handleMatchCreated(event.data)
      break
    case 'report.completed':
      handleReportCompleted(event.data)
      break
  }
  
  res.status(200).send('OK')
})
```

## Support

### Getting Help

- **Documentation**: https://docs.mortgagematchpro.com
- **API Reference**: https://api.mortgagematchpro.com/docs
- **Support Email**: api-support@mortgagematchpro.com
- **Status Page**: https://status.mortgagematchpro.com

### API Status

Check the API status at https://status.mortgagematchpro.com for:
- Current API status
- Planned maintenance windows
- Incident reports
- Performance metrics