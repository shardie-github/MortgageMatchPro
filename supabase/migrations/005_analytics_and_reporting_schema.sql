-- Analytics and Reporting Schema
-- This migration adds tables for analytics tracking, user dashboards, and reporting

-- Analytics events table for tracking user interactions
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_name VARCHAR(100) NOT NULL,
  event_properties JSONB,
  session_id VARCHAR(100),
  page_url TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- User scenarios table for saving calculations
CREATE TABLE IF NOT EXISTS user_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scenario_name VARCHAR(200) NOT NULL,
  scenario_type VARCHAR(50) NOT NULL, -- 'affordability', 'rate_comparison', 'amortization'
  scenario_data JSONB NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_scenarios_user_id ON user_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scenarios_type ON user_scenarios(scenario_type);
CREATE INDEX IF NOT EXISTS idx_user_scenarios_created_at ON user_scenarios(created_at);

-- User dashboard preferences
CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  dashboard_layout JSONB,
  widget_preferences JSONB,
  notification_settings JSONB,
  privacy_settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Broker performance metrics
CREATE TABLE IF NOT EXISTS broker_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  leads_received INTEGER DEFAULT 0,
  leads_contacted INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  total_commission DECIMAL(10,2) DEFAULT 0,
  avg_response_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(broker_id, metric_date)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_broker_metrics_broker_id ON broker_metrics(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_metrics_date ON broker_metrics(metric_date);

-- System health metrics
CREATE TABLE IF NOT EXISTS system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,4) NOT NULL,
  metric_unit VARCHAR(20) NOT NULL,
  tags JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_health_metric_name ON system_health_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_health_recorded_at ON system_health_metrics(recorded_at);

-- Report templates
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(200) NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'user_summary', 'broker_performance', 'system_health'
  template_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  report_name VARCHAR(200) NOT NULL,
  report_data JSONB NOT NULL,
  file_path TEXT,
  file_size_bytes INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_generated_reports_user_id ON generated_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON generated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON generated_reports(created_at);

-- User engagement metrics
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  calculations_performed INTEGER DEFAULT 0,
  rate_checks_requested INTEGER DEFAULT 0,
  scenarios_saved INTEGER DEFAULT 0,
  leads_submitted INTEGER DEFAULT 0,
  dashboard_views INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, metric_date)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON user_engagement_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_date ON user_engagement_metrics(metric_date);

-- Privacy consent tracking
CREATE TABLE IF NOT EXISTS privacy_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL, -- 'analytics', 'marketing', 'data_processing'
  consent_given BOOLEAN NOT NULL,
  consent_method VARCHAR(50) NOT NULL, -- 'explicit', 'implied', 'opt_in', 'opt_out'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_privacy_consent_user_id ON privacy_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_consent_type ON privacy_consent(consent_type);

-- Add RLS policies for analytics events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for user scenarios
ALTER TABLE user_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scenarios" ON user_scenarios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scenarios" ON user_scenarios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios" ON user_scenarios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios" ON user_scenarios
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for user dashboard preferences
ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dashboard preferences" ON user_dashboard_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard preferences" ON user_dashboard_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard preferences" ON user_dashboard_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Add RLS policies for generated reports
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports" ON generated_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports" ON generated_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for user engagement metrics
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own engagement metrics" ON user_engagement_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Add RLS policies for privacy consent
ALTER TABLE privacy_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own privacy consent" ON privacy_consent
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy consent" ON privacy_consent
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy consent" ON privacy_consent
  FOR UPDATE USING (auth.uid() = user_id);

-- Create functions for analytics
CREATE OR REPLACE FUNCTION get_user_engagement_summary(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_calculations BIGINT,
  total_rate_checks BIGINT,
  total_scenarios_saved BIGINT,
  total_leads_submitted BIGINT,
  total_dashboard_views BIGINT,
  avg_time_spent_minutes NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(uem.calculations_performed), 0) as total_calculations,
    COALESCE(SUM(uem.rate_checks_requested), 0) as total_rate_checks,
    COALESCE(SUM(uem.scenarios_saved), 0) as total_scenarios_saved,
    COALESCE(SUM(uem.leads_submitted), 0) as total_leads_submitted,
    COALESCE(SUM(uem.dashboard_views), 0) as total_dashboard_views,
    COALESCE(AVG(uem.time_spent_minutes), 0) as avg_time_spent_minutes
  FROM user_engagement_metrics uem
  WHERE uem.user_id = p_user_id
    AND uem.metric_date >= CURRENT_DATE - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for broker performance summary
CREATE OR REPLACE FUNCTION get_broker_performance_summary(p_broker_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_leads_received BIGINT,
  total_leads_contacted BIGINT,
  total_leads_converted BIGINT,
  avg_conversion_rate NUMERIC,
  total_commission NUMERIC,
  avg_response_time_minutes NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(bm.leads_received), 0) as total_leads_received,
    COALESCE(SUM(bm.leads_contacted), 0) as total_leads_contacted,
    COALESCE(SUM(bm.leads_converted), 0) as total_leads_converted,
    COALESCE(AVG(bm.conversion_rate), 0) as avg_conversion_rate,
    COALESCE(SUM(bm.total_commission), 0) as total_commission,
    COALESCE(AVG(bm.avg_response_time_minutes), 0) as avg_response_time_minutes
  FROM broker_metrics bm
  WHERE bm.broker_id = p_broker_id
    AND bm.metric_date >= CURRENT_DATE - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get system health summary
CREATE OR REPLACE FUNCTION get_system_health_summary(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  metric_name VARCHAR(100),
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  latest_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    shm.metric_name,
    AVG(shm.metric_value) as avg_value,
    MIN(shm.metric_value) as min_value,
    MAX(shm.metric_value) as max_value,
    (SELECT shm2.metric_value 
     FROM system_health_metrics shm2 
     WHERE shm2.metric_name = shm.metric_name 
     ORDER BY shm2.recorded_at DESC 
     LIMIT 1) as latest_value
  FROM system_health_metrics shm
  WHERE shm.recorded_at >= NOW() - INTERVAL '1 hour' * p_hours
  GROUP BY shm.metric_name
  ORDER BY shm.metric_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
