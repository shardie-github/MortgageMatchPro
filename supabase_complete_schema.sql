-- =============================================
-- MORTGAGE MATCH PRO - COMPLETE DATABASE SCHEMA
-- =============================================
-- This script creates all necessary tables for the MortgageMatchPro application
-- Run this in your Supabase SQL Editor to set up the complete database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CORE APPLICATION TABLES
-- =============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'broker')),
    stripe_customer_id TEXT,
    free_rate_checks_used INTEGER DEFAULT 0,
    last_rate_check_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    billing_email TEXT,
    phone TEXT
);

-- Mortgage calculations table
CREATE TABLE IF NOT EXISTS mortgage_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    country TEXT NOT NULL CHECK (country IN ('CA', 'US')),
    income DECIMAL(12,2) NOT NULL,
    debts DECIMAL(12,2) NOT NULL,
    down_payment DECIMAL(12,2) NOT NULL,
    property_price DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,3) NOT NULL,
    term_years INTEGER NOT NULL,
    gds_ratio DECIMAL(5,2) NOT NULL,
    tds_ratio DECIMAL(5,2) NOT NULL,
    dti_ratio DECIMAL(5,2) NOT NULL,
    max_affordable DECIMAL(12,2) NOT NULL,
    monthly_payment DECIMAL(12,2) NOT NULL,
    qualifying_rate DECIMAL(5,3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate checks table
CREATE TABLE IF NOT EXISTS rate_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    country TEXT NOT NULL CHECK (country IN ('CA', 'US')),
    term_years INTEGER NOT NULL,
    rate_type TEXT NOT NULL CHECK (rate_type IN ('fixed', 'variable')),
    rates JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Brokers table
CREATE TABLE IF NOT EXISTS brokers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT NOT NULL,
    license_number TEXT NOT NULL,
    provinces_states TEXT[] NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    lead_data JSONB NOT NULL,
    lead_score INTEGER NOT NULL CHECK (lead_score >= 0 AND lead_score <= 100),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'rejected')),
    broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MONETIZATION TABLES
-- =============================================

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')),
    tier TEXT NOT NULL CHECK (tier IN ('premium', 'broker')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing history table
CREATE TABLE IF NOT EXISTS billing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_invoice_id TEXT,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT NOT NULL CHECK (currency IN ('cad', 'usd')),
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'canceled', 'requires_action')),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('rate_check', 'subscription', 'broker_license', 'renewal')),
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- User entitlements table
CREATE TABLE IF NOT EXISTS user_entitlements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL CHECK (feature IN ('rate_checks', 'scenario_saving', 'lead_generation', 'report_export', 'broker_white_label', 'unlimited_calculations')),
    entitlement_type TEXT NOT NULL CHECK (entitlement_type IN ('subscription', 'one_time', 'trial', 'broker_license')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    usage_count INTEGER NOT NULL DEFAULT 0,
    usage_limit INTEGER, -- NULL means unlimited
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate check tokens table
CREATE TABLE IF NOT EXISTS rate_check_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    billing_history_id UUID NOT NULL REFERENCES billing_history(id) ON DELETE CASCADE,
    token_count INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broker licenses table
CREATE TABLE IF NOT EXISTS broker_licenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    license_number TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    provinces_states TEXT[] NOT NULL,
    white_label_domain TEXT,
    custom_branding JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('card', 'bank_account')),
    is_default BOOLEAN NOT NULL DEFAULT false,
    last_four TEXT,
    brand TEXT,
    exp_month INTEGER,
    exp_year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    billing_history_id UUID NOT NULL REFERENCES billing_history(id) ON DELETE CASCADE,
    stripe_refund_id TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'other')),
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- =============================================
-- ANALYTICS AND REPORTING TABLES
-- =============================================

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,
    event_properties JSONB,
    session_id VARCHAR(100),
    page_url TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User scenarios table
CREATE TABLE IF NOT EXISTS user_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scenario_name VARCHAR(200) NOT NULL,
    scenario_type VARCHAR(50) NOT NULL, -- 'affordability', 'rate_comparison', 'amortization'
    scenario_data JSONB NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User dashboard preferences
CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    dashboard_layout JSONB,
    widget_preferences JSONB,
    notification_settings JSONB,
    privacy_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Broker performance metrics
CREATE TABLE IF NOT EXISTS broker_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    leads_received INTEGER DEFAULT 0,
    leads_contacted INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    total_commission DECIMAL(10,2) DEFAULT 0,
    avg_response_time_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(broker_id, metric_date)
);

-- System health metrics
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL,
    tags JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report templates
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(200) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- 'user_summary', 'broker_performance', 'system_health'
    template_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated reports
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    report_name VARCHAR(200) NOT NULL,
    report_data JSONB NOT NULL,
    file_path TEXT,
    file_size_bytes INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User engagement metrics
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    calculations_performed INTEGER DEFAULT 0,
    rate_checks_requested INTEGER DEFAULT 0,
    scenarios_saved INTEGER DEFAULT 0,
    leads_submitted INTEGER DEFAULT 0,
    dashboard_views INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, metric_date)
);

-- Privacy consent tracking
CREATE TABLE IF NOT EXISTS privacy_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- 'analytics', 'marketing', 'data_processing'
    consent_given BOOLEAN NOT NULL,
    consent_method VARCHAR(50) NOT NULL, -- 'explicit', 'implied', 'opt_in', 'opt_out'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, consent_type)
);

-- =============================================
-- OPERATIONAL READINESS TABLES
-- =============================================

-- SRE Metrics table
CREATE TABLE IF NOT EXISTS sre_metrics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    value DECIMAL NOT NULL,
    unit TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    tags JSONB DEFAULT '{}',
    service TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'production',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error budgets table
CREATE TABLE IF NOT EXISTS error_budgets (
    id SERIAL PRIMARY KEY,
    service TEXT NOT NULL,
    total_requests INTEGER NOT NULL DEFAULT 0,
    error_requests INTEGER NOT NULL DEFAULT 0,
    error_rate DECIMAL NOT NULL DEFAULT 0,
    budget_remaining DECIMAL NOT NULL DEFAULT 1.0,
    budget_consumed DECIMAL NOT NULL DEFAULT 0,
    time_window TEXT NOT NULL DEFAULT '1h',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service, time_window)
);

-- SLIs (Service Level Indicators) table
CREATE TABLE IF NOT EXISTS slis (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    measurement TEXT NOT NULL CHECK (measurement IN ('availability', 'latency', 'throughput', 'error_rate')),
    target DECIMAL NOT NULL,
    current_value DECIMAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical')),
    service TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service, measurement)
);

-- SLOs (Service Level Objectives) table
CREATE TABLE IF NOT EXISTS slos (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sli_name TEXT NOT NULL,
    target_percentage DECIMAL NOT NULL,
    measurement_window TEXT NOT NULL,
    current_percentage DECIMAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'meeting' CHECK (status IN ('meeting', 'at_risk', 'breach')),
    service TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service, sli_name)
);

-- Regions table for load balancing
CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    health_check_url TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    capacity INTEGER NOT NULL DEFAULT 1,
    current_load INTEGER NOT NULL DEFAULT 0,
    last_health_check TIMESTAMPTZ,
    response_time INTEGER DEFAULT 0,
    error_rate DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scaling events table
CREATE TABLE IF NOT EXISTS scaling_events (
    id TEXT PRIMARY KEY,
    region TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('scale_up', 'scale_down', 'failover')),
    reason TEXT NOT NULL,
    instances_before INTEGER NOT NULL,
    instances_after INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operational readiness metrics table
CREATE TABLE IF NOT EXISTS operational_readiness_metrics (
    id SERIAL PRIMARY KEY,
    uptime_percentage DECIMAL NOT NULL,
    mttr_minutes DECIMAL NOT NULL,
    error_budget_remaining DECIMAL NOT NULL,
    cost_per_transaction DECIMAL NOT NULL,
    regional_availability JSONB DEFAULT '{}',
    sla_compliance JSONB DEFAULT '{}',
    last_updated TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disaster recovery plans table
CREATE TABLE IF NOT EXISTS disaster_recovery_plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    rto_minutes INTEGER NOT NULL,
    rpo_minutes INTEGER NOT NULL,
    procedures TEXT[] NOT NULL DEFAULT '{}',
    contacts TEXT[] NOT NULL DEFAULT '{}',
    last_tested TIMESTAMPTZ,
    next_test TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'deprecated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business continuity models table
CREATE TABLE IF NOT EXISTS business_continuity_models (
    id SERIAL PRIMARY KEY,
    scenario TEXT NOT NULL,
    impact_level TEXT NOT NULL CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    probability DECIMAL NOT NULL CHECK (probability >= 0 AND probability <= 1),
    mitigation_strategy TEXT NOT NULL,
    contingency_plan TEXT NOT NULL,
    owner TEXT NOT NULL,
    last_reviewed TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor contracts table
CREATE TABLE IF NOT EXISTS vendor_contracts (
    id SERIAL PRIMARY KEY,
    vendor_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    contract_value DECIMAL NOT NULL,
    renewal_date DATE NOT NULL,
    sla_requirements JSONB DEFAULT '{}',
    penalty_clauses TEXT[] DEFAULT '{}',
    escalation_contacts TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'terminated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    event TEXT NOT NULL,
    user_id TEXT,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_mortgage_calculations_user_id ON mortgage_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_mortgage_calculations_created_at ON mortgage_calculations(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_checks_user_id ON rate_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_checks_expires_at ON rate_checks(expires_at);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_broker_id ON leads(broker_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_brokers_is_active ON brokers(is_active);

-- Monetization indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id ON billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_payment_intent ON billing_history(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_payment_type ON billing_history(payment_type);
CREATE INDEX IF NOT EXISTS idx_billing_history_created_at ON billing_history(created_at);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_feature ON user_entitlements(feature);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_active ON user_entitlements(is_active);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_expires_at ON user_entitlements(expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_check_tokens_user_id ON rate_check_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_check_tokens_expires_at ON rate_check_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_broker_licenses_user_id ON broker_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_licenses_company ON broker_licenses(company_name);
CREATE INDEX IF NOT EXISTS idx_broker_licenses_active ON broker_licenses(is_active);
CREATE INDEX IF NOT EXISTS idx_broker_licenses_expires_at ON broker_licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id ON payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_refunds_billing_history_id ON refunds(billing_history_id);
CREATE INDEX IF NOT EXISTS idx_refunds_stripe_id ON refunds(stripe_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_scenarios_user_id ON user_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scenarios_type ON user_scenarios(scenario_type);
CREATE INDEX IF NOT EXISTS idx_user_scenarios_created_at ON user_scenarios(created_at);
CREATE INDEX IF NOT EXISTS idx_broker_metrics_broker_id ON broker_metrics(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_metrics_date ON broker_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_system_health_metric_name ON system_health_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_health_recorded_at ON system_health_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_generated_reports_user_id ON generated_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON generated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON generated_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON user_engagement_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_date ON user_engagement_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_privacy_consent_user_id ON privacy_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_consent_type ON privacy_consent(consent_type);

-- Operational indexes
CREATE INDEX IF NOT EXISTS idx_sre_metrics_service_timestamp ON sre_metrics(service, timestamp);
CREATE INDEX IF NOT EXISTS idx_sre_metrics_name_timestamp ON sre_metrics(name, timestamp);
CREATE INDEX IF NOT EXISTS idx_sre_metrics_environment ON sre_metrics(environment);
CREATE INDEX IF NOT EXISTS idx_error_budgets_service ON error_budgets(service);
CREATE INDEX IF NOT EXISTS idx_slis_service ON slis(service);
CREATE INDEX IF NOT EXISTS idx_slos_service ON slos(service);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(is_active);
CREATE INDEX IF NOT EXISTS idx_scaling_events_region_timestamp ON scaling_events(region, timestamp);
CREATE INDEX IF NOT EXISTS idx_operational_readiness_last_updated ON operational_readiness_metrics(last_updated);
CREATE INDEX IF NOT EXISTS idx_disaster_recovery_status ON disaster_recovery_plans(status);
CREATE INDEX IF NOT EXISTS idx_business_continuity_impact ON business_continuity_models(impact_level);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_renewal ON vendor_contracts(renewal_date);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status ON vendor_contracts(status);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_name_timestamp ON system_health_metrics(metric_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_severity_timestamp ON security_events(severity, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);

-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brokers_updated_at BEFORE UPDATE ON brokers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_entitlements_updated_at BEFORE UPDATE ON user_entitlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_broker_licenses_updated_at BEFORE UPDATE ON broker_licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_scenarios_updated_at BEFORE UPDATE ON user_scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_dashboard_preferences_updated_at BEFORE UPDATE ON user_dashboard_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_broker_metrics_updated_at BEFORE UPDATE ON broker_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_engagement_metrics_updated_at BEFORE UPDATE ON user_engagement_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_consent_updated_at BEFORE UPDATE ON privacy_consent
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortgage_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_check_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_consent ENABLE ROW LEVEL SECURITY;

-- Core RLS policies
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own calculations" ON mortgage_calculations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calculations" ON mortgage_calculations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own rate checks" ON rate_checks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate checks" ON rate_checks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own leads" ON leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brokers are publicly readable" ON brokers
    FOR SELECT USING (is_active = true);

-- Monetization RLS policies
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own billing history" ON billing_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own entitlements" ON user_entitlements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own entitlements" ON user_entitlements
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own rate check tokens" ON rate_check_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own broker licenses" ON broker_licenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own broker licenses" ON broker_licenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" ON payment_methods
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" ON payment_methods
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own refunds" ON refunds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM billing_history 
            WHERE billing_history.id = refunds.billing_history_id 
            AND billing_history.user_id = auth.uid()
        )
    );

-- Analytics RLS policies
CREATE POLICY "Users can view their own analytics events" ON analytics_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics events" ON analytics_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own scenarios" ON user_scenarios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scenarios" ON user_scenarios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios" ON user_scenarios
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios" ON user_scenarios
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own dashboard preferences" ON user_dashboard_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard preferences" ON user_dashboard_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard preferences" ON user_dashboard_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports" ON generated_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports" ON generated_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own engagement metrics" ON user_engagement_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own privacy consent" ON privacy_consent
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy consent" ON privacy_consent
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy consent" ON privacy_consent
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role policies for webhook processing
CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all billing history" ON billing_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all user entitlements" ON user_entitlements
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all rate check tokens" ON rate_check_tokens
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all broker licenses" ON broker_licenses
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all payment methods" ON payment_methods
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all refunds" ON refunds
    FOR ALL USING (auth.role() = 'service_role');

-- Additional RLS policies for missing tables
CREATE POLICY "Users can view their own mortgage calculations" ON mortgage_calculations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mortgage calculations" ON mortgage_calculations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own rate checks" ON rate_checks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate checks" ON rate_checks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own leads" ON leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leads" ON leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads" ON leads
    FOR UPDATE USING (auth.uid() = user_id);

-- Brokers can view leads assigned to them
CREATE POLICY "Brokers can view assigned leads" ON leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM brokers 
            WHERE brokers.id = leads.broker_id 
            AND brokers.email = auth.jwt() ->> 'email'
        )
    );

-- Brokers can update leads assigned to them
CREATE POLICY "Brokers can update assigned leads" ON leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM brokers 
            WHERE brokers.id = leads.broker_id 
            AND brokers.email = auth.jwt() ->> 'email'
        )
    );

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to check user entitlement
CREATE OR REPLACE FUNCTION check_user_entitlement(
    p_user_id UUID,
    p_feature TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    entitlement_exists BOOLEAN := FALSE;
    usage_count INTEGER := 0;
    usage_limit INTEGER := NULL;
BEGIN
    -- Check if user has active entitlement for the feature
    SELECT 
        is_active,
        user_entitlements.usage_count,
        user_entitlements.usage_limit
    INTO 
        entitlement_exists,
        usage_count,
        usage_limit
    FROM user_entitlements
    WHERE user_id = p_user_id
        AND feature = p_feature
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no entitlement found, return false
    IF NOT entitlement_exists THEN
        RETURN FALSE;
    END IF;

    -- If unlimited usage (usage_limit is NULL), return true
    IF usage_limit IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check if usage is within limits
    RETURN usage_count < usage_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume rate check token
CREATE OR REPLACE FUNCTION consume_rate_check_token(
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    token_id UUID;
    current_used_count INTEGER;
    token_count INTEGER;
BEGIN
    -- Find an available token
    SELECT id, used_count, token_count
    INTO token_id, current_used_count, token_count
    FROM rate_check_tokens
    WHERE user_id = p_user_id
        AND used_count < token_count
        AND expires_at > NOW()
    ORDER BY created_at ASC
    LIMIT 1;

    -- If no token found, return false
    IF token_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Increment used count
    UPDATE rate_check_tokens
    SET used_count = used_count + 1
    WHERE id = token_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_status(p_user_id UUID)
RETURNS TABLE (
    tier TEXT,
    status TEXT,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.tier,
        s.status,
        s.current_period_end,
        s.cancel_at_period_end
    FROM subscriptions s
    WHERE s.user_id = p_user_id
        AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant entitlement
CREATE OR REPLACE FUNCTION grant_entitlement(
    p_user_id UUID,
    p_feature TEXT,
    p_entitlement_type TEXT,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_usage_limit INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    entitlement_id UUID;
BEGIN
    INSERT INTO user_entitlements (
        user_id,
        feature,
        entitlement_type,
        expires_at,
        usage_limit
    ) VALUES (
        p_user_id,
        p_feature,
        p_entitlement_type,
        p_expires_at,
        p_usage_limit
    ) RETURNING id INTO entitlement_id;

    RETURN entitlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample brokers
INSERT INTO brokers (name, email, phone, company, license_number, provinces_states, commission_rate) VALUES
('John Smith', 'john@mortgagepro.ca', '+14161234567', 'Royal Bank Mortgage', 'M123456', ARRAY['ON', 'BC', 'AB'], 0.75),
('Sarah Johnson', 'sarah@mortgagepro.ca', '+14161234568', 'TD Mortgage', 'M123457', ARRAY['ON', 'QC', 'MB'], 0.80),
('Mike Chen', 'mike@mortgagepro.ca', '+14161234569', 'Scotia Mortgage', 'M123458', ARRAY['BC', 'AB', 'SK'], 0.70),
('Lisa Brown', 'lisa@mortgagepro.ca', '+14161234570', 'BMO Mortgage', 'M123459', ARRAY['ON', 'QC', 'NS'], 0.85),
('David Wilson', 'david@mortgagepro.ca', '+14161234571', 'CIBC Mortgage', 'M123460', ARRAY['AB', 'BC', 'ON'], 0.75)
ON CONFLICT DO NOTHING;

-- Insert default regions
INSERT INTO regions (id, name, endpoint, health_check_url, priority, is_active, capacity) VALUES
('us-east-1', 'US East (N. Virginia)', 'https://api-us-east.mortgagematch.com', 'https://api-us-east.mortgagematch.com/health', 1, true, 5),
('us-west-2', 'US West (Oregon)', 'https://api-us-west.mortgagematch.com', 'https://api-us-west.mortgagematch.com/health', 2, true, 3),
('eu-west-1', 'Europe (Ireland)', 'https://api-eu-west.mortgagematch.com', 'https://api-eu-west.mortgagematch.com/health', 3, true, 2),
('ap-southeast-1', 'Asia Pacific (Singapore)', 'https://api-ap-southeast.mortgagematch.com', 'https://api-ap-southeast.mortgagematch.com/health', 4, true, 2)
ON CONFLICT (id) DO NOTHING;

-- Insert default SLIs
INSERT INTO slis (name, description, measurement, target, service) VALUES
('API Availability', 'Percentage of time API is available', 'availability', 99.95, 'api'),
('API Response Time', 'Average response time for API requests', 'latency', 200, 'api'),
('API Throughput', 'Requests per second handled by API', 'throughput', 1000, 'api'),
('API Error Rate', 'Percentage of API requests that result in errors', 'error_rate', 1.0, 'api')
ON CONFLICT (service, measurement) DO NOTHING;

-- Insert default SLOs
INSERT INTO slos (name, description, sli_name, target_percentage, measurement_window, service) VALUES
('API Uptime SLO', 'API must be available 99.95% of the time', 'API Availability', 99.95, '30d', 'api'),
('API Performance SLO', 'API response time must be under 200ms 95% of the time', 'API Response Time', 95.0, '7d', 'api'),
('API Reliability SLO', 'API error rate must be under 1% 99% of the time', 'API Error Rate', 99.0, '7d', 'api')
ON CONFLICT (service, sli_name) DO NOTHING;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION check_user_entitlement(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_rate_check_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_entitlement(UUID, TEXT, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

SELECT 'MortgageMatchPro database schema created successfully!' as status;