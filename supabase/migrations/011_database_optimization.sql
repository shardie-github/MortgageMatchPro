-- Database Optimization Migration
-- This migration implements comprehensive database optimization including
-- advanced indexing, query optimization, partitioning, and performance monitoring

-- Enable additional extensions for optimization
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_qualstats";

-- Create performance monitoring tables
CREATE TABLE IF NOT EXISTS query_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT NOT NULL,
    query_text TEXT NOT NULL,
    execution_time_ms DECIMAL(10,3) NOT NULL,
    rows_returned INTEGER NOT NULL,
    rows_examined INTEGER NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS index_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    index_name TEXT NOT NULL,
    index_scans BIGINT NOT NULL DEFAULT 0,
    index_tuples_read BIGINT NOT NULL DEFAULT 0,
    index_tuples_fetched BIGINT NOT NULL DEFAULT 0,
    last_used TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS table_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    row_count BIGINT NOT NULL,
    table_size_bytes BIGINT NOT NULL,
    index_size_bytes BIGINT NOT NULL,
    total_size_bytes BIGINT NOT NULL,
    last_analyzed TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create advanced indexes for better performance

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mortgage_calculations_user_created 
ON mortgage_calculations(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mortgage_calculations_country_created 
ON mortgage_calculations(country, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_checks_user_expires 
ON rate_checks(user_id, expires_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_checks_country_type 
ON rate_checks(country, rate_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_user_status_created 
ON leads(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_broker_status 
ON leads(broker_id, status) WHERE broker_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_score_status 
ON leads(lead_score DESC, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_history_user_created 
ON billing_history(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_history_status_created 
ON billing_history(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_status 
ON subscriptions(user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_tier_status 
ON subscriptions(tier, status);

-- Partial indexes for filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_subscription 
ON users(subscription_tier, created_at) WHERE subscription_tier != 'free';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brokers_active 
ON brokers(commission_rate, created_at) WHERE is_active = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_pending 
ON leads(created_at, lead_score DESC) WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_converted 
ON leads(converted_at, broker_id) WHERE status = 'converted';

-- GIN indexes for JSONB columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mortgage_calculations_data_gin 
ON mortgage_calculations USING GIN(lead_data);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_data_gin 
ON leads USING GIN(lead_data);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_history_metadata_gin 
ON billing_history USING GIN(metadata);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_broker_licenses_branding_gin 
ON broker_licenses USING GIN(custom_branding);

-- Text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_trgm 
ON users USING GIN(email gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brokers_name_trgm 
ON brokers USING GIN(name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brokers_company_trgm 
ON brokers USING GIN(company gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_name_trgm 
ON leads USING GIN(name gin_trgm_ops);

-- Functional indexes for computed values
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mortgage_calculations_affordability 
ON mortgage_calculations((income - debts - (property_price * 0.05)));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_qualification_tier 
ON leads((CASE 
    WHEN lead_score >= 70 THEN 'PREMIUM'
    WHEN lead_score >= 50 THEN 'STANDARD'
    ELSE 'COACHING'
END));

-- Create partitioned tables for large datasets
-- Partition audit logs by month
CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
    LIKE comprehensive_audit_logs INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for the last 12 months
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..11 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * i);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'audit_logs_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs_partitioned FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date);
    END LOOP;
END $$;

-- Create materialized views for complex aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.subscription_tier,
    COUNT(DISTINCT mc.id) as total_calculations,
    COUNT(DISTINCT rc.id) as total_rate_checks,
    COUNT(DISTINCT l.id) as total_leads,
    MAX(mc.created_at) as last_calculation,
    MAX(rc.created_at) as last_rate_check,
    MAX(l.created_at) as last_lead,
    COALESCE(SUM(bh.amount), 0) as total_spent
FROM users u
LEFT JOIN mortgage_calculations mc ON u.id = mc.user_id
LEFT JOIN rate_checks rc ON u.id = rc.user_id
LEFT JOIN leads l ON u.id = l.user_id
LEFT JOIN billing_history bh ON u.id = bh.user_id AND bh.status = 'succeeded'
GROUP BY u.id, u.email, u.subscription_tier;

CREATE UNIQUE INDEX ON user_activity_summary(user_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS broker_performance_summary AS
SELECT 
    b.id as broker_id,
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
    AVG(l.lead_score) as avg_lead_score,
    MAX(l.created_at) as last_lead_received
FROM brokers b
LEFT JOIN leads l ON b.id = l.broker_id
WHERE b.is_active = TRUE
GROUP BY b.id, b.name, b.company, b.commission_rate;

CREATE UNIQUE INDEX ON broker_performance_summary(broker_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS system_metrics_summary AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_requests,
    AVG(execution_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_response_time,
    COUNT(CASE WHEN execution_time_ms > 1000 THEN 1 END) as slow_queries
FROM query_performance_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Create functions for query optimization
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE (
    query_hash TEXT,
    avg_execution_time DECIMAL(10,3),
    total_executions BIGINT,
    total_rows_returned BIGINT,
    query_text TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qpl.query_hash,
        AVG(qpl.execution_time_ms) as avg_execution_time,
        COUNT(*) as total_executions,
        SUM(qpl.rows_returned) as total_rows_returned,
        MAX(qpl.query_text) as query_text
    FROM query_performance_logs qpl
    WHERE qpl.created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY qpl.query_hash
    ORDER BY AVG(qpl.execution_time_ms) DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_slow_queries(threshold_ms DECIMAL DEFAULT 1000)
RETURNS TABLE (
    query_hash TEXT,
    max_execution_time DECIMAL(10,3),
    avg_execution_time DECIMAL(10,3),
    execution_count BIGINT,
    query_text TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qpl.query_hash,
        MAX(qpl.execution_time_ms) as max_execution_time,
        AVG(qpl.execution_time_ms) as avg_execution_time,
        COUNT(*) as execution_count,
        MAX(qpl.query_text) as query_text
    FROM query_performance_logs qpl
    WHERE qpl.execution_time_ms > threshold_ms
    AND qpl.created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY qpl.query_hash
    ORDER BY MAX(qpl.execution_time_ms) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY broker_performance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY system_metrics_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to collect table statistics
CREATE OR REPLACE FUNCTION collect_table_statistics()
RETURNS VOID AS $$
DECLARE
    table_record RECORD;
    row_count BIGINT;
    table_size BIGINT;
    index_size BIGINT;
    total_size BIGINT;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        -- Get row count
        EXECUTE format('SELECT COUNT(*) FROM %I.%I', table_record.schemaname, table_record.tablename) INTO row_count;
        
        -- Get table size
        SELECT pg_total_relation_size(format('%I.%I', table_record.schemaname, table_record.tablename)) INTO total_size;
        
        -- Get table size without indexes
        SELECT pg_relation_size(format('%I.%I', table_record.schemaname, table_record.tablename)) INTO table_size;
        
        -- Calculate index size
        index_size := total_size - table_size;
        
        -- Insert or update statistics
        INSERT INTO table_statistics (table_name, row_count, table_size_bytes, index_size_bytes, total_size_bytes, last_analyzed)
        VALUES (table_record.tablename, row_count, table_size, index_size, total_size, NOW())
        ON CONFLICT (table_name) DO UPDATE SET
            row_count = EXCLUDED.row_count,
            table_size_bytes = EXCLUDED.table_size_bytes,
            index_size_bytes = EXCLUDED.index_size_bytes,
            total_size_bytes = EXCLUDED.total_size_bytes,
            last_analyzed = EXCLUDED.last_analyzed;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to identify unused indexes
CREATE OR REPLACE FUNCTION identify_unused_indexes()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    index_size_bytes BIGINT,
    last_used TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name,
        i.index_name,
        pg_relation_size(i.index_name::regclass) as index_size_bytes,
        ius.last_used
    FROM pg_indexes i
    JOIN table_statistics t ON i.tablename = t.table_name
    LEFT JOIN index_usage_stats ius ON i.tablename = ius.table_name AND i.indexname = ius.index_name
    WHERE i.schemaname = 'public'
    AND (ius.index_scans = 0 OR ius.index_scans IS NULL)
    AND pg_relation_size(i.index_name::regclass) > 1024 * 1024 -- Only indexes larger than 1MB
    ORDER BY pg_relation_size(i.index_name::regclass) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to optimize queries
CREATE OR REPLACE FUNCTION optimize_database()
RETURNS TABLE (
    optimization_type TEXT,
    description TEXT,
    estimated_impact TEXT
) AS $$
DECLARE
    unused_indexes INTEGER;
    slow_queries INTEGER;
    large_tables INTEGER;
BEGIN
    -- Check for unused indexes
    SELECT COUNT(*) INTO unused_indexes
    FROM identify_unused_indexes();
    
    -- Check for slow queries
    SELECT COUNT(*) INTO slow_queries
    FROM get_slow_queries(1000);
    
    -- Check for large tables
    SELECT COUNT(*) INTO large_tables
    FROM table_statistics
    WHERE total_size_bytes > 100 * 1024 * 1024; -- 100MB
    
    RETURN QUERY
    SELECT 
        'unused_indexes'::TEXT,
        format('Found %s unused indexes that could be dropped', unused_indexes),
        CASE 
            WHEN unused_indexes > 0 THEN 'High - Will reduce storage and improve write performance'
            ELSE 'None'
        END
    UNION ALL
    SELECT 
        'slow_queries'::TEXT,
        format('Found %s slow queries that need optimization', slow_queries),
        CASE 
            WHEN slow_queries > 0 THEN 'High - Will improve user experience'
            ELSE 'None'
        END
    UNION ALL
    SELECT 
        'large_tables'::TEXT,
        format('Found %s large tables that could benefit from partitioning', large_tables),
        CASE 
            WHEN large_tables > 0 THEN 'Medium - Will improve query performance'
            ELSE 'None'
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic performance monitoring
CREATE OR REPLACE FUNCTION log_query_performance()
RETURNS TRIGGER AS $$
DECLARE
    query_text TEXT;
    execution_time DECIMAL(10,3);
    rows_returned INTEGER;
    rows_examined INTEGER;
BEGIN
    -- This is a simplified version - in production, you'd use pg_stat_statements
    -- or a more sophisticated query monitoring solution
    
    query_text := current_query();
    execution_time := 0; -- Would be calculated from actual query execution
    rows_returned := 0; -- Would be calculated from actual query execution
    rows_examined := 0; -- Would be calculated from actual query execution
    
    INSERT INTO query_performance_logs (
        query_hash, query_text, execution_time_ms, 
        rows_returned, rows_examined, user_id, session_id
    ) VALUES (
        md5(query_text), query_text, execution_time,
        rows_returned, rows_examined, auth.uid(),
        current_setting('request.jwt.claims', true)::jsonb->>'session_id'
    );
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance monitoring tables
CREATE INDEX idx_query_performance_logs_hash ON query_performance_logs(query_hash);
CREATE INDEX idx_query_performance_logs_created ON query_performance_logs(created_at);
CREATE INDEX idx_query_performance_logs_execution_time ON query_performance_logs(execution_time_ms);

CREATE INDEX idx_index_usage_stats_table ON index_usage_stats(table_name);
CREATE INDEX idx_index_usage_stats_index ON index_usage_stats(index_name);

-- Create views for performance monitoring
CREATE OR REPLACE VIEW performance_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM query_performance_logs WHERE created_at >= NOW() - INTERVAL '1 hour') as queries_last_hour,
    (SELECT AVG(execution_time_ms) FROM query_performance_logs WHERE created_at >= NOW() - INTERVAL '1 hour') as avg_response_time_ms,
    (SELECT COUNT(*) FROM query_performance_logs WHERE execution_time_ms > 1000 AND created_at >= NOW() - INTERVAL '1 hour') as slow_queries_last_hour,
    (SELECT COUNT(DISTINCT user_id) FROM query_performance_logs WHERE created_at >= NOW() - INTERVAL '1 hour') as active_users_last_hour,
    (SELECT SUM(total_size_bytes) FROM table_statistics) as total_database_size_bytes,
    (SELECT COUNT(*) FROM identify_unused_indexes()) as unused_indexes_count;

-- Create function to schedule maintenance tasks
CREATE OR REPLACE FUNCTION schedule_maintenance_tasks()
RETURNS VOID AS $$
BEGIN
    -- Refresh materialized views every hour
    PERFORM refresh_materialized_views();
    
    -- Collect table statistics daily
    PERFORM collect_table_statistics();
    
    -- Log maintenance completion
    INSERT INTO comprehensive_audit_logs (
        event_type, event_category, resource_type, action, 
        metadata, ip_address
    ) VALUES (
        'maintenance_completed',
        'system',
        'database',
        'optimization',
        json_build_object('timestamp', NOW()),
        inet_client_addr()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION analyze_query_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_materialized_views TO service_role;
GRANT EXECUTE ON FUNCTION collect_table_statistics TO service_role;
GRANT EXECUTE ON FUNCTION identify_unused_indexes TO service_role;
GRANT EXECUTE ON FUNCTION optimize_database TO service_role;
GRANT EXECUTE ON FUNCTION schedule_maintenance_tasks TO service_role;

-- Grant access to views
GRANT SELECT ON performance_dashboard TO authenticated;
GRANT SELECT ON user_activity_summary TO authenticated;
GRANT SELECT ON broker_performance_summary TO authenticated;
GRANT SELECT ON system_metrics_summary TO authenticated;

-- Enable RLS on new tables
ALTER TABLE query_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE index_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_statistics ENABLE ROW LEVEL SECURITY;

-- RLS policies for performance monitoring tables
CREATE POLICY "Admins can view performance logs" ON query_performance_logs
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can view index usage stats" ON index_usage_stats
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can view table statistics" ON table_statistics
    FOR SELECT USING (is_admin());

-- Insert initial data
INSERT INTO table_statistics (table_name, row_count, table_size_bytes, index_size_bytes, total_size_bytes, last_analyzed)
SELECT 
    tablename,
    0,
    0,
    0,
    0,
    NOW()
FROM pg_tables 
WHERE schemaname = 'public'
ON CONFLICT (table_name) DO NOTHING;