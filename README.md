# MortgageMatch Pro

AI-Powered Mortgage Intelligence Platform with ChatGPT Canvas Integration

## 🚀 Features

- **Mortgage Affordability Calculator**: Calculate how much you can afford based on income, debts, and financial situation
- **Real-time Rate Comparison**: Compare rates from top lenders in Canada and the US
- **Scenario Analysis**: Compare different mortgage options with detailed amortization schedules
- **Lead Generation**: Connect with qualified mortgage brokers
- **User Authentication**: Secure sign-in with email/password and Google OAuth
- **Session Persistence**: Save and reload mortgage scenarios
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Integration**: OpenAI GPT-4
- **State Management**: Zustand
- **Charts**: Recharts
- **Testing**: Jest, Playwright
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key
- Redis (optional, for caching)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/mortgagematch-pro.git
cd mortgagematch-pro
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Encryption Key (generate a random 32-character string)
ENCRYPTION_KEY=your_32_character_encryption_key

# Rate API Keys (optional, for production)
RATEHUB_API_KEY=your_ratehub_api_key
FREDDIE_MAC_API_KEY=your_freddie_mac_api_key
```

### 4. Database Setup

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Start local Supabase
supabase start

# Run migrations
supabase db reset

# Generate types
npm run db:generate
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase dashboard
2. Create a new project
3. Go to SQL Editor
4. Run the SQL from `supabase/migrations/001_initial_schema.sql`
5. Run the SQL from `supabase/migrations/002_security_hardening.sql`

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### E2E Tests

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npx playwright test

# Run E2E tests in headed mode
npx playwright test --headed

# Run E2E tests in debug mode
npx playwright test --debug
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## 🏗️ Project Structure

```
mortgagematch-pro/
├── app/                          # Next.js app directory
│   └── page.tsx                  # Main application page
├── components/                   # React components
│   ├── canvas/                   # Canvas-specific components
│   │   ├── AffordabilityInputPanel.tsx
│   │   ├── RateComparisonTable.tsx
│   │   ├── AmortizationChart.tsx
│   │   └── LeadGenModal.tsx
│   └── ui/                       # Reusable UI components
├── lib/                          # Utility libraries
│   ├── auth.tsx                  # Authentication context
│   ├── openai.ts                 # OpenAI integration
│   ├── supabase.ts               # Supabase client
│   ├── security.ts               # Security utilities
│   ├── monitoring.ts             # Analytics and monitoring
│   └── rate-apis.ts              # Rate API integrations
├── pages/                        # Next.js pages
│   ├── api/                      # API routes
│   │   ├── calculate.ts          # Affordability calculation
│   │   ├── rates.ts              # Rate fetching
│   │   ├── scenarios.ts          # Scenario comparison
│   │   └── leads.ts              # Lead processing
│   └── auth/                     # Authentication pages
├── store/                        # State management
│   └── mortgageStore.ts          # Zustand store
├── supabase/                     # Database migrations
│   └── migrations/
├── __tests__/                    # Test files
│   ├── lib/                      # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # E2E tests
└── styles/                       # Global styles
    └── globals.css
```

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project
2. Enable Row Level Security (RLS)
3. Set up authentication providers (Email, Google)
4. Configure CORS settings for your domain

### OpenAI Setup

1. Get an API key from OpenAI
2. Add the key to your environment variables
3. Ensure you have sufficient credits for API usage

### Rate APIs (Optional)

For production use, you can integrate with real rate APIs:

- **Ratehub.ca**: Canadian mortgage rates
- **Freddie Mac**: US mortgage rates

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🔒 Security

- Row Level Security (RLS) enabled on all database tables
- Input validation and sanitization
- Rate limiting on API endpoints
- Audit logging for compliance
- Data encryption for sensitive information
- CORS configuration for Canvas integration

## 📊 Monitoring

- Error tracking with Sentry integration
- Analytics tracking for user behavior
- Performance monitoring
- Audit logs for compliance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/mortgagematch-pro/issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Broker portal
- [ ] Document management
- [ ] Integration with more lenders
- [ ] Multi-language support
- [ ] Advanced mortgage products

## 🙏 Acknowledgments

- OpenAI for GPT-4 integration
- Supabase for backend services
- Vercel for hosting
- The open-source community for amazing tools and libraries