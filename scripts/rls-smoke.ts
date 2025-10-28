#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'error';
  message: string;
  details?: any;
}

class RLSSmokeTest {
  private results: TestResult[] = [];

  private addResult(name: string, status: 'passed' | 'failed' | 'error', message: string, details?: any) {
    this.results.push({ name, status, message, details });
  }

  async testAnonymousReadAccess() {
    log('\n🔍 Testing anonymous read access...', 'blue');
    
    try {
      const { data, error } = await anonClient
        .from('users')
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
          this.addResult(
            'Anonymous Read Access',
            'passed',
            'RLS correctly blocked anonymous read access',
            { error: error.message }
          );
          log('✅ Anonymous read access properly blocked', 'green');
        } else {
          this.addResult(
            'Anonymous Read Access',
            'failed',
            `Unexpected error: ${error.message}`,
            { error }
          );
          log(`❌ Unexpected error: ${error.message}`, 'red');
        }
      } else if (data && data.length === 0) {
        this.addResult(
          'Anonymous Read Access',
          'passed',
          'RLS correctly returned empty result for anonymous access',
          { data }
        );
        log('✅ Anonymous read access properly blocked (empty result)', 'green');
      } else {
        this.addResult(
          'Anonymous Read Access',
          'failed',
          'Anonymous user was able to read user data - RLS may not be working',
          { data }
        );
        log('❌ SECURITY ISSUE: Anonymous user can read user data!', 'red');
      }
    } catch (error) {
      this.addResult(
        'Anonymous Read Access',
        'error',
        `Test failed with exception: ${error.message}`,
        { error }
      );
      log(`❌ Test failed: ${error.message}`, 'red');
    }
  }

  async testAnonymousWriteAccess() {
    log('\n🔍 Testing anonymous write access...', 'blue');
    
    try {
      const testEmail = `test-${Date.now()}@example.com`;
      const { data, error } = await anonClient
        .from('users')
        .insert({ email: testEmail })
        .select();
      
      if (error) {
        if (error.code === 'PGRST301' || error.code === '42501' || error.message.includes('permission denied')) {
          this.addResult(
            'Anonymous Write Access',
            'passed',
            'RLS correctly blocked anonymous write access',
            { error: error.message }
          );
          log('✅ Anonymous write access properly blocked', 'green');
        } else {
          this.addResult(
            'Anonymous Write Access',
            'failed',
            `Unexpected error: ${error.message}`,
            { error }
          );
          log(`❌ Unexpected error: ${error.message}`, 'red');
        }
      } else {
        this.addResult(
          'Anonymous Write Access',
          'failed',
          'Anonymous user was able to write data - RLS may not be working',
          { data }
        );
        log('❌ SECURITY ISSUE: Anonymous user can write data!', 'red');
        
        // Clean up the test data
        if (data && data[0]) {
          try {
            await serviceClient
              .from('users')
              .delete()
              .eq('id', data[0].id);
            log('🧹 Cleaned up test data', 'yellow');
          } catch (cleanupError) {
            log(`⚠️  Could not clean up test data: ${cleanupError.message}`, 'yellow');
          }
        }
      }
    } catch (error) {
      this.addResult(
        'Anonymous Write Access',
        'error',
        `Test failed with exception: ${error.message}`,
        { error }
      );
      log(`❌ Test failed: ${error.message}`, 'red');
    }
  }

  async testServiceRoleAccess() {
    log('\n🔍 Testing service role access...', 'blue');
    
    try {
      // Test read access
      const { data: readData, error: readError } = await serviceClient
        .from('users')
        .select('id, email')
        .limit(1);
      
      if (readError) {
        this.addResult(
          'Service Role Read Access',
          'failed',
          `Service role should be able to read data: ${readError.message}`,
          { error: readError }
        );
        log(`❌ Service role read access failed: ${readError.message}`, 'red');
      } else {
        this.addResult(
          'Service Role Read Access',
          'passed',
          'Service role can read data as expected',
          { data: readData }
        );
        log('✅ Service role read access working', 'green');
      }
      
      // Test write access
      const testEmail = `service-test-${Date.now()}@example.com`;
      const { data: writeData, error: writeError } = await serviceClient
        .from('users')
        .insert({ email: testEmail })
        .select();
      
      if (writeError) {
        this.addResult(
          'Service Role Write Access',
          'failed',
          `Service role should be able to write data: ${writeError.message}`,
          { error: writeError }
        );
        log(`❌ Service role write access failed: ${writeError.message}`, 'red');
      } else {
        this.addResult(
          'Service Role Write Access',
          'passed',
          'Service role can write data as expected',
          { data: writeData }
        );
        log('✅ Service role write access working', 'green');
        
        // Clean up test data
        if (writeData && writeData[0]) {
          try {
            await serviceClient
              .from('users')
              .delete()
              .eq('id', writeData[0].id);
            log('🧹 Cleaned up service role test data', 'yellow');
          } catch (cleanupError) {
            log(`⚠️  Could not clean up test data: ${cleanupError.message}`, 'yellow');
          }
        }
      }
    } catch (error) {
      this.addResult(
        'Service Role Access',
        'error',
        `Test failed with exception: ${error.message}`,
        { error }
      );
      log(`❌ Test failed: ${error.message}`, 'red');
    }
  }

  async testRowLevelSecurity() {
    log('\n🔍 Testing row-level security...', 'blue');
    
    try {
      // Create a test user with service role
      const testEmail = `rls-test-${Date.now()}@example.com`;
      const { data: createData, error: createError } = await serviceClient
        .from('users')
        .insert({ email: testEmail })
        .select();
      
      if (createError) {
        this.addResult(
          'RLS Test Setup',
          'failed',
          `Could not create test user: ${createError.message}`,
          { error: createError }
        );
        log(`❌ Could not create test user: ${createError.message}`, 'red');
        return;
      }
      
      const testUserId = createData[0].id;
      log(`✅ Created test user: ${testUserId}`, 'green');
      
      // Test that anonymous user cannot access this specific user's data
      const { data: anonData, error: anonError } = await anonClient
        .from('users')
        .select('*')
        .eq('id', testUserId);
      
      if (anonError) {
        if (anonError.code === 'PGRST301' || anonError.message.includes('permission denied')) {
          this.addResult(
            'RLS Row Access',
            'passed',
            'RLS correctly prevented anonymous access to specific user data',
            { error: anonError.message }
          );
          log('✅ RLS correctly blocked anonymous access to specific user data', 'green');
        } else {
          this.addResult(
            'RLS Row Access',
            'failed',
            `Unexpected error: ${anonError.message}`,
            { error: anonError }
          );
          log(`❌ Unexpected error: ${anonError.message}`, 'red');
        }
      } else if (anonData && anonData.length === 0) {
        this.addResult(
          'RLS Row Access',
          'passed',
          'RLS correctly returned empty result for anonymous access to specific user data',
          { data: anonData }
        );
        log('✅ RLS correctly blocked anonymous access to specific user data (empty result)', 'green');
      } else {
        this.addResult(
          'RLS Row Access',
          'failed',
          'Anonymous user was able to access specific user data - RLS may not be working',
          { data: anonData }
        );
        log('❌ SECURITY ISSUE: Anonymous user can access specific user data!', 'red');
      }
      
      // Clean up test data
      try {
        await serviceClient
          .from('users')
          .delete()
          .eq('id', testUserId);
        log('🧹 Cleaned up RLS test data', 'yellow');
      } catch (cleanupError) {
        log(`⚠️  Could not clean up test data: ${cleanupError.message}`, 'yellow');
      }
      
    } catch (error) {
      this.addResult(
        'RLS Test',
        'error',
        `Test failed with exception: ${error.message}`,
        { error }
      );
      log(`❌ Test failed: ${error.message}`, 'red');
    }
  }

  async runAllTests() {
    log('🔐 Starting RLS Smoke Tests...', 'bold');
    
    await this.testAnonymousReadAccess();
    await this.testAnonymousWriteAccess();
    await this.testServiceRoleAccess();
    await this.testRowLevelSecurity();
    
    // Generate summary
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const errors = this.results.filter(r => r.status === 'error').length;
    const total = this.results.length;
    
    log('\n📊 RLS Smoke Test Summary', 'bold');
    log(`Total tests: ${total}`, 'blue');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`Errors: ${errors}`, errors > 0 ? 'red' : 'green');
    
    // Display failed tests
    const failedTests = this.results.filter(r => r.status === 'failed' || r.status === 'error');
    if (failedTests.length > 0) {
      log('\n❌ Failed Tests:', 'red');
      failedTests.forEach(test => {
        log(`  • ${test.name}: ${test.message}`, 'red');
      });
    }
    
    // Save results
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      summary: {
        total,
        passed,
        failed,
        errors
      },
      results: this.results
    };
    
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, '..', 'rls-smoke-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n📄 Report saved to: ${reportPath}`, 'blue');
    
    // Exit with appropriate code
    if (failed > 0 || errors > 0) {
      log('\n❌ RLS smoke tests failed!', 'red');
      process.exit(1);
    } else {
      log('\n✅ All RLS smoke tests passed!', 'green');
      process.exit(0);
    }
  }
}

// Run the tests
const smokeTest = new RLSSmokeTest();
smokeTest.runAllTests().catch(error => {
  log(`❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});