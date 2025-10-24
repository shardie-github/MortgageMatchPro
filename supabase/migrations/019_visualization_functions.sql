-- Data Visualization and Reporting Functions
-- This migration adds comprehensive functions for data visualization, reporting, and analytics

-- =============================================
-- DASHBOARD FUNCTIONS
-- =============================================

-- Function to create dashboard
CREATE OR REPLACE FUNCTION create_dashboard(
    p_name VARCHAR(255),
    p_description TEXT,
    p_dashboard_type VARCHAR(100),
    p_layout_config JSONB,
    p_filters JSONB DEFAULT NULL,
    p_is_public BOOLEAN DEFAULT false,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    dashboard_id UUID;
BEGIN
    INSERT INTO dashboards (name, description, dashboard_type, layout_config, filters, is_public, created_by)
    VALUES (p_name, p_description, p_dashboard_type, p_layout_config, p_filters, p_is_public, p_created_by)
    RETURNING id INTO dashboard_id;
    
    RETURN dashboard_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add widget to dashboard
CREATE OR REPLACE FUNCTION add_dashboard_widget(
    p_dashboard_id UUID,
    p_widget_type VARCHAR(100),
    p_title VARCHAR(255),
    p_description TEXT,
    p_position_x INTEGER,
    p_position_y INTEGER,
    p_width INTEGER DEFAULT 4,
    p_height INTEGER DEFAULT 3,
    p_widget_config JSONB,
    p_data_query TEXT DEFAULT NULL,
    p_refresh_interval INTEGER DEFAULT 300
)
RETURNS UUID AS $$
DECLARE
    widget_id UUID;
BEGIN
    INSERT INTO dashboard_widgets (dashboard_id, widget_type, title, description, position_x, position_y, width, height, widget_config, data_query, refresh_interval)
    VALUES (p_dashboard_id, p_widget_type, p_title, p_description, p_position_x, p_position_y, p_width, p_height, p_widget_config, p_data_query, p_refresh_interval)
    RETURNING id INTO widget_id;
    
    RETURN widget_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get dashboard data
CREATE OR REPLACE FUNCTION get_dashboard_data(p_dashboard_id UUID, p_filters JSONB DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    dashboard_record RECORD;
    widget_record RECORD;
    widgets_data JSONB := '[]'::JSONB;
    widget_data JSONB;
    cached_data JSONB;
    current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Get dashboard details
    SELECT * INTO dashboard_record
    FROM dashboards
    WHERE id = p_dashboard_id AND is_active = true;
    
    IF dashboard_record IS NULL THEN
        RETURN json_build_object('error', 'Dashboard not found or not active');
    END IF;
    
    -- Get all active widgets
    FOR widget_record IN 
        SELECT * FROM dashboard_widgets 
        WHERE dashboard_id = p_dashboard_id AND is_active = true
        ORDER BY position_y, position_x
    LOOP
        -- Check for cached data
        SELECT data INTO cached_data
        FROM widget_data_cache
        WHERE widget_id = widget_record.id
        AND expires_at > current_time
        ORDER BY cached_at DESC
        LIMIT 1;
        
        IF cached_data IS NOT NULL THEN
            widget_data := cached_data;
        ELSE
            -- Generate new data
            widget_data := generate_widget_data(widget_record, p_filters);
            
            -- Cache the data
            INSERT INTO widget_data_cache (widget_id, data, expires_at)
            VALUES (widget_record.id, widget_data, current_time + (widget_record.refresh_interval || ' seconds')::INTERVAL);
        END IF;
        
        -- Add widget data to response
        widgets_data := widgets_data || json_build_object(
            'widget_id', widget_record.id,
            'widget_type', widget_record.widget_type,
            'title', widget_record.title,
            'position_x', widget_record.position_x,
            'position_y', widget_record.position_y,
            'width', widget_record.width,
            'height', widget_record.height,
            'data', widget_data
        );
    END LOOP;
    
    RETURN json_build_object(
        'dashboard_id', p_dashboard_id,
        'name', dashboard_record.name,
        'description', dashboard_record.description,
        'dashboard_type', dashboard_record.dashboard_type,
        'layout_config', dashboard_record.layout_config,
        'widgets', widgets_data
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate widget data
CREATE OR REPLACE FUNCTION generate_widget_data(p_widget RECORD, p_filters JSONB)
RETURNS JSONB AS $$
DECLARE
    widget_data JSONB;
    query_result JSONB;
    chart_config JSONB;
    metric_value DECIMAL(15,4);
BEGIN
    CASE p_widget.widget_type
        WHEN 'chart' THEN
            -- Execute data query for chart
            IF p_widget.data_query IS NOT NULL THEN
                EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || p_widget.data_query || ') t' INTO query_result;
            ELSE
                query_result := '[]'::JSONB;
            END IF;
            
            chart_config := p_widget.widget_config;
            widget_data := json_build_object(
                'type', 'chart',
                'chart_type', chart_config->>'chart_type',
                'data', query_result,
                'options', chart_config->'options'
            );
            
        WHEN 'table' THEN
            -- Execute data query for table
            IF p_widget.data_query IS NOT NULL THEN
                EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || p_widget.data_query || ') t' INTO query_result;
            ELSE
                query_result := '[]'::JSONB;
            END IF;
            
            widget_data := json_build_object(
                'type', 'table',
                'columns', p_widget.widget_config->'columns',
                'data', query_result,
                'pagination', p_widget.widget_config->'pagination'
            );
            
        WHEN 'metric' THEN
            -- Execute data query for metric
            IF p_widget.data_query IS NOT NULL THEN
                EXECUTE 'SELECT ' || (p_widget.widget_config->>'value_field') || ' FROM (' || p_widget.data_query || ') t LIMIT 1' INTO metric_value;
            ELSE
                metric_value := 0;
            END IF;
            
            widget_data := json_build_object(
                'type', 'metric',
                'value', metric_value,
                'format', p_widget.widget_config->>'format',
                'trend', p_widget.widget_config->'trend',
                'comparison', p_widget.widget_config->'comparison'
            );
            
        WHEN 'gauge' THEN
            -- Execute data query for gauge
            IF p_widget.data_query IS NOT NULL THEN
                EXECUTE 'SELECT ' || (p_widget.widget_config->>'value_field') || ' FROM (' || p_widget.data_query || ') t LIMIT 1' INTO metric_value;
            ELSE
                metric_value := 0;
            END IF;
            
            widget_data := json_build_object(
                'type', 'gauge',
                'value', metric_value,
                'min', p_widget.widget_config->>'min',
                'max', p_widget.widget_config->>'max',
                'thresholds', p_widget.widget_config->'thresholds'
            );
            
        WHEN 'text' THEN
            widget_data := json_build_object(
                'type', 'text',
                'content', p_widget.widget_config->>'content',
                'format', p_widget.widget_config->>'format'
            );
            
        ELSE
            widget_data := json_build_object('error', 'Unknown widget type: ' || p_widget.widget_type);
    END CASE;
    
    RETURN widget_data;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- REPORTING FUNCTIONS
-- =============================================

-- Function to create report template
CREATE OR REPLACE FUNCTION create_report_template(
    p_name VARCHAR(255),
    p_description TEXT,
    p_template_type VARCHAR(100),
    p_template_config JSONB,
    p_data_query TEXT,
    p_parameters JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    template_id UUID;
BEGIN
    INSERT INTO report_templates (name, description, template_type, template_config, data_query, parameters, created_by)
    VALUES (p_name, p_description, p_template_type, p_template_config, p_data_query, p_parameters, p_created_by)
    RETURNING id INTO template_id;
    
    RETURN template_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate report
CREATE OR REPLACE FUNCTION generate_report(
    p_template_id UUID,
    p_report_name VARCHAR(255),
    p_parameters JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    report_id UUID;
    template_record RECORD;
    report_data JSONB;
    file_path VARCHAR(500);
    file_size BIGINT;
    record_count INTEGER;
BEGIN
    -- Get template details
    SELECT * INTO template_record
    FROM report_templates
    WHERE id = p_template_id AND is_active = true;
    
    IF template_record IS NULL THEN
        RAISE EXCEPTION 'Report template not found or not active';
    END IF;
    
    -- Create report record
    INSERT INTO generated_reports (template_id, report_name, parameters, created_by)
    VALUES (p_template_id, p_report_name, p_parameters, p_created_by)
    RETURNING id INTO report_id;
    
    -- Update status to generating
    UPDATE generated_reports
    SET status = 'generating', started_at = NOW()
    WHERE id = report_id;
    
    -- Execute data query
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || template_record.data_query || ') t' INTO report_data;
    
    -- Get record count
    record_count := json_array_length(report_data);
    
    -- Generate file based on template type
    CASE template_record.template_type
        WHEN 'json' THEN
            file_path := generate_json_report(report_id, report_data, template_record.template_config);
        WHEN 'csv' THEN
            file_path := generate_csv_report(report_id, report_data, template_record.template_config);
        WHEN 'html' THEN
            file_path := generate_html_report(report_id, report_data, template_record.template_config);
        ELSE
            RAISE EXCEPTION 'Unsupported template type: %', template_record.template_type;
    END CASE;
    
    -- Get file size
    SELECT pg_size_pretty(pg_relation_size(file_path::regclass))::BIGINT INTO file_size;
    
    -- Update report status
    UPDATE generated_reports
    SET status = 'completed',
        file_path = file_path,
        file_size = file_size,
        record_count = record_count,
        generated_at = NOW(),
        expires_at = NOW() + INTERVAL '30 days'
    WHERE id = report_id;
    
    RETURN report_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate JSON report
CREATE OR REPLACE FUNCTION generate_json_report(p_report_id UUID, p_data JSONB, p_config JSONB)
RETURNS VARCHAR(500) AS $$
DECLARE
    file_path VARCHAR(500);
    report_content JSONB;
BEGIN
    file_path := '/tmp/report_' || p_report_id || '.json';
    
    report_content := json_build_object(
        'report_id', p_report_id,
        'generated_at', NOW(),
        'data', p_data,
        'metadata', p_config
    );
    
    -- In a real implementation, you would write to file system
    -- For now, we'll just return the path
    RETURN file_path;
END;
$$ LANGUAGE plpgsql;

-- Function to generate CSV report
CREATE OR REPLACE FUNCTION generate_csv_report(p_report_id UUID, p_data JSONB, p_config JSONB)
RETURNS VARCHAR(500) AS $$
DECLARE
    file_path VARCHAR(500);
BEGIN
    file_path := '/tmp/report_' || p_report_id || '.csv';
    
    -- In a real implementation, you would convert JSON to CSV and write to file
    -- For now, we'll just return the path
    RETURN file_path;
END;
$$ LANGUAGE plpgsql;

-- Function to generate HTML report
CREATE OR REPLACE FUNCTION generate_html_report(p_report_id UUID, p_data JSONB, p_config JSONB)
RETURNS VARCHAR(500) AS $$
DECLARE
    file_path VARCHAR(500);
BEGIN
    file_path := '/tmp/report_' || p_report_id || '.html';
    
    -- In a real implementation, you would generate HTML from template and data
    -- For now, we'll just return the path
    RETURN file_path;
END;
$$ LANGUAGE plpgsql;

-- Function to create report subscription
CREATE OR REPLACE FUNCTION create_report_subscription(
    p_template_id UUID,
    p_subscriber_id UUID,
    p_schedule_cron VARCHAR(100),
    p_email_recipients TEXT[],
    p_parameters JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    subscription_id UUID;
    next_send_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate next send time
    next_send_time := calculate_next_run_time(p_schedule_cron);
    
    INSERT INTO report_subscriptions (template_id, subscriber_id, schedule_cron, email_recipients, parameters, next_send, created_by)
    VALUES (p_template_id, p_subscriber_id, p_schedule_cron, p_email_recipients, p_parameters, next_send_time, p_created_by)
    RETURNING id INTO subscription_id;
    
    RETURN subscription_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DATA EXPORT FUNCTIONS
-- =============================================

-- Function to create data export job
CREATE OR REPLACE FUNCTION create_data_export_job(
    p_name VARCHAR(255),
    p_description TEXT,
    p_export_type VARCHAR(100),
    p_data_query TEXT,
    p_filters JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    export_job_id UUID;
BEGIN
    INSERT INTO data_export_jobs (name, description, export_type, data_query, filters, created_by)
    VALUES (p_name, p_description, p_export_type, p_data_query, p_filters, p_created_by)
    RETURNING id INTO export_job_id;
    
    RETURN export_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to execute data export job
CREATE OR REPLACE FUNCTION execute_data_export_job(p_export_job_id UUID)
RETURNS JSONB AS $$
DECLARE
    export_record RECORD;
    export_data JSONB;
    file_path VARCHAR(500);
    file_size BIGINT;
    record_count INTEGER;
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get export job details
    SELECT * INTO export_record
    FROM data_export_jobs
    WHERE id = p_export_job_id;
    
    IF export_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Export job not found');
    END IF;
    
    start_time := NOW();
    
    -- Update status to processing
    UPDATE data_export_jobs
    SET status = 'processing', started_at = start_time
    WHERE id = p_export_job_id;
    
    -- Execute data query
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || export_record.data_query || ') t' INTO export_data;
    
    -- Get record count
    record_count := json_array_length(export_data);
    
    -- Generate export file
    CASE export_record.export_type
        WHEN 'json' THEN
            file_path := generate_json_export(p_export_job_id, export_data);
        WHEN 'csv' THEN
            file_path := generate_csv_export(p_export_job_id, export_data);
        WHEN 'excel' THEN
            file_path := generate_excel_export(p_export_job_id, export_data);
        ELSE
            RAISE EXCEPTION 'Unsupported export type: %', export_record.export_type;
    END CASE;
    
    end_time := NOW();
    
    -- Get file size
    file_size := 1024; -- Placeholder
    
    -- Update export job status
    UPDATE data_export_jobs
    SET status = 'completed',
        file_path = file_path,
        file_size = file_size,
        record_count = record_count,
        completed_at = end_time
    WHERE id = p_export_job_id;
    
    RETURN json_build_object(
        'success', true,
        'export_job_id', p_export_job_id,
        'file_path', file_path,
        'file_size', file_size,
        'record_count', record_count,
        'duration_seconds', EXTRACT(EPOCH FROM (end_time - start_time))
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate JSON export
CREATE OR REPLACE FUNCTION generate_json_export(p_export_job_id UUID, p_data JSONB)
RETURNS VARCHAR(500) AS $$
DECLARE
    file_path VARCHAR(500);
BEGIN
    file_path := '/tmp/export_' || p_export_job_id || '.json';
    
    -- In a real implementation, you would write data to file
    -- For now, we'll just return the path
    RETURN file_path;
END;
$$ LANGUAGE plpgsql;

-- Function to generate CSV export
CREATE OR REPLACE FUNCTION generate_csv_export(p_export_job_id UUID, p_data JSONB)
RETURNS VARCHAR(500) AS $$
DECLARE
    file_path VARCHAR(500);
BEGIN
    file_path := '/tmp/export_' || p_export_job_id || '.csv';
    
    -- In a real implementation, you would convert JSON to CSV and write to file
    -- For now, we'll just return the path
    RETURN file_path;
END;
$$ LANGUAGE plpgsql;

-- Function to generate Excel export
CREATE OR REPLACE FUNCTION generate_excel_export(p_export_job_id UUID, p_data JSONB)
RETURNS VARCHAR(500) AS $$
DECLARE
    file_path VARCHAR(500);
BEGIN
    file_path := '/tmp/export_' || p_export_job_id || '.xlsx';
    
    -- In a real implementation, you would generate Excel file
    -- For now, we'll just return the path
    RETURN file_path;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Function to record user analytics
CREATE OR REPLACE FUNCTION record_user_analytics(
    p_user_id UUID,
    p_metric_name VARCHAR(100),
    p_metric_value DECIMAL(15,4),
    p_metric_date DATE DEFAULT CURRENT_DATE,
    p_dimensions JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_analytics (user_id, metric_name, metric_value, metric_date, dimensions)
    VALUES (p_user_id, p_metric_name, p_metric_value, p_metric_date, p_dimensions)
    ON CONFLICT (user_id, metric_name, metric_date) 
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        dimensions = EXCLUDED.dimensions;
END;
$$ LANGUAGE plpgsql;

-- Function to record system metrics
CREATE OR REPLACE FUNCTION record_system_metrics(
    p_metric_name VARCHAR(100),
    p_metric_value DECIMAL(15,4),
    p_metric_unit VARCHAR(50) DEFAULT NULL,
    p_tags JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO system_metrics (metric_name, metric_value, metric_unit, tags)
    VALUES (p_metric_name, p_metric_value, p_metric_unit, p_tags);
END;
$$ LANGUAGE plpgsql;

-- Function to record performance metrics
CREATE OR REPLACE FUNCTION record_performance_metrics(
    p_component VARCHAR(100),
    p_metric_name VARCHAR(100),
    p_metric_value DECIMAL(15,4),
    p_metric_unit VARCHAR(50) DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO performance_metrics (component, metric_name, metric_value, metric_unit, metadata)
    VALUES (p_component, p_metric_name, p_metric_value, p_metric_unit, p_metadata);
END;
$$ LANGUAGE plpgsql;

-- Function to get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    analytics_summary JSONB;
BEGIN
    SELECT json_build_object(
        'user_analytics', (
            SELECT json_build_object(
                'total_users', COUNT(DISTINCT user_id),
                'total_metrics', COUNT(*),
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
                        WHERE metric_date BETWEEN p_start_date AND p_end_date
                        GROUP BY metric_name
                        ORDER BY metric_count DESC
                        LIMIT 10
                    ) top_metrics
                )
            )
            FROM user_analytics
            WHERE metric_date BETWEEN p_start_date AND p_end_date
        ),
        'system_metrics', (
            SELECT json_build_object(
                'total_metrics', COUNT(*),
                'avg_value', AVG(metric_value),
                'recent_metrics', (
                    SELECT json_agg(
                        json_build_object(
                            'metric_name', metric_name,
                            'value', metric_value,
                            'unit', metric_unit,
                            'recorded_at', recorded_at
                        )
                    )
                    FROM system_metrics
                    WHERE recorded_at >= NOW() - INTERVAL '1 hour'
                    ORDER BY recorded_at DESC
                    LIMIT 20
                )
            )
            FROM system_metrics
            WHERE recorded_at BETWEEN p_start_date AND p_end_date
        ),
        'performance_metrics', (
            SELECT json_build_object(
                'total_metrics', COUNT(*),
                'by_component', (
                    SELECT json_object_agg(component, component_stats)
                    FROM (
                        SELECT 
                            component,
                            json_build_object(
                                'count', COUNT(*),
                                'avg_value', AVG(metric_value),
                                'max_value', MAX(metric_value),
                                'min_value', MIN(metric_value)
                            ) as component_stats
                        FROM performance_metrics
                        WHERE recorded_at BETWEEN p_start_date AND p_end_date
                        GROUP BY component
                    ) component_breakdown
                )
            )
            FROM performance_metrics
            WHERE recorded_at BETWEEN p_start_date AND p_end_date
        )
    ) INTO analytics_summary;
    
    RETURN analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DATA SHARING FUNCTIONS
-- =============================================

-- Function to create data sharing link
CREATE OR REPLACE FUNCTION create_data_sharing_link(
    p_name VARCHAR(255),
    p_description TEXT,
    p_data_query TEXT,
    p_filters JSONB DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_max_access_count INTEGER DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    sharing_link_id UUID;
    access_token VARCHAR(255);
BEGIN
    -- Generate access token
    access_token := encode(gen_random_bytes(32), 'hex');
    
    -- Create sharing link
    INSERT INTO data_sharing_links (name, description, data_query, filters, access_token, expires_at, max_access_count, created_by)
    VALUES (p_name, p_description, p_data_query, p_filters, access_token, p_expires_at, p_max_access_count, p_created_by)
    RETURNING id INTO sharing_link_id;
    
    RETURN json_build_object(
        'sharing_link_id', sharing_link_id,
        'access_token', access_token,
        'expires_at', p_expires_at,
        'max_access_count', p_max_access_count
    );
END;
$$ LANGUAGE plpgsql;

-- Function to access shared data
CREATE OR REPLACE FUNCTION access_shared_data(p_access_token VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
    sharing_record RECORD;
    shared_data JSONB;
BEGIN
    -- Get sharing link details
    SELECT * INTO sharing_record
    FROM data_sharing_links
    WHERE access_token = p_access_token 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_access_count IS NULL OR current_access_count < max_access_count);
    
    IF sharing_record IS NULL THEN
        RETURN json_build_object('error', 'Invalid or expired access token');
    END IF;
    
    -- Execute data query
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sharing_record.data_query || ') t' INTO shared_data;
    
    -- Update access count
    UPDATE data_sharing_links
    SET current_access_count = current_access_count + 1
    WHERE id = sharing_record.id;
    
    RETURN json_build_object(
        'name', sharing_record.name,
        'description', sharing_record.description,
        'data', shared_data,
        'filters', sharing_record.filters
    );
END;
$$ LANGUAGE plpgsql;