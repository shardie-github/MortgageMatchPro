-- Security hardening migration for SOC II compliance

-- Enable additional security extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create audit logs table for compliance
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create security events table
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create data retention policy table
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    retention_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (table_name, retention_days) VALUES
('audit_logs', 2555), -- 7 years
('security_events', 2555), -- 7 years
('mortgage_calculations', 1095), -- 3 years
('rate_checks', 30), -- 30 days
('leads', 1095); -- 3 years

-- Add encryption columns for sensitive data
ALTER TABLE users ADD COLUMN encrypted_email TEXT;
ALTER TABLE users ADD COLUMN email_hash TEXT;

-- Add security metadata to existing tables
ALTER TABLE mortgage_calculations ADD COLUMN ip_address INET;
ALTER TABLE mortgage_calculations ADD COLUMN user_agent TEXT;
ALTER TABLE mortgage_calculations ADD COLUMN session_id TEXT;

ALTER TABLE rate_checks ADD COLUMN ip_address INET;
ALTER TABLE rate_checks ADD COLUMN user_agent TEXT;
ALTER TABLE rate_checks ADD COLUMN session_id TEXT;

ALTER TABLE leads ADD COLUMN ip_address INET;
ALTER TABLE leads ADD COLUMN user_agent TEXT;
ALTER TABLE leads ADD COLUMN session_id TEXT;

-- Create indexes for security and performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_event ON audit_logs(event);

CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
CREATE INDEX idx_security_events_resolved ON security_events(resolved);

CREATE INDEX idx_mortgage_calculations_ip ON mortgage_calculations(ip_address);
CREATE INDEX idx_rate_checks_ip ON rate_checks(ip_address);
CREATE INDEX idx_leads_ip ON leads(ip_address);

-- Create function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(encrypt(data::bytea, current_setting('app.encryption_key'), 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), current_setting('app.encryption_key'), 'aes'), 'UTF8');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to hash data for searching
CREATE OR REPLACE FUNCTION hash_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(data, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    event_type TEXT,
    severity TEXT,
    description TEXT,
    user_id UUID DEFAULT NULL,
    ip_address INET DEFAULT NULL,
    metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO security_events (event_type, severity, description, user_id, ip_address, metadata)
    VALUES (event_type, severity, description, user_id, ip_address, metadata)
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old data based on retention policies
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER AS $$
DECLARE
    policy RECORD;
    deleted_count INTEGER := 0;
    total_deleted INTEGER := 0;
BEGIN
    FOR policy IN SELECT * FROM data_retention_policies WHERE is_active = TRUE LOOP
        EXECUTE format('DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''', 
                      policy.table_name, policy.retention_days);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        
        -- Log the cleanup
        INSERT INTO audit_logs (event, details)
        VALUES ('data_cleanup', json_build_object(
            'table', policy.table_name,
            'retention_days', policy.retention_days,
            'deleted_rows', deleted_count
        ));
    END LOOP;
    
    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS INTEGER AS $$
DECLARE
    suspicious_count INTEGER := 0;
    event_id UUID;
BEGIN
    -- Detect multiple failed login attempts
    SELECT COUNT(*) INTO suspicious_count
    FROM audit_logs
    WHERE event = 'login_failed'
    AND timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY ip_address
    HAVING COUNT(*) > 5;
    
    IF suspicious_count > 0 THEN
        SELECT log_security_event(
            'multiple_failed_logins',
            'high',
            'Multiple failed login attempts detected',
            NULL,
            NULL,
            json_build_object('count', suspicious_count)
        ) INTO event_id;
    END IF;
    
    -- Detect unusual API usage patterns
    SELECT COUNT(*) INTO suspicious_count
    FROM audit_logs
    WHERE event LIKE 'api_%'
    AND timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY ip_address
    HAVING COUNT(*) > 100;
    
    IF suspicious_count > 0 THEN
        SELECT log_security_event(
            'unusual_api_usage',
            'medium',
            'Unusual API usage pattern detected',
            NULL,
            NULL,
            json_build_object('count', suspicious_count)
        ) INTO event_id;
    END IF;
    
    RETURN suspicious_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically hash emails
CREATE OR REPLACE FUNCTION hash_user_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_hash := hash_data(NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hash_email_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION hash_user_email();

-- Create trigger to log all data modifications
CREATE OR REPLACE FUNCTION log_data_changes()
RETURNS TRIGGER AS $$
DECLARE
    operation TEXT;
    table_name TEXT;
BEGIN
    table_name := TG_TABLE_NAME;
    
    IF TG_OP = 'INSERT' THEN
        operation := 'INSERT';
    ELSIF TG_OP = 'UPDATE' THEN
        operation := 'UPDATE';
    ELSIF TG_OP = 'DELETE' THEN
        operation := 'DELETE';
    END IF;
    
    INSERT INTO audit_logs (event, details)
    VALUES (
        'data_' || operation,
        json_build_object(
            'table', table_name,
            'operation', operation,
            'old_data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
            'new_data', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
        )
    );
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_mortgage_calculations
    AFTER INSERT OR UPDATE OR DELETE ON mortgage_calculations
    FOR EACH ROW EXECUTE FUNCTION log_data_changes();

CREATE TRIGGER audit_rate_checks
    AFTER INSERT OR UPDATE OR DELETE ON rate_checks
    FOR EACH ROW EXECUTE FUNCTION log_data_changes();

CREATE TRIGGER audit_leads
    AFTER INSERT OR UPDATE OR DELETE ON leads
    FOR EACH ROW EXECUTE FUNCTION log_data_changes();

-- Enhanced RLS policies for better security
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own calculations" ON mortgage_calculations;
DROP POLICY IF EXISTS "Users can insert own calculations" ON mortgage_calculations;
DROP POLICY IF EXISTS "Users can view own rate checks" ON rate_checks;
DROP POLICY IF EXISTS "Users can insert own rate checks" ON rate_checks;
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;

-- More restrictive RLS policies
CREATE POLICY "Users can view own data only" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data only" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data only" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own calculations only" ON mortgage_calculations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calculations only" ON mortgage_calculations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own rate checks only" ON rate_checks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate checks only" ON rate_checks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own leads only" ON leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads only" ON leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role policies for admin operations
CREATE POLICY "Service role can manage all data" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all calculations" ON mortgage_calculations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all rate checks" ON rate_checks
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');

-- Create view for compliance reporting
CREATE VIEW compliance_report AS
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as records_last_30_days,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM users
UNION ALL
SELECT 
    'mortgage_calculations' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as records_last_30_days,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM mortgage_calculations
UNION ALL
SELECT 
    'rate_checks' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as records_last_30_days,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM rate_checks
UNION ALL
SELECT 
    'leads' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as records_last_30_days,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM leads;

-- Create function to generate compliance report
CREATE OR REPLACE FUNCTION generate_compliance_report()
RETURNS TABLE (
    table_name TEXT,
    total_records BIGINT,
    records_last_30_days BIGINT,
    oldest_record TIMESTAMP WITH TIME ZONE,
    newest_record TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY SELECT * FROM compliance_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION encrypt_sensitive_data(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_sensitive_data(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION hash_data(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(TEXT, TEXT, TEXT, UUID, INET, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_data() TO service_role;
GRANT EXECUTE ON FUNCTION detect_suspicious_activity() TO service_role;
GRANT EXECUTE ON FUNCTION generate_compliance_report() TO service_role;

-- Grant access to views
GRANT SELECT ON compliance_report TO service_role;

-- Create scheduled job for data cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data();');
-- SELECT cron.schedule('detect-suspicious-activity', '*/15 * * * *', 'SELECT detect_suspicious_activity();');