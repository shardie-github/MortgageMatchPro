# Affiliate API Documentation - MortgageMatchPro

## Overview

The MortgageMatchPro Affiliate API allows partners to integrate referral tracking, commission management, and performance analytics into their applications. This API provides comprehensive tools for managing affiliate programs and tracking conversions.

## Base URL

```
https://api.mortgagematchpro.com/v1/affiliate
```

## Authentication

All API requests require authentication using an API key. Include your API key in the request header:

```
Authorization: Bearer YOUR_API_KEY
```

## Rate Limits

- **Standard Tier**: 1,000 requests per hour
- **Premium Tier**: 10,000 requests per hour
- **Enterprise Tier**: 100,000 requests per hour

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests per hour
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Endpoints

### 1. Affiliate Programs

#### Get All Programs
```http
GET /programs
```

**Response:**
```json
{
  "success": true,
  "data": {
    "programs": [
      {
        "id": "default",
        "name": "MortgageMatchPro Affiliate Program",
        "description": "Earn commissions by referring customers to MortgageMatchPro",
        "commissionRate": 0.1,
        "cookieDuration": 30,
        "status": "active",
        "requirements": {
          "minSignups": 5,
          "minRevenue": 1000,
          "approvalRequired": true
        },
        "tracking": {
          "baseUrl": "https://mortgagematchpro.com/affiliate",
          "trackingCode": "aff",
          "conversionEvents": ["signup", "subscription", "purchase"]
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### Get Program Details
```http
GET /programs/{programId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "program": {
      "id": "default",
      "name": "MortgageMatchPro Affiliate Program",
      "description": "Earn commissions by referring customers to MortgageMatchPro",
      "commissionRate": 0.1,
      "cookieDuration": 30,
      "status": "active",
      "requirements": {
        "minSignups": 5,
        "minRevenue": 1000,
        "approvalRequired": true
      },
      "tracking": {
        "baseUrl": "https://mortgagematchpro.com/affiliate",
        "trackingCode": "aff",
        "conversionEvents": ["signup", "subscription", "purchase"]
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 2. Affiliate Links

#### Create Affiliate Link
```http
POST /links
```

**Request Body:**
```json
{
  "affiliateId": "affiliate-123",
  "userId": "user-456",
  "originalUrl": "https://mortgagematchpro.com/pricing"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "link": {
      "id": "link-789",
      "affiliateId": "affiliate-123",
      "userId": "user-456",
      "originalUrl": "https://mortgagematchpro.com/pricing",
      "shortUrl": "https://mortgagematchpro.com/affiliate/aff/affiliate-123/user-456",
      "clicks": 0,
      "conversions": 0,
      "revenue": 0,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastUsed": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### Get Affiliate Links
```http
GET /links?affiliateId={affiliateId}&userId={userId}
```

**Query Parameters:**
- `affiliateId` (optional): Filter by affiliate ID
- `userId` (optional): Filter by user ID
- `limit` (optional): Number of results to return (default: 50)
- `offset` (optional): Number of results to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "links": [
      {
        "id": "link-789",
        "affiliateId": "affiliate-123",
        "userId": "user-456",
        "originalUrl": "https://mortgagematchpro.com/pricing",
        "shortUrl": "https://mortgagematchpro.com/affiliate/aff/affiliate-123/user-456",
        "clicks": 15,
        "conversions": 3,
        "revenue": 450.00,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastUsed": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 1
    }
  }
}
```

#### Track Click
```http
POST /links/{linkId}/click
```

**Request Body:**
```json
{
  "userId": "user-789",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "referrer": "https://google.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tracked": true,
    "linkId": "link-789",
    "clickId": "click-123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Referral Programs

#### Get All Referral Programs
```http
GET /referral-programs
```

**Response:**
```json
{
  "success": true,
  "data": {
    "programs": [
      {
        "id": "default",
        "name": "Refer a Friend",
        "description": "Get rewarded for referring friends to MortgageMatchPro",
        "rewardType": "credit",
        "rewardAmount": 50,
        "maxRewards": 500,
        "expirationDays": 90,
        "status": "active",
        "conditions": {
          "minPurchaseAmount": 100,
          "eligibleServices": ["premium", "enterprise"]
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### Create Referral Code
```http
POST /referral-codes
```

**Request Body:**
```json
{
  "userId": "user-456",
  "programId": "default"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "referralCode": {
      "id": "code-789",
      "userId": "user-456",
      "code": "ABC12345",
      "programId": "default",
      "uses": 0,
      "maxUses": 100,
      "rewardsEarned": 0,
      "createdAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-04-01T00:00:00Z"
    }
  }
}
```

#### Get Referral Code
```http
GET /referral-codes/{code}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "referralCode": {
      "id": "code-789",
      "userId": "user-456",
      "code": "ABC12345",
      "programId": "default",
      "uses": 5,
      "maxUses": 100,
      "rewardsEarned": 250.00,
      "createdAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-04-01T00:00:00Z"
    }
  }
}
```

### 4. Analytics

#### Get Affiliate Performance
```http
GET /analytics/performance?affiliateId={affiliateId}&from={from}&to={to}
```

**Query Parameters:**
- `affiliateId` (required): Affiliate ID
- `from` (optional): Start date (ISO 8601)
- `to` (optional): End date (ISO 8601)
- `granularity` (optional): Data granularity (hour, day, week, month)

**Response:**
```json
{
  "success": true,
  "data": {
    "affiliateId": "affiliate-123",
    "period": {
      "from": "2024-01-01T00:00:00Z",
      "to": "2024-01-31T23:59:59Z"
    },
    "metrics": {
      "totalClicks": 1250,
      "totalConversions": 45,
      "conversionRate": 0.036,
      "totalRevenue": 6750.00,
      "commissionEarned": 675.00,
      "averageOrderValue": 150.00
    },
    "dailyBreakdown": [
      {
        "date": "2024-01-01",
        "clicks": 25,
        "conversions": 1,
        "revenue": 150.00,
        "commission": 15.00
      }
    ]
  }
}
```

#### Get Referral Performance
```http
GET /analytics/referrals?userId={userId}&from={from}&to={to}
```

**Query Parameters:**
- `userId` (required): User ID
- `from` (optional): Start date (ISO 8601)
- `to` (optional): End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-456",
    "period": {
      "from": "2024-01-01T00:00:00Z",
      "to": "2024-01-31T23:59:59Z"
    },
    "metrics": {
      "totalReferrals": 8,
      "successfulReferrals": 5,
      "successRate": 0.625,
      "totalRewardsEarned": 250.00,
      "averageRewardPerReferral": 50.00
    },
    "referrals": [
      {
        "referralId": "ref-123",
        "referredUserId": "user-789",
        "signupDate": "2024-01-15T10:30:00Z",
        "conversionDate": "2024-01-20T14:45:00Z",
        "rewardAmount": 50.00,
        "status": "completed"
      }
    ]
  }
}
```

### 5. Feature Flags

#### Get Feature Flags
```http
GET /feature-flags
```

**Response:**
```json
{
  "success": true,
  "data": {
    "flags": [
      {
        "id": "affiliate-dashboard",
        "name": "Affiliate Dashboard",
        "description": "Enable affiliate dashboard for partners",
        "enabled": false,
        "rolloutPercentage": 0,
        "targetAudience": {
          "segments": ["affiliates", "partners"],
          "conditions": { "userType": "affiliate" }
        },
        "variants": {
          "control": { "enabled": false },
          "treatment": { "enabled": true }
        },
        "metrics": {
          "impressions": 0,
          "conversions": 0,
          "revenue": 0
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### Evaluate Feature Flag
```http
POST /feature-flags/{flagName}/evaluate
```

**Request Body:**
```json
{
  "userId": "user-456",
  "context": {
    "userType": "affiliate",
    "plan": "premium"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "flagName": "affiliate-dashboard",
    "userId": "user-456",
    "result": { "enabled": true },
    "variant": "treatment",
    "evaluatedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Error Handling

All API responses follow a consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "affiliateId",
      "reason": "Required field is missing"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Webhooks

The Affiliate API supports webhooks for real-time event notifications. Configure webhook endpoints to receive notifications for:

- Link clicks
- Conversions
- Commission payments
- Referral signups
- Feature flag changes

### Webhook Events

| Event | Description |
|-------|-------------|
| `affiliate.click` | Affiliate link clicked |
| `affiliate.conversion` | Conversion completed |
| `referral.signup` | Referral signup completed |
| `referral.conversion` | Referral conversion completed |
| `commission.paid` | Commission payment processed |
| `feature.flag.updated` | Feature flag configuration changed |

### Webhook Payload Example

```json
{
  "event": "affiliate.click",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "linkId": "link-789",
    "affiliateId": "affiliate-123",
    "userId": "user-456",
    "clickId": "click-123",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://google.com"
  }
}
```

## SDKs and Libraries

Official SDKs are available for:

- **JavaScript/Node.js**: `npm install @mortgagematchpro/affiliate-sdk`
- **Python**: `pip install mortgagematchpro-affiliate`
- **PHP**: `composer require mortgagematchpro/affiliate-sdk`
- **Java**: Available in Maven Central
- **C#**: Available in NuGet

## Support

For technical support and questions:

- **Documentation**: https://docs.mortgagematchpro.com/affiliate
- **API Status**: https://status.mortgagematchpro.com
- **Support Email**: affiliate-support@mortgagematchpro.com
- **Discord**: https://discord.gg/mortgagematchpro

## Changelog

### v1.4.0 (2024-01-15)
- Added feature flag support
- Enhanced analytics endpoints
- Improved webhook reliability
- Added rate limiting

### v1.3.0 (2024-01-01)
- Initial release
- Basic affiliate link tracking
- Referral program support
- Performance analytics

---

*Last updated: January 15, 2024*
*API Version: v1.4.0*
