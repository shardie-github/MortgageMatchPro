-- AI Onboarding and Personalization Schema
-- This migration adds tables for AI-driven onboarding, user segmentation, and personalization

-- User onboarding flow tracking
CREATE TABLE user_onboarding_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    flow_type TEXT NOT NULL CHECK (flow_type IN ('first_time_homebuyer', 'broker', 'refinance', 'investment', 'custom')),
    current_step INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL,
    completed_steps JSONB DEFAULT '[]'::jsonb,
    user_goals JSONB DEFAULT '{}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    drop_off_points JSONB DEFAULT '[]'::jsonb,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User segments for personalization
CREATE TABLE user_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    segment_type TEXT NOT NULL CHECK (segment_type IN ('homebuyer', 'broker', 'investor', 'refinance', 'first_time', 'repeat', 'high_value', 'at_risk')),
    confidence_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI agent interactions and learning
CREATE TABLE ai_agent_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL CHECK (agent_type IN ('welcome_flow', 'retainbot', 'personalization', 'recommendation')),
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('onboarding_step', 'nudge', 'recommendation', 'tooltip', 'q_and_a', 'retention_campaign')),
    content JSONB NOT NULL,
    user_response JSONB,
    effectiveness_score DECIMAL(5,2),
    learning_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User engagement tracking
CREATE TABLE user_engagement_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('page_view', 'feature_usage', 'time_spent', 'conversion', 'churn_risk', 'retention_score')),
    metric_value DECIMAL(10,2) NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personalized content and recommendations
CREATE TABLE personalized_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('tooltip', 'walkthrough', 'recommendation', 'notification', 'tutorial', 'help_text')),
    content_key TEXT NOT NULL,
    content_data JSONB NOT NULL,
    personalization_factors JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User consent and privacy preferences
CREATE TABLE user_consent_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('analytics', 'personalization', 'marketing', 'data_sharing', 'ai_learning')),
    granted BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Retention campaigns and automation
CREATE TABLE retention_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('welcome_series', 're_engagement', 'renewal_reminder', 'feature_adoption', 'churn_prevention')),
    trigger_condition JSONB NOT NULL,
    target_segment TEXT,
    content_template JSONB NOT NULL,
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('in_app', 'email', 'sms', 'push')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign executions
CREATE TABLE campaign_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES retention_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'sent', 'delivered', 'opened', 'clicked', 'converted', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    converted_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partner integrations
CREATE TABLE partner_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_name TEXT NOT NULL,
    integration_type TEXT NOT NULL CHECK (integration_type IN ('mls', 'crm', 'email_provider', 'sms_provider', 'analytics')),
    api_endpoint TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    configuration JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MLS property data cache
CREATE TABLE mls_property_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mls_id TEXT NOT NULL,
    property_data JSONB NOT NULL,
    location_data JSONB NOT NULL,
    price_range JSONB NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- CRM webhook logs
CREATE TABLE crm_webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
);

-- Create indexes for performance
CREATE INDEX idx_user_onboarding_flows_user_id ON user_onboarding_flows(user_id);
CREATE INDEX idx_user_onboarding_flows_flow_type ON user_onboarding_flows(flow_type);
CREATE INDEX idx_user_segments_user_id ON user_segments(user_id);
CREATE INDEX idx_user_segments_segment_type ON user_segments(segment_type);
CREATE INDEX idx_ai_agent_interactions_user_id ON ai_agent_interactions(user_id);
CREATE INDEX idx_ai_agent_interactions_agent_type ON ai_agent_interactions(agent_type);
CREATE INDEX idx_user_engagement_metrics_user_id ON user_engagement_metrics(user_id);
CREATE INDEX idx_user_engagement_metrics_metric_type ON user_engagement_metrics(metric_type);
CREATE INDEX idx_personalized_content_user_id ON personalized_content(user_id);
CREATE INDEX idx_personalized_content_content_type ON personalized_content(content_type);
CREATE INDEX idx_user_consent_preferences_user_id ON user_consent_preferences(user_id);
CREATE INDEX idx_campaign_executions_user_id ON campaign_executions(user_id);
CREATE INDEX idx_campaign_executions_campaign_id ON campaign_executions(campaign_id);
CREATE INDEX idx_mls_property_cache_location ON mls_property_cache USING GIN(location_data);
CREATE INDEX idx_mls_property_cache_price_range ON mls_property_cache USING GIN(price_range);

-- Add updated_at triggers
CREATE TRIGGER update_user_onboarding_flows_updated_at BEFORE UPDATE ON user_onboarding_flows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_segments_updated_at BEFORE UPDATE ON user_segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personalized_content_updated_at BEFORE UPDATE ON personalized_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_consent_preferences_updated_at BEFORE UPDATE ON user_consent_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retention_campaigns_updated_at BEFORE UPDATE ON retention_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_integrations_updated_at BEFORE UPDATE ON partner_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_onboarding_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalized_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consent_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own onboarding flows" ON user_onboarding_flows
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding flows" ON user_onboarding_flows
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding flows" ON user_onboarding_flows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own segments" ON user_segments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own agent interactions" ON ai_agent_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agent interactions" ON ai_agent_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own engagement metrics" ON user_engagement_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own engagement metrics" ON user_engagement_metrics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own personalized content" ON personalized_content
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own consent preferences" ON user_consent_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own consent preferences" ON user_consent_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent preferences" ON user_consent_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own campaign executions" ON campaign_executions
    FOR SELECT USING (auth.uid() = user_id);