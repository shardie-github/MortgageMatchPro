-- Predictive Insights Schema Migration
-- This migration adds tables for storing predictive analytics data

-- Create market_data table for storing historical market data
CREATE TABLE market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_type TEXT NOT NULL CHECK (data_type IN ('mortgage_rates', 'property_values', 'income_trends', 'market_indices')),
    region TEXT NOT NULL,
    date DATE NOT NULL,
    value DECIMAL(12,4) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(data_type, region, date)
);

-- Create forecasts table for storing model predictions
CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_type TEXT NOT NULL CHECK (model_type IN ('rate_forecast', 'property_appreciation', 'refinance_probability', 'income_growth')),
    target_date DATE NOT NULL,
    predicted_value DECIMAL(12,4) NOT NULL,
    confidence_interval_lower DECIMAL(12,4),
    confidence_interval_upper DECIMAL(12,4),
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    model_version TEXT NOT NULL,
    input_data JSONB NOT NULL,
    region TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create refinance_watchlist table for tracking refinance opportunities
CREATE TABLE refinance_watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_rate DECIMAL(5,3) NOT NULL,
    current_balance DECIMAL(12,2) NOT NULL,
    property_value DECIMAL(12,2) NOT NULL,
    refinance_probability DECIMAL(3,2) NOT NULL CHECK (refinance_probability >= 0 AND refinance_probability <= 1),
    potential_savings DECIMAL(12,2),
    priority_score INTEGER NOT NULL CHECK (priority_score >= 0 AND priority_score <= 100),
    last_contacted TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'contacted', 'converted', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scenario_simulations table for Monte Carlo simulations
CREATE TABLE scenario_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    simulation_type TEXT NOT NULL CHECK (simulation_type IN ('stress_test', 'rate_shock', 'income_variance', 'property_decline')),
    base_scenario_id UUID,
    iterations INTEGER NOT NULL DEFAULT 1000,
    results JSONB NOT NULL,
    summary_stats JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create model_explanations table for SHAP/LIME explanations
CREATE TABLE model_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    forecast_id UUID REFERENCES forecasts(id) ON DELETE CASCADE,
    explanation_type TEXT NOT NULL CHECK (explanation_type IN ('shap', 'lime', 'feature_importance')),
    feature_contributions JSONB NOT NULL,
    global_importance JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prediction_alerts table for notifications
CREATE TABLE prediction_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('rate_drop', 'refinance_opportunity', 'property_appreciation', 'risk_warning')),
    threshold_value DECIMAL(12,4),
    current_value DECIMAL(12,4),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create model_metrics table for tracking model performance
CREATE TABLE model_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_type TEXT NOT NULL,
    model_version TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(12,6) NOT NULL,
    evaluation_date DATE NOT NULL,
    test_data_period TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_market_data_type_date ON market_data(data_type, date);
CREATE INDEX idx_market_data_region ON market_data(region);
CREATE INDEX idx_forecasts_model_type ON forecasts(model_type);
CREATE INDEX idx_forecasts_target_date ON forecasts(target_date);
CREATE INDEX idx_forecasts_user_id ON forecasts(user_id);
CREATE INDEX idx_refinance_watchlist_user_id ON refinance_watchlist(user_id);
CREATE INDEX idx_refinance_watchlist_priority ON refinance_watchlist(priority_score DESC);
CREATE INDEX idx_scenario_simulations_user_id ON scenario_simulations(user_id);
CREATE INDEX idx_model_explanations_forecast_id ON model_explanations(forecast_id);
CREATE INDEX idx_prediction_alerts_user_id ON prediction_alerts(user_id);
CREATE INDEX idx_prediction_alerts_is_read ON prediction_alerts(is_read);
CREATE INDEX idx_model_metrics_model_type ON model_metrics(model_type);

-- Add updated_at triggers
CREATE TRIGGER update_refinance_watchlist_updated_at BEFORE UPDATE ON refinance_watchlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refinance_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Market data is publicly readable" ON market_data
    FOR SELECT USING (true);

CREATE POLICY "Users can view own forecasts" ON forecasts
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own refinance watchlist" ON refinance_watchlist
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own refinance watchlist" ON refinance_watchlist
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own scenario simulations" ON scenario_simulations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own model explanations" ON model_explanations
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM forecasts WHERE id = forecast_id));

CREATE POLICY "Users can view own prediction alerts" ON prediction_alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own prediction alerts" ON prediction_alerts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Model metrics are publicly readable" ON model_metrics
    FOR SELECT USING (true);

-- Insert sample market data
INSERT INTO market_data (data_type, region, date, value, metadata) VALUES
('mortgage_rates', 'CA', '2024-01-01', 5.45, '{"source": "Bank of Canada", "rate_type": "5_year_fixed"}'),
('mortgage_rates', 'CA', '2024-01-02', 5.47, '{"source": "Bank of Canada", "rate_type": "5_year_fixed"}'),
('mortgage_rates', 'CA', '2024-01-03', 5.43, '{"source": "Bank of Canada", "rate_type": "5_year_fixed"}'),
('property_values', 'Toronto', '2024-01-01', 1050000, '{"source": "CREA", "property_type": "single_family"}'),
('property_values', 'Toronto', '2024-01-02', 1052000, '{"source": "CREA", "property_type": "single_family"}'),
('property_values', 'Toronto', '2024-01-03', 1055000, '{"source": "CREA", "property_type": "single_family"}'),
('income_trends', 'CA', '2024-01-01', 75000, '{"source": "Statistics Canada", "metric": "median_household_income"}'),
('market_indices', 'CA', '2024-01-01', 21000, '{"source": "TSX", "index": "S&P_TSX_Composite"}');