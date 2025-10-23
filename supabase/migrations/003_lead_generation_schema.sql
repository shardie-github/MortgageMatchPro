-- Lead Generation and Compliance Schema
-- This migration adds tables for lead generation, broker management, compliance, and monitoring

-- Create consent_records table for GDPR compliance
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('data_sharing', 'marketing', 'analytics', 'broker_contact')),
  granted BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  withdrawal_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_logs table for compliance tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversion_events table for tracking lead conversions
CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  conversion_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create broker_assignments table for tracking lead assignments
CREATE TABLE IF NOT EXISTS broker_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assignment_reason TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification_logs table for tracking broker notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('sms', 'email', 'both')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lead_qualification_scores table for detailed scoring breakdown
CREATE TABLE IF NOT EXISTS lead_qualification_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  income_score INTEGER NOT NULL DEFAULT 0,
  down_payment_score INTEGER NOT NULL DEFAULT 0,
  credit_score INTEGER NOT NULL DEFAULT 0,
  tds_score INTEGER NOT NULL DEFAULT 0,
  employment_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  qualification_tier TEXT NOT NULL CHECK (qualification_tier IN ('PREMIUM', 'STANDARD', 'COACHING')),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create system_alerts table for monitoring alerts
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('high_volume', 'low_conversion', 'system_error', 'broker_inactive', 'data_retention')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  details JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_consent_records_lead_id ON consent_records(lead_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_granted ON consent_records(granted);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_conversion_events_lead_id ON conversion_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_broker_id ON conversion_events(broker_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_converted_at ON conversion_events(converted_at);

CREATE INDEX IF NOT EXISTS idx_broker_assignments_lead_id ON broker_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_broker_assignments_broker_id ON broker_assignments(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_assignments_status ON broker_assignments(status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_lead_id ON notification_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_broker_id ON notification_logs(broker_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

CREATE INDEX IF NOT EXISTS idx_lead_qualification_scores_lead_id ON lead_qualification_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_qualification_scores_tier ON lead_qualification_scores(qualification_tier);

CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_consent_records_updated_at BEFORE UPDATE ON consent_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_broker_assignments_updated_at BEFORE UPDATE ON broker_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_alerts_updated_at BEFORE UPDATE ON system_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for data security
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_qualification_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Consent records policies
CREATE POLICY "Users can view their own consent records" ON consent_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consent records" ON consent_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consent records" ON consent_records
  FOR UPDATE USING (auth.uid() = user_id);

-- Audit logs policies (admin only)
CREATE POLICY "Only admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email LIKE '%admin%'
    )
  );

-- Conversion events policies
CREATE POLICY "Brokers can view their own conversion events" ON conversion_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brokers 
      WHERE brokers.id = conversion_events.broker_id 
      AND brokers.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Brokers can insert their own conversion events" ON conversion_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM brokers 
      WHERE brokers.id = conversion_events.broker_id 
      AND brokers.email = auth.jwt() ->> 'email'
    )
  );

-- Broker assignments policies
CREATE POLICY "Brokers can view their own assignments" ON broker_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brokers 
      WHERE brokers.id = broker_assignments.broker_id 
      AND brokers.email = auth.jwt() ->> 'email'
    )
  );

-- Notification logs policies
CREATE POLICY "Brokers can view their own notification logs" ON notification_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brokers 
      WHERE brokers.id = notification_logs.broker_id 
      AND brokers.email = auth.jwt() ->> 'email'
    )
  );

-- Lead qualification scores policies
CREATE POLICY "Users can view their own lead scores" ON lead_qualification_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_qualification_scores.lead_id 
      AND leads.user_id = auth.uid()
    )
  );

-- System alerts policies (admin only)
CREATE POLICY "Only admins can view system alerts" ON system_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email LIKE '%admin%'
    )
  );

-- Insert sample broker data
INSERT INTO brokers (name, email, phone, company, license_number, provinces_states, commission_rate, is_active)
VALUES 
  ('John Smith', 'john.smith@premiummortgages.com', '555-0101', 'Premium Mortgage Solutions', 'LIC001', ARRAY['ON', 'BC'], 2.5, true),
  ('Sarah Johnson', 'sarah.johnson@nationalbrokers.ca', '555-0102', 'National Broker Network', 'LIC002', ARRAY['ON', 'QC', 'AB'], 2.0, true),
  ('Mike Chen', 'mike.chen@financialcoaching.ca', '555-0103', 'Financial Coaching Services', 'LIC003', ARRAY['ON', 'BC', 'AB'], 1.5, true),
  ('Lisa Rodriguez', 'lisa.rodriguez@toplenders.com', '555-0104', 'Top Lenders Group', 'LIC004', ARRAY['ON', 'QC'], 3.0, true),
  ('David Wilson', 'david.wilson@standardbrokers.ca', '555-0105', 'Standard Broker Services', 'LIC005', ARRAY['AB', 'BC', 'SK'], 2.2, true)
ON CONFLICT (email) DO NOTHING;

-- Create a function to automatically assign brokers to leads
CREATE OR REPLACE FUNCTION assign_broker_to_lead()
RETURNS TRIGGER AS $$
DECLARE
  selected_broker_id UUID;
  broker_count INTEGER;
BEGIN
  -- Only assign if no broker is already assigned
  IF NEW.broker_id IS NULL THEN
    -- Get count of active brokers
    SELECT COUNT(*) INTO broker_count FROM brokers WHERE is_active = true;
    
    IF broker_count > 0 THEN
      -- Simple round-robin assignment based on lead score
      IF NEW.lead_score >= 70 THEN
        -- Premium tier - assign to brokers with higher commission rates
        SELECT id INTO selected_broker_id 
        FROM brokers 
        WHERE is_active = true 
        ORDER BY commission_rate DESC, created_at ASC 
        LIMIT 1;
      ELSIF NEW.lead_score >= 50 THEN
        -- Standard tier - assign to brokers with medium commission rates
        SELECT id INTO selected_broker_id 
        FROM brokers 
        WHERE is_active = true 
        AND commission_rate BETWEEN 2.0 AND 2.5
        ORDER BY created_at ASC 
        LIMIT 1;
      ELSE
        -- Coaching tier - assign to brokers with lower commission rates
        SELECT id INTO selected_broker_id 
        FROM brokers 
        WHERE is_active = true 
        AND commission_rate < 2.0
        ORDER BY created_at ASC 
        LIMIT 1;
      END IF;
      
      -- Update the lead with the selected broker
      NEW.broker_id := selected_broker_id;
      
      -- Insert broker assignment record
      INSERT INTO broker_assignments (lead_id, broker_id, assignment_reason)
      VALUES (NEW.id, selected_broker_id, 
        CASE 
          WHEN NEW.lead_score >= 70 THEN 'Premium tier assignment'
          WHEN NEW.lead_score >= 50 THEN 'Standard tier assignment'
          ELSE 'Coaching tier assignment'
        END
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign brokers
CREATE TRIGGER trigger_assign_broker_to_lead
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION assign_broker_to_lead();

-- Create a function to log lead qualification scores
CREATE OR REPLACE FUNCTION log_lead_qualification_score()
RETURNS TRIGGER AS $$
DECLARE
  income_score INTEGER := 0;
  down_payment_score INTEGER := 0;
  credit_score INTEGER := 0;
  tds_score INTEGER := 0;
  employment_score INTEGER := 0;
  qualification_tier TEXT;
BEGIN
  -- Calculate individual scores based on lead data
  IF (NEW.lead_data->>'income')::INTEGER > 75000 THEN
    income_score := 20;
  END IF;
  
  IF ((NEW.lead_data->>'downPayment')::INTEGER / (NEW.lead_data->>'propertyValue')::INTEGER) >= 0.2 THEN
    down_payment_score := 25;
  END IF;
  
  IF (NEW.lead_data->>'creditScore' IS NOT NULL AND (NEW.lead_data->>'creditScore')::INTEGER >= 700 THEN
    credit_score := 30;
  END IF;
  
  -- TDS calculation (simplified)
  tds_score := 10; -- Assume TDS < 35% for now
  
  IF NEW.lead_data->>'employmentType' = 'salaried' THEN
    employment_score := 15;
  END IF;
  
  -- Determine qualification tier
  IF NEW.lead_score >= 70 THEN
    qualification_tier := 'PREMIUM';
  ELSIF NEW.lead_score >= 50 THEN
    qualification_tier := 'STANDARD';
  ELSE
    qualification_tier := 'COACHING';
  END IF;
  
  -- Insert qualification score breakdown
  INSERT INTO lead_qualification_scores (
    lead_id, income_score, down_payment_score, credit_score, 
    tds_score, employment_score, total_score, qualification_tier
  ) VALUES (
    NEW.id, income_score, down_payment_score, credit_score,
    tds_score, employment_score, NEW.lead_score, qualification_tier
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log qualification scores
CREATE TRIGGER trigger_log_lead_qualification_score
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_qualification_score();