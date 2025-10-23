-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'broker')),
    stripe_customer_id TEXT
);

-- Create mortgage_calculations table
CREATE TABLE mortgage_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    country TEXT NOT NULL CHECK (country IN ('CA', 'US')),
    income DECIMAL(12,2) NOT NULL,
    debts DECIMAL(12,2) NOT NULL,
    down_payment DECIMAL(12,2) NOT NULL,
    property_price DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,3) NOT NULL,
    term_years INTEGER NOT NULL,
    gds_ratio DECIMAL(5,2) NOT NULL,
    tds_ratio DECIMAL(5,2) NOT NULL,
    dti_ratio DECIMAL(5,2) NOT NULL,
    max_affordable DECIMAL(12,2) NOT NULL,
    monthly_payment DECIMAL(12,2) NOT NULL,
    qualifying_rate DECIMAL(5,3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rate_checks table
CREATE TABLE rate_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    country TEXT NOT NULL CHECK (country IN ('CA', 'US')),
    term_years INTEGER NOT NULL,
    rate_type TEXT NOT NULL CHECK (rate_type IN ('fixed', 'variable')),
    rates JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create brokers table
CREATE TABLE brokers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT NOT NULL,
    license_number TEXT NOT NULL,
    provinces_states TEXT[] NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    lead_data JSONB NOT NULL,
    lead_score INTEGER NOT NULL CHECK (lead_score >= 0 AND lead_score <= 100),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'rejected')),
    broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_mortgage_calculations_user_id ON mortgage_calculations(user_id);
CREATE INDEX idx_mortgage_calculations_created_at ON mortgage_calculations(created_at);
CREATE INDEX idx_rate_checks_user_id ON rate_checks(user_id);
CREATE INDEX idx_rate_checks_expires_at ON rate_checks(expires_at);
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_broker_id ON leads(broker_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_brokers_is_active ON brokers(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brokers_updated_at BEFORE UPDATE ON brokers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample brokers
INSERT INTO brokers (name, email, phone, company, license_number, provinces_states, commission_rate) VALUES
('John Smith', 'john@mortgagepro.ca', '+14161234567', 'Royal Bank Mortgage', 'M123456', ARRAY['ON', 'BC', 'AB'], 0.75),
('Sarah Johnson', 'sarah@mortgagepro.ca', '+14161234568', 'TD Mortgage', 'M123457', ARRAY['ON', 'QC', 'MB'], 0.80),
('Mike Chen', 'mike@mortgagepro.ca', '+14161234569', 'Scotia Mortgage', 'M123458', ARRAY['BC', 'AB', 'SK'], 0.70),
('Lisa Brown', 'lisa@mortgagepro.ca', '+14161234570', 'BMO Mortgage', 'M123459', ARRAY['ON', 'QC', 'NS'], 0.85),
('David Wilson', 'david@mortgagepro.ca', '+14161234571', 'CIBC Mortgage', 'M123460', ARRAY['AB', 'BC', 'ON'], 0.75);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortgage_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own calculations" ON mortgage_calculations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calculations" ON mortgage_calculations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own rate checks" ON rate_checks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate checks" ON rate_checks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own leads" ON leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brokers are publicly readable" ON brokers
    FOR SELECT USING (is_active = true);