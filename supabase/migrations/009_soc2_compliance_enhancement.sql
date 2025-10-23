-- SOC 2 Compliance Enhancement Migration
-- This migration implements comprehensive SOC 2 Type II compliance features
-- including enhanced security, audit logging, data encryption, and access controls

-- Enable additional security extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create comprehensive audit logging table
CREATE TABLE IF NOT EXISTS comprehensive_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL CHECK (event_category IN ('authentication', 'authorization', 'data_access', 'data_modification', 'system', 'security', 'compliance')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET NOT NULL,
    user_agent TEXT,
    request_id TEXT,
    response_status INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create data classification table
CREATE TABLE IF NOT EXISTS data_classification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    column_name TEXT NOT NULL,
    classification_level TEXT NOT NULL CHECK (classification_level IN ('public', 'internal', 'confidential', 'restricted')),
    data_type TEXT NOT NULL,
    pii_flag BOOLEAN DEFAULT FALSE,
    encryption_required BOOLEAN DEFAULT FALSE,
    retention_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(table_name, column_name)
);

-- Create access control matrix
CREATE TABLE IF NOT EXISTS access_control_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    permissions TEXT[] NOT NULL,
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create security incidents table
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type TEXT NOT NULL CHECK (incident_type IN ('data_breach', 'unauthorized_access', 'suspicious_activity', 'system_compromise', 'policy_violation')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    affected_users INTEGER DEFAULT 0,
    affected_data_types TEXT[],
    detection_method TEXT NOT NULL,
    source_ip INET,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Create data retention policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    retention_period_days INTEGER NOT NULL,
    archive_before_delete BOOLEAN DEFAULT TRUE,
    anonymize_before_delete BOOLEAN DEFAULT FALSE,
    legal_hold BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create encryption keys management table
CREATE TABLE IF NOT EXISTS encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name TEXT NOT NULL UNIQUE,
    key_type TEXT NOT NULL CHECK (key_type IN ('aes', 'rsa', 'ec')),
    key_size INTEGER NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Create compliance reports table
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL CHECK (report_type IN ('soc2', 'gdpr', 'ccpa', 'pci_dss', 'hipaa', 'custom')),
    report_name TEXT NOT NULL,
    report_period_start TIMESTAMPTZ NOT NULL,
    report_period_end TIMESTAMPTZ NOT NULL,
    generated_by TEXT NOT NULL,
    report_data JSONB NOT NULL,
    compliance_score DECIMAL(5,2),
    findings_count INTEGER DEFAULT 0,
    recommendations_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user access logs table
CREATE TABLE IF NOT EXISTS user_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    access_type TEXT NOT NULL CHECK (access_type IN ('login', 'logout', 'api_access', 'data_export', 'admin_action')),
    resource_accessed TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    ip_address INET NOT NULL,
    user_agent TEXT,
    session_duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create data lineage table
CREATE TABLE IF NOT EXISTS data_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    source_column TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_column TEXT NOT NULL,
    transformation_type TEXT NOT NULL,
    transformation_logic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert data classification for all tables
INSERT INTO data_classification (table_name, column_name, classification_level, data_type, pii_flag, encryption_required, retention_days) VALUES
-- Users table
('users', 'id', 'internal', 'uuid', false, false, 2555),
('users', 'email', 'confidential', 'text', true, true, 2555),
('users', 'phone', 'confidential', 'text', true, true, 2555),
('users', 'billing_email', 'confidential', 'text', true, true, 2555),
('users', 'stripe_customer_id', 'restricted', 'text', false, true, 2555),
('users', 'created_at', 'internal', 'timestamptz', false, false, 2555),
('users', 'updated_at', 'internal', 'timestamptz', false, false, 2555),
('users', 'subscription_tier', 'internal', 'text', false, false, 2555),

-- Mortgage calculations table
('mortgage_calculations', 'id', 'internal', 'uuid', false, false, 1095),
('mortgage_calculations', 'user_id', 'internal', 'uuid', false, false, 1095),
('mortgage_calculations', 'income', 'confidential', 'decimal', true, true, 1095),
('mortgage_calculations', 'debts', 'confidential', 'decimal', true, true, 1095),
('mortgage_calculations', 'down_payment', 'confidential', 'decimal', true, true, 1095),
('mortgage_calculations', 'property_price', 'confidential', 'decimal', true, true, 1095),
('mortgage_calculations', 'created_at', 'internal', 'timestamptz', false, false, 1095),

-- Leads table
('leads', 'id', 'internal', 'uuid', false, false, 1095),
('leads', 'user_id', 'internal', 'uuid', false, false, 1095),
('leads', 'name', 'confidential', 'text', true, true, 1095),
('leads', 'email', 'confidential', 'text', true, true, 1095),
('leads', 'phone', 'confidential', 'text', true, true, 1095),
('leads', 'lead_data', 'confidential', 'jsonb', true, true, 1095),
('leads', 'created_at', 'internal', 'timestamptz', false, false, 1095),

-- Brokers table
('brokers', 'id', 'internal', 'uuid', false, false, 2555),
('brokers', 'name', 'public', 'text', false, false, 2555),
('brokers', 'email', 'confidential', 'text', true, true, 2555),
('brokers', 'phone', 'confidential', 'text', true, true, 2555),
('brokers', 'company', 'public', 'text', false, false, 2555),
('brokers', 'license_number', 'confidential', 'text', false, true, 2555),
('brokers', 'commission_rate', 'internal', 'decimal', false, false, 2555),

-- Billing history table
('billing_history', 'id', 'internal', 'uuid', false, false, 2555),
('billing_history', 'user_id', 'internal', 'uuid', false, false, 2555),
('billing_history', 'amount', 'confidential', 'integer', false, true, 2555),
('billing_history', 'stripe_payment_intent_id', 'restricted', 'text', false, true, 2555),
('billing_history', 'stripe_invoice_id', 'restricted', 'text', false, true, 2555),
('billing_history', 'created_at', 'internal', 'timestamptz', false, false, 2555);

-- Insert access control matrix
INSERT INTO access_control_matrix (role_name, resource_type, resource_id, permissions, conditions) VALUES
-- Service role permissions
('service_role', 'all_tables', NULL, ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'], '{}'),
('service_role', 'all_functions', NULL, ARRAY['EXECUTE'], '{}'),

-- Authenticated user permissions
('authenticated', 'users', NULL, ARRAY['SELECT', 'UPDATE'], '{"user_id": "auth.uid()"}'),
('authenticated', 'mortgage_calculations', NULL, ARRAY['SELECT', 'INSERT'], '{"user_id": "auth.uid()"}'),
('authenticated', 'rate_checks', NULL, ARRAY['SELECT', 'INSERT'], '{"user_id": "auth.uid()"}'),
('authenticated', 'leads', NULL, ARRAY['SELECT', 'INSERT'], '{"user_id": "auth.uid()"}'),
('authenticated', 'brokers', NULL, ARRAY['SELECT'], '{"is_active": true}'),
('authenticated', 'subscriptions', NULL, ARRAY['SELECT', 'UPDATE'], '{"user_id": "auth.uid()"}'),
('authenticated', 'billing_history', NULL, ARRAY['SELECT'], '{"user_id": "auth.uid()"}'),
('authenticated', 'user_entitlements', NULL, ARRAY['SELECT', 'UPDATE'], '{"user_id": "auth.uid()"}'),
('authenticated', 'payment_methods', NULL, ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'], '{"user_id": "auth.uid()"}'),

-- Admin permissions
('admin', 'audit_logs', NULL, ARRAY['SELECT'], '{}'),
('admin', 'security_incidents', NULL, ARRAY['SELECT', 'INSERT', 'UPDATE'], '{}'),
('admin', 'compliance_reports', NULL, ARRAY['SELECT', 'INSERT', 'UPDATE'], '{}'),
('admin', 'user_access_logs', NULL, ARRAY['SELECT'], '{}');

-- Insert data retention policies
INSERT INTO data_retention_policies (table_name, retention_period_days, archive_before_delete, anonymize_before_delete) VALUES
('comprehensive_audit_logs', 2555, true, false), -- 7 years
('security_incidents', 2555, true, false), -- 7 years
('user_access_logs', 1095, true, true), -- 3 years, anonymize
('mortgage_calculations', 1095, true, true), -- 3 years, anonymize
('rate_checks', 30, false, true), -- 30 days, anonymize
('leads', 1095, true, true), -- 3 years, anonymize
('analytics_events', 365, true, true), -- 1 year, anonymize
('user_engagement_metrics', 1095, true, true); -- 3 years, anonymize

-- Create comprehensive audit logging function
CREATE OR REPLACE FUNCTION log_comprehensive_audit_event(
    p_event_type TEXT,
    p_event_category TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_action TEXT,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_response_status INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
    current_user_id UUID;
    current_session_id TEXT;
BEGIN
    -- Get current user and session
    current_user_id := auth.uid();
    current_session_id := current_setting('request.jwt.claims', true)::jsonb->>'session_id';
    
    -- Insert audit log
    INSERT INTO comprehensive_audit_logs (
        event_type, event_category, user_id, session_id, resource_type, resource_id,
        action, old_values, new_values, ip_address, user_agent, request_id,
        response_status, error_message, metadata
    ) VALUES (
        p_event_type, p_event_category, current_user_id, current_session_id,
        p_resource_type, p_resource_id, p_action, p_old_values, p_new_values,
        p_ip_address, p_user_agent, p_request_id, p_response_status, p_error_message, p_metadata
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create data encryption function
CREATE OR REPLACE FUNCTION encrypt_sensitive_field(
    p_data TEXT,
    p_key_name TEXT DEFAULT 'default_encryption_key'
)
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
    encrypted_data TEXT;
BEGIN
    -- Get encryption key (in production, this should be from a secure key management system)
    SELECT encrypted_key INTO encryption_key
    FROM encryption_keys
    WHERE key_name = p_key_name AND is_active = true
    ORDER BY key_version DESC
    LIMIT 1;
    
    IF encryption_key IS NULL THEN
        RAISE EXCEPTION 'Encryption key not found: %', p_key_name;
    END IF;
    
    -- Encrypt the data
    encrypted_data := encode(encrypt(p_data::bytea, encryption_key, 'aes'), 'base64');
    
    RETURN encrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create data decryption function (service role only)
CREATE OR REPLACE FUNCTION decrypt_sensitive_field(
    p_encrypted_data TEXT,
    p_key_name TEXT DEFAULT 'default_encryption_key'
)
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
    decrypted_data TEXT;
BEGIN
    -- Only allow service role to decrypt
    IF auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Access denied: Only service role can decrypt data';
    END IF;
    
    -- Get encryption key
    SELECT encrypted_key INTO encryption_key
    FROM encryption_keys
    WHERE key_name = p_key_name AND is_active = true
    ORDER BY key_version DESC
    LIMIT 1;
    
    IF encryption_key IS NULL THEN
        RAISE EXCEPTION 'Encryption key not found: %', p_key_name;
    END IF;
    
    -- Decrypt the data
    decrypted_data := convert_from(decrypt(decode(p_encrypted_data, 'base64'), encryption_key, 'aes'), 'UTF8');
    
    RETURN decrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create data anonymization function
CREATE OR REPLACE FUNCTION anonymize_pii_data(p_data TEXT, p_data_type TEXT)
RETURNS TEXT AS $$
BEGIN
    CASE p_data_type
        WHEN 'email' THEN
            RETURN regexp_replace(p_data, '^(.{2}).*(@.*)$', '\1***\2');
        WHEN 'phone' THEN
            RETURN regexp_replace(p_data, '^(.{3}).*(.{4})$', '\1-***-****-\2');
        WHEN 'name' THEN
            RETURN regexp_replace(p_data, '^(.{1}).*$', '\1***');
        ELSE
            RETURN '***ANONYMIZED***';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create compliance report generation function
CREATE OR REPLACE FUNCTION generate_soc2_compliance_report(
    p_report_period_start TIMESTAMPTZ,
    p_report_period_end TIMESTAMPTZ,
    p_generated_by TEXT
)
RETURNS UUID AS $$
DECLARE
    report_id UUID;
    audit_count INTEGER;
    security_incident_count INTEGER;
    data_access_count INTEGER;
    compliance_score DECIMAL(5,2);
BEGIN
    -- Count audit events
    SELECT COUNT(*) INTO audit_count
    FROM comprehensive_audit_logs
    WHERE timestamp BETWEEN p_report_period_start AND p_report_period_end;
    
    -- Count security incidents
    SELECT COUNT(*) INTO security_incident_count
    FROM security_incidents
    WHERE created_at BETWEEN p_report_period_start AND p_report_period_end;
    
    -- Count data access events
    SELECT COUNT(*) INTO data_access_count
    FROM comprehensive_audit_logs
    WHERE event_category = 'data_access'
    AND timestamp BETWEEN p_report_period_start AND p_report_period_end;
    
    -- Calculate compliance score (simplified)
    compliance_score := CASE
        WHEN security_incident_count = 0 THEN 100.0
        WHEN security_incident_count <= 5 THEN 90.0
        WHEN security_incident_count <= 10 THEN 80.0
        ELSE 70.0
    END;
    
    -- Insert compliance report
    INSERT INTO compliance_reports (
        report_type, report_name, report_period_start, report_period_end,
        generated_by, report_data, compliance_score, findings_count
    ) VALUES (
        'soc2',
        'SOC 2 Type II Compliance Report',
        p_report_period_start,
        p_report_period_end,
        p_generated_by,
        json_build_object(
            'audit_events_count', audit_count,
            'security_incidents_count', security_incident_count,
            'data_access_events_count', data_access_count,
            'compliance_score', compliance_score,
            'report_generated_at', NOW()
        ),
        compliance_score,
        security_incident_count
    ) RETURNING id INTO report_id;
    
    RETURN report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create data retention cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE (
    table_name TEXT,
    deleted_count BIGINT
) AS $$
DECLARE
    policy RECORD;
    deleted_count BIGINT;
BEGIN
    FOR policy IN 
        SELECT table_name, retention_period_days, anonymize_before_delete
        FROM data_retention_policies
        WHERE retention_period_days IS NOT NULL
    LOOP
        -- Delete expired data
        EXECUTE format(
            'DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''',
            policy.table_name,
            policy.retention_period_days
        );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        -- Log the cleanup
        PERFORM log_comprehensive_audit_event(
            'data_cleanup',
            'system',
            policy.table_name,
            NULL,
            'DELETE',
            NULL,
            json_build_object('deleted_count', deleted_count),
            NULL,
            NULL,
            NULL,
            200,
            NULL,
            json_build_object('retention_days', policy.retention_period_days)
        );
        
        RETURN QUERY SELECT policy.table_name, deleted_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX idx_comprehensive_audit_logs_event_type ON comprehensive_audit_logs(event_type);
CREATE INDEX idx_comprehensive_audit_logs_event_category ON comprehensive_audit_logs(event_category);
CREATE INDEX idx_comprehensive_audit_logs_user_id ON comprehensive_audit_logs(user_id);
CREATE INDEX idx_comprehensive_audit_logs_timestamp ON comprehensive_audit_logs(timestamp);
CREATE INDEX idx_comprehensive_audit_logs_resource_type ON comprehensive_audit_logs(resource_type);

CREATE INDEX idx_data_classification_table_column ON data_classification(table_name, column_name);
CREATE INDEX idx_data_classification_classification ON data_classification(classification_level);
CREATE INDEX idx_data_classification_pii ON data_classification(pii_flag);

CREATE INDEX idx_access_control_role ON access_control_matrix(role_name);
CREATE INDEX idx_access_control_resource ON access_control_matrix(resource_type);

CREATE INDEX idx_security_incidents_type ON security_incidents(incident_type);
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX idx_security_incidents_status ON security_incidents(status);
CREATE INDEX idx_security_incidents_created_at ON security_incidents(created_at);

CREATE INDEX idx_user_access_logs_user_id ON user_access_logs(user_id);
CREATE INDEX idx_user_access_logs_access_type ON user_access_logs(access_type);
CREATE INDEX idx_user_access_logs_created_at ON user_access_logs(created_at);

-- Enable RLS on all new tables
ALTER TABLE comprehensive_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_classification ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_control_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_lineage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
-- Audit logs - admin and service role only
CREATE POLICY "Only admins can view audit logs" ON comprehensive_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email LIKE '%admin%'
        ) OR auth.role() = 'service_role'
    );

-- Data classification - read-only for authenticated users
CREATE POLICY "Authenticated users can view data classification" ON data_classification
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Access control matrix - admin and service role only
CREATE POLICY "Only admins can manage access control" ON access_control_matrix
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email LIKE '%admin%'
        ) OR auth.role() = 'service_role'
    );

-- Security incidents - admin and service role only
CREATE POLICY "Only admins can manage security incidents" ON security_incidents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email LIKE '%admin%'
        ) OR auth.role() = 'service_role'
    );

-- Data retention policies - admin and service role only
CREATE POLICY "Only admins can manage retention policies" ON data_retention_policies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email LIKE '%admin%'
        ) OR auth.role() = 'service_role'
    );

-- Encryption keys - service role only
CREATE POLICY "Only service role can manage encryption keys" ON encryption_keys
    FOR ALL USING (auth.role() = 'service_role');

-- Compliance reports - admin and service role only
CREATE POLICY "Only admins can manage compliance reports" ON compliance_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email LIKE '%admin%'
        ) OR auth.role() = 'service_role'
    );

-- User access logs - users can view their own, admins can view all
CREATE POLICY "Users can view own access logs" ON user_access_logs
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email LIKE '%admin%'
        ) OR auth.role() = 'service_role'
    );

-- Data lineage - read-only for authenticated users
CREATE POLICY "Authenticated users can view data lineage" ON data_lineage
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION log_comprehensive_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION encrypt_sensitive_field TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_sensitive_field TO service_role;
GRANT EXECUTE ON FUNCTION anonymize_pii_data TO authenticated;
GRANT EXECUTE ON FUNCTION generate_soc2_compliance_report TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_data TO service_role;

-- Create triggers for automatic audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    event_category TEXT;
BEGIN
    -- Determine event category based on table
    event_category := CASE TG_TABLE_NAME
        WHEN 'users' THEN 'data_modification'
        WHEN 'mortgage_calculations' THEN 'data_modification'
        WHEN 'leads' THEN 'data_modification'
        WHEN 'billing_history' THEN 'data_modification'
        ELSE 'data_modification'
    END;
    
    -- Prepare old and new data
    IF TG_OP = 'DELETE' THEN
        old_data := row_to_json(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := row_to_json(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := row_to_json(OLD);
        new_data := row_to_json(NEW);
    END IF;
    
    -- Log the audit event
    PERFORM log_comprehensive_audit_event(
        'data_' || TG_OP,
        event_category,
        TG_TABLE_NAME,
        COALESCE(NEW.id::TEXT, OLD.id::TEXT),
        TG_OP,
        old_data,
        new_data,
        inet_client_addr(),
        current_setting('request.headers', true)::jsonb->>'user-agent',
        current_setting('request.jwt.claims', true)::jsonb->>'jti',
        NULL,
        NULL,
        json_build_object('trigger', 'audit_trigger')
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_mortgage_calculations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON mortgage_calculations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_leads_trigger
    AFTER INSERT OR UPDATE OR DELETE ON leads
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_billing_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON billing_history
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Insert default encryption key (in production, this should be generated securely)
INSERT INTO encryption_keys (key_name, key_type, key_size, encrypted_key, is_active) VALUES
('default_encryption_key', 'aes', 256, encode(gen_random_bytes(32), 'base64'), true)
ON CONFLICT (key_name) DO NOTHING;

-- Create view for SOC 2 compliance dashboard
CREATE OR REPLACE VIEW soc2_compliance_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM comprehensive_audit_logs WHERE timestamp >= NOW() - INTERVAL '24 hours') as audit_events_24h,
    (SELECT COUNT(*) FROM security_incidents WHERE status = 'open') as open_security_incidents,
    (SELECT COUNT(*) FROM user_access_logs WHERE created_at >= NOW() - INTERVAL '24 hours') as user_access_events_24h,
    (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
    (SELECT COUNT(*) FROM data_retention_policies WHERE is_active = true) as active_retention_policies,
    (SELECT COUNT(*) FROM encryption_keys WHERE is_active = true) as active_encryption_keys,
    (SELECT compliance_score FROM compliance_reports ORDER BY created_at DESC LIMIT 1) as latest_compliance_score;

-- Grant permissions
GRANT SELECT ON soc2_compliance_dashboard TO authenticated;
GRANT SELECT ON soc2_compliance_dashboard TO service_role;