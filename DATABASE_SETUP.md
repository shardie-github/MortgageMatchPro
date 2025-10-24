# Database Setup Guide for MortgageMatchPro

This guide will help you set up the complete database schema, RLS policies, and functions for the MortgageMatchPro application on Supabase.

## Prerequisites

1. **Supabase Account**: You need a Supabase account and project
2. **Node.js**: Version 16 or higher
3. **npm**: Package manager
4. **Docker**: Required for local development (optional for remote setup)

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd mortgagematch-pro

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy the environment template
cp .env.template .env

# Edit the .env file with your Supabase credentials
nano .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

### 3. Run Database Setup

#### Option A: Remote Supabase (Recommended for Production)

```bash
# Run the complete database setup
./scripts/setup-supabase-database.sh --remote

# Or with custom environment file
./scripts/setup-supabase-database.sh --remote --env-file .env.production
```

#### Option B: Local Development

```bash
# Start local Supabase (requires Docker)
./scripts/setup-supabase-database.sh --local
```

#### Option C: Dry Run (Preview Changes)

```bash
# See what would be executed without running
./scripts/setup-supabase-database.sh --remote --dry-run
```

## What Gets Created

The setup script creates a comprehensive database schema including:

### Core Tables
- `users` - User accounts and subscription information
- `mortgage_calculations` - Mortgage calculation results
- `rate_checks` - Rate check history
- `scenarios` - User-defined mortgage scenarios
- `leads` - Lead generation and tracking
- `brokers` - Broker information and profiles

### Analytics & Reporting
- `analytics_events` - User interaction tracking
- `performance_metrics` - Application performance data
- `user_behavior` - User behavior analytics
- `conversion_funnels` - Conversion tracking

### AI & Automation
- `ai_insights` - AI-generated insights
- `predictive_models` - ML model data
- `automation_rules` - Business automation rules
- `workflow_instances` - Workflow execution data

### Compliance & Security
- `audit_logs` - Security audit trail
- `compliance_checks` - Compliance verification
- `data_retention` - Data retention policies
- `privacy_consent` - User privacy preferences

### RLS Policies
- Row Level Security policies for all tables
- User-based access controls
- Broker-specific data isolation
- Admin-level access controls

### Functions & Triggers
- Automated data processing functions
- Real-time update triggers
- Data validation functions
- Performance optimization functions

## Manual Setup (Alternative)

If you prefer to set up the database manually:

### 1. Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase_complete_schema.sql`
4. Execute the SQL script

### 2. Using Migration Files

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Execute each migration file in order:
   - `001_initial_schema.sql`
   - `002_security_hardening.sql`
   - `003_lead_generation_schema.sql`
   - ... (continue in alphabetical order)

### 3. Using Supabase CLI

```bash
# Initialize Supabase project
npx supabase init

# Link to remote project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

## Verification

After running the setup, verify your database:

1. **Check Tables**: Go to Supabase Dashboard → Table Editor
2. **Verify RLS**: Check that RLS policies are enabled
3. **Test Functions**: Run some test queries
4. **Check Extensions**: Ensure required extensions are installed

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure you're using the service role key, not the anon key
2. **Connection Failed**: Verify your Supabase URL and credentials
3. **Migration Errors**: Check the Supabase logs for detailed error messages
4. **Docker Issues**: Ensure Docker is running for local development

### Getting Help

1. Check the Supabase documentation
2. Review the migration files for specific table structures
3. Check the application logs for connection issues
4. Verify your environment variables

## Next Steps

After successful database setup:

1. **Test Connection**: Run your application and verify database connectivity
2. **Set Up Monitoring**: Configure database monitoring and alerts
3. **Backup Strategy**: Set up regular database backups
4. **Performance Tuning**: Monitor and optimize database performance
5. **Security Review**: Review and update security policies as needed

## Files Reference

- `supabase_complete_schema.sql` - Complete database schema
- `supabase/migrations/` - Individual migration files
- `scripts/setup-supabase-database.sh` - Main setup script
- `scripts/setup-database.js` - Node.js setup script
- `scripts/run-migrations.js` - Migration runner script
- `.env.template` - Environment variables template