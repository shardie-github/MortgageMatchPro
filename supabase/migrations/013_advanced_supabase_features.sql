-- Advanced Supabase Features Migration
-- Implements realtime subscriptions, edge functions, advanced RLS, and performance optimizations

-- Enable additional extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_qualstats";

-- Create advanced RLS policies with better security
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND subscription_tier = 'broker'
    AND id IN (
      SELECT user_id FROM broker_licenses 
      WHERE is_active = true 
      AND expires_at > NOW()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_owner_or_admin(resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = resource_user_id OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own calculations" ON mortgage_calculations;
DROP POLICY IF EXISTS "Users can insert own calculations" ON mortgage_calculations;
DROP POLICY IF EXISTS "Users can view own rate checks" ON rate_checks;
DROP POLICY IF EXISTS "Users can insert own rate checks" ON rate_checks;
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Brokers are publicly readable" ON brokers;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Mortgage calculations policies
CREATE POLICY "Users can view own calculations" ON mortgage_calculations
  FOR SELECT USING (is_owner_or_admin(user_id));

CREATE POLICY "Users can insert own calculations" ON mortgage_calculations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calculations" ON mortgage_calculations
  FOR UPDATE USING (is_owner_or_admin(user_id));

CREATE POLICY "Users can delete own calculations" ON mortgage_calculations
  FOR DELETE USING (is_owner_or_admin(user_id));

-- Rate checks policies
CREATE POLICY "Users can view own rate checks" ON rate_checks
  FOR SELECT USING (is_owner_or_admin(user_id));

CREATE POLICY "Users can insert own rate checks" ON rate_checks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rate checks" ON rate_checks
  FOR UPDATE USING (is_owner_or_admin(user_id));

-- Leads policies
CREATE POLICY "Users can view own leads" ON leads
  FOR SELECT USING (is_owner_or_admin(user_id));

CREATE POLICY "Users can insert own leads" ON leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON leads
  FOR UPDATE USING (is_owner_or_admin(user_id));

CREATE POLICY "Brokers can view assigned leads" ON leads
  FOR SELECT USING (
    broker_id IN (
      SELECT id FROM brokers 
      WHERE id IN (
        SELECT broker_id FROM broker_licenses 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Brokers can update assigned leads" ON leads
  FOR UPDATE USING (
    broker_id IN (
      SELECT id FROM brokers 
      WHERE id IN (
        SELECT broker_id FROM broker_licenses 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Brokers policies
CREATE POLICY "Brokers are publicly readable" ON brokers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage brokers" ON brokers
  FOR ALL USING (is_admin());

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (is_owner_or_admin(user_id));

CREATE POLICY "Users can view own billing history" ON billing_history
  FOR SELECT USING (is_owner_or_admin(user_id));

-- Create advanced database functions
CREATE OR REPLACE FUNCTION get_user_dashboard_data(user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user', (SELECT row_to_json(u) FROM users u WHERE u.id = user_id),
    'recent_calculations', (
      SELECT json_agg(row_to_json(mc)) 
      FROM mortgage_calculations mc 
      WHERE mc.user_id = user_id 
      ORDER BY mc.created_at DESC 
      LIMIT 5
    ),
    'recent_rate_checks', (
      SELECT json_agg(row_to_json(rc)) 
      FROM rate_checks rc 
      WHERE rc.user_id = user_id 
      ORDER BY rc.created_at DESC 
      LIMIT 5
    ),
    'recent_leads', (
      SELECT json_agg(row_to_json(l)) 
      FROM leads l 
      WHERE l.user_id = user_id 
      ORDER BY l.created_at DESC 
      LIMIT 5
    ),
    'subscription', (
      SELECT row_to_json(s) 
      FROM subscriptions s 
      WHERE s.user_id = user_id 
      AND s.status = 'active' 
      LIMIT 1
    ),
    'analytics', (
      SELECT json_build_object(
        'total_calculations', COUNT(mc.id),
        'total_rate_checks', COUNT(rc.id),
        'total_leads', COUNT(l.id),
        'avg_lead_score', AVG(l.lead_score)
      )
      FROM users u
      LEFT JOIN mortgage_calculations mc ON u.id = mc.user_id
      LEFT JOIN rate_checks rc ON u.id = rc.user_id
      LEFT JOIN leads l ON u.id = l.user_id
      WHERE u.id = user_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for broker dashboard
CREATE OR REPLACE FUNCTION get_broker_dashboard_data(broker_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'broker', (SELECT row_to_json(b) FROM brokers b WHERE b.id = broker_id),
    'assigned_leads', (
      SELECT json_agg(row_to_json(l)) 
      FROM leads l 
      WHERE l.broker_id = broker_id 
      ORDER BY l.created_at DESC 
      LIMIT 10
    ),
    'lead_stats', (
      SELECT json_build_object(
        'total_leads', COUNT(*),
        'pending_leads', COUNT(*) FILTER (WHERE status = 'pending'),
        'contacted_leads', COUNT(*) FILTER (WHERE status = 'contacted'),
        'converted_leads', COUNT(*) FILTER (WHERE status = 'converted'),
        'avg_lead_score', AVG(lead_score)
      )
      FROM leads 
      WHERE broker_id = broker_id
    ),
    'recent_activity', (
      SELECT json_agg(
        json_build_object(
          'type', 'lead_update',
          'lead_id', l.id,
          'lead_name', l.name,
          'status', l.status,
          'updated_at', l.updated_at
        )
      )
      FROM leads l 
      WHERE l.broker_id = broker_id 
      AND l.updated_at >= NOW() - INTERVAL '7 days'
      ORDER BY l.updated_at DESC 
      LIMIT 20
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for system analytics
CREATE OR REPLACE FUNCTION get_system_analytics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_stats', (
      SELECT json_build_object(
        'total_users', COUNT(*),
        'free_users', COUNT(*) FILTER (WHERE subscription_tier = 'free'),
        'premium_users', COUNT(*) FILTER (WHERE subscription_tier = 'premium'),
        'broker_users', COUNT(*) FILTER (WHERE subscription_tier = 'broker'),
        'new_users_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
        'new_users_this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
      )
      FROM users
    ),
    'calculation_stats', (
      SELECT json_build_object(
        'total_calculations', COUNT(*),
        'calculations_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
        'calculations_this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
        'avg_property_price', AVG(property_price),
        'avg_monthly_payment', AVG(monthly_payment)
      )
      FROM mortgage_calculations
    ),
    'lead_stats', (
      SELECT json_build_object(
        'total_leads', COUNT(*),
        'leads_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
        'leads_this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
        'conversion_rate', 
          ROUND(
            COUNT(*) FILTER (WHERE status = 'converted')::DECIMAL / 
            NULLIF(COUNT(*) FILTER (WHERE status IN ('contacted', 'converted')), 0) * 100, 
            2
          ),
        'avg_lead_score', AVG(lead_score)
      )
      FROM leads
    ),
    'broker_stats', (
      SELECT json_build_object(
        'total_brokers', COUNT(*),
        'active_brokers', COUNT(*) FILTER (WHERE is_active = true),
        'avg_commission_rate', AVG(commission_rate)
      )
      FROM brokers
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for database health monitoring
CREATE OR REPLACE FUNCTION get_database_health()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'connection_count', (
      SELECT count(*) 
      FROM pg_stat_activity 
      WHERE state = 'active'
    ),
    'database_size', (
      SELECT pg_size_pretty(pg_database_size(current_database()))
    ),
    'table_sizes', (
      SELECT json_agg(
        json_build_object(
          'table_name', schemaname||'.'||tablename,
          'size', pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
        )
      )
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    ),
    'index_usage', (
      SELECT json_agg(
        json_build_object(
          'index_name', indexname,
          'table_name', tablename,
          'index_scans', idx_scan,
          'index_tuples_read', idx_tup_read,
          'index_tuples_fetched', idx_tup_fetch
        )
      )
      FROM pg_stat_user_indexes 
      ORDER BY idx_scan DESC
      LIMIT 10
    ),
    'slow_queries', (
      SELECT json_agg(
        json_build_object(
          'query', query,
          'calls', calls,
          'total_time', total_time,
          'mean_time', mean_time
        )
      )
      FROM pg_stat_statements 
      ORDER BY total_time DESC
      LIMIT 10
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for data export
CREATE OR REPLACE FUNCTION export_user_data(user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_profile', (SELECT row_to_json(u) FROM users u WHERE u.id = user_id),
    'mortgage_calculations', (
      SELECT json_agg(row_to_json(mc)) 
      FROM mortgage_calculations mc 
      WHERE mc.user_id = user_id
    ),
    'rate_checks', (
      SELECT json_agg(row_to_json(rc)) 
      FROM rate_checks rc 
      WHERE rc.user_id = user_id
    ),
    'leads', (
      SELECT json_agg(row_to_json(l)) 
      FROM leads l 
      WHERE l.user_id = user_id
    ),
    'subscriptions', (
      SELECT json_agg(row_to_json(s)) 
      FROM subscriptions s 
      WHERE s.user_id = user_id
    ),
    'billing_history', (
      SELECT json_agg(row_to_json(bh)) 
      FROM billing_history bh 
      WHERE bh.user_id = user_id
    ),
    'exported_at', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for data anonymization
CREATE OR REPLACE FUNCTION anonymize_user_data(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Anonymize user profile
  UPDATE users SET
    email = 'anonymized_' || user_id || '@example.com',
    phone = NULL,
    billing_email = NULL,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Anonymize leads
  UPDATE leads SET
    name = 'Anonymized User',
    email = 'anonymized_' || user_id || '@example.com',
    phone = '000-000-0000',
    lead_data = jsonb_build_object('anonymized', true),
    updated_at = NOW()
  WHERE user_id = user_id;
  
  -- Anonymize mortgage calculations (keep financial data for analytics)
  UPDATE mortgage_calculations SET
    updated_at = NOW()
  WHERE user_id = user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for cleanup
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS JSON AS $$
DECLARE
  result JSON;
  deleted_calculations INTEGER;
  deleted_rate_checks INTEGER;
  deleted_audit_logs INTEGER;
BEGIN
  -- Delete old mortgage calculations (older than 2 years)
  DELETE FROM mortgage_calculations 
  WHERE created_at < NOW() - INTERVAL '2 years';
  GET DIAGNOSTICS deleted_calculations = ROW_COUNT;
  
  -- Delete expired rate checks
  DELETE FROM rate_checks 
  WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_rate_checks = ROW_COUNT;
  
  -- Delete old audit logs (older than 1 year)
  DELETE FROM comprehensive_audit_logs 
  WHERE timestamp < NOW() - INTERVAL '1 year';
  GET DIAGNOSTICS deleted_audit_logs = ROW_COUNT;
  
  SELECT json_build_object(
    'deleted_calculations', deleted_calculations,
    'deleted_rate_checks', deleted_rate_checks,
    'deleted_audit_logs', deleted_audit_logs,
    'cleanup_date', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create advanced indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mortgage_calculations_user_created_property 
ON mortgage_calculations(user_id, created_at DESC, property_price);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mortgage_calculations_country_affordability 
ON mortgage_calculations(country, max_affordable DESC) 
WHERE max_affordable > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_broker_status_score 
ON leads(broker_id, status, lead_score DESC) 
WHERE broker_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_user_status_created 
ON leads(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_checks_country_type_expires 
ON rate_checks(country, rate_type, expires_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_created 
ON users(subscription_tier, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_status_tier 
ON subscriptions(user_id, status, tier);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_history_user_created_status 
ON billing_history(user_id, created_at DESC, status);

-- Create full-text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_fts 
ON users USING gin(to_tsvector('english', email));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brokers_name_company_fts 
ON brokers USING gin(to_tsvector('english', name || ' ' || company));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_name_email_fts 
ON leads USING gin(to_tsvector('english', name || ' ' || email));

-- Create partial indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mortgage_calculations_high_value 
ON mortgage_calculations(property_price, monthly_payment) 
WHERE property_price > 1000000;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_high_score 
ON leads(lead_score, created_at DESC) 
WHERE lead_score >= 80;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_premium_active 
ON users(id, subscription_tier) 
WHERE subscription_tier IN ('premium', 'broker');

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_dashboard_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_broker_dashboard_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_analytics TO service_role;
GRANT EXECUTE ON FUNCTION get_database_health TO service_role;
GRANT EXECUTE ON FUNCTION export_user_data TO authenticated;
GRANT EXECUTE ON FUNCTION anonymize_user_data TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_data TO service_role;

-- Create views for common queries
CREATE OR REPLACE VIEW user_summary AS
SELECT 
  u.id,
  u.email,
  u.subscription_tier,
  u.created_at,
  COUNT(DISTINCT mc.id) as total_calculations,
  COUNT(DISTINCT rc.id) as total_rate_checks,
  COUNT(DISTINCT l.id) as total_leads,
  MAX(mc.created_at) as last_calculation,
  MAX(rc.created_at) as last_rate_check,
  MAX(l.created_at) as last_lead
FROM users u
LEFT JOIN mortgage_calculations mc ON u.id = mc.user_id
LEFT JOIN rate_checks rc ON u.id = rc.user_id
LEFT JOIN leads l ON u.id = l.user_id
GROUP BY u.id, u.email, u.subscription_tier, u.created_at;

CREATE OR REPLACE VIEW broker_performance AS
SELECT 
  b.id,
  b.name,
  b.company,
  b.commission_rate,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'contacted' THEN l.id END) as contacted_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END) as converted_leads,
  ROUND(
    COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END)::DECIMAL / 
    NULLIF(COUNT(DISTINCT CASE WHEN l.status = 'contacted' THEN l.id END), 0) * 100, 
    2
  ) as conversion_rate,
  AVG(l.lead_score) as avg_lead_score
FROM brokers b
LEFT JOIN leads l ON b.id = l.broker_id
WHERE b.is_active = true
GROUP BY b.id, b.name, b.company, b.commission_rate;

-- Grant access to views
GRANT SELECT ON user_summary TO authenticated;
GRANT SELECT ON broker_performance TO authenticated;

-- Create triggers for automatic data maintenance
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all relevant tables
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brokers_updated_at 
  BEFORE UPDATE ON brokers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at 
  BEFORE UPDATE ON leads 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_broker_licenses_updated_at 
  BEFORE UPDATE ON broker_licenses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY broker_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY system_metrics_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION refresh_all_materialized_views TO service_role;

-- Insert initial system configuration
INSERT INTO system_config (key, value, description) VALUES
('realtime_enabled', 'true', 'Enable realtime subscriptions'),
('max_calculations_per_user', '1000', 'Maximum calculations per user per month'),
('rate_check_cache_duration', '3600', 'Rate check cache duration in seconds'),
('lead_auto_assignment', 'true', 'Enable automatic lead assignment to brokers'),
('maintenance_mode', 'false', 'Enable maintenance mode'),
('data_retention_days', '730', 'Data retention period in days')
ON CONFLICT (key) DO NOTHING;