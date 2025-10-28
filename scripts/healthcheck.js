#!/usr/bin/env node

const http = require('http');
const https = require('https');

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

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          latency
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(options.timeout || 10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function checkHealthEndpoint(baseUrl) {
  log(`\n🏥 Checking health endpoint: ${baseUrl}/api/health`, 'blue');
  
  try {
    const response = await makeRequest(`${baseUrl}/api/health`, {
      timeout: 5000
    });
    
    if (response.statusCode === 200) {
      const health = JSON.parse(response.body);
      log(`✅ Health check passed (${response.latency}ms)`, 'green');
      log(`  Status: ${health.status}`, 'reset');
      log(`  Version: ${health.version}`, 'reset');
      log(`  Environment: ${health.environment}`, 'reset');
      log(`  Uptime: ${health.uptime}s`, 'reset');
      
      if (health.checks) {
        log(`  Database: ${health.checks.database?.status || 'unknown'} (${health.checks.database?.latency || 0}ms)`, 'reset');
        log(`  Redis: ${health.checks.redis?.status || 'unknown'} (${health.checks.redis?.latency || 0}ms)`, 'reset');
      }
      
      return { success: true, health, latency: response.latency };
    } else {
      log(`❌ Health check failed with status ${response.statusCode}`, 'red');
      return { success: false, error: `HTTP ${response.statusCode}`, latency: response.latency };
    }
  } catch (error) {
    log(`❌ Health check failed: ${error.message}`, 'red');
    return { success: false, error: error.message, latency: 0 };
  }
}

async function checkSelftestEndpoint(baseUrl) {
  log(`\n🔍 Checking selftest endpoint: ${baseUrl}/api/selftest`, 'blue');
  
  try {
    const response = await makeRequest(`${baseUrl}/api/selftest`, {
      timeout: 10000
    });
    
    if (response.statusCode === 200) {
      const selftest = JSON.parse(response.body);
      log(`✅ Selftest passed (${response.latency}ms)`, 'green');
      log(`  Status: ${selftest.status}`, 'reset');
      log(`  Version: ${selftest.version}`, 'reset');
      log(`  Environment: ${selftest.environment}`, 'reset');
      
      if (selftest.summary) {
        log(`  Tests: ${selftest.summary.passed}/${selftest.summary.total} passed`, 'reset');
        if (selftest.summary.failed > 0) {
          log(`  Failed: ${selftest.summary.failed}`, 'red');
        }
      }
      
      return { success: true, selftest, latency: response.latency };
    } else {
      log(`❌ Selftest failed with status ${response.statusCode}`, 'red');
      return { success: false, error: `HTTP ${response.statusCode}`, latency: response.latency };
    }
  } catch (error) {
    log(`❌ Selftest failed: ${error.message}`, 'red');
    return { success: false, error: error.message, latency: 0 };
  }
}

async function checkMainPage(baseUrl) {
  log(`\n🏠 Checking main page: ${baseUrl}`, 'blue');
  
  try {
    const response = await makeRequest(baseUrl, {
      timeout: 5000
    });
    
    if (response.statusCode === 200) {
      log(`✅ Main page accessible (${response.latency}ms)`, 'green');
      return { success: true, latency: response.latency };
    } else {
      log(`❌ Main page failed with status ${response.statusCode}`, 'red');
      return { success: false, error: `HTTP ${response.statusCode}`, latency: response.latency };
    }
  } catch (error) {
    log(`❌ Main page failed: ${error.message}`, 'red');
    return { success: false, error: error.message, latency: 0 };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3000';
  
  log('🔍 Starting health check...', 'bold');
  log(`Target: ${baseUrl}`, 'blue');
  
  const results = {
    timestamp: new Date().toISOString(),
    target: baseUrl,
    checks: {
      mainPage: null,
      health: null,
      selftest: null
    },
    summary: {
      passed: 0,
      failed: 0,
      total: 0
    }
  };
  
  // Check main page
  results.checks.mainPage = await checkMainPage(baseUrl);
  results.summary.total++;
  if (results.checks.mainPage.success) {
    results.summary.passed++;
  } else {
    results.summary.failed++;
  }
  
  // Check health endpoint
  results.checks.health = await checkHealthEndpoint(baseUrl);
  results.summary.total++;
  if (results.checks.health.success) {
    results.summary.passed++;
  } else {
    results.summary.failed++;
  }
  
  // Check selftest endpoint
  results.checks.selftest = await checkSelftestEndpoint(baseUrl);
  results.summary.total++;
  if (results.checks.selftest.success) {
    results.summary.passed++;
  } else {
    results.summary.failed++;
  }
  
  // Display summary
  log('\n📊 Health Check Summary', 'bold');
  log(`Total checks: ${results.summary.total}`, 'blue');
  log(`Passed: ${results.summary.passed}`, 'green');
  log(`Failed: ${results.summary.failed}`, results.summary.failed > 0 ? 'red' : 'green');
  
  // Save results
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, '..', 'health-check-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log(`\n📄 Report saved to: ${reportPath}`, 'blue');
  
  // Exit with appropriate code
  if (results.summary.failed > 0) {
    log('\n❌ Health check failed!', 'red');
    process.exit(1);
  } else {
    log('\n✅ All health checks passed!', 'green');
    process.exit(0);
  }
}

main().catch(error => {
  log(`❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});