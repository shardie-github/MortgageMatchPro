-- Operational Readiness Database Schema
-- Implements enterprise-scale operational readiness with SRE metrics, load balancing, and disaster recovery

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

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sre_metrics_service_timestamp ON sre_metrics(service, timestamp);
CREATE INDEX IF NOT EXISTS idx_sre_metrics_name_timestamp ON sre_metrics(name, timestamp);
CREATE INDEX IF NOT EXISTS idx_sre_metrics_environment ON sre_metrics(environment);

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

-- System health metrics table (for historical tracking)
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id SERIAL PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL NOT NULL,
    metric_unit TEXT NOT NULL,
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security events table (for audit logging)
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

-- Create indexes for performance
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

-- Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_region_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_disaster_recovery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_business_continuity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_vendor_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER trigger_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_region_updated_at();

CREATE TRIGGER trigger_disaster_recovery_updated_at
    BEFORE UPDATE ON disaster_recovery_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_disaster_recovery_updated_at();

CREATE TRIGGER trigger_business_continuity_updated_at
    BEFORE UPDATE ON business_continuity_models
    FOR EACH ROW
    EXECUTE FUNCTION update_business_continuity_updated_at();

CREATE TRIGGER trigger_vendor_contracts_updated_at
    BEFORE UPDATE ON vendor_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_contracts_updated_at();

-- Create views for common queries
CREATE OR REPLACE VIEW current_sre_metrics AS
SELECT 
    service,
    name,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value,
    COUNT(*) as sample_count,
    MAX(timestamp) as last_updated
FROM sre_metrics
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY service, name;

CREATE OR REPLACE VIEW operational_dashboard AS
SELECT 
    (SELECT uptime_percentage FROM operational_readiness_metrics ORDER BY last_updated DESC LIMIT 1) as current_uptime,
    (SELECT mttr_minutes FROM operational_readiness_metrics ORDER BY last_updated DESC LIMIT 1) as current_mttr,
    (SELECT error_budget_remaining FROM operational_readiness_metrics ORDER BY last_updated DESC LIMIT 1) as current_error_budget,
    (SELECT COUNT(*) FROM regions WHERE is_active = true) as active_regions,
    (SELECT COUNT(*) FROM regions) as total_regions,
    (SELECT COUNT(*) FROM scaling_events WHERE timestamp >= NOW() - INTERVAL '24 hours') as scaling_events_24h;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;