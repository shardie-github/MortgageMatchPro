-- Create config_flags table for feature flags and kill switches
CREATE TABLE IF NOT EXISTS config_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  environment VARCHAR(50) NOT NULL DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create RLS policies for config_flags
ALTER TABLE config_flags ENABLE ROW LEVEL SECURITY;

-- Allow read access to anon and authenticated users
CREATE POLICY "Allow read access to config flags" ON config_flags
  FOR SELECT USING (true);

-- Only allow service role to modify config flags
CREATE POLICY "Only service role can modify config flags" ON config_flags
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_config_flags_name ON config_flags(name);
CREATE INDEX idx_config_flags_environment ON config_flags(environment);
CREATE INDEX idx_config_flags_enabled ON config_flags(enabled);

-- Create function to get config flags for client
CREATE OR REPLACE FUNCTION get_config_flags()
RETURNS TABLE (
  name VARCHAR(255),
  enabled BOOLEAN,
  environment VARCHAR(50)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cf.name,
    cf.enabled,
    cf.environment
  FROM config_flags cf
  WHERE cf.environment = 'all' OR cf.environment = current_setting('app.environment', true);
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_config_flags() TO anon, authenticated;

-- Insert default feature flags
INSERT INTO config_flags (name, description, enabled, environment) VALUES
  ('maintenance_mode', 'Enable maintenance mode for the application', false, 'all'),
  ('new_ui_features', 'Enable new UI features', true, 'all'),
  ('advanced_analytics', 'Enable advanced analytics features', true, 'all'),
  ('beta_features', 'Enable beta features for testing', false, 'preview'),
  ('debug_mode', 'Enable debug mode and additional logging', false, 'preview')
ON CONFLICT (name) DO NOTHING;

-- Create audit log table for config flag changes
CREATE TABLE IF NOT EXISTS config_flags_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES config_flags(id),
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger to log config flag changes
CREATE OR REPLACE FUNCTION log_config_flag_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO config_flags_audit (flag_id, action, new_values, changed_by)
    VALUES (NEW.id, 'created', to_jsonb(NEW), NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO config_flags_audit (flag_id, action, old_values, new_values, changed_by)
    VALUES (NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), NEW.updated_by);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO config_flags_audit (flag_id, action, old_values, changed_by)
    VALUES (OLD.id, 'deleted', to_jsonb(OLD), OLD.updated_by);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER config_flags_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON config_flags
  FOR EACH ROW EXECUTE FUNCTION log_config_flag_changes();
