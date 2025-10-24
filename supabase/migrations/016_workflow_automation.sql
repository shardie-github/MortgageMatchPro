-- Workflow Automation and Real-time Processing
-- This migration adds advanced workflow automation, scheduling, and real-time processing capabilities

-- =============================================
-- SCHEDULING AND AUTOMATION
-- =============================================

-- Scheduled jobs table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    job_type VARCHAR(100) NOT NULL, -- 'data_ingestion', 'analysis', 'quality_check', 'workflow', 'cleanup'
    target_id UUID, -- ID of the target resource (workflow_id, model_id, etc.)
    schedule_cron VARCHAR(100) NOT NULL, -- cron expression
    parameters JSONB,
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Job execution history
CREATE TABLE IF NOT EXISTS job_execution_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed', 'cancelled'
    execution_log JSONB,
    error_message TEXT,
    duration_seconds INTEGER
);

-- =============================================
-- REAL-TIME DATA PROCESSING
-- =============================================

-- Real-time processing rules
CREATE TABLE IF NOT EXISTS real_time_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_table VARCHAR(255) NOT NULL,
    trigger_event VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    trigger_conditions JSONB, -- conditions that must be met
    action_type VARCHAR(100) NOT NULL, -- 'workflow', 'analysis', 'notification', 'webhook'
    action_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Real-time processing events
CREATE TABLE IF NOT EXISTS real_time_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES real_time_rules(id) ON DELETE CASCADE,
    trigger_table VARCHAR(255) NOT NULL,
    trigger_event VARCHAR(50) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processing_log JSONB,
    error_message TEXT
);

-- =============================================
-- DATA PIPELINE MANAGEMENT
-- =============================================

-- Data pipeline definitions
CREATE TABLE IF NOT EXISTS data_pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    pipeline_type VARCHAR(100) NOT NULL, -- 'etl', 'elt', 'streaming', 'batch'
    stages JSONB NOT NULL, -- array of pipeline stages
    dependencies JSONB, -- pipeline dependencies
    schedule_cron VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Pipeline executions
CREATE TABLE IF NOT EXISTS pipeline_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES data_pipelines(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    current_stage INTEGER DEFAULT 0,
    stage_results JSONB,
    execution_log JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =============================================
-- MACHINE LEARNING PIPELINE
-- =============================================

-- ML pipeline definitions
CREATE TABLE IF NOT EXISTS ml_pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    pipeline_type VARCHAR(100) NOT NULL, -- 'training', 'inference', 'evaluation', 'deployment'
    model_id UUID REFERENCES analysis_models(id),
    stages JSONB NOT NULL, -- array of ML pipeline stages
    hyperparameters JSONB,
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- ML pipeline executions
CREATE TABLE IF NOT EXISTS ml_pipeline_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES ml_pipelines(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    current_stage INTEGER DEFAULT 0,
    stage_results JSONB,
    model_metrics JSONB,
    execution_log JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =============================================
-- INDEXES
-- =============================================

-- Scheduled jobs indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_active ON scheduled_jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run ON scheduled_jobs(next_run);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_type ON scheduled_jobs(job_type);

-- Job execution history indexes
CREATE INDEX IF NOT EXISTS idx_job_execution_history_job ON job_execution_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_execution_history_started ON job_execution_history(started_at);
CREATE INDEX IF NOT EXISTS idx_job_execution_history_status ON job_execution_history(status);

-- Real-time processing indexes
CREATE INDEX IF NOT EXISTS idx_real_time_rules_active ON real_time_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_real_time_rules_trigger ON real_time_rules(trigger_table, trigger_event);
CREATE INDEX IF NOT EXISTS idx_real_time_events_rule ON real_time_events(rule_id);
CREATE INDEX IF NOT EXISTS idx_real_time_events_status ON real_time_events(status);
CREATE INDEX IF NOT EXISTS idx_real_time_events_processed ON real_time_events(processed_at);

-- Pipeline indexes
CREATE INDEX IF NOT EXISTS idx_data_pipelines_active ON data_pipelines(is_active);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_pipeline ON pipeline_executions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX IF NOT EXISTS idx_ml_pipelines_active ON ml_pipelines(is_active);
CREATE INDEX IF NOT EXISTS idx_ml_pipeline_executions_pipeline ON ml_pipeline_executions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_ml_pipeline_executions_status ON ml_pipeline_executions(status);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_scheduled_jobs_updated_at BEFORE UPDATE ON scheduled_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_real_time_rules_updated_at BEFORE UPDATE ON real_time_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_pipelines_updated_at BEFORE UPDATE ON data_pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ml_pipelines_updated_at BEFORE UPDATE ON ml_pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();