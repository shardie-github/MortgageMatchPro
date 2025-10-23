-- Automation and AI Intelligence Migration
-- This migration implements automated monitoring, alerting, and self-evolving data intelligence
-- including ML model training, automated insights, and predictive analytics

-- Create AI model management tables
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL UNIQUE,
    model_type TEXT NOT NULL CHECK (model_type IN ('classification', 'regression', 'clustering', 'recommendation', 'forecasting')),
    model_version TEXT NOT NULL,
    model_data BYTEA NOT NULL,
    training_data_hash TEXT NOT NULL,
    accuracy_score DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deployed_at TIMESTAMPTZ
);

-- Create model training jobs table
CREATE TABLE IF NOT EXISTS model_training_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('initial_training', 'retraining', 'fine_tuning', 'validation')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    training_data_query TEXT NOT NULL,
    hyperparameters JSONB DEFAULT '{}',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create automated insights table
CREATE TABLE IF NOT EXISTS automated_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_type TEXT NOT NULL CHECK (insight_type IN ('trend', 'anomaly', 'prediction', 'recommendation', 'alert')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    impact_level TEXT NOT NULL CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    data_source TEXT NOT NULL,
    insight_data JSONB NOT NULL,
    is_actionable BOOLEAN DEFAULT FALSE,
    action_required BOOLEAN DEFAULT FALSE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'actioned', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Create alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('threshold', 'anomaly', 'trend', 'pattern', 'custom')),
    condition_query TEXT NOT NULL,
    threshold_value DECIMAL(15,4),
    comparison_operator TEXT CHECK (comparison_operator IN ('>', '<', '>=', '<=', '=', '!=', 'contains', 'not_contains')),
    evaluation_frequency TEXT NOT NULL DEFAULT '1 hour' CHECK (evaluation_frequency IN ('5 minutes', '15 minutes', '30 minutes', '1 hour', '6 hours', '24 hours')),
    is_active BOOLEAN DEFAULT TRUE,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    notification_channels TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create alert executions table
CREATE TABLE IF NOT EXISTS alert_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ NOT NULL,
    alert_value DECIMAL(15,4),
    threshold_value DECIMAL(15,4),
    context_data JSONB DEFAULT '{}',
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_channels TEXT[],
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT
);

-- Create data quality monitoring table
CREATE TABLE IF NOT EXISTS data_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    expected_value DECIMAL(15,4),
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    measurement_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create automated recommendations table
CREATE TABLE IF NOT EXISTS automated_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('rate_optimization', 'refinance_opportunity', 'affordability_improvement', 'broker_suggestion', 'feature_usage')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority_score INTEGER NOT NULL CHECK (priority_score >= 0 AND priority_score <= 100),
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    recommendation_data JSONB NOT NULL,
    is_presented BOOLEAN DEFAULT FALSE,
    is_accepted BOOLEAN,
    presented_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create system health monitoring table
CREATE TABLE IF NOT EXISTS system_health_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
    threshold_warning DECIMAL(15,4),
    threshold_critical DECIMAL(15,4),
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create automated workflows table
CREATE TABLE IF NOT EXISTS automated_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name TEXT NOT NULL,
    workflow_type TEXT NOT NULL CHECK (workflow_type IN ('data_processing', 'model_training', 'alert_processing', 'insight_generation', 'maintenance')),
    trigger_condition JSONB NOT NULL,
    workflow_steps JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_executed TIMESTAMPTZ,
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES automated_workflows(id) ON DELETE CASCADE,
    execution_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    execution_log JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_ai_models_type ON ai_models(model_type);
CREATE INDEX idx_ai_models_active ON ai_models(is_active);
CREATE INDEX idx_ai_models_created ON ai_models(created_at);

CREATE INDEX idx_model_training_jobs_model ON model_training_jobs(model_id);
CREATE INDEX idx_model_training_jobs_status ON model_training_jobs(status);
CREATE INDEX idx_model_training_jobs_created ON model_training_jobs(created_at);

CREATE INDEX idx_automated_insights_type ON automated_insights(insight_type);
CREATE INDEX idx_automated_insights_impact ON automated_insights(impact_level);
CREATE INDEX idx_automated_insights_status ON automated_insights(status);
CREATE INDEX idx_automated_insights_created ON automated_insights(created_at);

CREATE INDEX idx_alert_rules_active ON alert_rules(is_active);
CREATE INDEX idx_alert_rules_type ON alert_rules(rule_type);
CREATE INDEX idx_alert_rules_severity ON alert_rules(severity);

CREATE INDEX idx_alert_executions_rule ON alert_executions(rule_id);
CREATE INDEX idx_alert_executions_triggered ON alert_executions(triggered_at);
CREATE INDEX idx_alert_executions_resolved ON alert_executions(resolved_at);

CREATE INDEX idx_data_quality_metrics_table ON data_quality_metrics(table_name);
CREATE INDEX idx_data_quality_metrics_timestamp ON data_quality_metrics(measurement_timestamp);

CREATE INDEX idx_automated_recommendations_user ON automated_recommendations(user_id);
CREATE INDEX idx_automated_recommendations_type ON automated_recommendations(recommendation_type);
CREATE INDEX idx_automated_recommendations_priority ON automated_recommendations(priority_score DESC);
CREATE INDEX idx_automated_recommendations_presented ON automated_recommendations(is_presented);

CREATE INDEX idx_system_health_monitoring_metric ON system_health_monitoring(metric_name);
CREATE INDEX idx_system_health_monitoring_status ON system_health_monitoring(status);
CREATE INDEX idx_system_health_monitoring_recorded ON system_health_monitoring(recorded_at);

CREATE INDEX idx_automated_workflows_type ON automated_workflows(workflow_type);
CREATE INDEX idx_automated_workflows_active ON automated_workflows(is_active);

CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started ON workflow_executions(started_at);

-- Create AI and automation functions
CREATE OR REPLACE FUNCTION train_ml_model(
    p_model_name TEXT,
    p_model_type TEXT,
    p_training_data_query TEXT,
    p_hyperparameters JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    model_id UUID;
    job_id UUID;
BEGIN
    -- Create model record
    INSERT INTO ai_models (model_name, model_type, model_version, model_data, training_data_hash)
    VALUES (p_model_name, p_model_type, '1.0.0', '\x', md5(p_training_data_query))
    RETURNING id INTO model_id;
    
    -- Create training job
    INSERT INTO model_training_jobs (model_id, job_type, training_data_query, hyperparameters, status, started_at)
    VALUES (model_id, 'initial_training', p_training_data_query, p_hyperparameters, 'running', NOW())
    RETURNING id INTO job_id;
    
    -- Log the training start
    PERFORM log_comprehensive_audit_event(
        'model_training_started',
        'system',
        'ai_models',
        model_id::TEXT,
        'INSERT',
        NULL,
        json_build_object('model_name', p_model_name, 'model_type', p_model_type),
        NULL,
        NULL,
        NULL,
        200,
        NULL,
        json_build_object('job_id', job_id)
    );
    
    RETURN job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_automated_insight(
    p_insight_type TEXT,
    p_title TEXT,
    p_description TEXT,
    p_confidence_score DECIMAL,
    p_impact_level TEXT,
    p_data_source TEXT,
    p_insight_data JSONB
)
RETURNS UUID AS $$
DECLARE
    insight_id UUID;
BEGIN
    INSERT INTO automated_insights (
        insight_type, title, description, confidence_score, impact_level,
        data_source, insight_data, is_actionable, action_required
    ) VALUES (
        p_insight_type, p_title, p_description, p_confidence_score, p_impact_level,
        p_data_source, p_insight_data, 
        p_impact_level IN ('high', 'critical'),
        p_impact_level = 'critical'
    ) RETURNING id INTO insight_id;
    
    -- Log insight generation
    PERFORM log_comprehensive_audit_event(
        'insight_generated',
        'system',
        'automated_insights',
        insight_id::TEXT,
        'INSERT',
        NULL,
        json_build_object('insight_type', p_insight_type, 'impact_level', p_impact_level),
        NULL,
        NULL,
        NULL,
        200,
        NULL,
        json_build_object('confidence_score', p_confidence_score)
    );
    
    RETURN insight_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION evaluate_alert_rules()
RETURNS INTEGER AS $$
DECLARE
    rule_record RECORD;
    alert_count INTEGER := 0;
    current_value DECIMAL(15,4);
    threshold_met BOOLEAN := FALSE;
BEGIN
    FOR rule_record IN 
        SELECT * FROM alert_rules WHERE is_active = TRUE
    LOOP
        -- Execute the condition query to get current value
        EXECUTE rule_record.condition_query INTO current_value;
        
        -- Check if threshold is met
        CASE rule_record.comparison_operator
            WHEN '>' THEN threshold_met := current_value > rule_record.threshold_value;
            WHEN '<' THEN threshold_met := current_value < rule_record.threshold_value;
            WHEN '>=' THEN threshold_met := current_value >= rule_record.threshold_value;
            WHEN '<=' THEN threshold_met := current_value <= rule_record.threshold_value;
            WHEN '=' THEN threshold_met := current_value = rule_record.threshold_value;
            WHEN '!=' THEN threshold_met := current_value != rule_record.threshold_value;
            ELSE threshold_met := FALSE;
        END CASE;
        
        -- Create alert execution if threshold is met
        IF threshold_met THEN
            INSERT INTO alert_executions (
                rule_id, triggered_at, alert_value, threshold_value,
                context_data, notification_sent, notification_channels
            ) VALUES (
                rule_record.id, NOW(), current_value, rule_record.threshold_value,
                json_build_object('rule_name', rule_record.rule_name, 'severity', rule_record.severity),
                FALSE, rule_record.notification_channels
            );
            
            alert_count := alert_count + 1;
        END IF;
    END LOOP;
    
    RETURN alert_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_user_recommendations(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    recommendation_count INTEGER := 0;
    user_subscription TEXT;
    user_income DECIMAL(12,2);
    user_debts DECIMAL(12,2);
    recent_calculations RECORD;
    recommendation_id UUID;
BEGIN
    -- Get user information
    SELECT subscription_tier INTO user_subscription FROM users WHERE id = p_user_id;
    
    -- Get recent calculations for analysis
    SELECT income, debts INTO user_income, user_debts
    FROM mortgage_calculations
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Generate rate optimization recommendations
    IF user_subscription = 'free' AND user_income > 50000 THEN
        INSERT INTO automated_recommendations (
            user_id, recommendation_type, title, description,
            priority_score, confidence_score, recommendation_data
        ) VALUES (
            p_user_id, 'rate_optimization',
            'Upgrade to Premium for Better Rates',
            'Based on your income, you could save significantly with premium rate access.',
            85, 0.9,
            json_build_object('potential_savings', user_income * 0.01, 'current_tier', user_subscription)
        ) RETURNING id INTO recommendation_id;
        
        recommendation_count := recommendation_count + 1;
    END IF;
    
    -- Generate refinance opportunity recommendations
    IF user_debts > 0 AND user_income > 0 AND (user_debts / user_income) > 0.4 THEN
        INSERT INTO automated_recommendations (
            user_id, recommendation_type, title, description,
            priority_score, confidence_score, recommendation_data
        ) VALUES (
            p_user_id, 'refinance_opportunity',
            'Consider Refinancing Your Debt',
            'Your debt-to-income ratio suggests refinancing could improve your financial position.',
            75, 0.8,
            json_build_object('dti_ratio', user_debts / user_income, 'recommended_action', 'refinance')
        ) RETURNING id INTO recommendation_id;
        
        recommendation_count := recommendation_count + 1;
    END IF;
    
    RETURN recommendation_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION monitor_data_quality()
RETURNS VOID AS $$
DECLARE
    table_record RECORD;
    row_count BIGINT;
    null_count BIGINT;
    quality_score DECIMAL(3,2);
BEGIN
    FOR table_record IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        -- Check for null values in critical columns
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.tablename) INTO row_count;
        
        -- Calculate quality score based on various metrics
        quality_score := CASE
            WHEN row_count = 0 THEN 0.0
            WHEN row_count < 100 THEN 0.5
            WHEN row_count < 1000 THEN 0.7
            WHEN row_count < 10000 THEN 0.8
            ELSE 0.9
        END;
        
        -- Insert quality metrics
        INSERT INTO data_quality_metrics (table_name, metric_name, metric_value, quality_score)
        VALUES (table_record.tablename, 'row_count', row_count, quality_score);
        
        -- Check for data freshness (if table has created_at column)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = table_record.tablename 
            AND column_name = 'created_at'
        ) THEN
            EXECUTE format(
                'SELECT COUNT(*) FROM %I WHERE created_at >= NOW() - INTERVAL ''24 hours''',
                table_record.tablename
            ) INTO row_count;
            
            INSERT INTO data_quality_metrics (table_name, metric_name, metric_value, quality_score)
            VALUES (table_record.tablename, 'recent_updates_24h', row_count, 
                CASE WHEN row_count > 0 THEN 1.0 ELSE 0.0 END);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION execute_automated_workflow(p_workflow_id UUID)
RETURNS UUID AS $$
DECLARE
    workflow_record RECORD;
    execution_id UUID;
    step_record RECORD;
    step_result JSONB;
    workflow_status TEXT := 'running';
    error_message TEXT;
BEGIN
    -- Get workflow details
    SELECT * INTO workflow_record FROM automated_workflows WHERE id = p_workflow_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workflow not found: %', p_workflow_id;
    END IF;
    
    -- Create execution record
    INSERT INTO workflow_executions (workflow_id, execution_id, status, started_at)
    VALUES (p_workflow_id, gen_random_uuid()::TEXT, 'running', NOW())
    RETURNING id INTO execution_id;
    
    -- Execute workflow steps
    FOR step_record IN 
        SELECT * FROM jsonb_array_elements(workflow_record.workflow_steps) AS step
    LOOP
        BEGIN
            -- Execute step based on type
            CASE step_record->>'type'
                WHEN 'data_query' THEN
                    EXECUTE step_record->>'query' INTO step_result;
                WHEN 'function_call' THEN
                    EXECUTE format('SELECT %I(%L)', 
                        step_record->>'function_name', 
                        step_record->>'parameters'
                    ) INTO step_result;
                WHEN 'condition_check' THEN
                    EXECUTE step_record->>'condition' INTO step_result;
                ELSE
                    step_result := json_build_object('status', 'skipped', 'reason', 'unknown_step_type');
            END CASE;
            
            -- Log step execution
            UPDATE workflow_executions
            SET execution_log = execution_log || json_build_object(
                'step', step_record->>'name',
                'result', step_result,
                'timestamp', NOW()
            )::jsonb
            WHERE id = execution_id;
            
        EXCEPTION WHEN OTHERS THEN
            error_message := SQLERRM;
            workflow_status := 'failed';
            
            UPDATE workflow_executions
            SET status = 'failed', error_message = error_message, completed_at = NOW()
            WHERE id = execution_id;
            
            EXIT;
        END;
    END LOOP;
    
    -- Update workflow execution status
    IF workflow_status = 'running' THEN
        workflow_status := 'completed';
        UPDATE workflow_executions
        SET status = 'completed', completed_at = NOW()
        WHERE id = execution_id;
        
        -- Update workflow statistics
        UPDATE automated_workflows
        SET last_executed = NOW(), execution_count = execution_count + 1, success_count = success_count + 1
        WHERE id = p_workflow_id;
    END IF;
    
    RETURN execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create automated maintenance function
CREATE OR REPLACE FUNCTION run_automated_maintenance()
RETURNS VOID AS $$
BEGIN
    -- Refresh materialized views
    PERFORM refresh_materialized_views();
    
    -- Collect table statistics
    PERFORM collect_table_statistics();
    
    -- Monitor data quality
    PERFORM monitor_data_quality();
    
    -- Evaluate alert rules
    PERFORM evaluate_alert_rules();
    
    -- Generate insights for active users
    PERFORM generate_user_recommendations(user_id)
    FROM users
    WHERE subscription_tier IN ('premium', 'broker')
    AND last_rate_check_reset >= NOW() - INTERVAL '7 days';
    
    -- Log maintenance completion
    PERFORM log_comprehensive_audit_event(
        'automated_maintenance_completed',
        'system',
        'database',
        'maintenance',
        NULL,
        json_build_object('timestamp', NOW()),
        NULL,
        NULL,
        NULL,
        200,
        NULL,
        json_build_object('maintenance_type', 'automated')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default alert rules
INSERT INTO alert_rules (rule_name, rule_type, condition_query, threshold_value, comparison_operator, severity, notification_channels) VALUES
('High Error Rate', 'threshold', 'SELECT COUNT(*) FROM comprehensive_audit_logs WHERE event_type = ''error'' AND timestamp >= NOW() - INTERVAL ''1 hour''', 10, '>', 'high', ARRAY['email', 'slack']),
('Slow Query Performance', 'threshold', 'SELECT AVG(execution_time_ms) FROM query_performance_logs WHERE created_at >= NOW() - INTERVAL ''1 hour''', 1000, '>', 'medium', ARRAY['email']),
('Low Data Quality', 'threshold', 'SELECT AVG(quality_score) FROM data_quality_metrics WHERE measurement_timestamp >= NOW() - INTERVAL ''1 hour''', 0.7, '<', 'medium', ARRAY['email']),
('High Memory Usage', 'threshold', 'SELECT (SELECT setting::int FROM pg_settings WHERE name = ''shared_buffers'') * 0.9', 1000000000, '>', 'high', ARRAY['email', 'slack', 'pagerduty']);

-- Insert default automated workflows
INSERT INTO automated_workflows (workflow_name, workflow_type, trigger_condition, workflow_steps, is_active) VALUES
('Daily Data Quality Check', 'data_processing', '{"schedule": "0 2 * * *"}', '[
    {"name": "check_data_quality", "type": "function_call", "function_name": "monitor_data_quality", "parameters": "{}"},
    {"name": "generate_insights", "type": "function_call", "function_name": "generate_automated_insight", "parameters": "{\"insight_type\": \"data_quality\", \"title\": \"Daily Data Quality Report\", \"description\": \"Automated data quality assessment\", \"confidence_score\": 0.95, \"impact_level\": \"medium\", \"data_source\": \"data_quality_metrics\", \"insight_data\": {}}"}
]', TRUE),
('Weekly Model Retraining', 'model_training', '{"schedule": "0 3 * * 0"}', '[
    {"name": "check_model_performance", "type": "data_query", "query": "SELECT AVG(accuracy_score) FROM ai_models WHERE is_active = TRUE"},
    {"name": "retrain_models", "type": "function_call", "function_name": "train_ml_model", "parameters": "{\"model_name\": \"lead_scoring\", \"model_type\": \"classification\", \"training_data_query\": \"SELECT * FROM leads WHERE created_at >= NOW() - INTERVAL ''30 days''\"}"}
]', TRUE),
('Hourly System Health Check', 'maintenance', '{"schedule": "0 * * * *"}', '[
    {"name": "check_system_health", "type": "function_call", "function_name": "run_automated_maintenance", "parameters": "{}"},
    {"name": "evaluate_alerts", "type": "function_call", "function_name": "evaluate_alert_rules", "parameters": "{}"}
]', TRUE);

-- Enable RLS on all new tables
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "Admins can manage AI models" ON ai_models FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage training jobs" ON model_training_jobs FOR ALL USING (is_admin());
CREATE POLICY "Users can view own insights" ON automated_insights FOR SELECT USING (auth.uid() = assigned_to OR is_admin());
CREATE POLICY "Admins can manage insights" ON automated_insights FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage alert rules" ON alert_rules FOR ALL USING (is_admin());
CREATE POLICY "Admins can view alert executions" ON alert_executions FOR SELECT USING (is_admin());
CREATE POLICY "Admins can view data quality metrics" ON data_quality_metrics FOR SELECT USING (is_admin());
CREATE POLICY "Users can view own recommendations" ON automated_recommendations FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can update own recommendations" ON automated_recommendations FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Admins can view system health" ON system_health_monitoring FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage workflows" ON automated_workflows FOR ALL USING (is_admin());
CREATE POLICY "Admins can view workflow executions" ON workflow_executions FOR SELECT USING (is_admin());

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION train_ml_model TO service_role;
GRANT EXECUTE ON FUNCTION generate_automated_insight TO service_role;
GRANT EXECUTE ON FUNCTION evaluate_alert_rules TO service_role;
GRANT EXECUTE ON FUNCTION generate_user_recommendations TO service_role;
GRANT EXECUTE ON FUNCTION monitor_data_quality TO service_role;
GRANT EXECUTE ON FUNCTION execute_automated_workflow TO service_role;
GRANT EXECUTE ON FUNCTION run_automated_maintenance TO service_role;

-- Create view for automation dashboard
CREATE OR REPLACE VIEW automation_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM ai_models WHERE is_active = TRUE) as active_models,
    (SELECT COUNT(*) FROM model_training_jobs WHERE status = 'running') as running_training_jobs,
    (SELECT COUNT(*) FROM automated_insights WHERE status = 'new') as new_insights,
    (SELECT COUNT(*) FROM alert_executions WHERE resolved_at IS NULL) as active_alerts,
    (SELECT COUNT(*) FROM automated_recommendations WHERE is_presented = FALSE) as pending_recommendations,
    (SELECT COUNT(*) FROM automated_workflows WHERE is_active = TRUE) as active_workflows,
    (SELECT AVG(quality_score) FROM data_quality_metrics WHERE measurement_timestamp >= NOW() - INTERVAL '24 hours') as avg_data_quality,
    (SELECT COUNT(*) FROM workflow_executions WHERE status = 'running') as running_workflows;

-- Grant permissions
GRANT SELECT ON automation_dashboard TO authenticated;
GRANT SELECT ON automation_dashboard TO service_role;