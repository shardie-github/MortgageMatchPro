-- Multi-tenant core schema migration
-- This migration adds organization, membership, and tenant isolation tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE organization_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');
CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'ANALYST', 'VIEWER');
CREATE TYPE plan_type AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE membership_status AS ENUM ('active', 'pending', 'suspended');
CREATE TYPE webhook_status AS ENUM ('pending', 'delivered', 'failed', 'retrying');

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status organization_status DEFAULT 'trial',
    plan plan_type DEFAULT 'free',
    limits JSONB NOT NULL DEFAULT '{
        "maxUsers": 5,
        "maxAiCallsPerDay": 100,
        "maxSavedScenarios": 10,
        "maxIntegrations": 2,
        "maxWebhooks": 5,
        "maxApiKeys": 3
    }',
    branding JSONB DEFAULT '{
        "primaryColor": "#3B82F6",
        "secondaryColor": "#1E40AF",
        "accentColor": "#F59E0B",
        "fontFamily": "Inter"
    }',
    settings JSONB DEFAULT '{
        "timezone": "UTC",
        "currency": "CAD",
        "locale": "en-CA",
        "features": {},
        "apiKeyRotationDays": 90,
        "requireMfa": false,
        "allowApiAccess": true
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memberships table (user ↔ organization relationship)
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    status membership_status DEFAULT 'active',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status webhook_status DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage snapshots table (daily rollups)
CREATE TABLE IF NOT EXISTS usage_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    ai_calls INTEGER DEFAULT 0,
    ai_tokens INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    webhook_deliveries INTEGER DEFAULT 0,
    exports INTEGER DEFAULT 0,
    storage_used BIGINT DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, date)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id UUID,
    result TEXT NOT NULL CHECK (result IN ('success', 'failure')),
    ip INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type plan_type NOT NULL,
    limits JSONB NOT NULL,
    pricing JSONB NOT NULL,
    features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add organization_id to existing tables for tenant isolation
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_organization_id UUID REFERENCES organizations(id);
ALTER TABLE mortgage_calculations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE rate_checks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE billing_history ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON memberships(role);
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_webhook_events_organization_id ON webhook_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_organization_id ON usage_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_date ON usage_snapshots(date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create RLS policies for tenant isolation
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizations
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Owners can update their organization" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND role = 'OWNER' AND status = 'active'
        )
    );

-- RLS policies for memberships
CREATE POLICY "Users can view memberships in their organizations" ON memberships
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Owners and admins can manage memberships" ON memberships
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN') AND status = 'active'
        )
    );

-- RLS policies for API keys
CREATE POLICY "Users can view API keys in their organizations" ON api_keys
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Admins can manage API keys" ON api_keys
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN') AND status = 'active'
        )
    );

-- RLS policies for webhook events
CREATE POLICY "Users can view webhook events in their organizations" ON webhook_events
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- RLS policies for usage snapshots
CREATE POLICY "Users can view usage snapshots in their organizations" ON usage_snapshots
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- RLS policies for audit logs
CREATE POLICY "Users can view audit logs in their organizations" ON audit_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Create functions for tenant context
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE(organization_id UUID, role user_role) AS $$
BEGIN
    RETURN QUERY
    SELECT m.organization_id, m.role
    FROM memberships m
    WHERE m.user_id = user_uuid AND m.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_primary_organization(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT u.primary_organization_id INTO org_id
    FROM users u
    WHERE u.id = user_uuid;
    
    -- If no primary org, get the first active membership
    IF org_id IS NULL THEN
        SELECT m.organization_id INTO org_id
        FROM memberships m
        WHERE m.user_id = user_uuid AND m.status = 'active'
        ORDER BY m.created_at ASC
        LIMIT 1;
    END IF;
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at
    BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default plans
INSERT INTO plans (name, type, limits, pricing, features) VALUES
('Free', 'free', '{
    "maxUsers": 5,
    "maxAiCallsPerDay": 100,
    "maxSavedScenarios": 10,
    "maxIntegrations": 2,
    "maxWebhooks": 5,
    "maxApiKeys": 3
}', '{
    "monthly": 0,
    "yearly": 0
}', '{
    "basic_ai_insights",
    "rate_comparison",
    "affordability_calculator"
}'),
('Pro', 'pro', '{
    "maxUsers": 25,
    "maxAiCallsPerDay": 1000,
    "maxSavedScenarios": 100,
    "maxIntegrations": 10,
    "maxWebhooks": 20,
    "maxApiKeys": 10
}', '{
    "monthly": 99,
    "yearly": 990,
    "perAiCall": 0.01
}', '{
    "advanced_ai_insights",
    "white_label_branding",
    "api_access",
    "webhook_integrations",
    "priority_support"
}'),
('Enterprise', 'enterprise', '{
    "maxUsers": -1,
    "maxAiCallsPerDay": -1,
    "maxSavedScenarios": -1,
    "maxIntegrations": -1,
    "maxWebhooks": -1,
    "maxApiKeys": -1
}', '{
    "monthly": 499,
    "yearly": 4990,
    "perAiCall": 0.005
}', '{
    "unlimited_ai_insights",
    "full_white_label",
    "custom_integrations",
    "dedicated_support",
    "sla_guarantee",
    "custom_domains"
}');

-- Create example organizations for demo
INSERT INTO organizations (name, slug, status, plan, limits) VALUES
('DemoBroker', 'demo-broker', 'active', 'pro', '{
    "maxUsers": 25,
    "maxAiCallsPerDay": 1000,
    "maxSavedScenarios": 100,
    "maxIntegrations": 10,
    "maxWebhooks": 20,
    "maxApiKeys": 10
}'),
('PremierLender', 'premier-lender', 'active', 'enterprise', '{
    "maxUsers": -1,
    "maxAiCallsPerDay": -1,
    "maxSavedScenarios": -1,
    "maxIntegrations": -1,
    "maxWebhooks": -1,
    "maxApiKeys": -1
}'),
('Sandbox', 'sandbox', 'trial', 'free', '{
    "maxUsers": 5,
    "maxAiCallsPerDay": 100,
    "maxSavedScenarios": 10,
    "maxIntegrations": 2,
    "maxWebhooks": 5,
    "maxApiKeys": 3
}');