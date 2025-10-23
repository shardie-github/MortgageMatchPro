# MortgageMatch Pro - Deployment Guide

This guide covers the complete deployment process for MortgageMatch Pro, including all necessary services and configurations.

## Prerequisites

Before deploying, ensure you have accounts and API keys for:

- [OpenAI](https://openai.com) - AI API access
- [Supabase](https://supabase.com) - Database and authentication
- [Vercel](https://vercel.com) - Frontend hosting
- [Stripe](https://stripe.com) - Payment processing
- [Twilio](https://twilio.com) - SMS notifications
- [Redis](https://redis.com) - Caching (Upstash recommended)
- [Sentry](https://sentry.io) - Error monitoring
- [PostHog](https://posthog.com) - Analytics

## Step 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose organization and enter project details:
   - Name: `mortgagematch-pro`
   - Database Password: Generate a strong password
   - Region: Choose closest to your users

### 1.2 Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### 1.3 Configure Row Level Security

The migrations automatically set up RLS policies. Verify in Supabase Dashboard:
- Go to Authentication > Policies
- Ensure all tables have proper RLS policies enabled

### 1.4 Get API Keys

From Supabase Dashboard > Settings > API:
- Project URL
- Anon public key
- Service role key (keep secret!)

## Step 2: OpenAI Configuration

### 2.1 Get API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Navigate to API Keys
3. Create new secret key
4. Copy the key (starts with `sk-`)

### 2.2 Configure Usage Limits

Set appropriate usage limits in OpenAI Dashboard:
- Monthly spending limit: $100-500 (adjust based on expected usage)
- Rate limits: Monitor and adjust as needed

## Step 3: Payment Setup (Stripe)

### 3.1 Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Complete account setup and verification
3. Switch to live mode when ready for production

### 3.2 Create Products and Prices

```bash
# Install Stripe CLI
npm install -g stripe

# Login to Stripe
stripe login

# Create products (run these commands)
stripe products create --name "Rate Check" --description "One-time rate check"
stripe products create --name "Premium Subscription" --description "Monthly premium access"
stripe products create --name "Broker White Label" --description "Annual broker license"

# Create prices
stripe prices create --product prod_xxx --unit-amount 299 --currency cad --recurring
stripe prices create --product prod_yyy --unit-amount 999 --currency cad --recurring
stripe prices create --product prod_zzz --unit-amount 120000 --currency cad
```

### 3.3 Configure Webhooks

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 3.4 Get API Keys

From Stripe Dashboard > Developers > API Keys:
- Publishable key (starts with `pk_`)
- Secret key (starts with `sk_`)
- Webhook signing secret (starts with `whsec_`)

## Step 4: SMS Setup (Twilio)

### 4.1 Create Twilio Account

1. Go to [Twilio Console](https://console.twilio.com)
2. Complete account setup and phone verification
3. Purchase a phone number for SMS

### 4.2 Get Credentials

From Twilio Console > Account > API Keys & Tokens:
- Account SID
- Auth Token
- Phone Number (format: +1234567890)

## Step 5: Caching Setup (Redis)

### 5.1 Using Upstash (Recommended)

1. Go to [Upstash Console](https://console.upstash.com)
2. Create new database
3. Choose region closest to your users
4. Copy connection string

### 5.2 Alternative: Self-hosted Redis

```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:alpine

# Or using Redis Cloud
# Sign up at https://redis.com and get connection string
```

## Step 6: Monitoring Setup

### 6.1 Sentry Configuration

1. Go to [Sentry Dashboard](https://sentry.io)
2. Create new project (Next.js)
3. Get DSN from project settings
4. Configure release tracking

### 6.2 PostHog Configuration

1. Go to [PostHog Dashboard](https://app.posthog.com)
2. Create new project
3. Get API key from project settings
4. Configure feature flags if needed

## Step 7: Rate APIs Setup

### 7.1 Ratehub.ca (Canada)

1. Contact Ratehub.ca for API access
2. Get API key and documentation
3. Test API endpoints

### 7.2 Freddie Mac (US)

1. Go to [Freddie Mac Developer Portal](https://developer.freddiemac.com)
2. Register for API access
3. Get API key and documentation

## Step 8: Frontend Deployment (Vercel)

### 8.1 Prepare for Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Build the project
npm run build
```

### 8.2 Deploy to Vercel

```bash
# Deploy to Vercel
vercel

# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel env add STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_PHONE_NUMBER
vercel env add RATEHUB_API_KEY
vercel env add FREDDIE_MAC_API_KEY
vercel env add REDIS_URL
vercel env add SENTRY_DSN
vercel env add POSTHOG_KEY
vercel env add DEFAULT_BROKER_PHONE
```

### 8.3 Configure Custom Domain

1. Go to Vercel Dashboard > Project Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Enable SSL certificate

## Step 9: Environment Configuration

### 9.1 Production Environment Variables

Create `.env.production` with all required variables:

```env
# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_your-key
STRIPE_SECRET_KEY=sk_live_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Rate APIs
RATEHUB_API_KEY=your-ratehub-key
FREDDIE_MAC_API_KEY=your-freddie-mac-key

# Redis
REDIS_URL=redis://your-redis-url

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
POSTHOG_KEY=phc_your-posthog-key

# Defaults
DEFAULT_BROKER_PHONE=+1234567890
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Step 10: Testing and Validation

### 10.1 Run Tests

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### 10.2 Test API Endpoints

```bash
# Test affordability calculation
curl -X POST https://your-domain.com/api/affordability \
  -H "Content-Type: application/json" \
  -d '{
    "country": "CA",
    "income": 75000,
    "debts": 500,
    "downPayment": 50000,
    "propertyPrice": 500000,
    "interestRate": 5.5,
    "termYears": 25,
    "location": "Toronto, ON"
  }'

# Test rate lookup
curl "https://your-domain.com/api/rates?country=CA&termYears=25&rateType=fixed&propertyPrice=500000&downPayment=50000"
```

### 10.3 Test Payment Flow

1. Use Stripe test cards to test payments
2. Verify webhook handling
3. Test subscription creation/cancellation

## Step 11: Security Configuration

### 11.1 SSL/TLS

- Vercel automatically provides SSL certificates
- Ensure all API endpoints use HTTPS
- Configure HSTS headers

### 11.2 CORS Configuration

Update `next.config.js` with production domains:

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

### 11.3 Rate Limiting

Configure rate limiting in Vercel:
- Go to Project Settings > Functions
- Set appropriate rate limits for API routes

## Step 12: Monitoring and Maintenance

### 12.1 Set Up Alerts

Configure alerts for:
- High error rates (Sentry)
- Payment failures (Stripe)
- API rate limit exceeded
- Database connection issues

### 12.2 Regular Maintenance

- Monitor API usage and costs
- Review error logs weekly
- Update dependencies monthly
- Backup database regularly

### 12.3 Performance Monitoring

- Use Vercel Analytics for performance metrics
- Monitor PostHog for user behavior
- Track conversion rates and user engagement

## Step 13: Scaling Considerations

### 13.1 Database Scaling

- Monitor Supabase usage
- Consider read replicas for high traffic
- Implement connection pooling

### 13.2 API Scaling

- Use Redis for caching frequently accessed data
- Implement API rate limiting
- Consider CDN for static assets

### 13.3 Cost Optimization

- Monitor OpenAI API usage
- Optimize database queries
- Use appropriate instance sizes

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check domain configuration in `next.config.js`
2. **Database Connection**: Verify Supabase credentials and network access
3. **Payment Failures**: Check Stripe webhook configuration
4. **Rate API Errors**: Verify API keys and rate limits
5. **Build Failures**: Check environment variables and dependencies

### Debug Commands

```bash
# Check Vercel logs
vercel logs

# Check Supabase logs
supabase logs

# Test Redis connection
redis-cli -u $REDIS_URL ping

# Test Stripe webhook
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Support

For deployment issues:
- Check Vercel documentation
- Review Supabase guides
- Contact service providers for API issues
- Check project GitHub issues

## Next Steps

After successful deployment:
1. Set up monitoring dashboards
2. Configure automated backups
3. Implement CI/CD pipeline
4. Set up staging environment
5. Plan for scaling and optimization