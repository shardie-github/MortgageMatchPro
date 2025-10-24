-- Comprehensive Data Management Schema
-- This migration builds upon the existing schema to add comprehensive data management,
-- parsing, analysis, and workflow capabilities for the mortgage application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =============================================
-- DATA INGESTION AND SOURCE MANAGEMENT
-- =============================================

-- Data sources configuration
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL, -- 'api', 'file', 'database', 'webhook', 'stream'
    connection_config JSONB NOT NULL,
    authentication_config JSONB,
    parsing_rules JSONB,
    validation_rules JSONB,
    refresh_schedule VARCHAR(100), -- cron expression
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    metadata JSONB
);

-- Data ingestion jobs
CREATE TABLE IF NOT EXISTS data_ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    job_type VARCHAR(100) NOT NULL, -- 'full', 'incremental', 'real_time'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_successful INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    execution_log JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Raw data storage
CREATE TABLE IF NOT EXISTS raw_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    job_id UUID REFERENCES data_ingestion_jobs(id) ON DELETE CASCADE,
    data_type VARCHAR(100) NOT NULL,
    raw_data JSONB NOT NULL,
    data_hash VARCHAR(64) NOT NULL, -- for deduplication
    ingestion_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'processed', 'failed'
    validation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'valid', 'invalid', 'warning'
    validation_errors JSONB,
    metadata JSONB
);

-- =============================================
-- DATA PARSING AND TRANSFORMATION
-- =============================================

-- Data parsing templates
CREATE TABLE IF NOT EXISTS data_parsing_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL,
    data_type VARCHAR(100) NOT NULL,
    parsing_schema JSONB NOT NULL, -- JSON schema for validation
    transformation_rules JSONB NOT NULL, -- rules for data transformation
    field_mappings JSONB NOT NULL, -- mapping from source fields to target fields
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Parsed data storage
CREATE TABLE IF NOT EXISTS parsed_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_data_id UUID REFERENCES raw_data(id) ON DELETE CASCADE,
    template_id UUID REFERENCES data_parsing_templates(id),
    parsed_data JSONB NOT NULL,
    parsing_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parsing_errors JSONB,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    metadata JSONB
);

-- Data transformation jobs
CREATE TABLE IF NOT EXISTS data_transformation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_table VARCHAR(255) NOT NULL,
    target_table VARCHAR(255) NOT NULL,
    transformation_sql TEXT NOT NULL,
    schedule VARCHAR(100), -- cron expression
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =============================================
-- DATA ANALYSIS AND INSIGHTS
-- =============================================

-- Analysis models
CREATE TABLE IF NOT EXISTS analysis_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    model_type VARCHAR(100) NOT NULL, -- 'regression', 'classification', 'clustering', 'time_series'
    algorithm VARCHAR(100) NOT NULL,
    model_config JSONB NOT NULL,
    training_data_query TEXT,
    validation_data_query TEXT,
    model_parameters JSONB,
    performance_metrics JSONB,
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Analysis jobs
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES analysis_models(id) ON DELETE CASCADE,
    job_name VARCHAR(255) NOT NULL,
    input_data_query TEXT NOT NULL,
    parameters JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Generated insights
CREATE TABLE IF NOT EXISTS generated_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    insight_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    insight_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    impact_level VARCHAR(50), -- 'low', 'medium', 'high', 'critical'
    actionable BOOLEAN DEFAULT false,
    recommendations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN DEFAULT false,
    user_id UUID REFERENCES users(id)
);

-- =============================================
-- WORKFLOW MANAGEMENT
-- =============================================

-- Workflow definitions
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_type VARCHAR(100) NOT NULL, -- 'data_processing', 'analysis', 'notification', 'integration'
    trigger_conditions JSONB NOT NULL,
    steps JSONB NOT NULL, -- array of workflow steps
    error_handling JSONB,
    retry_policy JSONB,
    timeout_seconds INTEGER DEFAULT 3600,
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Workflow executions
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    trigger_data JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    current_step INTEGER DEFAULT 0,
    step_results JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    execution_log JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Workflow step definitions
CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type VARCHAR(100) NOT NULL, -- 'data_query', 'data_transform', 'analysis', 'notification', 'webhook'
    step_config JSONB NOT NULL,
    dependencies JSONB, -- array of step IDs this step depends on
    timeout_seconds INTEGER DEFAULT 300,
    retry_count INTEGER DEFAULT 0,
    is_optional BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- DATA QUALITY AND MONITORING
-- =============================================

-- Data quality rules
CREATE TABLE IF NOT EXISTS data_quality_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    table_name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255),
    rule_type VARCHAR(100) NOT NULL, -- 'completeness', 'accuracy', 'consistency', 'validity', 'timeliness'
    rule_expression TEXT NOT NULL, -- SQL expression or validation logic
    severity VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Data quality checks
CREATE TABLE IF NOT EXISTS data_quality_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES data_quality_rules(id) ON DELETE CASCADE,
    check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) NOT NULL, -- 'passed', 'failed', 'warning'
    records_checked INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    failure_rate DECIMAL(5,2),
    error_details JSONB,
    execution_time_ms INTEGER
);

-- Data lineage tracking
CREATE TABLE IF NOT EXISTS data_lineage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_table VARCHAR(255) NOT NULL,
    source_column VARCHAR(255),
    target_table VARCHAR(255) NOT NULL,
    target_column VARCHAR(255),
    transformation_type VARCHAR(100), -- 'direct', 'calculated', 'aggregated', 'filtered'
    transformation_logic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =============================================
-- REAL-TIME PROCESSING AND ALERTING
-- =============================================

-- Real-time data streams
CREATE TABLE IF NOT EXISTS data_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    stream_config JSONB NOT NULL,
    processing_rules JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Alert definitions
CREATE TABLE IF NOT EXISTS alert_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    alert_type VARCHAR(100) NOT NULL, -- 'threshold', 'anomaly', 'pattern', 'quality'
    trigger_conditions JSONB NOT NULL,
    severity VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    notification_channels JSONB, -- array of notification methods
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Alert instances
CREATE TABLE IF NOT EXISTS alert_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_definition_id UUID REFERENCES alert_definitions(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'suppressed'
    alert_data JSONB NOT NULL,
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    notification_sent BOOLEAN DEFAULT false
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Data sources indexes
CREATE INDEX IF NOT EXISTS idx_data_sources_type_active ON data_sources(source_type, is_active);
CREATE INDEX IF NOT EXISTS idx_data_sources_priority ON data_sources(priority DESC);

-- Data ingestion indexes
CREATE INDEX IF NOT EXISTS idx_data_ingestion_jobs_source_status ON data_ingestion_jobs(source_id, status);
CREATE INDEX IF NOT EXISTS idx_data_ingestion_jobs_created ON data_ingestion_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_raw_data_source_job ON raw_data(source_id, job_id);
CREATE INDEX IF NOT EXISTS idx_raw_data_hash ON raw_data(data_hash);
CREATE INDEX IF NOT EXISTS idx_raw_data_processing_status ON raw_data(processing_status);

-- Parsed data indexes
CREATE INDEX IF NOT EXISTS idx_parsed_data_raw_data ON parsed_data(raw_data_id);
CREATE INDEX IF NOT EXISTS idx_parsed_data_template ON parsed_data(template_id);
CREATE INDEX IF NOT EXISTS idx_parsed_data_confidence ON parsed_data(confidence_score DESC);

-- Analysis indexes
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_model_status ON analysis_jobs(model_id, status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created ON analysis_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_insights_type ON generated_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_generated_insights_impact ON generated_insights(impact_level);
CREATE INDEX IF NOT EXISTS idx_generated_insights_user ON generated_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_insights_created ON generated_insights(created_at);

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_status ON workflow_executions(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created ON workflow_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_order ON workflow_steps(workflow_id, step_order);

-- Data quality indexes
CREATE INDEX IF NOT EXISTS idx_data_quality_checks_rule_timestamp ON data_quality_checks(rule_id, check_timestamp);
CREATE INDEX IF NOT EXISTS idx_data_quality_checks_status ON data_quality_checks(status);
CREATE INDEX IF NOT EXISTS idx_data_lineage_source ON data_lineage(source_table, source_column);
CREATE INDEX IF NOT EXISTS idx_data_lineage_target ON data_lineage(target_table, target_column);

-- Alert indexes
CREATE INDEX IF NOT EXISTS idx_alert_instances_definition_status ON alert_instances(alert_definition_id, status);
CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered ON alert_instances(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_instances_status ON alert_instances(status);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_parsing_templates_updated_at BEFORE UPDATE ON data_parsing_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analysis_models_updated_at BEFORE UPDATE ON analysis_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON workflow_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_quality_rules_updated_at BEFORE UPDATE ON data_quality_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_definitions_updated_at BEFORE UPDATE ON alert_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_streams_updated_at BEFORE UPDATE ON data_streams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();