#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Performance thresholds
const THRESHOLDS = {
  p95: 300, // 300ms
  p99: 500, // 500ms
  max: 1000 // 1000ms
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test queries to measure performance
const TEST_QUERIES = [
  {
    name: 'User Lookup',
    query: () => supabase.from('users').select('id, email').limit(10),
    description: 'Basic user table query'
  },
  {
    name: 'Mortgage Calculations',
    query: () => supabase.from('mortgage_calculations').select('*').limit(10),
    description: 'Mortgage calculations table query'
  },
  {
    name: 'Rate Checks',
    query: () => supabase.from('rate_checks').select('*').limit(10),
    description: 'Rate checks table query'
  },
  {
    name: 'Complex Join',
    query: () => supabase
      .from('mortgage_calculations')
      .select(`
        *,
        users!inner(email, subscription_tier)
      `)
      .limit(10),
    description: 'Join between mortgage_calculations and users'
  },
  {
    name: 'Aggregate Query',
    query: () => supabase
      .from('mortgage_calculations')
      .select('country, avg(interest_rate)')
      .group('country'),
    description: 'Aggregate query with grouping'
  }
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function measureQuery(queryFn, iterations = 5) {
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      const { data, error } = await queryFn();
      const end = performance.now();
      
      if (error) {
        throw new Error(error.message);
      }
      
      times.push(end - start);
    } catch (error) {
      log(`  ❌ Query failed: ${error.message}`, 'red');
      return null;
    }
  }
  
  return times;
}

function calculateStats(times) {
  if (!times || times.length === 0) return null;
  
  const sorted = [...times].sort((a, b) => a - b);
  const len = sorted.length;
  
  return {
    min: sorted[0],
    max: sorted[len - 1],
    avg: times.reduce((a, b) => a + b, 0) / len,
    p50: sorted[Math.floor(len * 0.5)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)]
  };
}

function getStatus(stats) {
  if (!stats) return 'error';
  if (stats.p95 > THRESHOLDS.max) return 'critical';
  if (stats.p95 > THRESHOLDS.p99) return 'error';
  if (stats.p95 > THRESHOLDS.p95) return 'warning';
  return 'ok';
}

function getStatusIcon(status) {
  switch (status) {
    case 'critical': return '🚨';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'ok': return '✅';
    default: return '❓';
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'critical': return 'red';
    case 'error': return 'red';
    case 'warning': return 'yellow';
    case 'ok': return 'green';
    default: return 'reset';
  }
}

async function checkDatabaseHealth() {
  log('🏥 Checking database health...', 'blue');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(error.message);
    }
    
    log('✅ Database connection successful', 'green');
    return true;
  } catch (error) {
    log(`❌ Database health check failed: ${error.message}`, 'red');
    return false;
  }
}

async function runPerformanceTests() {
  log('\n⚡ Running performance tests...', 'blue');
  
  const results = [];
  let hasErrors = false;
  let hasWarnings = false;
  
  for (const test of TEST_QUERIES) {
    log(`\n📊 Testing: ${test.name}`, 'blue');
    log(`  ${test.description}`, 'reset');
    
    const times = await measureQuery(test.query);
    const stats = calculateStats(times);
    const status = getStatus(stats);
    
    if (status === 'error' || status === 'critical') {
      hasErrors = true;
    } else if (status === 'warning') {
      hasWarnings = true;
    }
    
    if (stats) {
      log(`  Min: ${stats.min.toFixed(2)}ms`, 'reset');
      log(`  Max: ${stats.max.toFixed(2)}ms`, 'reset');
      log(`  Avg: ${stats.avg.toFixed(2)}ms`, 'reset');
      log(`  P95: ${stats.p95.toFixed(2)}ms ${getStatusIcon(status)}`, getStatusColor(status));
      log(`  P99: ${stats.p99.toFixed(2)}ms`, 'reset');
    }
    
    results.push({
      name: test.name,
      description: test.description,
      stats,
      status,
      times
    });
  }
  
  return { results, hasErrors, hasWarnings };
}

async function checkIndexes() {
  log('\n📋 Checking database indexes...', 'blue');
  
  try {
    // Check for common indexes that should exist
    const indexQueries = [
      {
        name: 'Users email index',
        query: `SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND indexname LIKE '%email%'`
      },
      {
        name: 'Mortgage calculations user_id index',
        query: `SELECT indexname FROM pg_indexes WHERE tablename = 'mortgage_calculations' AND indexname LIKE '%user_id%'`
      },
      {
        name: 'Rate checks created_at index',
        query: `SELECT indexname FROM pg_indexes WHERE tablename = 'rate_checks' AND indexname LIKE '%created_at%'`
      }
    ];
    
    const indexResults = [];
    
    for (const { name, query } of indexQueries) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query });
        
        if (error) {
          log(`  ⚠️  ${name}: Could not check (${error.message})`, 'yellow');
          indexResults.push({ name, exists: false, error: error.message });
        } else {
          const exists = data && data.length > 0;
          log(`  ${exists ? '✅' : '❌'} ${name}: ${exists ? 'Exists' : 'Missing'}`, exists ? 'green' : 'red');
          indexResults.push({ name, exists, error: null });
        }
      } catch (error) {
        log(`  ⚠️  ${name}: Could not check (${error.message})`, 'yellow');
        indexResults.push({ name, exists: false, error: error.message });
      }
    }
    
    return indexResults;
  } catch (error) {
    log(`⚠️  Could not check indexes: ${error.message}`, 'yellow');
    return [];
  }
}

async function generateReport(healthCheck, performanceResults, indexResults) {
  const report = {
    timestamp: new Date().toISOString(),
    health: {
      connected: healthCheck,
      status: healthCheck ? 'healthy' : 'unhealthy'
    },
    performance: {
      results: performanceResults.results,
      summary: {
        totalTests: performanceResults.results.length,
        passed: performanceResults.results.filter(r => r.status === 'ok').length,
        warnings: performanceResults.results.filter(r => r.status === 'warning').length,
        errors: performanceResults.results.filter(r => r.status === 'error' || r.status === 'critical').length
      },
      thresholds: THRESHOLDS
    },
    indexes: {
      results: indexResults,
      summary: {
        total: indexResults.length,
        exists: indexResults.filter(r => r.exists).length,
        missing: indexResults.filter(r => !r.exists).length
      }
    }
  };
  
  return report;
}

async function main() {
  log('🔍 Starting database performance check...', 'bold');
  
  // Check database health
  const healthCheck = await checkDatabaseHealth();
  if (!healthCheck) {
    process.exit(1);
  }
  
  // Run performance tests
  const performanceResults = await runPerformanceTests();
  
  // Check indexes
  const indexResults = await checkIndexes();
  
  // Generate report
  const report = await generateReport(healthCheck, performanceResults, indexResults);
  
  // Display summary
  log('\n📈 Performance Summary', 'bold');
  log(`Total tests: ${report.performance.summary.totalTests}`, 'blue');
  log(`Passed: ${report.performance.summary.passed}`, 'green');
  log(`Warnings: ${report.performance.summary.warnings}`, report.performance.summary.warnings > 0 ? 'yellow' : 'green');
  log(`Errors: ${report.performance.summary.errors}`, report.performance.summary.errors > 0 ? 'red' : 'green');
  
  log('\n📋 Index Summary', 'bold');
  log(`Total indexes checked: ${report.indexes.summary.total}`, 'blue');
  log(`Exists: ${report.indexes.summary.exists}`, 'green');
  log(`Missing: ${report.indexes.summary.missing}`, report.indexes.summary.missing > 0 ? 'yellow' : 'green');
  
  // Save report
  const reportPath = './db-performance-report.json';
  const fs = await import('fs');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Report saved to: ${reportPath}`, 'blue');
  
  // Exit with appropriate code
  if (performanceResults.hasErrors) {
    log('\n❌ Database performance check failed!', 'red');
    process.exit(1);
  } else if (performanceResults.hasWarnings) {
    log('\n⚠️  Database performance check passed with warnings.', 'yellow');
    process.exit(0);
  } else {
    log('\n✅ Database performance check passed!', 'green');
    process.exit(0);
  }
}

main().catch(error => {
  log(`❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});