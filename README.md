# MortgageMatch Pro

An AI-powered mortgage intelligence platform built with ChatGPT Canvas integration, providing real-time affordability analysis, rate comparisons, and broker connections for Canadian and US users.

## Features

### 🤖 Multi-Agent AI System
- **Affordability Agent**: Calculates mortgage affordability using OSFI (Canada) and CFPB (US) regulations
- **Rate Intelligence Agent**: Fetches real-time rates from Ratehub.ca and Freddie Mac APIs
- **Scenario Analysis Agent**: Compares multiple mortgage options with detailed amortization schedules
- **Lead Routing Agent**: Matches users with qualified brokers based on lead scoring
- **Monetization Agent**: Handles Stripe payments and subscription management

### 🎨 ChatGPT Canvas Integration
- Interactive affordability calculator with sliders and real-time updates
- Dynamic rate comparison tables with lender contact information
- Amortization charts showing principal vs interest over time
- Lead generation modal with broker recommendations
- Responsive design optimized for ChatGPT Canvas

### 🏦 Compliance & Security
- OSFI B-20 compliance for Canadian mortgages
- CFPB TILA RESPA compliance for US mortgages
- PIPEDA and CCPA data privacy compliance
- Row Level Security (RLS) with Supabase
- Encrypted data transmission and storage

### 💰 Monetization
- Rate check tokens: $2.99 one-time
- Premium subscription: $9.99/month unlimited
- White-label broker version: $1,200/year
- Commission-based lead referrals: $150-$300 per conversion

## Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Zustand** for state management
- **Radix UI** for accessible components

### Backend
- **Fastify** for API server
- **GraphQL Yoga** for GraphQL API
- **Supabase** for database and auth
- **Redis** for caching rate data
- **OpenAI SDK** for AI agents

### Integrations
- **Stripe** for payments
- **Twilio** for SMS notifications
- **Plaid** for income verification
- **Sentry** for error monitoring
- **PostHog** for analytics

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- OpenAI API key
- Stripe account
- Twilio account
- Redis instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/mortgagematch-pro.git
   cd mortgagematch-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your API keys and configuration values.

4. **Set up Supabase**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Initialize Supabase
   supabase init

   # Start local Supabase
   supabase start

   # Run migrations
   supabase db reset
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Affordability Calculation
```http
POST /api/affordability
Content-Type: application/json

{
  "country": "CA",
  "income": 75000,
  "debts": 500,
  "downPayment": 50000,
  "propertyPrice": 500000,
  "interestRate": 5.5,
  "termYears": 25,
  "location": "Toronto, ON"
}
```

### Rate Lookup
```http
GET /api/rates?country=CA&termYears=25&rateType=fixed&propertyPrice=500000&downPayment=50000
```

### Scenario Comparison
```http
POST /api/scenarios
Content-Type: application/json

{
  "scenarios": [
    {
      "name": "5-Year Fixed",
      "rate": 5.5,
      "term": 25,
      "type": "fixed",
      "propertyPrice": 500000,
      "downPayment": 50000
    }
  ]
}
```

### Lead Submission
```http
POST /api/leads
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+14161234567",
  "leadData": {
    "income": 75000,
    "debts": 500,
    "downPayment": 50000,
    "propertyPrice": 500000,
    "creditScore": 750,
    "employmentType": "salaried",
    "location": "Toronto, ON"
  }
}
```

## Deployment

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Set environment variables**
   Use the Vercel dashboard to add all environment variables from `.env.example`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Supabase Deployment

1. **Deploy database**
   ```bash
   supabase db push
   ```

2. **Set up production environment**
   - Create production Supabase project
   - Update environment variables
   - Run migrations

## Usage Examples

### ChatGPT Canvas Integration

```typescript
// Example: Calculate affordability
const affordability = await fetch('/api/affordability', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    country: 'CA',
    income: 95000,
    debts: 600,
    downPayment: 80000,
    propertyPrice: 600000,
    interestRate: 4.89,
    termYears: 25,
    location: 'Vancouver, BC'
  })
})
```

### OpenAI SDK Integration

```typescript
import { AffordabilityAgent } from '@/lib/openai'

const agent = new AffordabilityAgent()
const result = await agent.calculateAffordability({
  country: 'CA',
  income: 95000,
  debts: 600,
  downPayment: 80000,
  propertyPrice: 600000,
  interestRate: 4.89,
  termYears: 25,
  location: 'Vancouver, BC'
})
```

## Compliance

### Canadian Regulations (OSFI)
- GDS ≤ 32% (Gross Debt Service)
- TDS ≤ 44% (Total Debt Service)
- Stress test = max(rate + 2%, 5.25%)
- CMHC insured mortgage compliance

### US Regulations (CFPB)
- DTI ≤ 43% (Debt-to-Income)
- TILA RESPA compliance
- NMLS licensing requirements

## Monitoring & Analytics

- **Sentry**: Error tracking and performance monitoring
- **PostHog**: User analytics and feature flags
- **Supabase**: Database monitoring and logs
- **Vercel**: Deployment and performance metrics

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@mortgagematchpro.com or join our Discord community.

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced scenario modeling
- [ ] Integration with more lenders
- [ ] Automated document processing
- [ ] Real-time market insights
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] API rate limiting and caching
- [ ] Webhook integrations
- [ ] Advanced lead scoring algorithms