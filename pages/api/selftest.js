import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const tests = {
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    results: {
      rls_read_anon: { status: 'unknown', latency: 0, error: null },
      rls_write_anon: { status: 'unknown', latency: 0, error: null },
      rls_read_service: { status: 'unknown', latency: 0, error: null },
      rls_write_service: { status: 'unknown', latency: 0, error: null },
      service_role_access: { status: 'unknown', latency: 0, error: null }
    },
    summary: {
      passed: 0,
      failed: 0,
      total: 0
    }
  };

  // Test 1: Anonymous read access (should be restricted by RLS)
  try {
    const start = Date.now();
    const { data, error } = await anonClient
      .from('users')
      .select('*')
      .limit(1);
    
    const latency = Date.now() - start;
    
    if (error && error.code === 'PGRST301') {
      // This is expected - RLS should block anonymous access
      tests.results.rls_read_anon = {
        status: 'passed',
        latency,
        error: null,
        note: 'RLS correctly blocked anonymous read access'
      };
    } else if (data && data.length === 0) {
      // Also acceptable - empty result due to RLS
      tests.results.rls_read_anon = {
        status: 'passed',
        latency,
        error: null,
        note: 'RLS correctly returned empty result for anonymous access'
      };
    } else {
      tests.results.rls_read_anon = {
        status: 'failed',
        latency,
        error: 'Anonymous user was able to read user data - RLS may not be working',
        note: 'This is a security issue!'
      };
    }
  } catch (error) {
    tests.results.rls_read_anon = {
      status: 'failed',
      latency: 0,
      error: error.message,
      note: 'Unexpected error during anonymous read test'
    };
  }

  // Test 2: Anonymous write access (should be blocked by RLS)
  try {
    const start = Date.now();
    const { data, error } = await anonClient
      .from('users')
      .insert({ email: 'test@example.com' })
      .select();
    
    const latency = Date.now() - start;
    
    if (error && (error.code === 'PGRST301' || error.code === '42501')) {
      // This is expected - RLS should block anonymous write access
      tests.results.rls_write_anon = {
        status: 'passed',
        latency,
        error: null,
        note: 'RLS correctly blocked anonymous write access'
      };
    } else {
      tests.results.rls_write_anon = {
        status: 'failed',
        latency,
        error: 'Anonymous user was able to write data - RLS may not be working',
        note: 'This is a security issue!'
      };
    }
  } catch (error) {
    tests.results.rls_write_anon = {
      status: 'failed',
      latency: 0,
      error: error.message,
      note: 'Unexpected error during anonymous write test'
    };
  }

  // Test 3: Service role read access (should work)
  try {
    const start = Date.now();
    const { data, error } = await serviceClient
      .from('users')
      .select('id, email')
      .limit(1);
    
    const latency = Date.now() - start;
    
    if (error) {
      tests.results.rls_read_service = {
        status: 'failed',
        latency,
        error: error.message,
        note: 'Service role should be able to read data'
      };
    } else {
      tests.results.rls_read_service = {
        status: 'passed',
        latency,
        error: null,
        note: 'Service role can read data as expected'
      };
    }
  } catch (error) {
    tests.results.rls_read_service = {
      status: 'failed',
      latency: 0,
      error: error.message,
      note: 'Unexpected error during service role read test'
    };
  }

  // Test 4: Service role write access (should work)
  try {
    const start = Date.now();
    const testEmail = `test-${Date.now()}@example.com`;
    const { data, error } = await serviceClient
      .from('users')
      .insert({ email: testEmail })
      .select();
    
    const latency = Date.now() - start;
    
    if (error) {
      tests.results.rls_write_service = {
        status: 'failed',
        latency,
        error: error.message,
        note: 'Service role should be able to write data'
      };
    } else {
      // Clean up the test data
      if (data && data[0]) {
        await serviceClient
          .from('users')
          .delete()
          .eq('id', data[0].id);
      }
      
      tests.results.rls_write_service = {
        status: 'passed',
        latency,
        error: null,
        note: 'Service role can write data as expected'
      };
    }
  } catch (error) {
    tests.results.rls_write_service = {
      status: 'failed',
      latency: 0,
      error: error.message,
      note: 'Unexpected error during service role write test'
    };
  }

  // Test 5: Service role access to sensitive data
  try {
    const start = Date.now();
    const { data, error } = await serviceClient
      .from('users')
      .select('*')
      .limit(1);
    
    const latency = Date.now() - start;
    
    if (error) {
      tests.results.service_role_access = {
        status: 'failed',
        latency,
        error: error.message,
        note: 'Service role should have full access to data'
      };
    } else {
      tests.results.service_role_access = {
        status: 'passed',
        latency,
        error: null,
        note: 'Service role has full access as expected'
      };
    }
  } catch (error) {
    tests.results.service_role_access = {
      status: 'failed',
      latency: 0,
      error: error.message,
      note: 'Unexpected error during service role access test'
    };
  }

  // Calculate summary
  for (const [key, result] of Object.entries(tests.results)) {
    tests.summary.total++;
    if (result.status === 'passed') {
      tests.summary.passed++;
    } else {
      tests.summary.failed++;
    }
  }

  const totalLatency = Date.now() - startTime;
  tests.latency = totalLatency;

  // Determine overall status
  const overallStatus = tests.summary.failed === 0 ? 'passed' : 'failed';
  const statusCode = overallStatus === 'passed' ? 200 : 500;

  res.status(statusCode).json({
    ...tests,
    status: overallStatus
  });
}