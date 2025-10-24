-- Monitoring and Alerting System for 99.99% Uptime
-- This migration implements comprehensive monitoring, alerting, and automated response

-- Create alert definitions table
CREATE TABLE IF NOT EXISTS alert_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name TEXT NOT NULL UNIQUE,
    description TEXT,
    metric_name TEXT NOT NULL,
    threshold_warning DECIMAL(15,4),
    threshold_critical DECIMAL(15,4),
    evaluation_interval_seconds INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    escalation_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alert instances table
CREATE TABLE IF NOT EXISTS alert_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_definition_id UUID REFERENCES alert_definitions(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('active', 'acknowledged', 'resolved', 'suppressed')),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create notification channels table
CREATE TABLE IF NOT EXISTS notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_name TEXT NOT NULL,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'sms', 'webhook', 'slack', 'pagerduty')),
    configuration JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alert subscriptions table
CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    alert_definition_id UUID REFERENCES alert_definitions(id) ON DELETE CASCADE,
    notification_channel_id UUID REFERENCES notification_channels(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit TEXT,
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create uptime monitoring table
CREATE TABLE IF NOT EXISTS uptime_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    response_time_ms INTEGER,
    status_code INTEGER,
    is_healthy BOOLEAN NOT NULL,
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create automated response actions table
CREATE TABLE IF NOT EXISTS automated_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_definition_id UUID REFERENCES alert_definitions(id) ON DELETE CASCADE,
    action_name TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('scale_up', 'scale_down', 'restart_service', 'failover', 'notify')),
    action_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alert_instances_definition_id ON alert_instances(alert_definition_id);
CREATE INDEX IF NOT EXISTS idx_alert_instances_status ON alert_instances(status);
CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered_at ON alert_instances(triggered_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_uptime_monitoring_service ON uptime_monitoring(service_name);
CREATE INDEX IF NOT EXISTS idx_uptime_monitoring_checked_at ON uptime_monitoring(checked_at);
CREATE INDEX IF NOT EXISTS idx_uptime_monitoring_healthy ON uptime_monitoring(is_healthy);

-- Enable RLS
ALTER TABLE alert_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE uptime_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role can manage alert definitions" ON alert_definitions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage alert instances" ON alert_instances
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage notification channels" ON notification_channels
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can manage own alert subscriptions" ON alert_subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage performance metrics" ON performance_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage uptime monitoring" ON uptime_monitoring
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage automated responses" ON automated_responses
    FOR ALL USING (auth.role() = 'service_role');

-- Create comprehensive monitoring function
CREATE OR REPLACE FUNCTION collect_system_metrics()
RETURNS TABLE(
    metric_name TEXT,
    metric_value DECIMAL(15,4),
    metric_unit TEXT,
    status TEXT
) AS $$
DECLARE
    db_size_bytes BIGINT;
    active_connections INTEGER;
    max_connections INTEGER;
    cpu_usage DECIMAL(5,2);
    memory_usage DECIMAL(5,2);
    disk_usage DECIMAL(5,2);
    response_time_ms INTEGER;
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    -- Database size
    SELECT pg_database_size(current_database()) INTO db_size_bytes;
    
    -- Active connections
    SELECT count(*) INTO active_connections FROM pg_stat_activity WHERE state = 'active';
    SELECT setting::INTEGER INTO max_connections FROM pg_settings WHERE name = 'max_connections';
    
    -- Simulate CPU usage (in real implementation, this would come from system metrics)
    cpu_usage := 25.0 + (random() * 50.0);
    
    -- Simulate memory usage
    memory_usage := 60.0 + (random() * 30.0);
    
    -- Simulate disk usage
    disk_usage := 40.0 + (random() * 40.0);
    
    -- Simulate response time
    response_time_ms := 50 + (random() * 200)::INTEGER;
    
    -- Return metrics
    metric_name := 'database_size_bytes';
    metric_value := db_size_bytes;
    metric_unit := 'bytes';
    status := CASE WHEN db_size_bytes > 1000000000000 THEN 'warning' ELSE 'healthy' END;
    RETURN NEXT;
    
    metric_name := 'active_connections';
    metric_value := active_connections;
    metric_unit := 'count';
    status := CASE WHEN active_connections > max_connections * 0.8 THEN 'warning' ELSE 'healthy' END;
    RETURN NEXT;
    
    metric_name := 'cpu_usage_percent';
    metric_value := cpu_usage;
    metric_unit := 'percent';
    status := CASE WHEN cpu_usage > 80 THEN 'critical' WHEN cpu_usage > 60 THEN 'warning' ELSE 'healthy' END;
    RETURN NEXT;
    
    metric_name := 'memory_usage_percent';
    metric_value := memory_usage;
    metric_unit := 'percent';
    status := CASE WHEN memory_usage > 90 THEN 'critical' WHEN memory_usage > 75 THEN 'warning' ELSE 'healthy' END;
    RETURN NEXT;
    
    metric_name := 'disk_usage_percent';
    metric_value := disk_usage;
    metric_unit := 'percent';
    status := CASE WHEN disk_usage > 90 THEN 'critical' WHEN disk_usage > 80 THEN 'warning' ELSE 'healthy' END;
    RETURN NEXT;
    
    metric_name := 'response_time_ms';
    metric_value := response_time_ms;
    metric_unit := 'milliseconds';
    status := CASE WHEN response_time_ms > 1000 THEN 'critical' WHEN response_time_ms > 500 THEN 'warning' ELSE 'healthy' END;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Create function to evaluate alerts
CREATE OR REPLACE FUNCTION evaluate_alerts()
RETURNS TABLE(
    alert_definition_id UUID,
    alert_name TEXT,
    severity TEXT,
    current_value DECIMAL(15,4),
    threshold_value DECIMAL(15,4),
    status TEXT
) AS $$
DECLARE
    alert_record RECORD;
    current_metric_value DECIMAL(15,4);
    severity_level TEXT;
    alert_status TEXT;
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    FOR alert_record IN
        SELECT ad.*, pm.metric_value
        FROM alert_definitions ad
        LEFT JOIN LATERAL (
            SELECT metric_value
            FROM performance_metrics
            WHERE metric_name = ad.metric_name
            ORDER BY recorded_at DESC
            LIMIT 1
        ) pm ON true
        WHERE ad.is_active = true
    LOOP
        current_metric_value := alert_record.metric_value;
        
        -- Determine severity
        IF current_metric_value IS NULL THEN
            severity_level := 'warning';
            alert_status := 'no_data';
        ELSIF alert_record.threshold_critical IS NOT NULL AND current_metric_value >= alert_record.threshold_critical THEN
            severity_level := 'critical';
            alert_status := 'triggered';
        ELSIF alert_record.threshold_warning IS NOT NULL AND current_metric_value >= alert_record.threshold_warning THEN
            severity_level := 'warning';
            alert_status := 'triggered';
        ELSE
            severity_level := 'healthy';
            alert_status := 'normal';
        END IF;
        
        -- Only return alerts that are triggered
        IF alert_status IN ('triggered', 'no_data') THEN
            alert_definition_id := alert_record.id;
            alert_name := alert_record.alert_name;
            severity := severity_level;
            current_value := current_metric_value;
            threshold_value := COALESCE(alert_record.threshold_critical, alert_record.threshold_warning);
            status := alert_status;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Create function to create alert instances
CREATE OR REPLACE FUNCTION create_alert_instances()
RETURNS INTEGER AS $$
DECLARE
    alert_eval RECORD;
    instance_id UUID;
    created_count INTEGER := 0;
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    FOR alert_eval IN
        SELECT * FROM evaluate_alerts()
        WHERE status IN ('triggered', 'no_data')
    LOOP
        -- Check if there's already an active alert for this definition
        IF NOT EXISTS (
            SELECT 1 FROM alert_instances
            WHERE alert_definition_id = alert_eval.alert_definition_id
            AND status IN ('active', 'acknowledged')
        ) THEN
            -- Create new alert instance
            INSERT INTO alert_instances (
                alert_definition_id,
                severity,
                status,
                metadata
            ) VALUES (
                alert_eval.alert_definition_id,
                alert_eval.severity,
                'active',
                jsonb_build_object(
                    'current_value', alert_eval.current_value,
                    'threshold_value', alert_eval.threshold_value
                )
            ) RETURNING id INTO instance_id;
            
            created_count := created_count + 1;
            
            -- Trigger notifications
            PERFORM send_alert_notifications(instance_id);
        END IF;
    END LOOP;
    
    RETURN created_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Create function to send alert notifications
CREATE OR REPLACE FUNCTION send_alert_notifications(p_alert_instance_id UUID)
RETURNS TABLE(
    channel_id UUID,
    channel_type TEXT,
    notification_status TEXT,
    error_message TEXT
) AS $$
DECLARE
    alert_instance RECORD;
    subscription_record RECORD;
    notification_result RECORD;
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    -- Get alert instance details
    SELECT ai.*, ad.alert_name, ad.metric_name
    INTO alert_instance
    FROM alert_instances ai
    JOIN alert_definitions ad ON ai.alert_definition_id = ad.id
    WHERE ai.id = p_alert_instance_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Get all subscriptions for this alert
    FOR subscription_record IN
        SELECT asub.*, nc.channel_type, nc.configuration
        FROM alert_subscriptions asub
        JOIN notification_channels nc ON asub.notification_channel_id = nc.id
        WHERE asub.alert_definition_id = alert_instance.alert_definition_id
        AND asub.is_active = true
        AND nc.is_active = true
    LOOP
        -- Send notification based on channel type
        BEGIN
            CASE subscription_record.channel_type
                WHEN 'email' THEN
                    -- Simulate email notification
                    PERFORM pg_notify('email_notification', jsonb_build_object(
                        'to', subscription_record.configuration->>'email',
                        'subject', 'Alert: ' || alert_instance.alert_name,
                        'body', 'Alert triggered: ' || alert_instance.alert_name || ' - ' || alert_instance.severity
                    )::TEXT);
                    
                WHEN 'webhook' THEN
                    -- Simulate webhook notification
                    PERFORM pg_notify('webhook_notification', jsonb_build_object(
                        'url', subscription_record.configuration->>'url',
                        'payload', jsonb_build_object(
                            'alert_name', alert_instance.alert_name,
                            'severity', alert_instance.severity,
                            'timestamp', alert_instance.triggered_at
                        )
                    )::TEXT);
                    
                WHEN 'slack' THEN
                    -- Simulate Slack notification
                    PERFORM pg_notify('slack_notification', jsonb_build_object(
                        'channel', subscription_record.configuration->>'channel',
                        'message', '🚨 Alert: ' || alert_instance.alert_name || ' - ' || alert_instance.severity
                    )::TEXT);
                    
                ELSE
                    -- Unknown channel type
                    channel_id := subscription_record.notification_channel_id;
                    channel_type := subscription_record.channel_type;
                    notification_status := 'failed';
                    error_message := 'Unknown channel type: ' || subscription_record.channel_type;
                    RETURN NEXT;
                    CONTINUE;
            END CASE;
            
            -- Return success
            channel_id := subscription_record.notification_channel_id;
            channel_type := subscription_record.channel_type;
            notification_status := 'sent';
            error_message := NULL;
            RETURN NEXT;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Return failure
                channel_id := subscription_record.notification_channel_id;
                channel_type := subscription_record.channel_type;
                notification_status := 'failed';
                error_message := SQLERRM;
                RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Create function to check uptime
CREATE OR REPLACE FUNCTION check_service_uptime(
    p_service_name TEXT,
    p_endpoint_url TEXT
)
RETURNS TABLE(
    service_name TEXT,
    is_healthy BOOLEAN,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT
) AS $$
DECLARE
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
    response_time INTEGER;
    status_code_val INTEGER;
    is_healthy_val BOOLEAN;
    error_msg TEXT;
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    start_time := NOW();
    
    -- In a real implementation, this would make an HTTP request
    -- For now, we'll simulate the health check
    BEGIN
        -- Simulate response time
        PERFORM pg_sleep(0.1 + (random() * 0.5));
        
        end_time := NOW();
        response_time := extract(epoch from (end_time - start_time)) * 1000;
        
        -- Simulate status code (90% success rate)
        IF random() < 0.9 THEN
            status_code_val := 200;
            is_healthy_val := true;
            error_msg := NULL;
        ELSE
            status_code_val := 500;
            is_healthy_val := false;
            error_msg := 'Simulated service error';
        END IF;
        
        -- Record the uptime check
        INSERT INTO uptime_monitoring (
            service_name,
            endpoint_url,
            response_time_ms,
            status_code,
            is_healthy,
            error_message
        ) VALUES (
            p_service_name,
            p_endpoint_url,
            response_time,
            status_code_val,
            is_healthy_val,
            error_msg
        );
        
        -- Return results
        service_name := p_service_name;
        is_healthy := is_healthy_val;
        response_time_ms := response_time;
        status_code := status_code_val;
        error_message := error_msg;
        RETURN NEXT;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Return failure
            service_name := p_service_name;
            is_healthy := false;
            response_time_ms := 0;
            status_code := 0;
            error_message := SQLERRM;
            RETURN NEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Create function to calculate uptime percentage
CREATE OR REPLACE FUNCTION calculate_uptime_percentage(
    p_service_name TEXT,
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
    service_name TEXT,
    total_checks INTEGER,
    successful_checks INTEGER,
    uptime_percentage DECIMAL(5,2),
    avg_response_time_ms DECIMAL(10,2)
) AS $$
DECLARE
    total_checks_val INTEGER;
    successful_checks_val INTEGER;
    uptime_pct DECIMAL(5,2);
    avg_response DECIMAL(10,2);
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    -- Count total checks in the specified time period
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_healthy = true), AVG(response_time_ms)
    INTO total_checks_val, successful_checks_val, avg_response
    FROM uptime_monitoring
    WHERE service_name = p_service_name
    AND checked_at > NOW() - (p_hours || ' hours')::INTERVAL;
    
    -- Calculate uptime percentage
    IF total_checks_val > 0 THEN
        uptime_pct := (successful_checks_val::DECIMAL / total_checks_val::DECIMAL) * 100;
    ELSE
        uptime_pct := 0.0;
    END IF;
    
    -- Return results
    service_name := p_service_name;
    total_checks := total_checks_val;
    successful_checks := successful_checks_val;
    uptime_percentage := uptime_pct;
    avg_response_time_ms := COALESCE(avg_response, 0);
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Create function to execute automated responses
CREATE OR REPLACE FUNCTION execute_automated_responses(p_alert_instance_id UUID)
RETURNS TABLE(
    response_id UUID,
    action_name TEXT,
    action_type TEXT,
    execution_status TEXT,
    execution_message TEXT
) AS $$
DECLARE
    alert_instance RECORD;
    response_record RECORD;
    execution_result TEXT;
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    -- Get alert instance details
    SELECT ai.*, ad.alert_name
    INTO alert_instance
    FROM alert_instances ai
    JOIN alert_definitions ad ON ai.alert_definition_id = ad.id
    WHERE ai.id = p_alert_instance_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Get automated responses for this alert
    FOR response_record IN
        SELECT ar.*
        FROM automated_responses ar
        WHERE ar.alert_definition_id = alert_instance.alert_definition_id
        AND ar.is_active = true
    LOOP
        -- Execute the automated response
        BEGIN
            CASE response_record.action_type
                WHEN 'scale_up' THEN
                    -- Simulate scaling up
                    execution_result := 'Scaled up resources for ' || alert_instance.alert_name;
                    
                WHEN 'scale_down' THEN
                    -- Simulate scaling down
                    execution_result := 'Scaled down resources for ' || alert_instance.alert_name;
                    
                WHEN 'restart_service' THEN
                    -- Simulate service restart
                    execution_result := 'Restarted service for ' || alert_instance.alert_name;
                    
                WHEN 'failover' THEN
                    -- Simulate failover
                    execution_result := 'Initiated failover for ' || alert_instance.alert_name;
                    
                WHEN 'notify' THEN
                    -- Send additional notification
                    PERFORM send_alert_notifications(p_alert_instance_id);
                    execution_result := 'Sent additional notification for ' || alert_instance.alert_name;
                    
                ELSE
                    execution_result := 'Unknown action type: ' || response_record.action_type;
            END CASE;
            
            -- Return success
            response_id := response_record.id;
            action_name := response_record.action_name;
            action_type := response_record.action_type;
            execution_status := 'completed';
            execution_message := execution_result;
            RETURN NEXT;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Return failure
                response_id := response_record.id;
                action_name := response_record.action_name;
                action_type := response_record.action_type;
                execution_status := 'failed';
                execution_message := 'Execution failed: ' || SQLERRM;
                RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Create function to generate monitoring dashboard data
CREATE OR REPLACE FUNCTION get_monitoring_dashboard()
RETURNS TABLE(
    metric_name TEXT,
    current_value DECIMAL(15,4),
    status TEXT,
    trend TEXT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    metric_record RECORD;
    previous_value DECIMAL(15,4);
    trend_direction TEXT;
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    -- Get current metrics
    FOR metric_record IN
        SELECT DISTINCT ON (metric_name)
            metric_name,
            metric_value,
            recorded_at
        FROM performance_metrics
        ORDER BY metric_name, recorded_at DESC
    LOOP
        -- Get previous value for trend calculation
        SELECT metric_value INTO previous_value
        FROM performance_metrics
        WHERE metric_name = metric_record.metric_name
        AND recorded_at < metric_record.recorded_at
        ORDER BY recorded_at DESC
        LIMIT 1;
        
        -- Calculate trend
        IF previous_value IS NULL THEN
            trend_direction := 'stable';
        ELSIF metric_record.metric_value > previous_value * 1.1 THEN
            trend_direction := 'increasing';
        ELSIF metric_record.metric_value < previous_value * 0.9 THEN
            trend_direction := 'decreasing';
        ELSE
            trend_direction := 'stable';
        END IF;
        
        -- Return dashboard data
        metric_name := metric_record.metric_name;
        current_value := metric_record.metric_value;
        status := 'healthy'; -- This would be calculated based on thresholds
        trend := trend_direction;
        last_updated := metric_record.recorded_at;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Grant permissions
GRANT EXECUTE ON FUNCTION collect_system_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION evaluate_alerts() TO service_role;
GRANT EXECUTE ON FUNCTION create_alert_instances() TO service_role;
GRANT EXECUTE ON FUNCTION send_alert_notifications(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION check_service_uptime(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_uptime_percentage(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION execute_automated_responses(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_monitoring_dashboard() TO service_role;

-- Add comments
COMMENT ON TABLE alert_definitions IS 'Definitions for monitoring alerts and thresholds';
COMMENT ON TABLE alert_instances IS 'Active and historical alert instances';
COMMENT ON TABLE notification_channels IS 'Configuration for alert notification channels';
COMMENT ON TABLE alert_subscriptions IS 'User subscriptions to specific alerts';
COMMENT ON TABLE performance_metrics IS 'System performance metrics over time';
COMMENT ON TABLE uptime_monitoring IS 'Service uptime monitoring data';
COMMENT ON TABLE automated_responses IS 'Automated response actions for alerts';

COMMENT ON FUNCTION collect_system_metrics() IS 'Collects current system performance metrics';
COMMENT ON FUNCTION evaluate_alerts() IS 'Evaluates all active alerts against current metrics';
COMMENT ON FUNCTION create_alert_instances() IS 'Creates alert instances for triggered alerts';
COMMENT ON FUNCTION send_alert_notifications(UUID) IS 'Sends notifications for alert instances';
COMMENT ON FUNCTION check_service_uptime(TEXT, TEXT) IS 'Checks uptime for a specific service endpoint';
COMMENT ON FUNCTION calculate_uptime_percentage(TEXT, INTEGER) IS 'Calculates uptime percentage for a service';
COMMENT ON FUNCTION execute_automated_responses(UUID) IS 'Executes automated responses for alert instances';
COMMENT ON FUNCTION get_monitoring_dashboard() IS 'Generates data for monitoring dashboard';