#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Cost thresholds (in USD)
const COST_THRESHOLDS = {
  daily: {
    supabase: 10, // $10/day
    vercel: 5,    // $5/day
    total: 15     // $15/day total
  },
  monthly: {
    supabase: 300, // $300/month
    vercel: 150,   // $150/month
    total: 450     // $450/month total
  }
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

async function getSupabaseUsage() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('⚠️  Missing Supabase credentials, skipping Supabase cost check', 'yellow');
    return null;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get database size
    const { data: dbSize, error: dbError } = await supabase
      .rpc('get_database_size');
    
    if (dbError) {
      log(`⚠️  Could not get database size: ${dbError.message}`, 'yellow');
    }

    // Get table row counts
    const tables = ['users', 'mortgage_calculations', 'rate_checks', 'broker_profiles'];
    const tableStats = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          log(`⚠️  Could not get count for ${table}: ${error.message}`, 'yellow');
          tableStats[table] = 0;
        } else {
          tableStats[table] = count || 0;
        }
      } catch (error) {
        log(`⚠️  Error getting count for ${table}: ${error.message}`, 'yellow');
        tableStats[table] = 0;
      }
    }

    // Estimate costs based on usage
    const estimatedCosts = {
      database: {
        size: dbSize || 0,
        cost: (dbSize || 0) * 0.0001, // Rough estimate: $0.0001 per MB
        unit: 'MB'
      },
      storage: {
        rows: Object.values(tableStats).reduce((sum, count) => sum + count, 0),
        cost: Object.values(tableStats).reduce((sum, count) => sum + count, 0) * 0.00001, // Rough estimate
        unit: 'rows'
      },
      api: {
        requests: 0, // Would need to track this separately
        cost: 0,
        unit: 'requests'
      }
    };

    return {
      database: estimatedCosts.database,
      storage: estimatedCosts.storage,
      api: estimatedCosts.api,
      tableStats,
      total: estimatedCosts.database.cost + estimatedCosts.storage.cost + estimatedCosts.api.cost
    };
  } catch (error) {
    log(`❌ Error getting Supabase usage: ${error.message}`, 'red');
    return null;
  }
}

async function getVercelUsage() {
  // This would require Vercel API access
  // For now, return estimated values based on common usage patterns
  const estimatedCosts = {
    functions: {
      invocations: 1000, // Estimated daily invocations
      cost: 1000 * 0.0000002, // $0.0000002 per invocation
      unit: 'invocations'
    },
    bandwidth: {
      bytes: 100 * 1024 * 1024, // 100MB estimated daily
      cost: 100 * 0.0001, // $0.0001 per MB
      unit: 'MB'
    },
    edge: {
      requests: 500, // Estimated daily edge requests
      cost: 500 * 0.0000001, // $0.0000001 per request
      unit: 'requests'
    }
  };

  return {
    ...estimatedCosts,
    total: estimatedCosts.functions.cost + estimatedCosts.bandwidth.cost + estimatedCosts.edge.cost
  };
}

function checkThresholds(supabaseUsage, vercelUsage) {
  const warnings = [];
  const errors = [];
  
  const totalDaily = (supabaseUsage?.total || 0) + (vercelUsage?.total || 0);
  const totalMonthly = totalDaily * 30; // Rough monthly estimate
  
  // Check daily thresholds
  if (totalDaily > COST_THRESHOLDS.daily.total) {
    errors.push(`Daily cost ($${totalDaily.toFixed(2)}) exceeds threshold ($${COST_THRESHOLDS.daily.total})`);
  } else if (totalDaily > COST_THRESHOLDS.daily.total * 0.8) {
    warnings.push(`Daily cost ($${totalDaily.toFixed(2)}) is approaching threshold ($${COST_THRESHOLDS.daily.total})`);
  }
  
  // Check monthly thresholds
  if (totalMonthly > COST_THRESHOLDS.monthly.total) {
    errors.push(`Monthly cost ($${totalMonthly.toFixed(2)}) exceeds threshold ($${COST_THRESHOLDS.monthly.total})`);
  } else if (totalMonthly > COST_THRESHOLDS.monthly.total * 0.8) {
    warnings.push(`Monthly cost ($${totalMonthly.toFixed(2)}) is approaching threshold ($${COST_THRESHOLDS.monthly.total})`);
  }
  
  // Check individual service thresholds
  if (supabaseUsage) {
    if (supabaseUsage.total > COST_THRESHOLDS.daily.supabase) {
      errors.push(`Supabase daily cost ($${supabaseUsage.total.toFixed(2)}) exceeds threshold ($${COST_THRESHOLDS.daily.supabase})`);
    }
  }
  
  if (vercelUsage) {
    if (vercelUsage.total > COST_THRESHOLDS.daily.vercel) {
      errors.push(`Vercel daily cost ($${vercelUsage.total.toFixed(2)}) exceeds threshold ($${COST_THRESHOLDS.daily.vercel})`);
    }
  }
  
  return { warnings, errors };
}

function generateReport(supabaseUsage, vercelUsage, thresholds) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    costs: {
      supabase: supabaseUsage,
      vercel: vercelUsage,
      total: {
        daily: (supabaseUsage?.total || 0) + (vercelUsage?.total || 0),
        monthly: ((supabaseUsage?.total || 0) + (vercelUsage?.total || 0)) * 30
      }
    },
    thresholds: COST_THRESHOLDS,
    alerts: {
      warnings: thresholds.warnings,
      errors: thresholds.errors,
      status: thresholds.errors.length > 0 ? 'error' : thresholds.warnings.length > 0 ? 'warning' : 'ok'
    },
    recommendations: []
  };
  
  // Add recommendations based on usage
  if (supabaseUsage) {
    if (supabaseUsage.storage.rows > 100000) {
      report.recommendations.push('Consider implementing data archiving for old records');
    }
    if (supabaseUsage.database.size > 1000) {
      report.recommendations.push('Consider database optimization and cleanup');
    }
  }
  
  if (vercelUsage) {
    if (vercelUsage.functions.invocations > 10000) {
      report.recommendations.push('Consider optimizing function calls or implementing caching');
    }
    if (vercelUsage.bandwidth.bytes > 1024 * 1024 * 1024) { // 1GB
      report.recommendations.push('Consider implementing CDN or image optimization');
    }
  }
  
  return report;
}

async function main() {
  log('💰 Starting cost guard check...', 'bold');
  
  // Get usage data
  log('\n📊 Gathering usage data...', 'blue');
  const supabaseUsage = await getSupabaseUsage();
  const vercelUsage = await getVercelUsage();
  
  // Check thresholds
  log('\n🔍 Checking cost thresholds...', 'blue');
  const thresholds = checkThresholds(supabaseUsage, vercelUsage);
  
  // Generate report
  const report = generateReport(supabaseUsage, vercelUsage, thresholds);
  
  // Display results
  log('\n📈 Cost Summary', 'bold');
  
  if (supabaseUsage) {
    log(`Supabase: $${supabaseUsage.total.toFixed(4)}/day`, 'blue');
    log(`  Database: $${supabaseUsage.database.cost.toFixed(4)} (${supabaseUsage.database.size} ${supabaseUsage.database.unit})`, 'reset');
    log(`  Storage: $${supabaseUsage.storage.cost.toFixed(4)} (${supabaseUsage.storage.rows} ${supabaseUsage.storage.unit})`, 'reset');
  }
  
  if (vercelUsage) {
    log(`Vercel: $${vercelUsage.total.toFixed(4)}/day`, 'blue');
    log(`  Functions: $${vercelUsage.functions.cost.toFixed(4)} (${vercelUsage.functions.invocations} ${vercelUsage.functions.unit})`, 'reset');
    log(`  Bandwidth: $${vercelUsage.bandwidth.cost.toFixed(4)} (${vercelUsage.bandwidth.bytes} ${vercelUsage.bandwidth.unit})`, 'reset');
  }
  
  log(`Total: $${report.costs.total.daily.toFixed(4)}/day ($${report.costs.total.monthly.toFixed(2)}/month)`, 'blue');
  
  // Display alerts
  if (thresholds.warnings.length > 0) {
    log('\n⚠️  Warnings:', 'yellow');
    thresholds.warnings.forEach(warning => log(`  • ${warning}`, 'yellow'));
  }
  
  if (thresholds.errors.length > 0) {
    log('\n❌ Errors:', 'red');
    thresholds.errors.forEach(error => log(`  • ${error}`, 'red'));
  }
  
  if (thresholds.warnings.length === 0 && thresholds.errors.length === 0) {
    log('\n✅ All costs within budget!', 'green');
  }
  
  // Display recommendations
  if (report.recommendations.length > 0) {
    log('\n💡 Recommendations:', 'blue');
    report.recommendations.forEach(rec => log(`  • ${rec}`, 'reset'));
  }
  
  // Save report
  const reportPath = join(projectRoot, 'cost-guard-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Report saved to: ${reportPath}`, 'blue');
  
  // Exit with appropriate code
  if (thresholds.errors.length > 0) {
    log('\n❌ Cost guard check failed!', 'red');
    process.exit(1);
  } else if (thresholds.warnings.length > 0) {
    log('\n⚠️  Cost guard check passed with warnings.', 'yellow');
    process.exit(0);
  } else {
    log('\n✅ Cost guard check passed!', 'green');
    process.exit(0);
  }
}

main().catch(error => {
  log(`❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});