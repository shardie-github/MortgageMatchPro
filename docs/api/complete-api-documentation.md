# Complete API Documentation

## Overview

This document provides comprehensive API documentation for the MortgageMatch Pro platform, including all endpoints, request/response examples, error handling, and rate limiting details.

## Base URL

```
Production: https://mortgagematch-pro.vercel.app/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require authentication unless otherwise specified. Include the JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

| Endpoint Category | Limit | Window | Headers |
|------------------|-------|--------|---------|
| Authentication | 10 requests | 1 minute | `X-RateLimit-Limit`, `X-RateLimit-Remaining` |
| Mortgage Calculations | 100 requests | 1 hour | `X-RateLimit-Limit`, `X-RateLimit-Remaining` |
| Rate APIs | 60 requests | 1 minute | `X-RateLimit-Limit`, `X-RateLimit-Remaining` |
| General API | 1000 requests | 1 hour | `X-RateLimit-Limit`, `X-RateLimit-Remaining` |

When rate limit is exceeded, the API returns:
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  },
  "timestamp": "2024-12-19T10:30:00Z",
  "requestId": "req_123456789"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | External service unavailable |

## API Endpoints

### Authentication

#### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "userType": "borrower"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user_123456789",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "borrower",
    "emailVerified": false,
    "createdAt": "2024-12-19T10:30:00Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  },
  "timestamp": "2024-12-19T10:30:00Z",
  "requestId": "req_123456789"
}
```

#### POST /api/auth/login

Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_123456789",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "borrower"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid email or password",
  "code": "UNAUTHORIZED",
  "timestamp": "2024-12-19T10:30:00Z",
  "requestId": "req_123456789"
}
```

#### POST /api/auth/logout

Logout user and invalidate token.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Mortgage Calculations

#### POST /api/mortgage/calculate

Calculate mortgage affordability and options.

**Request Body:**
```json
{
  "income": 100000,
  "monthlyDebts": 500,
  "downPayment": 50000,
  "propertyPrice": 500000,
  "interestRate": 3.5,
  "termYears": 25,
  "propertyType": "single_family",
  "location": {
    "city": "Toronto",
    "province": "ON",
    "postalCode": "M5V 3A8"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "calculation": {
    "id": "calc_123456789",
    "monthlyPayment": 2456.78,
    "totalInterest": 236627.00,
    "totalCost": 736627.00,
    "affordability": {
      "maxAffordablePrice": 525000,
      "debtToIncomeRatio": 0.35,
      "grossDebtServiceRatio": 0.32,
      "totalDebtServiceRatio": 0.28
    },
    "recommendations": [
      {
        "type": "down_payment",
        "message": "Consider increasing down payment to 20% to avoid CMHC insurance",
        "impact": "savings",
        "amount": 15000
      }
    ],
    "rates": {
      "current": 3.5,
      "bestAvailable": 3.25,
      "source": "RateHub.ca"
    }
  },
  "timestamp": "2024-12-19T10:30:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid mortgage calculation parameters",
  "code": "VALIDATION_ERROR",
  "details": {
    "income": "Income must be positive",
    "propertyPrice": "Property price must be greater than down payment"
  },
  "timestamp": "2024-12-19T10:30:00Z",
  "requestId": "req_123456789"
}
```

#### GET /api/mortgage/calculations

Get user's mortgage calculation history.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort direction (asc/desc, default: desc)

**Response (200 OK):**
```json
{
  "success": true,
  "calculations": [
    {
      "id": "calc_123456789",
      "propertyPrice": 500000,
      "monthlyPayment": 2456.78,
      "createdAt": "2024-12-19T10:30:00Z",
      "status": "completed"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Rate Information

#### GET /api/rates/current

Get current mortgage rates from multiple sources.

**Query Parameters:**
- `propertyType` (optional): Type of property (single_family, condo, townhouse)
- `term` (optional): Mortgage term in years (1, 2, 3, 4, 5, 7, 10)
- `amortization` (optional): Amortization period in years (15, 20, 25, 30)

**Response (200 OK):**
```json
{
  "success": true,
  "rates": {
    "fixed": [
      {
        "term": 5,
        "rate": 3.25,
        "source": "RateHub.ca",
        "lastUpdated": "2024-12-19T10:30:00Z",
        "lender": "TD Bank",
        "features": ["Portable", "Prepayment options"]
      }
    ],
    "variable": [
      {
        "term": 5,
        "rate": 2.95,
        "source": "Freddie Mac",
        "lastUpdated": "2024-12-19T10:30:00Z",
        "lender": "RBC",
        "features": ["Convertible", "Prepayment options"]
      }
    ]
  },
  "lastUpdated": "2024-12-19T10:30:00Z"
}
```

**Error Response (503 Service Unavailable):**
```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Rate services are temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "details": {
    "fallbackUsed": true,
    "cachedData": true
  },
  "timestamp": "2024-12-19T10:30:00Z",
  "requestId": "req_123456789"
}
```

### Lead Management

#### POST /api/leads/create

Create a new lead for broker matching.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "propertyPrice": 500000,
  "downPayment": 50000,
  "income": 100000,
  "preferredContact": "email",
  "timeline": "3_months",
  "location": {
    "city": "Toronto",
    "province": "ON"
  },
  "notes": "First-time homebuyer looking for guidance"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Lead created successfully",
  "lead": {
    "id": "lead_123456789",
    "status": "new",
    "assignedBroker": null,
    "createdAt": "2024-12-19T10:30:00Z",
    "estimatedResponseTime": "2-4 hours"
  }
}
```

#### GET /api/leads

Get leads for authenticated broker.

**Query Parameters:**
- `status` (optional): Filter by status (new, contacted, qualified, closed)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

**Response (200 OK):**
```json
{
  "success": true,
  "leads": [
    {
      "id": "lead_123456789",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "propertyPrice": 500000,
      "status": "new",
      "createdAt": "2024-12-19T10:30:00Z",
      "priority": "high"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

### Broker Management

#### GET /api/brokers/profile

Get broker profile information.

**Response (200 OK):**
```json
{
  "success": true,
  "broker": {
    "id": "broker_123456789",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@example.com",
    "phone": "+1234567890",
    "licenseNumber": "M12345678",
    "company": "ABC Mortgage Brokers",
    "specialties": ["first_time_buyers", "investment_properties"],
    "serviceAreas": ["Toronto", "Mississauga", "Brampton"],
    "rating": 4.8,
    "totalDeals": 150,
    "yearsExperience": 8
  }
}
```

#### PUT /api/brokers/profile

Update broker profile information.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890",
  "company": "ABC Mortgage Brokers",
  "specialties": ["first_time_buyers", "investment_properties"],
  "serviceAreas": ["Toronto", "Mississauga", "Brampton"],
  "bio": "Experienced mortgage broker specializing in first-time homebuyers"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "broker": {
    "id": "broker_123456789",
    "firstName": "Jane",
    "lastName": "Smith",
    "updatedAt": "2024-12-19T10:30:00Z"
  }
}
```

### Health and Monitoring

#### GET /api/health

Get system health status.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-19T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "lastChecked": "2024-12-19T10:30:00Z"
    },
    "redis": {
      "status": "healthy",
      "responseTime": 12,
      "lastChecked": "2024-12-19T10:30:00Z"
    },
    "externalApis": {
      "openai": "healthy",
      "stripe": "healthy",
      "ratehub": "healthy",
      "freddie_mac": "healthy"
    }
  },
  "uptime": 86400,
  "memoryUsage": {
    "used": "256MB",
    "total": "512MB",
    "percentage": 50
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-12-19T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "unhealthy",
      "error": "Connection timeout",
      "lastChecked": "2024-12-19T10:30:00Z"
    }
  },
  "uptime": 86400
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { MortgageMatchAPI } from '@mortgagematch/api-client';

const api = new MortgageMatchAPI({
  baseURL: 'https://mortgagematch-pro.vercel.app/api',
  apiKey: 'your-api-key'
});

// Calculate mortgage
const calculation = await api.mortgage.calculate({
  income: 100000,
  monthlyDebts: 500,
  downPayment: 50000,
  propertyPrice: 500000,
  interestRate: 3.5,
  termYears: 25
});

// Get current rates
const rates = await api.rates.getCurrent({
  propertyType: 'single_family',
  term: 5
});
```

### Python

```python
import requests
from mortgagematch import MortgageMatchClient

client = MortgageMatchClient(
    base_url='https://mortgagematch-pro.vercel.app/api',
    api_key='your-api-key'
)

# Calculate mortgage
calculation = client.mortgage.calculate(
    income=100000,
    monthly_debts=500,
    down_payment=50000,
    property_price=500000,
    interest_rate=3.5,
    term_years=25
)

# Get current rates
rates = client.rates.get_current(
    property_type='single_family',
    term=5
)
```

### cURL Examples

```bash
# Calculate mortgage
curl -X POST https://mortgagematch-pro.vercel.app/api/mortgage/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "income": 100000,
    "monthlyDebts": 500,
    "downPayment": 50000,
    "propertyPrice": 500000,
    "interestRate": 3.5,
    "termYears": 25
  }'

# Get current rates
curl -X GET "https://mortgagematch-pro.vercel.app/api/rates/current?propertyType=single_family&term=5" \
  -H "Authorization: Bearer your-jwt-token"
```

## Webhooks

### Lead Created Webhook

**Endpoint:** `POST /webhooks/leads/created`

**Headers:**
```http
Content-Type: application/json
X-Webhook-Signature: sha256=...
```

**Payload:**
```json
{
  "event": "lead.created",
  "data": {
    "lead": {
      "id": "lead_123456789",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "propertyPrice": 500000,
      "createdAt": "2024-12-19T10:30:00Z"
    }
  },
  "timestamp": "2024-12-19T10:30:00Z"
}
```

### Payment Processed Webhook

**Endpoint:** `POST /webhooks/payments/processed`

**Payload:**
```json
{
  "event": "payment.processed",
  "data": {
    "payment": {
      "id": "pay_123456789",
      "amount": 99.00,
      "currency": "CAD",
      "status": "succeeded",
      "customerId": "user_123456789",
      "createdAt": "2024-12-19T10:30:00Z"
    }
  },
  "timestamp": "2024-12-19T10:30:00Z"
}
```

## Changelog

### v1.0.0 (2024-12-19)
- Initial API release
- Authentication endpoints
- Mortgage calculation endpoints
- Rate information endpoints
- Lead management endpoints
- Broker management endpoints
- Health monitoring endpoints

## Support

For API support and questions:
- Email: api-support@mortgagematch.com
- Documentation: https://docs.mortgagematch.com
- Status Page: https://status.mortgagematch.com