-- Data Visualization and Reporting System
-- This migration adds comprehensive data visualization, reporting, and dashboard capabilities

-- =============================================
-- DASHBOARD AND VISUALIZATION
-- =============================================

-- Dashboard definitions
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dashboard_type VARCHAR(100) NOT NULL, -- 'user', 'broker', 'admin', 'system'
    layout_config JSONB NOT NULL, -- dashboard layout configuration
    filters JSONB, -- default filters
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Dashboard widgets
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
    widget_type VARCHAR(100) NOT NULL, -- 'chart', 'table', 'metric', 'gauge', 'map', 'text'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    width INTEGER NOT NULL DEFAULT 4,
    height INTEGER NOT NULL DEFAULT 3,
    widget_config JSONB NOT NULL, -- widget-specific configuration
    data_query TEXT, -- SQL query for data
    refresh_interval INTEGER DEFAULT 300, -- seconds
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Widget data cache
CREATE TABLE IF NOT EXISTS widget_data_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    widget_id UUID REFERENCES dashboard_widgets(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- =============================================
-- REPORTING SYSTEM
-- =============================================

-- Report templates
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(100) NOT NULL, -- 'pdf', 'excel', 'csv', 'html', 'json'
    template_config JSONB NOT NULL, -- template configuration
    data_query TEXT NOT NULL, -- SQL query for report data
    parameters JSONB, -- report parameters
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Generated reports
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    report_name VARCHAR(255) NOT NULL,
    parameters JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
    file_path VARCHAR(500),
    file_size BIGINT,
    generated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Report subscriptions
CREATE TABLE IF NOT EXISTS report_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    subscriber_id UUID REFERENCES users(id) ON DELETE CASCADE,
    schedule_cron VARCHAR(100) NOT NULL, -- cron expression
    email_recipients TEXT[], -- email addresses
    parameters JSONB,
    is_active BOOLEAN DEFAULT true,
    last_sent TIMESTAMP WITH TIME ZONE,
    next_send TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =============================================
-- DATA EXPORT AND SHARING
-- =============================================

-- Data export jobs
CREATE TABLE IF NOT EXISTS data_export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    export_type VARCHAR(100) NOT NULL, -- 'csv', 'excel', 'json', 'xml', 'sql'
    data_query TEXT NOT NULL,
    filters JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    file_path VARCHAR(500),
    file_size BIGINT,
    record_count INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Data sharing links
CREATE TABLE IF NOT EXISTS data_sharing_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_query TEXT NOT NULL,
    filters JSONB,
    access_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_access_count INTEGER,
    current_access_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =============================================
-- ANALYTICS AND METRICS
-- =============================================

-- User analytics
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_date DATE NOT NULL,
    dimensions JSONB, -- additional dimensions for the metric
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System metrics
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags JSONB -- additional tags for the metric
);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component VARCHAR(100) NOT NULL, -- 'api', 'database', 'frontend', 'workflow'
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- =============================================
-- INDEXES
-- =============================================

-- Dashboard indexes
CREATE INDEX IF NOT EXISTS idx_dashboards_type_active ON dashboards(dashboard_type, is_active);
CREATE INDEX IF NOT EXISTS idx_dashboards_created_by ON dashboards(created_by);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(widget_type);
CREATE INDEX IF NOT EXISTS idx_widget_data_cache_widget ON widget_data_cache(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_data_cache_expires ON widget_data_cache(expires_at);

-- Report indexes
CREATE INDEX IF NOT EXISTS idx_report_templates_type_active ON report_templates(template_type, is_active);
CREATE INDEX IF NOT EXISTS idx_generated_reports_template ON generated_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_status ON generated_reports(status);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created ON generated_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_template ON report_subscriptions(template_id);
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_subscriber ON report_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_next_send ON report_subscriptions(next_send);

-- Export indexes
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_status ON data_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_created_by ON data_export_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_data_sharing_links_token ON data_sharing_links(access_token);
CREATE INDEX IF NOT EXISTS idx_data_sharing_links_active ON data_sharing_links(is_active);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_metric ON user_analytics(user_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_user_analytics_date ON user_analytics(metric_date);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_recorded ON system_metrics(metric_name, recorded_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_component ON performance_metrics(component, metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded ON performance_metrics(recorded_at);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboard_widgets_updated_at BEFORE UPDATE ON dashboard_widgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();