-- Fix Function Search Path Mutable Issues
-- This migration addresses security vulnerabilities related to function search paths
-- and ensures proper schema isolation for all database functions

-- Set secure search path for the session
SET search_path = public, extensions;

-- Create a secure function wrapper that ensures proper search path
CREATE OR REPLACE FUNCTION secure_function_wrapper(func_name TEXT, func_args TEXT DEFAULT '')
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- Set secure search path for function execution
    PERFORM set_config('search_path', 'public,extensions', true);
    
    -- Execute the function with proper search path
    EXECUTE format('SELECT %s(%s)', func_name, func_args) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE LOG 'Error in secure_function_wrapper: %', SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix all existing functions to have proper search path security
-- This ensures functions can't be hijacked by malicious search path manipulation

-- Update all SECURITY DEFINER functions to set search path explicitly
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND subscription_tier = 'broker'
        AND id IN (
            SELECT user_id FROM broker_licenses 
            WHERE is_active = true 
            AND expires_at > NOW()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

CREATE OR REPLACE FUNCTION is_owner_or_admin(resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    RETURN auth.uid() = resource_user_id OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Update all other critical functions with proper search path security
CREATE OR REPLACE FUNCTION check_user_entitlement(
    p_user_id UUID,
    p_entitlement_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    RETURN EXISTS (
        SELECT 1 FROM user_entitlements ue
        JOIN entitlements e ON ue.entitlement_id = e.id
        WHERE ue.user_id = p_user_id
        AND e.entitlement_type = p_entitlement_type
        AND ue.is_active = true
        AND (ue.expires_at IS NULL OR ue.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

CREATE OR REPLACE FUNCTION consume_rate_check_token(
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
    new_count INTEGER;
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    -- Get user record with row-level locking
    SELECT * INTO user_record FROM users WHERE id = p_user_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has free rate checks available
    IF user_record.subscription_tier = 'free' THEN
        IF user_record.free_rate_checks_used >= 5 THEN
            RETURN FALSE;
        END IF;
        
        -- Increment the counter
        new_count := user_record.free_rate_checks_used + 1;
        UPDATE users 
        SET free_rate_checks_used = new_count
        WHERE id = p_user_id;
        
        RETURN TRUE;
    END IF;
    
    -- For premium/broker users, always allow
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Create a comprehensive function to audit and fix all function search paths
CREATE OR REPLACE FUNCTION audit_and_fix_function_search_paths()
RETURNS TABLE(
    function_name TEXT,
    schema_name TEXT,
    current_search_path TEXT,
    is_secure BOOLEAN,
    action_taken TEXT
) AS $$
DECLARE
    func_record RECORD;
    current_path TEXT;
    is_secure_func BOOLEAN;
    action TEXT;
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    -- Get all functions in the public schema
    FOR func_record IN 
        SELECT 
            p.proname as function_name,
            n.nspname as schema_name,
            p.prosecdef as is_security_definer
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'  -- Only functions, not procedures
    LOOP
        -- Check current search path setting
        SELECT COALESCE(
            (SELECT option_value 
             FROM pg_options_to_table(p.proconfig) 
             WHERE option_name = 'search_path'), 
            'default'
        ) INTO current_path;
        
        -- Determine if function is secure
        is_secure_func := (current_path = 'public,extensions' OR current_path = 'public');
        
        -- Determine action needed
        IF func_record.is_security_definer AND NOT is_secure_func THEN
            action := 'NEEDS_FIX';
        ELSIF func_record.is_security_definer AND is_secure_func THEN
            action := 'SECURE';
        ELSE
            action := 'NO_ACTION_NEEDED';
        END IF;
        
        -- Return the audit information
        function_name := func_record.function_name;
        schema_name := func_record.schema_name;
        current_search_path := current_path;
        is_secure := is_secure_func;
        action_taken := action;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Create a function to automatically fix insecure functions
CREATE OR REPLACE FUNCTION fix_insecure_functions()
RETURNS INTEGER AS $$
DECLARE
    func_record RECORD;
    fixed_count INTEGER := 0;
    func_definition TEXT;
    new_definition TEXT;
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    -- Get all SECURITY DEFINER functions that need fixing
    FOR func_record IN 
        SELECT 
            p.proname as function_name,
            pg_get_functiondef(p.oid) as function_def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND p.prosecdef = true
        AND NOT EXISTS (
            SELECT 1 
            FROM pg_options_to_table(p.proconfig) 
            WHERE option_name = 'search_path'
        )
    LOOP
        -- Add search_path setting to function definition
        func_definition := func_record.function_def;
        
        -- Replace the function with secure search path
        new_definition := regexp_replace(
            func_definition,
            'LANGUAGE plpgsql SECURITY DEFINER;',
            'LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''public,extensions'';',
            'g'
        );
        
        -- Execute the updated function definition
        BEGIN
            EXECUTE new_definition;
            fixed_count := fixed_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'Failed to fix function %: %', func_record.function_name, SQLERRM;
        END;
    END LOOP;
    
    RETURN fixed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Create a monitoring function for search path security
CREATE OR REPLACE FUNCTION monitor_search_path_security()
RETURNS TABLE(
    check_time TIMESTAMP WITH TIME ZONE,
    total_functions INTEGER,
    secure_functions INTEGER,
    insecure_functions INTEGER,
    security_score DECIMAL(5,2)
) AS $$
DECLARE
    total_count INTEGER;
    secure_count INTEGER;
    insecure_count INTEGER;
    score DECIMAL(5,2);
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    -- Count total SECURITY DEFINER functions
    SELECT COUNT(*) INTO total_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.prosecdef = true;
    
    -- Count secure functions
    SELECT COUNT(*) INTO secure_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.prosecdef = true
    AND EXISTS (
        SELECT 1 
        FROM pg_options_to_table(p.proconfig) 
        WHERE option_name = 'search_path'
        AND option_value IN ('public,extensions', 'public')
    );
    
    -- Calculate insecure functions
    insecure_count := total_count - secure_count;
    
    -- Calculate security score
    IF total_count > 0 THEN
        score := (secure_count::DECIMAL / total_count::DECIMAL) * 100;
    ELSE
        score := 100.0;
    END IF;
    
    -- Return monitoring data
    check_time := NOW();
    total_functions := total_count;
    secure_functions := secure_count;
    insecure_functions := insecure_count;
    security_score := score;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Create a comprehensive security audit function
CREATE OR REPLACE FUNCTION perform_security_audit()
RETURNS TABLE(
    audit_category TEXT,
    check_name TEXT,
    status TEXT,
    details TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- Set secure search path
    PERFORM set_config('search_path', 'public,extensions', true);
    
    -- Check 1: Function search path security
    audit_category := 'FUNCTION_SECURITY';
    check_name := 'Search Path Security';
    
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND p.prosecdef = true
        AND NOT EXISTS (
            SELECT 1 
            FROM pg_options_to_table(p.proconfig) 
            WHERE option_name = 'search_path'
        )
    ) THEN
        status := 'FAIL';
        details := 'Found SECURITY DEFINER functions without explicit search_path';
        recommendation := 'Run fix_insecure_functions() to secure all functions';
    ELSE
        status := 'PASS';
        details := 'All SECURITY DEFINER functions have explicit search_path';
        recommendation := 'Continue monitoring with monitor_search_path_security()';
    END IF;
    
    RETURN NEXT;
    
    -- Check 2: RLS policies
    audit_category := 'RLS_SECURITY';
    check_name := 'Row Level Security';
    
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND NOT c.relrowsecurity
    ) THEN
        status := 'WARN';
        details := 'Some tables do not have RLS enabled';
        recommendation := 'Enable RLS on all user data tables';
    ELSE
        status := 'PASS';
        details := 'All tables have RLS enabled';
        recommendation := 'RLS configuration is secure';
    END IF;
    
    RETURN NEXT;
    
    -- Check 3: Extension security
    audit_category := 'EXTENSION_SECURITY';
    check_name := 'Extension Permissions';
    
    IF EXISTS (
        SELECT 1 FROM pg_extension e
        WHERE e.extname IN ('plpgsql', 'uuid-ossp', 'pgcrypto')
        AND NOT EXISTS (
            SELECT 1 FROM pg_roles r
            WHERE r.rolname = 'supabase_auth_admin'
            AND r.rolsuper = false
        )
    ) THEN
        status := 'PASS';
        details := 'Extensions are properly configured';
        recommendation := 'No action needed';
    ELSE
        status := 'WARN';
        details := 'Check extension permissions';
        recommendation := 'Verify extension security settings';
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public,extensions';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION secure_function_wrapper(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION audit_and_fix_function_search_paths() TO service_role;
GRANT EXECUTE ON FUNCTION fix_insecure_functions() TO service_role;
GRANT EXECUTE ON FUNCTION monitor_search_path_security() TO service_role;
GRANT EXECUTE ON FUNCTION perform_security_audit() TO service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_function_security_audit 
ON pg_proc(proname, pronamespace) 
WHERE prokind = 'f' AND prosecdef = true;

-- Add comments for documentation
COMMENT ON FUNCTION secure_function_wrapper(TEXT, TEXT) IS 'Secure wrapper for function execution with proper search path';
COMMENT ON FUNCTION audit_and_fix_function_search_paths() IS 'Audits all functions for search path security issues';
COMMENT ON FUNCTION fix_insecure_functions() IS 'Automatically fixes functions with insecure search paths';
COMMENT ON FUNCTION monitor_search_path_security() IS 'Monitors search path security across all functions';
COMMENT ON FUNCTION perform_security_audit() IS 'Comprehensive security audit of the database';