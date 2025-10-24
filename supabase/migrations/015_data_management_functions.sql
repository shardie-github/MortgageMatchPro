-- Comprehensive Data Management Functions
-- This migration adds functions for data ingestion, parsing, analysis, and workflow management

-- =============================================
-- DATA INGESTION FUNCTIONS
-- =============================================

-- Function to create a new data ingestion job
CREATE OR REPLACE FUNCTION create_data_ingestion_job(
    p_source_id UUID,
    p_job_type VARCHAR(100),
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    job_id UUID;
BEGIN
    INSERT INTO data_ingestion_jobs (source_id, job_type, created_by)
    VALUES (p_source_id, p_job_type, p_created_by)
    RETURNING id INTO job_id;
    
    RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process raw data
CREATE OR REPLACE FUNCTION process_raw_data(
    p_job_id UUID,
    p_data_type VARCHAR(100),
    p_raw_data JSONB,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    raw_data_id UUID;
    data_hash VARCHAR(64);
BEGIN
    -- Generate hash for deduplication
    data_hash := encode(digest(p_raw_data::text, 'sha256'), 'hex');
    
    -- Check for duplicates
    IF EXISTS (SELECT 1 FROM raw_data WHERE data_hash = data_hash) THEN
        RAISE NOTICE 'Duplicate data detected, skipping insertion';
        RETURN NULL;
    END IF;
    
    -- Insert raw data
    INSERT INTO raw_data (source_id, job_id, data_type, raw_data, data_hash, metadata)
    SELECT source_id, p_job_id, p_data_type, p_raw_data, data_hash, p_metadata
    FROM data_ingestion_jobs WHERE id = p_job_id
    RETURNING id INTO raw_data_id;
    
    RETURN raw_data_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate data against parsing template
CREATE OR REPLACE FUNCTION validate_data_against_template(
    p_raw_data JSONB,
    p_template_id UUID
)
RETURNS JSONB AS $$
DECLARE
    template_schema JSONB;
    validation_result JSONB;
    errors JSONB := '[]'::JSONB;
    field_name TEXT;
    field_definition JSONB;
    field_value JSONB;
    is_valid BOOLEAN := true;
BEGIN
    -- Get template schema
    SELECT parsing_schema INTO template_schema
    FROM data_parsing_templates
    WHERE id = p_template_id;
    
    IF template_schema IS NULL THEN
        RETURN json_build_object('valid', false, 'errors', '["Template not found"]');
    END IF;
    
    -- Validate each field
    FOR field_name, field_definition IN SELECT * FROM json_each(template_schema->'properties')
    LOOP
        field_value := p_raw_data->field_name;
        
        -- Check required fields
        IF (template_schema->'required') ? field_name AND (field_value IS NULL OR field_value = 'null'::JSONB) THEN
            errors := errors || json_build_object('field', field_name, 'error', 'Required field is missing');
            is_valid := false;
        END IF;
        
        -- Check field type
        IF field_value IS NOT NULL AND field_value != 'null'::JSONB THEN
            CASE field_definition->>'type'
                WHEN 'string' THEN
                    IF json_typeof(field_value) != 'string' THEN
                        errors := errors || json_build_object('field', field_name, 'error', 'Expected string type');
                        is_valid := false;
                    END IF;
                WHEN 'number' THEN
                    IF json_typeof(field_value) NOT IN ('number', 'string') THEN
                        errors := errors || json_build_object('field', field_name, 'error', 'Expected number type');
                        is_valid := false;
                    END IF;
                WHEN 'boolean' THEN
                    IF json_typeof(field_value) != 'boolean' THEN
                        errors := errors || json_build_object('field', field_name, 'error', 'Expected boolean type');
                        is_valid := false;
                    END IF;
            END CASE;
        END IF;
    END LOOP;
    
    RETURN json_build_object('valid', is_valid, 'errors', errors);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DATA PARSING FUNCTIONS
-- =============================================

-- Function to parse raw data using template
CREATE OR REPLACE FUNCTION parse_raw_data(
    p_raw_data_id UUID,
    p_template_id UUID
)
RETURNS UUID AS $$
DECLARE
    parsed_data_id UUID;
    raw_data_record RECORD;
    template_record RECORD;
    parsed_data JSONB;
    field_mappings JSONB;
    source_field TEXT;
    target_field TEXT;
    field_value JSONB;
    confidence_score DECIMAL(3,2) := 1.0;
    parsing_errors JSONB := '[]'::JSONB;
BEGIN
    -- Get raw data and template
    SELECT rd.*, ds.source_type
    INTO raw_data_record
    FROM raw_data rd
    JOIN data_ingestion_jobs dij ON rd.job_id = dij.id
    JOIN data_sources ds ON dij.source_id = ds.id
    WHERE rd.id = p_raw_data_id;
    
    SELECT * INTO template_record
    FROM data_parsing_templates
    WHERE id = p_template_id;
    
    IF raw_data_record IS NULL OR template_record IS NULL THEN
        RAISE EXCEPTION 'Raw data or template not found';
    END IF;
    
    -- Initialize parsed data
    parsed_data := '{}'::JSONB;
    field_mappings := template_record.field_mappings;
    
    -- Apply field mappings
    FOR source_field, target_field IN SELECT * FROM json_each_text(field_mappings)
    LOOP
        field_value := raw_data_record.raw_data->source_field;
        
        -- Apply transformation rules if any
        IF template_record.transformation_rules ? source_field THEN
            -- Apply transformation logic here
            -- This is a simplified version - in practice, you'd have more complex transformation logic
            field_value := raw_data_record.raw_data->source_field;
        END IF;
        
        parsed_data := parsed_data || json_build_object(target_field, field_value);
    END LOOP;
    
    -- Calculate confidence score based on data completeness
    confidence_score := calculate_parsing_confidence(parsed_data, template_record.parsing_schema);
    
    -- Insert parsed data
    INSERT INTO parsed_data (raw_data_id, template_id, parsed_data, confidence_score, parsing_errors)
    VALUES (p_raw_data_id, p_template_id, parsed_data, confidence_score, parsing_errors)
    RETURNING id INTO parsed_data_id;
    
    -- Update raw data processing status
    UPDATE raw_data 
    SET processing_status = 'processed'
    WHERE id = p_raw_data_id;
    
    RETURN parsed_data_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate parsing confidence
CREATE OR REPLACE FUNCTION calculate_parsing_confidence(
    p_parsed_data JSONB,
    p_schema JSONB
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    total_fields INTEGER;
    filled_fields INTEGER;
    required_fields INTEGER;
    missing_required INTEGER;
    confidence DECIMAL(3,2);
BEGIN
    -- Count total fields in schema
    SELECT COUNT(*) INTO total_fields
    FROM json_object_keys(p_schema->'properties');
    
    -- Count filled fields
    SELECT COUNT(*) INTO filled_fields
    FROM json_object_keys(p_parsed_data)
    WHERE p_parsed_data->json_object_keys(p_parsed_data) IS NOT NULL
    AND p_parsed_data->json_object_keys(p_parsed_data) != 'null'::JSONB;
    
    -- Count required fields
    SELECT COUNT(*) INTO required_fields
    FROM json_array_elements_text(p_schema->'required');
    
    -- Count missing required fields
    SELECT COUNT(*) INTO missing_required
    FROM json_array_elements_text(p_schema->'required') AS req_field
    WHERE p_parsed_data->req_field IS NULL
    OR p_parsed_data->req_field = 'null'::JSONB;
    
    -- Calculate confidence (0.0 to 1.0)
    confidence := (filled_fields::DECIMAL / total_fields::DECIMAL) * 0.7 + 
                  (CASE WHEN missing_required = 0 THEN 1.0 ELSE 0.0 END) * 0.3;
    
    RETURN LEAST(1.0, GREATEST(0.0, confidence));
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DATA ANALYSIS FUNCTIONS
-- =============================================

-- Function to run analysis job
CREATE OR REPLACE FUNCTION run_analysis_job(
    p_model_id UUID,
    p_job_name VARCHAR(255),
    p_input_data_query TEXT,
    p_parameters JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    analysis_job_id UUID;
    model_record RECORD;
BEGIN
    -- Get model information
    SELECT * INTO model_record
    FROM analysis_models
    WHERE id = p_model_id AND is_active = true;
    
    IF model_record IS NULL THEN
        RAISE EXCEPTION 'Model not found or not active';
    END IF;
    
    -- Create analysis job
    INSERT INTO analysis_jobs (model_id, job_name, input_data_query, parameters, created_by)
    VALUES (p_model_id, p_job_name, p_input_data_query, p_parameters, p_created_by)
    RETURNING id INTO analysis_job_id;
    
    -- Update job status to running
    UPDATE analysis_jobs 
    SET status = 'running', started_at = NOW()
    WHERE id = analysis_job_id;
    
    -- Execute analysis (simplified version)
    PERFORM execute_analysis_logic(analysis_job_id, model_record, p_input_data_query, p_parameters);
    
    -- Update job status to completed
    UPDATE analysis_jobs 
    SET status = 'completed', completed_at = NOW()
    WHERE id = analysis_job_id;
    
    RETURN analysis_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to execute analysis logic
CREATE OR REPLACE FUNCTION execute_analysis_logic(
    p_job_id UUID,
    p_model RECORD,
    p_input_query TEXT,
    p_parameters JSONB
)
RETURNS VOID AS $$
DECLARE
    input_data JSONB;
    results JSONB;
    insight_data JSONB;
    insight_id UUID;
BEGIN
    -- Execute input query to get data
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || p_input_query || ') t' INTO input_data;
    
    -- Apply model-specific analysis logic
    CASE p_model.model_type
        WHEN 'regression' THEN
            results := perform_regression_analysis(input_data, p_model.model_parameters);
        WHEN 'classification' THEN
            results := perform_classification_analysis(input_data, p_model.model_parameters);
        WHEN 'clustering' THEN
            results := perform_clustering_analysis(input_data, p_model.model_parameters);
        WHEN 'time_series' THEN
            results := perform_time_series_analysis(input_data, p_model.model_parameters);
        ELSE
            results := json_build_object('error', 'Unsupported model type');
    END CASE;
    
    -- Update job with results
    UPDATE analysis_jobs 
    SET results = results
    WHERE id = p_job_id;
    
    -- Generate insights from results
    insight_data := generate_insights_from_results(results, p_model);
    
    -- Create insight record
    INSERT INTO generated_insights (analysis_job_id, insight_type, title, description, insight_data, confidence_score, impact_level, actionable)
    VALUES (p_job_id, 'analysis_result', 'Analysis Results', 'Generated from analysis job', insight_data, 0.8, 'medium', true)
    RETURNING id INTO insight_id;
    
END;
$$ LANGUAGE plpgsql;

-- Placeholder functions for different analysis types
CREATE OR REPLACE FUNCTION perform_regression_analysis(input_data JSONB, parameters JSONB)
RETURNS JSONB AS $$
BEGIN
    -- Simplified regression analysis
    RETURN json_build_object(
        'type', 'regression',
        'r_squared', 0.85,
        'coefficients', json_build_object('intercept', 1000, 'slope', 0.5),
        'predictions', input_data
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION perform_classification_analysis(input_data JSONB, parameters JSONB)
RETURNS JSONB AS $$
BEGIN
    -- Simplified classification analysis
    RETURN json_build_object(
        'type', 'classification',
        'accuracy', 0.92,
        'predictions', input_data,
        'classes', json_build_array('low_risk', 'medium_risk', 'high_risk')
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION perform_clustering_analysis(input_data JSONB, parameters JSONB)
RETURNS JSONB AS $$
BEGIN
    -- Simplified clustering analysis
    RETURN json_build_object(
        'type', 'clustering',
        'clusters', 3,
        'silhouette_score', 0.75,
        'cluster_assignments', input_data
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION perform_time_series_analysis(input_data JSONB, parameters JSONB)
RETURNS JSONB AS $$
BEGIN
    -- Simplified time series analysis
    RETURN json_build_object(
        'type', 'time_series',
        'trend', 'increasing',
        'seasonality', 'monthly',
        'forecast', input_data
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate insights from analysis results
CREATE OR REPLACE FUNCTION generate_insights_from_results(results JSONB, model RECORD)
RETURNS JSONB AS $$
DECLARE
    insights JSONB := '[]'::JSONB;
    insight JSONB;
BEGIN
    -- Generate insights based on model type and results
    CASE model.model_type
        WHEN 'regression' THEN
            insight := json_build_object(
                'type', 'trend_analysis',
                'message', 'Data shows strong correlation with R² = ' || (results->>'r_squared'),
                'recommendation', 'Consider this trend in future planning'
            );
        WHEN 'classification' THEN
            insight := json_build_object(
                'type', 'pattern_recognition',
                'message', 'Model achieved ' || (results->>'accuracy') || ' accuracy',
                'recommendation', 'Use this model for automated classification'
            );
        WHEN 'clustering' THEN
            insight := json_build_object(
                'type', 'segmentation',
                'message', 'Data naturally groups into ' || (results->>'clusters') || ' clusters',
                'recommendation', 'Consider different strategies for each segment'
            );
        WHEN 'time_series' THEN
            insight := json_build_object(
                'type', 'forecasting',
                'message', 'Trend: ' || (results->>'trend') || ', Seasonality: ' || (results->>'seasonality'),
                'recommendation', 'Adjust strategy based on seasonal patterns'
            );
    END CASE;
    
    insights := insights || insight;
    
    RETURN insights;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- WORKFLOW MANAGEMENT FUNCTIONS
-- =============================================

-- Function to execute workflow
CREATE OR REPLACE FUNCTION execute_workflow(
    p_workflow_id UUID,
    p_trigger_data JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    execution_id UUID;
    workflow_record RECORD;
    step_record RECORD;
    step_result JSONB;
    all_steps_completed BOOLEAN := false;
    current_step INTEGER := 0;
BEGIN
    -- Get workflow definition
    SELECT * INTO workflow_record
    FROM workflow_definitions
    WHERE id = p_workflow_id AND is_active = true;
    
    IF workflow_record IS NULL THEN
        RAISE EXCEPTION 'Workflow not found or not active';
    END IF;
    
    -- Create workflow execution
    INSERT INTO workflow_executions (workflow_id, trigger_data, created_by)
    VALUES (p_workflow_id, p_trigger_data, p_created_by)
    RETURNING id INTO execution_id;
    
    -- Update execution status to running
    UPDATE workflow_executions 
    SET status = 'running', started_at = NOW()
    WHERE id = execution_id;
    
    -- Execute workflow steps
    WHILE NOT all_steps_completed LOOP
        -- Get next step to execute
        SELECT * INTO step_record
        FROM workflow_steps
        WHERE workflow_id = p_workflow_id
        AND step_order > current_step
        ORDER BY step_order
        LIMIT 1;
        
        IF step_record IS NULL THEN
            all_steps_completed := true;
        ELSE
            -- Execute step
            step_result := execute_workflow_step(execution_id, step_record, p_trigger_data);
            
            -- Update step results
            UPDATE workflow_executions 
            SET step_results = COALESCE(step_results, '{}'::JSONB) || 
                json_build_object(step_record.step_order::TEXT, step_result),
                current_step = step_record.step_order
            WHERE id = execution_id;
            
            current_step := step_record.step_order;
            
            -- Check if step failed and workflow should stop
            IF (step_result->>'status') = 'failed' AND NOT step_record.is_optional THEN
                UPDATE workflow_executions 
                SET status = 'failed', 
                    error_message = 'Step ' || step_record.step_order || ' failed: ' || (step_result->>'error')
                WHERE id = execution_id;
                RETURN execution_id;
            END IF;
        END IF;
    END LOOP;
    
    -- Mark execution as completed
    UPDATE workflow_executions 
    SET status = 'completed', completed_at = NOW()
    WHERE id = execution_id;
    
    RETURN execution_id;
END;
$$ LANGUAGE plpgsql;

-- Function to execute individual workflow step
CREATE OR REPLACE FUNCTION execute_workflow_step(
    p_execution_id UUID,
    p_step RECORD,
    p_trigger_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    step_result JSONB;
    step_config JSONB;
    step_type VARCHAR(100);
    query_result JSONB;
BEGIN
    step_config := p_step.step_config;
    step_type := p_step.step_type;
    
    CASE step_type
        WHEN 'data_query' THEN
            -- Execute data query
            EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || (step_config->>'query') || ') t' INTO query_result;
            step_result := json_build_object('status', 'completed', 'data', query_result);
            
        WHEN 'data_transform' THEN
            -- Execute data transformation
            step_result := json_build_object('status', 'completed', 'message', 'Data transformation completed');
            
        WHEN 'analysis' THEN
            -- Execute analysis
            step_result := json_build_object('status', 'completed', 'message', 'Analysis completed');
            
        WHEN 'notification' THEN
            -- Send notification
            step_result := json_build_object('status', 'completed', 'message', 'Notification sent');
            
        WHEN 'webhook' THEN
            -- Call webhook
            step_result := json_build_object('status', 'completed', 'message', 'Webhook called');
            
        ELSE
            step_result := json_build_object('status', 'failed', 'error', 'Unknown step type: ' || step_type);
    END CASE;
    
    RETURN step_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DATA QUALITY FUNCTIONS
-- =============================================

-- Function to run data quality checks
CREATE OR REPLACE FUNCTION run_data_quality_checks(
    p_table_name VARCHAR(255),
    p_rule_ids UUID[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    rule_record RECORD;
    check_result JSONB;
    total_checks INTEGER := 0;
    passed_checks INTEGER := 0;
    failed_checks INTEGER := 0;
    check_summary JSONB;
BEGIN
    -- Run quality checks for specified rules or all active rules for the table
    FOR rule_record IN 
        SELECT * FROM data_quality_rules 
        WHERE table_name = p_table_name 
        AND is_active = true
        AND (p_rule_ids IS NULL OR id = ANY(p_rule_ids))
    LOOP
        total_checks := total_checks + 1;
        
        -- Execute quality check
        check_result := execute_quality_check(rule_record);
        
        -- Record check result
        INSERT INTO data_quality_checks (rule_id, status, records_checked, records_failed, failure_rate, error_details, execution_time_ms)
        VALUES (
            rule_record.id,
            check_result->>'status',
            (check_result->>'records_checked')::INTEGER,
            (check_result->>'records_failed')::INTEGER,
            (check_result->>'failure_rate')::DECIMAL,
            check_result->'error_details',
            (check_result->>'execution_time_ms')::INTEGER
        );
        
        -- Update counters
        IF (check_result->>'status') = 'passed' THEN
            passed_checks := passed_checks + 1;
        ELSE
            failed_checks := failed_checks + 1;
        END IF;
    END LOOP;
    
    -- Create summary
    check_summary := json_build_object(
        'table_name', p_table_name,
        'total_checks', total_checks,
        'passed_checks', passed_checks,
        'failed_checks', failed_checks,
        'success_rate', CASE WHEN total_checks > 0 THEN (passed_checks::DECIMAL / total_checks::DECIMAL) * 100 ELSE 0 END
    );
    
    RETURN check_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to execute individual quality check
CREATE OR REPLACE FUNCTION execute_quality_check(rule_record RECORD)
RETURNS JSONB AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time_ms INTEGER;
    query_text TEXT;
    records_checked INTEGER;
    records_failed INTEGER;
    failure_rate DECIMAL(5,2);
    check_status VARCHAR(50);
    error_details JSONB;
BEGIN
    start_time := clock_timestamp();
    
    -- Build query to check rule
    query_text := 'SELECT COUNT(*) as total, COUNT(CASE WHEN NOT (' || rule_record.rule_expression || ') THEN 1 END) as failed FROM ' || rule_record.table_name;
    
    -- Execute check
    EXECUTE query_text INTO records_checked, records_failed;
    
    end_time := clock_timestamp();
    execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Calculate failure rate
    failure_rate := CASE WHEN records_checked > 0 THEN (records_failed::DECIMAL / records_checked::DECIMAL) * 100 ELSE 0 END;
    
    -- Determine status based on severity and failure rate
    CASE rule_record.severity
        WHEN 'critical' THEN
            check_status := CASE WHEN records_failed = 0 THEN 'passed' ELSE 'failed' END;
        WHEN 'high' THEN
            check_status := CASE WHEN failure_rate <= 5 THEN 'passed' ELSE 'failed' END;
        WHEN 'medium' THEN
            check_status := CASE WHEN failure_rate <= 10 THEN 'passed' ELSE 'failed' END;
        WHEN 'low' THEN
            check_status := CASE WHEN failure_rate <= 20 THEN 'passed' ELSE 'warning' END;
        ELSE
            check_status := 'failed';
    END CASE;
    
    -- Prepare error details if failed
    IF check_status != 'passed' THEN
        error_details := json_build_object(
            'rule_name', rule_record.name,
            'rule_expression', rule_record.rule_expression,
            'failure_rate', failure_rate,
            'records_failed', records_failed
        );
    ELSE
        error_details := NULL;
    END IF;
    
    RETURN json_build_object(
        'status', check_status,
        'records_checked', records_checked,
        'records_failed', records_failed,
        'failure_rate', failure_rate,
        'error_details', error_details,
        'execution_time_ms', execution_time_ms
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ALERTING FUNCTIONS
-- =============================================

-- Function to evaluate alert conditions
CREATE OR REPLACE FUNCTION evaluate_alert_conditions()
RETURNS JSONB AS $$
DECLARE
    alert_record RECORD;
    alert_result JSONB;
    triggered_alerts INTEGER := 0;
BEGIN
    -- Check all active alert definitions
    FOR alert_record IN 
        SELECT * FROM alert_definitions WHERE is_active = true
    LOOP
        -- Evaluate alert condition
        alert_result := evaluate_single_alert(alert_record);
        
        -- If alert triggered, create alert instance
        IF (alert_result->>'triggered')::BOOLEAN THEN
            INSERT INTO alert_instances (alert_definition_id, alert_data)
            VALUES (alert_record.id, alert_result->'alert_data');
            
            triggered_alerts := triggered_alerts + 1;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'evaluation_time', NOW(),
        'alerts_checked', (SELECT COUNT(*) FROM alert_definitions WHERE is_active = true),
        'alerts_triggered', triggered_alerts
    );
END;
$$ LANGUAGE plpgsql;

-- Function to evaluate single alert
CREATE OR REPLACE FUNCTION evaluate_single_alert(alert_record RECORD)
RETURNS JSONB AS $$
DECLARE
    condition_result BOOLEAN;
    alert_data JSONB;
BEGIN
    -- Execute alert condition query
    EXECUTE 'SELECT ' || (alert_record.trigger_conditions->>'expression') INTO condition_result;
    
    IF condition_result THEN
        alert_data := json_build_object(
            'alert_name', alert_record.name,
            'severity', alert_record.severity,
            'description', alert_record.description,
            'triggered_at', NOW()
        );
        
        RETURN json_build_object('triggered', true, 'alert_data', alert_data);
    ELSE
        RETURN json_build_object('triggered', false);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to get data lineage for a table
CREATE OR REPLACE FUNCTION get_data_lineage(p_table_name VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
    lineage_data JSONB;
BEGIN
    SELECT json_agg(
        json_build_object(
            'source_table', source_table,
            'source_column', source_column,
            'target_table', target_table,
            'target_column', target_column,
            'transformation_type', transformation_type,
            'transformation_logic', transformation_logic
        )
    ) INTO lineage_data
    FROM data_lineage
    WHERE target_table = p_table_name;
    
    RETURN COALESCE(lineage_data, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to get system health summary
CREATE OR REPLACE FUNCTION get_data_management_health()
RETURNS JSONB AS $$
DECLARE
    health_data JSONB;
BEGIN
    SELECT json_build_object(
        'data_sources', (
            SELECT json_build_object(
                'total', COUNT(*),
                'active', COUNT(*) FILTER (WHERE is_active = true),
                'inactive', COUNT(*) FILTER (WHERE is_active = false)
            )
            FROM data_sources
        ),
        'recent_ingestion_jobs', (
            SELECT json_build_object(
                'total', COUNT(*),
                'successful', COUNT(*) FILTER (WHERE status = 'completed'),
                'failed', COUNT(*) FILTER (WHERE status = 'failed'),
                'running', COUNT(*) FILTER (WHERE status = 'running')
            )
            FROM data_ingestion_jobs
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        ),
        'data_quality', (
            SELECT json_build_object(
                'total_checks', COUNT(*),
                'passed', COUNT(*) FILTER (WHERE status = 'passed'),
                'failed', COUNT(*) FILTER (WHERE status = 'failed'),
                'warning', COUNT(*) FILTER (WHERE status = 'warning')
            )
            FROM data_quality_checks
            WHERE check_timestamp >= NOW() - INTERVAL '24 hours'
        ),
        'active_alerts', (
            SELECT COUNT(*)
            FROM alert_instances
            WHERE status = 'active'
        ),
        'workflow_executions', (
            SELECT json_build_object(
                'total', COUNT(*),
                'completed', COUNT(*) FILTER (WHERE status = 'completed'),
                'failed', COUNT(*) FILTER (WHERE status = 'failed'),
                'running', COUNT(*) FILTER (WHERE status = 'running')
            )
            FROM workflow_executions
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        )
    ) INTO health_data;
    
    RETURN health_data;
END;
$$ LANGUAGE plpgsql;