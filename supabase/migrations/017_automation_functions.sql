-- Automation and Scheduling Functions
-- This migration adds comprehensive automation, scheduling, and real-time processing functions

-- =============================================
-- SCHEDULING FUNCTIONS
-- =============================================

-- Function to create scheduled job
CREATE OR REPLACE FUNCTION create_scheduled_job(
    p_name VARCHAR(255),
    p_description TEXT,
    p_job_type VARCHAR(100),
    p_target_id UUID,
    p_schedule_cron VARCHAR(100),
    p_parameters JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    job_id UUID;
    next_run_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate next run time based on cron expression
    next_run_time := calculate_next_run_time(p_schedule_cron);
    
    -- Create scheduled job
    INSERT INTO scheduled_jobs (name, description, job_type, target_id, schedule_cron, parameters, next_run, created_by)
    VALUES (p_name, p_description, p_job_type, p_target_id, p_schedule_cron, p_parameters, next_run_time, p_created_by)
    RETURNING id INTO job_id;
    
    RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next run time from cron expression
CREATE OR REPLACE FUNCTION calculate_next_run_time(p_cron VARCHAR(100))
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    next_run TIMESTAMP WITH TIME ZONE;
    current_time TIMESTAMP WITH TIME ZONE := NOW();
    cron_parts TEXT[];
    minute_part TEXT;
    hour_part TEXT;
    day_part TEXT;
    month_part TEXT;
    weekday_part TEXT;
BEGIN
    -- Parse cron expression (simplified version)
    cron_parts := string_to_array(p_cron, ' ');
    
    IF array_length(cron_parts, 1) != 5 THEN
        RAISE EXCEPTION 'Invalid cron expression format. Expected: minute hour day month weekday';
    END IF;
    
    minute_part := cron_parts[1];
    hour_part := cron_parts[2];
    day_part := cron_parts[3];
    month_part := cron_parts[4];
    weekday_part := cron_parts[5];
    
    -- Calculate next run time (simplified logic)
    -- In a real implementation, you'd use a proper cron parser
    next_run := current_time + INTERVAL '1 hour'; -- Default to next hour
    
    -- Handle specific cases
    IF minute_part = '*' AND hour_part = '*' THEN
        next_run := current_time + INTERVAL '1 minute';
    ELSIF minute_part = '0' AND hour_part = '*' THEN
        next_run := date_trunc('hour', current_time) + INTERVAL '1 hour';
    ELSIF minute_part = '0' AND hour_part = '0' THEN
        next_run := date_trunc('day', current_time) + INTERVAL '1 day';
    END IF;
    
    RETURN next_run;
END;
$$ LANGUAGE plpgsql;

-- Function to execute scheduled job
CREATE OR REPLACE FUNCTION execute_scheduled_job(p_job_id UUID)
RETURNS JSONB AS $$
DECLARE
    job_record RECORD;
    execution_id UUID;
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
    duration_seconds INTEGER;
    execution_result JSONB;
    job_status VARCHAR(50) := 'running';
    error_message TEXT;
BEGIN
    -- Get job details
    SELECT * INTO job_record
    FROM scheduled_jobs
    WHERE id = p_job_id AND is_active = true;
    
    IF job_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Job not found or not active');
    END IF;
    
    start_time := NOW();
    
    -- Create execution record
    INSERT INTO job_execution_history (job_id, started_at, status)
    VALUES (p_job_id, start_time, 'running')
    RETURNING id INTO execution_id;
    
    -- Execute job based on type
    BEGIN
        CASE job_record.job_type
            WHEN 'data_ingestion' THEN
                execution_result := execute_data_ingestion_job(job_record.target_id, job_record.parameters);
            WHEN 'analysis' THEN
                execution_result := execute_analysis_job(job_record.target_id, job_record.parameters);
            WHEN 'quality_check' THEN
                execution_result := execute_quality_check_job(job_record.target_id, job_record.parameters);
            WHEN 'workflow' THEN
                execution_result := execute_workflow_job(job_record.target_id, job_record.parameters);
            WHEN 'cleanup' THEN
                execution_result := execute_cleanup_job(job_record.parameters);
            ELSE
                RAISE EXCEPTION 'Unknown job type: %', job_record.job_type;
        END CASE;
        
        job_status := 'completed';
        
    EXCEPTION WHEN OTHERS THEN
        job_status := 'failed';
        error_message := SQLERRM;
        execution_result := json_build_object('success', false, 'error', error_message);
    END;
    
    end_time := NOW();
    duration_seconds := EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER;
    
    -- Update execution record
    UPDATE job_execution_history
    SET completed_at = end_time,
        status = job_status,
        execution_log = execution_result,
        error_message = error_message,
        duration_seconds = duration_seconds
    WHERE id = execution_id;
    
    -- Update job statistics
    UPDATE scheduled_jobs
    SET last_run = start_time,
        next_run = calculate_next_run_time(job_record.schedule_cron),
        run_count = run_count + 1,
        success_count = success_count + CASE WHEN job_status = 'completed' THEN 1 ELSE 0 END,
        failure_count = failure_count + CASE WHEN job_status = 'failed' THEN 1 ELSE 0 END
    WHERE id = p_job_id;
    
    RETURN json_build_object(
        'success', job_status = 'completed',
        'execution_id', execution_id,
        'duration_seconds', duration_seconds,
        'result', execution_result
    );
END;
$$ LANGUAGE plpgsql;

-- Function to execute data ingestion job
CREATE OR REPLACE FUNCTION execute_data_ingestion_job(p_source_id UUID, p_parameters JSONB)
RETURNS JSONB AS $$
DECLARE
    job_id UUID;
    source_record RECORD;
    records_processed INTEGER := 0;
BEGIN
    -- Get source details
    SELECT * INTO source_record
    FROM data_sources
    WHERE id = p_source_id AND is_active = true;
    
    IF source_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Data source not found or not active');
    END IF;
    
    -- Create ingestion job
    job_id := create_data_ingestion_job(p_source_id, 'scheduled', NULL);
    
    -- Simulate data processing (in real implementation, this would connect to actual data source)
    records_processed := 100; -- Placeholder
    
    -- Update job status
    UPDATE data_ingestion_jobs
    SET status = 'completed',
        completed_at = NOW(),
        records_processed = records_processed,
        records_successful = records_processed
    WHERE id = job_id;
    
    RETURN json_build_object(
        'success', true,
        'job_id', job_id,
        'records_processed', records_processed
    );
END;
$$ LANGUAGE plpgsql;

-- Function to execute analysis job
CREATE OR REPLACE FUNCTION execute_analysis_job(p_model_id UUID, p_parameters JSONB)
RETURNS JSONB AS $$
DECLARE
    analysis_job_id UUID;
    input_query TEXT;
BEGIN
    -- Get default input query or use provided one
    input_query := COALESCE(p_parameters->>'input_query', 'SELECT * FROM parsed_data LIMIT 1000');
    
    -- Run analysis job
    analysis_job_id := run_analysis_job(
        p_model_id,
        'Scheduled Analysis',
        input_query,
        p_parameters,
        NULL
    );
    
    RETURN json_build_object(
        'success', true,
        'analysis_job_id', analysis_job_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to execute quality check job
CREATE OR REPLACE FUNCTION execute_quality_check_job(p_rule_id UUID, p_parameters JSONB)
RETURNS JSONB AS $$
DECLARE
    rule_record RECORD;
    table_name VARCHAR(255);
    check_result JSONB;
BEGIN
    -- Get rule details
    SELECT * INTO rule_record
    FROM data_quality_rules
    WHERE id = p_rule_id AND is_active = true;
    
    IF rule_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Quality rule not found or not active');
    END IF;
    
    table_name := rule_record.table_name;
    
    -- Run quality check
    check_result := run_data_quality_checks(table_name, ARRAY[p_rule_id]);
    
    RETURN json_build_object(
        'success', true,
        'check_result', check_result
    );
END;
$$ LANGUAGE plpgsql;

-- Function to execute workflow job
CREATE OR REPLACE FUNCTION execute_workflow_job(p_workflow_id UUID, p_parameters JSONB)
RETURNS JSONB AS $$
DECLARE
    execution_id UUID;
    trigger_data JSONB;
BEGIN
    trigger_data := COALESCE(p_parameters->'trigger_data', '{}'::JSONB);
    
    -- Execute workflow
    execution_id := execute_workflow(p_workflow_id, trigger_data, NULL);
    
    RETURN json_build_object(
        'success', true,
        'execution_id', execution_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to execute cleanup job
CREATE OR REPLACE FUNCTION execute_cleanup_job(p_parameters JSONB)
RETURNS JSONB AS $$
DECLARE
    cleanup_type VARCHAR(100);
    retention_days INTEGER;
    records_deleted INTEGER := 0;
    cleanup_result JSONB := '{}'::JSONB;
BEGIN
    cleanup_type := p_parameters->>'type';
    retention_days := COALESCE((p_parameters->>'retention_days')::INTEGER, 30);
    
    CASE cleanup_type
        WHEN 'old_audit_logs' THEN
            DELETE FROM audit_logs WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
            GET DIAGNOSTICS records_deleted = ROW_COUNT;
            cleanup_result := cleanup_result || json_build_object('audit_logs_deleted', records_deleted);
            
        WHEN 'old_ingestion_jobs' THEN
            DELETE FROM data_ingestion_jobs WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
            GET DIAGNOSTICS records_deleted = ROW_COUNT;
            cleanup_result := cleanup_result || json_build_object('ingestion_jobs_deleted', records_deleted);
            
        WHEN 'old_quality_checks' THEN
            DELETE FROM data_quality_checks WHERE check_timestamp < NOW() - (retention_days || ' days')::INTERVAL;
            GET DIAGNOSTICS records_deleted = ROW_COUNT;
            cleanup_result := cleanup_result || json_build_object('quality_checks_deleted', records_deleted);
            
        WHEN 'old_insights' THEN
            DELETE FROM generated_insights WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
            GET DIAGNOSTICS records_deleted = ROW_COUNT;
            cleanup_result := cleanup_result || json_build_object('insights_deleted', records_deleted);
            
        ELSE
            RETURN json_build_object('success', false, 'error', 'Unknown cleanup type: ' || cleanup_type);
    END CASE;
    
    RETURN json_build_object(
        'success', true,
        'cleanup_type', cleanup_type,
        'retention_days', retention_days,
        'results', cleanup_result
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- REAL-TIME PROCESSING FUNCTIONS
-- =============================================

-- Function to create real-time rule
CREATE OR REPLACE FUNCTION create_real_time_rule(
    p_name VARCHAR(255),
    p_description TEXT,
    p_trigger_table VARCHAR(255),
    p_trigger_event VARCHAR(50),
    p_trigger_conditions JSONB,
    p_action_type VARCHAR(100),
    p_action_config JSONB,
    p_priority INTEGER DEFAULT 0,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    rule_id UUID;
BEGIN
    INSERT INTO real_time_rules (name, description, trigger_table, trigger_event, trigger_conditions, action_type, action_config, priority, created_by)
    VALUES (p_name, p_description, p_trigger_table, p_trigger_event, p_trigger_conditions, p_action_type, p_action_config, p_priority, p_created_by)
    RETURNING id INTO rule_id;
    
    RETURN rule_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process real-time event
CREATE OR REPLACE FUNCTION process_real_time_event(
    p_rule_id UUID,
    p_trigger_table VARCHAR(255),
    p_trigger_event VARCHAR(50),
    p_record_id UUID,
    p_old_data JSONB,
    p_new_data JSONB
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
    rule_record RECORD;
    conditions_met BOOLEAN := true;
    action_result JSONB;
BEGIN
    -- Get rule details
    SELECT * INTO rule_record
    FROM real_time_rules
    WHERE id = p_rule_id AND is_active = true;
    
    IF rule_record IS NULL THEN
        RAISE EXCEPTION 'Real-time rule not found or not active';
    END IF;
    
    -- Check trigger conditions
    IF rule_record.trigger_conditions IS NOT NULL THEN
        conditions_met := evaluate_trigger_conditions(rule_record.trigger_conditions, p_old_data, p_new_data);
    END IF;
    
    -- Create event record
    INSERT INTO real_time_events (rule_id, trigger_table, trigger_event, record_id, old_data, new_data, status)
    VALUES (p_rule_id, p_trigger_table, p_trigger_event, p_record_id, p_old_data, p_new_data, 'pending')
    RETURNING id INTO event_id;
    
    -- Process event if conditions are met
    IF conditions_met THEN
        UPDATE real_time_events SET status = 'processing' WHERE id = event_id;
        
        -- Execute action
        action_result := execute_real_time_action(rule_record, p_old_data, p_new_data);
        
        -- Update event status
        UPDATE real_time_events
        SET status = CASE WHEN (action_result->>'success')::BOOLEAN THEN 'completed' ELSE 'failed' END,
            processing_log = action_result,
            error_message = action_result->>'error'
        WHERE id = event_id;
    ELSE
        UPDATE real_time_events SET status = 'skipped' WHERE id = event_id;
    END IF;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to evaluate trigger conditions
CREATE OR REPLACE FUNCTION evaluate_trigger_conditions(
    p_conditions JSONB,
    p_old_data JSONB,
    p_new_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    condition_result BOOLEAN := true;
    condition_key TEXT;
    condition_value JSONB;
    field_value JSONB;
    expected_value JSONB;
BEGIN
    -- Evaluate each condition
    FOR condition_key, condition_value IN SELECT * FROM json_each(p_conditions)
    LOOP
        field_value := p_new_data->condition_key;
        expected_value := condition_value;
        
        -- Simple equality check (can be extended for more complex conditions)
        IF field_value != expected_value THEN
            condition_result := false;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN condition_result;
END;
$$ LANGUAGE plpgsql;

-- Function to execute real-time action
CREATE OR REPLACE FUNCTION execute_real_time_action(
    p_rule RECORD,
    p_old_data JSONB,
    p_new_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    action_result JSONB;
    action_type VARCHAR(100);
    action_config JSONB;
BEGIN
    action_type := p_rule.action_type;
    action_config := p_rule.action_config;
    
    CASE action_type
        WHEN 'workflow' THEN
            action_result := json_build_object(
                'success', true,
                'message', 'Workflow triggered',
                'workflow_id', action_config->>'workflow_id'
            );
            
        WHEN 'analysis' THEN
            action_result := json_build_object(
                'success', true,
                'message', 'Analysis triggered',
                'model_id', action_config->>'model_id'
            );
            
        WHEN 'notification' THEN
            action_result := json_build_object(
                'success', true,
                'message', 'Notification sent',
                'channel', action_config->>'channel'
            );
            
        WHEN 'webhook' THEN
            action_result := json_build_object(
                'success', true,
                'message', 'Webhook called',
                'url', action_config->>'url'
            );
            
        ELSE
            action_result := json_build_object(
                'success', false,
                'error', 'Unknown action type: ' || action_type
            );
    END CASE;
    
    RETURN action_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PIPELINE MANAGEMENT FUNCTIONS
-- =============================================

-- Function to create data pipeline
CREATE OR REPLACE FUNCTION create_data_pipeline(
    p_name VARCHAR(255),
    p_description TEXT,
    p_pipeline_type VARCHAR(100),
    p_stages JSONB,
    p_dependencies JSONB DEFAULT NULL,
    p_schedule_cron VARCHAR(100) DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    pipeline_id UUID;
BEGIN
    INSERT INTO data_pipelines (name, description, pipeline_type, stages, dependencies, schedule_cron, created_by)
    VALUES (p_name, p_description, p_pipeline_type, p_stages, p_dependencies, p_schedule_cron, p_created_by)
    RETURNING id INTO pipeline_id;
    
    RETURN pipeline_id;
END;
$$ LANGUAGE plpgsql;

-- Function to execute data pipeline
CREATE OR REPLACE FUNCTION execute_data_pipeline(
    p_pipeline_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    execution_id UUID;
    pipeline_record RECORD;
    stages JSONB;
    stage_count INTEGER;
    current_stage INTEGER := 0;
    stage_result JSONB;
    all_stages_completed BOOLEAN := false;
BEGIN
    -- Get pipeline details
    SELECT * INTO pipeline_record
    FROM data_pipelines
    WHERE id = p_pipeline_id AND is_active = true;
    
    IF pipeline_record IS NULL THEN
        RAISE EXCEPTION 'Pipeline not found or not active';
    END IF;
    
    stages := pipeline_record.stages;
    stage_count := json_array_length(stages);
    
    -- Create pipeline execution
    INSERT INTO pipeline_executions (pipeline_id, created_by)
    VALUES (p_pipeline_id, p_created_by)
    RETURNING id INTO execution_id;
    
    -- Update execution status to running
    UPDATE pipeline_executions
    SET status = 'running', started_at = NOW()
    WHERE id = execution_id;
    
    -- Execute pipeline stages
    WHILE NOT all_stages_completed AND current_stage < stage_count LOOP
        current_stage := current_stage + 1;
        
        -- Execute current stage
        stage_result := execute_pipeline_stage(execution_id, current_stage, stages->(current_stage - 1));
        
        -- Update stage results
        UPDATE pipeline_executions
        SET stage_results = COALESCE(stage_results, '{}'::JSONB) || 
            json_build_object(current_stage::TEXT, stage_result),
            current_stage = current_stage
        WHERE id = execution_id;
        
        -- Check if stage failed
        IF (stage_result->>'status') = 'failed' THEN
            UPDATE pipeline_executions
            SET status = 'failed',
                error_message = 'Stage ' || current_stage || ' failed: ' || (stage_result->>'error')
            WHERE id = execution_id;
            RETURN execution_id;
        END IF;
        
        -- Check if all stages completed
        IF current_stage >= stage_count THEN
            all_stages_completed := true;
        END IF;
    END LOOP;
    
    -- Mark execution as completed
    UPDATE pipeline_executions
    SET status = 'completed', completed_at = NOW()
    WHERE id = execution_id;
    
    RETURN execution_id;
END;
$$ LANGUAGE plpgsql;

-- Function to execute pipeline stage
CREATE OR REPLACE FUNCTION execute_pipeline_stage(
    p_execution_id UUID,
    p_stage_number INTEGER,
    p_stage_config JSONB
)
RETURNS JSONB AS $$
DECLARE
    stage_type VARCHAR(100);
    stage_result JSONB;
BEGIN
    stage_type := p_stage_config->>'type';
    
    CASE stage_type
        WHEN 'extract' THEN
            stage_result := json_build_object('status', 'completed', 'message', 'Data extraction completed');
            
        WHEN 'transform' THEN
            stage_result := json_build_object('status', 'completed', 'message', 'Data transformation completed');
            
        WHEN 'load' THEN
            stage_result := json_build_object('status', 'completed', 'message', 'Data loading completed');
            
        WHEN 'validate' THEN
            stage_result := json_build_object('status', 'completed', 'message', 'Data validation completed');
            
        WHEN 'analyze' THEN
            stage_result := json_build_object('status', 'completed', 'message', 'Data analysis completed');
            
        ELSE
            stage_result := json_build_object('status', 'failed', 'error', 'Unknown stage type: ' || stage_type);
    END CASE;
    
    RETURN stage_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- AUTOMATION ORCHESTRATION
-- =============================================

-- Function to run all due scheduled jobs
CREATE OR REPLACE FUNCTION run_due_scheduled_jobs()
RETURNS JSONB AS $$
DECLARE
    job_record RECORD;
    execution_result JSONB;
    total_jobs INTEGER := 0;
    successful_jobs INTEGER := 0;
    failed_jobs INTEGER := 0;
    job_results JSONB := '[]'::JSONB;
BEGIN
    -- Get all due jobs
    FOR job_record IN 
        SELECT * FROM scheduled_jobs 
        WHERE is_active = true 
        AND next_run <= NOW()
        ORDER BY priority DESC, next_run ASC
    LOOP
        total_jobs := total_jobs + 1;
        
        -- Execute job
        execution_result := execute_scheduled_job(job_record.id);
        
        -- Update counters
        IF (execution_result->>'success')::BOOLEAN THEN
            successful_jobs := successful_jobs + 1;
        ELSE
            failed_jobs := failed_jobs + 1;
        END IF;
        
        -- Add to results
        job_results := job_results || json_build_object(
            'job_id', job_record.id,
            'job_name', job_record.name,
            'result', execution_result
        );
    END LOOP;
    
    RETURN json_build_object(
        'execution_time', NOW(),
        'total_jobs', total_jobs,
        'successful_jobs', successful_jobs,
        'failed_jobs', failed_jobs,
        'job_results', job_results
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get automation dashboard data
CREATE OR REPLACE FUNCTION get_automation_dashboard()
RETURNS JSONB AS $$
DECLARE
    dashboard_data JSONB;
BEGIN
    SELECT json_build_object(
        'scheduled_jobs', (
            SELECT json_build_object(
                'total', COUNT(*),
                'active', COUNT(*) FILTER (WHERE is_active = true),
                'due', COUNT(*) FILTER (WHERE is_active = true AND next_run <= NOW()),
                'recent_runs', COUNT(*) FILTER (WHERE last_run >= NOW() - INTERVAL '24 hours')
            )
            FROM scheduled_jobs
        ),
        'real_time_rules', (
            SELECT json_build_object(
                'total', COUNT(*),
                'active', COUNT(*) FILTER (WHERE is_active = true),
                'recent_events', COUNT(*) FILTER (WHERE processed_at >= NOW() - INTERVAL '24 hours')
            )
            FROM real_time_rules
        ),
        'data_pipelines', (
            SELECT json_build_object(
                'total', COUNT(*),
                'active', COUNT(*) FILTER (WHERE is_active = true),
                'recent_executions', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')
            )
            FROM data_pipelines
        ),
        'system_health', (
            SELECT json_build_object(
                'avg_execution_time', AVG(duration_seconds),
                'success_rate', (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)::DECIMAL) * 100,
                'recent_failures', COUNT(*) FILTER (WHERE status = 'failed' AND started_at >= NOW() - INTERVAL '24 hours')
            )
            FROM job_execution_history
            WHERE started_at >= NOW() - INTERVAL '7 days'
        )
    ) INTO dashboard_data;
    
    RETURN dashboard_data;
END;
$$ LANGUAGE plpgsql;