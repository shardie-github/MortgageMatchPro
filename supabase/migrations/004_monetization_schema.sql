-- Monetization Infrastructure Schema
-- This migration adds tables for subscriptions, billing, entitlements, and payment tracking

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')),
  tier TEXT NOT NULL CHECK (tier IN ('premium', 'broker')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create billing_history table for payment tracking
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL CHECK (currency IN ('cad', 'usd')),
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'canceled', 'requires_action')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('rate_check', 'subscription', 'broker_license', 'renewal')),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create user_entitlements table for feature access tracking
CREATE TABLE IF NOT EXISTS user_entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('rate_checks', 'scenario_saving', 'lead_generation', 'report_export', 'broker_white_label', 'unlimited_calculations')),
  entitlement_type TEXT NOT NULL CHECK (entitlement_type IN ('subscription', 'one_time', 'trial', 'broker_license')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  usage_count INTEGER NOT NULL DEFAULT 0,
  usage_limit INTEGER, -- NULL means unlimited
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rate_check_tokens table for pay-per-use tracking
CREATE TABLE IF NOT EXISTS rate_check_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_history_id UUID NOT NULL REFERENCES billing_history(id) ON DELETE CASCADE,
  token_count INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create broker_licenses table for B2B licensing
CREATE TABLE IF NOT EXISTS broker_licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  provinces_states TEXT[] NOT NULL,
  white_label_domain TEXT,
  custom_branding JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_methods table for storing customer payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank_account')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  last_four TEXT,
  brand TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create refunds table for tracking refunds
CREATE TABLE IF NOT EXISTS refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  billing_history_id UUID NOT NULL REFERENCES billing_history(id) ON DELETE CASCADE,
  stripe_refund_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'other')),
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'canceled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);

CREATE INDEX IF NOT EXISTS idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id ON billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_payment_intent ON billing_history(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_payment_type ON billing_history(payment_type);
CREATE INDEX IF NOT EXISTS idx_billing_history_created_at ON billing_history(created_at);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_feature ON user_entitlements(feature);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_active ON user_entitlements(is_active);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_expires_at ON user_entitlements(expires_at);

CREATE INDEX IF NOT EXISTS idx_rate_check_tokens_user_id ON rate_check_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_check_tokens_expires_at ON rate_check_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_broker_licenses_user_id ON broker_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_licenses_company ON broker_licenses(company_name);
CREATE INDEX IF NOT EXISTS idx_broker_licenses_active ON broker_licenses(is_active);
CREATE INDEX IF NOT EXISTS idx_broker_licenses_expires_at ON broker_licenses(expires_at);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id ON payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(is_default);

CREATE INDEX IF NOT EXISTS idx_refunds_billing_history_id ON refunds(billing_history_id);
CREATE INDEX IF NOT EXISTS idx_refunds_stripe_id ON refunds(stripe_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_entitlements_updated_at BEFORE UPDATE ON user_entitlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_broker_licenses_updated_at BEFORE UPDATE ON broker_licenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_check_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Billing history policies
CREATE POLICY "Users can view their own billing history" ON billing_history
  FOR SELECT USING (auth.uid() = user_id);

-- User entitlements policies
CREATE POLICY "Users can view their own entitlements" ON user_entitlements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own entitlements" ON user_entitlements
  FOR UPDATE USING (auth.uid() = user_id);

-- Rate check tokens policies
CREATE POLICY "Users can view their own rate check tokens" ON rate_check_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Broker licenses policies
CREATE POLICY "Users can view their own broker licenses" ON broker_licenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own broker licenses" ON broker_licenses
  FOR UPDATE USING (auth.uid() = user_id);

-- Payment methods policies
CREATE POLICY "Users can view their own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" ON payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" ON payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" ON payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- Refunds policies
CREATE POLICY "Users can view their own refunds" ON refunds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM billing_history 
      WHERE billing_history.id = refunds.billing_history_id 
      AND billing_history.user_id = auth.uid()
    )
  );

-- Service role policies for webhook processing
CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all billing history" ON billing_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all user entitlements" ON user_entitlements
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all rate check tokens" ON rate_check_tokens
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all broker licenses" ON broker_licenses
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all payment methods" ON payment_methods
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all refunds" ON refunds
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to check user entitlement
CREATE OR REPLACE FUNCTION check_user_entitlement(
  p_user_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  entitlement_exists BOOLEAN := FALSE;
  usage_count INTEGER := 0;
  usage_limit INTEGER := NULL;
BEGIN
  -- Check if user has active entitlement for the feature
  SELECT 
    is_active,
    user_entitlements.usage_count,
    user_entitlements.usage_limit
  INTO 
    entitlement_exists,
    usage_count,
    usage_limit
  FROM user_entitlements
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no entitlement found, return false
  IF NOT entitlement_exists THEN
    RETURN FALSE;
  END IF;

  -- If unlimited usage (usage_limit is NULL), return true
  IF usage_limit IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if usage is within limits
  RETURN usage_count < usage_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to consume rate check token
CREATE OR REPLACE FUNCTION consume_rate_check_token(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  token_id UUID;
  current_used_count INTEGER;
  token_count INTEGER;
BEGIN
  -- Find an available token
  SELECT id, used_count, token_count
  INTO token_id, current_used_count, token_count
  FROM rate_check_tokens
  WHERE user_id = p_user_id
    AND used_count < token_count
    AND expires_at > NOW()
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no token found, return false
  IF token_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Increment used count
  UPDATE rate_check_tokens
  SET used_count = used_count + 1
  WHERE id = token_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_status(p_user_id UUID)
RETURNS TABLE (
  tier TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.tier,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to grant entitlement
CREATE OR REPLACE FUNCTION grant_entitlement(
  p_user_id UUID,
  p_feature TEXT,
  p_entitlement_type TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_usage_limit INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  entitlement_id UUID;
BEGIN
  INSERT INTO user_entitlements (
    user_id,
    feature,
    entitlement_type,
    expires_at,
    usage_limit
  ) VALUES (
    p_user_id,
    p_feature,
    p_entitlement_type,
    p_expires_at,
    p_usage_limit
  ) RETURNING id INTO entitlement_id;

  RETURN entitlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_user_entitlement(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_rate_check_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_entitlement(UUID, TEXT, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;

-- Insert default free tier entitlements for existing users
INSERT INTO user_entitlements (user_id, feature, entitlement_type, usage_limit)
SELECT 
  id,
  'rate_checks',
  'subscription',
  3 -- 3 free rate checks per month
FROM users
WHERE subscription_tier = 'free'
ON CONFLICT DO NOTHING;

-- Update users table to include additional fields for monetization
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_rate_checks_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_rate_check_reset TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index for free rate check tracking
CREATE INDEX IF NOT EXISTS idx_users_last_rate_check_reset ON users(last_rate_check_reset);