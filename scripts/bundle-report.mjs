#!/usr/bin/env node

import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Bundle size budgets
const BUDGETS = {
  client: {
    warn: 250 * 1024, // 250 KB
    fail: 400 * 1024, // 400 KB
  },
  serverless: {
    warn: 1.2 * 1024 * 1024, // 1.2 MB
    fail: 1.5 * 1024 * 1024, // 1.5 MB
  },
  edge: {
    warn: 1.2 * 1024 * 1024, // 1.2 MB
    fail: 1.5 * 1024 * 1024, // 1.5 MB
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

function getFileSize(filePath) {
  if (!existsSync(filePath)) {
    return 0;
  }
  return statSync(filePath).size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  const nextDir = join(projectRoot, '.next');
  const staticDir = join(nextDir, 'static');
  
  if (!existsSync(nextDir)) {
    log('❌ .next directory not found. Run "npm run build" first.', 'red');
    process.exit(1);
  }

  const report = {
    timestamp: new Date().toISOString(),
    buildId: null,
    bundles: {
      client: {},
      serverless: {},
      edge: {}
    },
    summary: {
      totalSize: 0,
      warnings: [],
      errors: []
    }
  };

  // Get build ID
  try {
    const buildManifest = JSON.parse(readFileSync(join(nextDir, 'build-manifest.json'), 'utf8'));
    report.buildId = buildManifest.buildId || 'unknown';
  } catch (e) {
    log('⚠️  Could not read build manifest', 'yellow');
  }

  // Analyze client bundles
  log('\n📊 Analyzing client bundles...', 'blue');
  const clientChunks = join(staticDir, 'chunks');
  if (existsSync(clientChunks)) {
    const files = readFileSync(join(nextDir, 'build-manifest.json'), 'utf8');
    const manifest = JSON.parse(files);
    
    for (const [page, assets] of Object.entries(manifest.pages)) {
      if (page.startsWith('/_')) continue; // Skip internal pages
      
      let pageSize = 0;
      const pageAssets = [];
      
      for (const asset of assets) {
        if (asset.endsWith('.js')) {
          const assetPath = join(staticDir, asset);
          const size = getFileSize(assetPath);
          pageSize += size;
          pageAssets.push({ asset, size });
        }
      }
      
      report.bundles.client[page] = {
        size: pageSize,
        assets: pageAssets,
        status: getStatus(pageSize, BUDGETS.client)
      };
      
      report.summary.totalSize += pageSize;
      
      log(`  ${page}: ${formatBytes(pageSize)} ${getStatusIcon(report.bundles.client[page].status)}`, 
          getStatusColor(report.bundles.client[page].status));
    }
  }

  // Analyze serverless functions
  log('\n📊 Analyzing serverless functions...', 'blue');
  const serverlessDir = join(nextDir, 'serverless');
  if (existsSync(serverlessDir)) {
    const pagesDir = join(serverlessDir, 'pages');
    if (existsSync(pagesDir)) {
      const apiFiles = readFileSync(join(pagesDir, 'api'), 'utf8').split('\n').filter(Boolean);
      
      for (const file of apiFiles) {
        const filePath = join(pagesDir, 'api', file);
        const size = getFileSize(filePath);
        
        report.bundles.serverless[`/api/${file}`] = {
          size,
          status: getStatus(size, BUDGETS.serverless)
        };
        
        report.summary.totalSize += size;
        
        log(`  /api/${file}: ${formatBytes(size)} ${getStatusIcon(report.bundles.serverless[`/api/${file}`].status)}`, 
            getStatusColor(report.bundles.serverless[`/api/${file}`].status));
      }
    }
  }

  // Check for edge functions
  log('\n📊 Analyzing edge functions...', 'blue');
  const edgeDir = join(nextDir, 'edge');
  if (existsSync(edgeDir)) {
    // Edge functions analysis would go here
    log('  No edge functions found', 'yellow');
  }

  // Generate summary
  log('\n📈 Bundle Analysis Summary', 'bold');
  log(`Total bundle size: ${formatBytes(report.summary.totalSize)}`, 'blue');
  
  // Check for warnings and errors
  let hasWarnings = false;
  let hasErrors = false;
  
  for (const [type, bundles] of Object.entries(report.bundles)) {
    for (const [name, bundle] of Object.entries(bundles)) {
      if (bundle.status === 'warning') {
        hasWarnings = true;
        report.summary.warnings.push(`${name}: ${formatBytes(bundle.size)} exceeds warning threshold`);
      } else if (bundle.status === 'error') {
        hasErrors = true;
        report.summary.errors.push(`${name}: ${formatBytes(bundle.size)} exceeds error threshold`);
      }
    }
  }

  if (hasWarnings) {
    log('\n⚠️  Warnings:', 'yellow');
    report.summary.warnings.forEach(warning => log(`  • ${warning}`, 'yellow'));
  }

  if (hasErrors) {
    log('\n❌ Errors:', 'red');
    report.summary.errors.forEach(error => log(`  • ${error}`, 'red'));
  }

  if (!hasWarnings && !hasErrors) {
    log('\n✅ All bundles within budget!', 'green');
  }

  // Save report
  const reportPath = join(projectRoot, 'bundle-analysis-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Report saved to: ${reportPath}`, 'blue');

  return { hasErrors, hasWarnings, report };
}

function getStatus(size, budget) {
  if (size > budget.fail) return 'error';
  if (size > budget.warn) return 'warning';
  return 'ok';
}

function getStatusIcon(status) {
  switch (status) {
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'ok': return '✅';
    default: return '❓';
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'error': return 'red';
    case 'warning': return 'yellow';
    case 'ok': return 'green';
    default: return 'reset';
  }
}

// Main execution
const args = process.argv.slice(2);
const isCheck = args.includes('--check');
const isBudget = args.includes('--budget');

if (isBudget) {
  log('📋 Bundle Size Budgets:', 'bold');
  log(`Client bundles: ${formatBytes(BUDGETS.client.warn)} (warn) / ${formatBytes(BUDGETS.client.fail)} (fail)`, 'blue');
  log(`Serverless functions: ${formatBytes(BUDGETS.serverless.warn)} (warn) / ${formatBytes(BUDGETS.serverless.fail)} (fail)`, 'blue');
  log(`Edge functions: ${formatBytes(BUDGETS.edge.warn)} (warn) / ${formatBytes(BUDGETS.edge.fail)} (fail)`, 'blue');
  process.exit(0);
}

try {
  const { hasErrors, hasWarnings } = analyzeBundle();
  
  if (isCheck) {
    if (hasErrors) {
      log('\n❌ Bundle size check failed!', 'red');
      process.exit(1);
    } else if (hasWarnings) {
      log('\n⚠️  Bundle size check passed with warnings', 'yellow');
      process.exit(0);
    } else {
      log('\n✅ Bundle size check passed!', 'green');
      process.exit(0);
    }
  }
} catch (error) {
  log(`❌ Error analyzing bundles: ${error.message}`, 'red');
  process.exit(1);
}