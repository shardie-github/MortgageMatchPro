-- Complete Data Ecosystem Integration
-- This migration provides comprehensive data management, analysis, and automation capabilities

-- =============================================
-- COMPREHENSIVE DATA MANAGEMENT VIEWS
-- =============================================

-- View for data source health monitoring
CREATE OR REPLACE VIEW data_source_health AS
SELECT 
    ds.id,
    ds.name,
    ds.source_type,
    ds.is_active,
    ds.created_at,
    COALESCE(recent_jobs.total_jobs, 0) as total_jobs_24h,
    COALESCE(recent_jobs.successful_jobs, 0) as successful_jobs_24h,
    COALESCE(recent_jobs.failed_jobs, 0) as failed_jobs_24h,
    COALESCE(recent_jobs.success_rate, 0) as success_rate_24h,
    COALESCE(recent_jobs.total_records, 0) as total_records_24h,
    COALESCE(recent_jobs.avg_processing_time, 0) as avg_processing_time_ms
FROM data_sources ds
LEFT JOIN (
    SELECT 
        dij.source_id,
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
        CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 0
        END as success_rate,
        SUM(records_processed) as total_records,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) as avg_processing_time
    FROM data_ingestion_jobs dij
    WHERE dij.created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY dij.source_id
) recent_jobs ON ds.id = recent_jobs.source_id;

-- View for data quality overview
CREATE OR REPLACE VIEW data_quality_overview AS
SELECT 
    dqr.table_name,
    dqr.rule_type,
    COUNT(dqc.id) as total_checks,
    COUNT(dqc.id) FILTER (WHERE dqc.status = 'passed') as passed_checks,
    COUNT(dqc.id) FILTER (WHERE dqc.status = 'failed') as failed_checks,
    COUNT(dqc.id) FILTER (WHERE dqc.status = 'warning') as warning_checks,
    CASE 
        WHEN COUNT(dqc.id) > 0 THEN (COUNT(dqc.id) FILTER (WHERE dqc.status = 'passed')::DECIMAL / COUNT(dqc.id)::DECIMAL) * 100
        ELSE 0
    END as pass_rate,
    AVG(dqc.failure_rate) as avg_failure_rate,
    MAX(dqc.check_timestamp) as last_check
FROM data_quality_rules dqr
LEFT JOIN data_quality_checks dqc ON dqr.id = dqc.rule_id
WHERE dqr.is_active = true
GROUP BY dqr.table_name, dqr.rule_type;

-- View for workflow execution summary
CREATE OR REPLACE VIEW workflow_execution_summary AS
SELECT 
    wd.id as workflow_id,
    wd.name as workflow_name,
    wd.workflow_type,
    wd.is_active,
    COUNT(we.id) as total_executions,
    COUNT(we.id) FILTER (WHERE we.status = 'completed') as completed_executions,
    COUNT(we.id) FILTER (WHERE we.status = 'failed') as failed_executions,
    COUNT(we.id) FILTER (WHERE we.status = 'running') as running_executions,
    CASE 
        WHEN COUNT(we.id) > 0 THEN (COUNT(we.id) FILTER (WHERE we.status = 'completed')::DECIMAL / COUNT(we.id)::DECIMAL) * 100
        ELSE 0
    END as success_rate,
    AVG(EXTRACT(EPOCH FROM (we.completed_at - we.started_at))) as avg_duration_seconds,
    MAX(we.created_at) as last_execution
FROM workflow_definitions wd
LEFT JOIN workflow_executions we ON wd.id = we.workflow_id
GROUP BY wd.id, wd.name, wd.workflow_type, wd.is_active;

-- View for system performance metrics
CREATE OR REPLACE VIEW system_performance_summary AS
SELECT 
    component,
    metric_name,
    COUNT(*) as measurement_count,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    STDDEV(metric_value) as std_deviation,
    MAX(recorded_at) as last_measurement
FROM performance_metrics
WHERE recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY component, metric_name;

-- =============================================
-- COMPREHENSIVE ANALYTICS FUNCTIONS
-- =============================================

-- Function to get comprehensive system health
CREATE OR REPLACE FUNCTION get_comprehensive_system_health()
RETURNS JSONB AS $$
DECLARE
    health_data JSONB;
BEGIN
    SELECT json_build_object(
        'timestamp', NOW(),
        'data_sources', (
            SELECT json_build_object(
                'total', COUNT(*),
                'active', COUNT(*) FILTER (WHERE is_active = true),
                'inactive', COUNT(*) FILTER (WHERE is_active = false),
                'health_score', AVG(
                    CASE 
                        WHEN success_rate_24h >= 95 THEN 100
                        WHEN success_rate_24h >= 90 THEN 80
                        WHEN success_rate_24h >= 80 THEN 60
                        ELSE 40
                    END
                )
            )
            FROM data_source_health
        ),
        'data_quality', (
            SELECT json_build_object(
                'total_rules', COUNT(DISTINCT table_name || rule_type),
                'avg_pass_rate', AVG(pass_rate),
                'critical_issues', COUNT(*) FILTER (WHERE pass_rate < 80),
                'health_score', AVG(pass_rate)
            )
            FROM data_quality_overview
        ),
        'workflows', (
            SELECT json_build_object(
                'total_workflows', COUNT(*),
                'active_workflows', COUNT(*) FILTER (WHERE is_active = true),
                'avg_success_rate', AVG(success_rate),
                'recent_executions', SUM(total_executions) FILTER (WHERE last_execution >= NOW() - INTERVAL '24 hours')
            )
            FROM workflow_execution_summary
        ),
        'performance', (
            SELECT json_build_object(
                'components_monitored', COUNT(DISTINCT component),
                'metrics_tracked', COUNT(DISTINCT metric_name),
                'avg_response_time', AVG(avg_value) FILTER (WHERE metric_name = 'response_time'),
                'system_load', AVG(avg_value) FILTER (WHERE metric_name = 'cpu_usage')
            )
            FROM system_performance_summary
        ),
        'alerts', (
            SELECT json_build_object(
                'active_alerts', COUNT(*) FILTER (WHERE status = 'active'),
                'resolved_today', COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= CURRENT_DATE),
                'critical_alerts', COUNT(*) FILTER (WHERE status = 'active' AND severity = 'critical')
            )
            FROM alert_instances
        )
    ) INTO health_data;
    
    RETURN health_data;
END;
$$ LANGUAGE plpgsql;

-- Function to get data insights and recommendations
CREATE OR REPLACE FUNCTION get_data_insights_and_recommendations()
RETURNS JSONB AS $$
DECLARE
    insights JSONB := '[]'::JSONB;
    insight JSONB;
    data_volume_trend JSONB;
    quality_trend JSONB;
    performance_trend JSONB;
    usage_patterns JSONB;
BEGIN
    -- Data volume trend analysis
    SELECT json_build_object(
        'type', 'data_volume_trend',
        'title', 'Data Volume Growth',
        'description', 'Analysis of data ingestion volume over time',
        'recommendation', 'Consider scaling storage and processing capacity',
        'priority', 'medium'
    ) INTO data_volume_trend;
    
    -- Data quality trend analysis
    SELECT json_build_object(
        'type', 'quality_trend',
        'title', 'Data Quality Trends',
        'description', 'Monitoring data quality metrics and trends',
        'recommendation', 'Review and update data quality rules',
        'priority', 'high'
    ) INTO quality_trend;
    
    -- Performance trend analysis
    SELECT json_build_object(
        'type', 'performance_trend',
        'title', 'System Performance',
        'description', 'Analysis of system performance metrics',
        'recommendation', 'Optimize slow queries and consider indexing',
        'priority', 'medium'
    ) INTO performance_trend;
    
    -- Usage patterns analysis
    SELECT json_build_object(
        'type', 'usage_patterns',
        'title', 'User Usage Patterns',
        'description', 'Analysis of user behavior and system usage',
        'recommendation', 'Implement user segmentation and personalized experiences',
        'priority', 'low'
    ) INTO usage_patterns;
    
    insights := insights || data_volume_trend || quality_trend || performance_trend || usage_patterns;
    
    RETURN json_build_object(
        'generated_at', NOW(),
        'total_insights', json_array_length(insights),
        'insights', insights
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate automated reports
CREATE OR REPLACE FUNCTION generate_automated_reports()
RETURNS JSONB AS $$
DECLARE
    report_result JSONB := '[]'::JSONB;
    subscription_record RECORD;
    report_id UUID;
    generation_result JSONB;
BEGIN
    -- Process all due report subscriptions
    FOR subscription_record IN 
        SELECT * FROM report_subscriptions 
        WHERE is_active = true 
        AND next_send <= NOW()
    LOOP
        -- Generate report
        report_id := generate_report(
            subscription_record.template_id,
            'Automated Report - ' || subscription_record.template_id,
            subscription_record.parameters,
            subscription_record.subscriber_id
        );
        
        generation_result := json_build_object(
            'subscription_id', subscription_record.id,
            'report_id', report_id,
            'status', 'generated'
        );
        
        report_result := report_result || generation_result;
        
        -- Update next send time
        UPDATE report_subscriptions
        SET next_send = calculate_next_run_time(schedule_cron),
            last_sent = NOW()
        WHERE id = subscription_record.id;
    END LOOP;
    
    RETURN json_build_object(
        'processed_at', NOW(),
        'subscriptions_processed', json_array_length(report_result),
        'results', report_result
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MAINTENANCE AND OPTIMIZATION FUNCTIONS
-- =============================================

-- Function to perform comprehensive system maintenance
CREATE OR REPLACE FUNCTION perform_system_maintenance()
RETURNS JSONB AS $$
DECLARE
    maintenance_result JSONB := '{}'::JSONB;
    cleanup_result JSONB;
    optimization_result JSONB;
    index_result JSONB;
    stats_result JSONB;
BEGIN
    -- Cleanup old data
    cleanup_result := json_build_object(
        'old_audit_logs', (
            DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'
        ),
        'old_ingestion_jobs', (
            DELETE FROM data_ingestion_jobs WHERE created_at < NOW() - INTERVAL '30 days'
        ),
        'old_quality_checks', (
            DELETE FROM data_quality_checks WHERE check_timestamp < NOW() - INTERVAL '30 days'
        ),
        'old_insights', (
            DELETE FROM generated_insights WHERE created_at < NOW() - INTERVAL '30 days'
        )
    );
    
    -- Update table statistics
    PERFORM collect_table_statistics();
    stats_result := json_build_object('status', 'completed');
    
    -- Analyze query performance
    PERFORM analyze_query_performance();
    optimization_result := json_build_object('status', 'completed');
    
    -- Identify unused indexes
    PERFORM identify_unused_indexes();
    index_result := json_build_object('status', 'completed');
    
    maintenance_result := json_build_object(
        'maintenance_time', NOW(),
        'cleanup', cleanup_result,
        'statistics', stats_result,
        'optimization', optimization_result,
        'index_analysis', index_result
    );
    
    RETURN maintenance_result;
END;
$$ LANGUAGE plpgsql;

-- Function to optimize database performance
CREATE OR REPLACE FUNCTION optimize_database_performance()
RETURNS JSONB AS $$
DECLARE
    optimization_result JSONB := '{}'::JSONB;
    slow_queries JSONB;
    unused_indexes JSONB;
    table_stats JSONB;
BEGIN
    -- Get slow queries
    SELECT json_agg(
        json_build_object(
            'query', query_text,
            'avg_execution_time', avg_execution_time_ms,
            'execution_count', execution_count
        )
    ) INTO slow_queries
    FROM get_slow_queries(1000);
    
    -- Get unused indexes
    SELECT json_agg(
        json_build_object(
            'table_name', table_name,
            'index_name', index_name,
            'unused_since', last_used
        )
    ) INTO unused_indexes
    FROM identify_unused_indexes();
    
    -- Get table statistics
    SELECT json_agg(
        json_build_object(
            'table_name', table_name,
            'row_count', row_count,
            'table_size', table_size,
            'index_size', index_size
        )
    ) INTO table_stats
    FROM collect_table_statistics();
    
    optimization_result := json_build_object(
        'optimization_time', NOW(),
        'slow_queries', COALESCE(slow_queries, '[]'::JSONB),
        'unused_indexes', COALESCE(unused_indexes, '[]'::JSONB),
        'table_statistics', COALESCE(table_stats, '[]'::JSONB)
    );
    
    RETURN optimization_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMPREHENSIVE MONITORING FUNCTIONS
-- =============================================

-- Function to monitor data pipeline health
CREATE OR REPLACE FUNCTION monitor_data_pipeline_health()
RETURNS JSONB AS $$
DECLARE
    pipeline_health JSONB;
BEGIN
    SELECT json_build_object(
        'monitoring_time', NOW(),
        'data_sources', (
            SELECT json_build_object(
                'healthy', COUNT(*) FILTER (WHERE success_rate_24h >= 95),
                'degraded', COUNT(*) FILTER (WHERE success_rate_24h >= 80 AND success_rate_24h < 95),
                'unhealthy', COUNT(*) FILTER (WHERE success_rate_24h < 80),
                'total', COUNT(*)
            )
            FROM data_source_health
        ),
        'data_quality', (
            SELECT json_build_object(
                'excellent', COUNT(*) FILTER (WHERE pass_rate >= 95),
                'good', COUNT(*) FILTER (WHERE pass_rate >= 80 AND pass_rate < 95),
                'poor', COUNT(*) FILTER (WHERE pass_rate < 80),
                'total', COUNT(*)
            )
            FROM data_quality_overview
        ),
        'workflows', (
            SELECT json_build_object(
                'running', COUNT(*) FILTER (WHERE status = 'running'),
                'completed', COUNT(*) FILTER (WHERE status = 'completed'),
                'failed', COUNT(*) FILTER (WHERE status = 'failed'),
                'total', COUNT(*)
            )
            FROM workflow_executions
            WHERE created_at >= NOW() - INTERVAL '1 hour'
        ),
        'alerts', (
            SELECT json_build_object(
                'active', COUNT(*) FILTER (WHERE status = 'active'),
                'critical', COUNT(*) FILTER (WHERE status = 'active' AND severity = 'critical'),
                'resolved_today', COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= CURRENT_DATE)
            )
            FROM alert_instances
        )
    ) INTO pipeline_health;
    
    RETURN pipeline_health;
END;
$$ LANGUAGE plpgsql;

-- Function to get comprehensive dashboard data
CREATE OR REPLACE FUNCTION get_comprehensive_dashboard_data()
RETURNS JSONB AS $$
DECLARE
    dashboard_data JSONB;
BEGIN
    SELECT json_build_object(
        'system_health', get_comprehensive_system_health(),
        'pipeline_health', monitor_data_pipeline_health(),
        'insights', get_data_insights_and_recommendations(),
        'performance', (
            SELECT json_build_object(
                'avg_response_time', AVG(avg_value) FILTER (WHERE metric_name = 'response_time'),
                'cpu_usage', AVG(avg_value) FILTER (WHERE metric_name = 'cpu_usage'),
                'memory_usage', AVG(avg_value) FILTER (WHERE metric_name = 'memory_usage'),
                'disk_usage', AVG(avg_value) FILTER (WHERE metric_name = 'disk_usage')
            )
            FROM system_performance_summary
        ),
        'data_volume', (
            SELECT json_build_object(
                'total_records_24h', SUM(total_records_24h),
                'avg_processing_time', AVG(avg_processing_time_ms),
                'success_rate', AVG(success_rate_24h)
            )
            FROM data_source_health
        ),
        'user_activity', (
            SELECT json_build_object(
                'active_users_24h', COUNT(DISTINCT user_id),
                'total_analytics_events', COUNT(*),
                'top_metrics', (
                    SELECT json_agg(
                        json_build_object(
                            'metric_name', metric_name,
                            'count', metric_count
                        )
                    )
                    FROM (
                        SELECT metric_name, COUNT(*) as metric_count
                        FROM user_analytics
                        WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
                        GROUP BY metric_name
                        ORDER BY metric_count DESC
                        LIMIT 5
                    ) top_metrics
                )
            )
            FROM user_analytics
            WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
        )
    ) INTO dashboard_data;
    
    RETURN dashboard_data;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FINAL SYSTEM INTEGRATION
-- =============================================

-- Function to initialize complete data ecosystem
CREATE OR REPLACE FUNCTION initialize_data_ecosystem()
RETURNS JSONB AS $$
DECLARE
    init_result JSONB;
    sample_data_source_id UUID;
    sample_workflow_id UUID;
    sample_dashboard_id UUID;
BEGIN
    -- Create sample data source
    INSERT INTO data_sources (name, source_type, connection_config, parsing_rules, validation_rules, is_active)
    VALUES (
        'Sample Mortgage Data Source',
        'api',
        '{"url": "https://api.example.com/mortgage-data", "method": "GET"}'::JSONB,
        '{"schema": {"type": "object", "properties": {"property_value": {"type": "number"}, "loan_amount": {"type": "number"}}}'::JSONB,
        '{"required_fields": ["property_value", "loan_amount"]}'::JSONB,
        true
    ) RETURNING id INTO sample_data_source_id;
    
    -- Create sample workflow
    INSERT INTO workflow_definitions (name, description, workflow_type, trigger_conditions, steps, is_active)
    VALUES (
        'Sample Data Processing Workflow',
        'Processes incoming mortgage data',
        'data_processing',
        '{"event": "data_received"}'::JSONB,
        '[{"type": "data_query", "config": {"query": "SELECT * FROM raw_data WHERE processing_status = ''pending''"}}, {"type": "data_transform", "config": {"transformation": "parse_mortgage_data"}}]'::JSONB,
        true
    ) RETURNING id INTO sample_workflow_id;
    
    -- Create sample dashboard
    INSERT INTO dashboards (name, description, dashboard_type, layout_config, is_public, is_active)
    VALUES (
        'System Overview Dashboard',
        'Comprehensive system monitoring dashboard',
        'admin',
        '{"layout": "grid", "columns": 12, "rows": 8}'::JSONB,
        false,
        true
    ) RETURNING id INTO sample_dashboard_id;
    
    -- Add sample widgets to dashboard
    INSERT INTO dashboard_widgets (dashboard_id, widget_type, title, position_x, position_y, width, height, widget_config, data_query)
    VALUES 
    (sample_dashboard_id, 'metric', 'Data Sources', 0, 0, 3, 2, '{"format": "number", "trend": "up"}'::JSONB, 'SELECT COUNT(*) FROM data_sources WHERE is_active = true'),
    (sample_dashboard_id, 'chart', 'Data Quality Trends', 3, 0, 6, 4, '{"chart_type": "line", "options": {"responsive": true}}'::JSONB, 'SELECT check_timestamp as date, AVG(failure_rate) as failure_rate FROM data_quality_checks GROUP BY check_timestamp ORDER BY check_timestamp'),
    (sample_dashboard_id, 'table', 'Recent Workflow Executions', 0, 2, 12, 4, '{"columns": ["workflow_name", "status", "started_at", "completed_at"]}'::JSONB, 'SELECT wd.name as workflow_name, we.status, we.started_at, we.completed_at FROM workflow_executions we JOIN workflow_definitions wd ON we.workflow_id = wd.id ORDER BY we.created_at DESC LIMIT 10');
    
    init_result := json_build_object(
        'initialization_time', NOW(),
        'status', 'completed',
        'sample_components', json_build_object(
            'data_source_id', sample_data_source_id,
            'workflow_id', sample_workflow_id,
            'dashboard_id', sample_dashboard_id
        ),
        'message', 'Data ecosystem initialized successfully with sample components'
    );
    
    RETURN init_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FINAL INDEXES AND OPTIMIZATIONS
-- =============================================

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_source_health_active ON data_source_health(is_active);
CREATE INDEX IF NOT EXISTS idx_data_quality_overview_table ON data_quality_overview(table_name);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_summary_type ON workflow_execution_summary(workflow_type);
CREATE INDEX IF NOT EXISTS idx_system_performance_summary_component ON system_performance_summary(component);

-- Create materialized view for frequently accessed data
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_system_health_summary AS
SELECT 
    NOW() as snapshot_time,
    get_comprehensive_system_health() as health_data,
    get_data_insights_and_recommendations() as insights_data
WITH NO DATA;

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_system_health_summary()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_system_health_summary;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to refresh materialized view
INSERT INTO scheduled_jobs (name, description, job_type, target_id, schedule_cron, parameters, is_active)
VALUES (
    'Refresh System Health Summary',
    'Refreshes the materialized view for system health summary',
    'maintenance',
    NULL,
    '*/15 * * * *', -- Every 15 minutes
    '{"function": "refresh_system_health_summary"}'::JSONB,
    true
);

-- Final system status
SELECT 'Data ecosystem setup completed successfully' as status;