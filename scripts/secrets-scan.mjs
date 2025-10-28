#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Secret patterns to detect
const SECRET_PATTERNS = [
  // API Keys
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{48}/g, severity: 'high' },
  { name: 'Supabase Service Role Key', pattern: /eyJ[a-zA-Z0-9_-]{100,}/g, severity: 'critical' },
  { name: 'Stripe Secret Key', pattern: /sk_(test_|live_)[a-zA-Z0-9]{24,}/g, severity: 'high' },
  { name: 'Stripe Webhook Secret', pattern: /whsec_[a-zA-Z0-9]{32,}/g, severity: 'high' },
  { name: 'Twilio Auth Token', pattern: /[a-f0-9]{32}/g, severity: 'high' },
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'high' },
  { name: 'AWS Secret Key', pattern: /[a-zA-Z0-9/+=]{40}/g, severity: 'high' },
  { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/g, severity: 'high' },
  { name: 'GitHub App Token', pattern: /ghs_[a-zA-Z0-9]{36}/g, severity: 'high' },
  { name: 'JWT Secret', pattern: /[a-zA-Z0-9]{32,}/g, severity: 'medium' },
  
  // Database URLs
  { name: 'Database URL', pattern: /(postgresql|mysql|mongodb):\/\/[^\s'"]+/g, severity: 'high' },
  { name: 'Redis URL', pattern: /redis:\/\/[^\s'"]+/g, severity: 'medium' },
  
  // Generic patterns
  { name: 'Generic API Key', pattern: /[a-zA-Z0-9]{32,}/g, severity: 'low' },
  { name: 'Email Password', pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: 'medium' },
];

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,
  /\.env\.example/,
  /bundle-analysis-report\.json/,
  /test-results\.json/,
  /\.DS_Store/,
  /Thumbs\.db/,
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx', '.json', '.md', '.yml', '.yaml', '.env'];

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

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function shouldScanFile(filePath) {
  const ext = extname(filePath);
  return SCAN_EXTENSIONS.includes(ext) || ext === '';
}

function scanFile(filePath) {
  const findings = [];
  
  try {
    const content = readFileSync(filePath, 'utf8');
    
    for (const { name, pattern, severity } of SECRET_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Skip if it's in a comment or string literal that looks like documentation
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(match)) {
              const line = lines[i].trim();
              // Skip documentation examples
              if (line.startsWith('//') || line.startsWith('*') || line.startsWith('#')) {
                continue;
              }
              
              findings.push({
                file: filePath,
                line: i + 1,
                secret: match,
                type: name,
                severity,
                context: line.substring(0, 100)
              });
            }
          }
        }
      }
    }
  } catch (error) {
    // Skip files that can't be read as text
  }
  
  return findings;
}

function scanDirectory(dirPath) {
  const findings = [];
  
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      if (shouldExcludeFile(fullPath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        findings.push(...scanDirectory(fullPath));
      } else if (entry.isFile() && shouldScanFile(fullPath)) {
        findings.push(...scanFile(fullPath));
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
  
  return findings;
}

function checkGitHistory() {
  log('\n🔍 Checking git history for secrets...', 'blue');
  
  try {
    // Check for secrets in git history
    const gitLog = execSync('git log --all --full-history -- .', { 
      cwd: projectRoot, 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    const findings = [];
    for (const { name, pattern, severity } of SECRET_PATTERNS) {
      const matches = gitLog.match(pattern);
      if (matches) {
        for (const match of matches) {
          findings.push({
            file: 'git-history',
            line: 0,
            secret: match,
            type: name,
            severity,
            context: 'Found in git history'
          });
        }
      }
    }
    
    return findings;
  } catch (error) {
    log('⚠️  Could not check git history', 'yellow');
    return [];
  }
}

function checkEnvironmentFiles() {
  log('\n🔍 Checking environment files...', 'blue');
  
  const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.env.test'
  ];
  
  const findings = [];
  
  for (const envFile of envFiles) {
    const filePath = join(projectRoot, envFile);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split('=');
          if (value && value.length > 8) {
            // Check if it looks like a secret
            for (const { name, pattern, severity } of SECRET_PATTERNS) {
              if (pattern.test(value)) {
                findings.push({
                  file: envFile,
                  line: i + 1,
                  secret: value,
                  type: name,
                  severity,
                  context: line
                });
              }
            }
          }
        }
      }
    }
  }
  
  return findings;
}

function generateReport(findings) {
  const report = {
    timestamp: new Date().toISOString(),
    totalFindings: findings.length,
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
    findings: findings
  };
  
  return report;
}

function main() {
  log('🔐 Starting secrets scan...', 'bold');
  
  const allFindings = [];
  
  // Scan current files
  log('\n📁 Scanning current files...', 'blue');
  allFindings.push(...scanDirectory(projectRoot));
  
  // Check git history
  allFindings.push(...checkGitHistory());
  
  // Check environment files
  allFindings.push(...checkEnvironmentFiles());
  
  // Generate report
  const report = generateReport(allFindings);
  
  // Display results
  log('\n📊 Secrets Scan Results', 'bold');
  log(`Total findings: ${report.totalFindings}`, 'blue');
  log(`Critical: ${report.critical}`, report.critical > 0 ? 'red' : 'green');
  log(`High: ${report.high}`, report.high > 0 ? 'red' : 'green');
  log(`Medium: ${report.medium}`, report.medium > 0 ? 'yellow' : 'green');
  log(`Low: ${report.low}`, report.low > 0 ? 'yellow' : 'green');
  
  if (report.totalFindings > 0) {
    log('\n🚨 Findings:', 'red');
    
    // Group by severity
    const bySeverity = {
      critical: findings.filter(f => f.severity === 'critical'),
      high: findings.filter(f => f.severity === 'high'),
      medium: findings.filter(f => f.severity === 'medium'),
      low: findings.filter(f => f.severity === 'low')
    };
    
    for (const [severity, findings] of Object.entries(bySeverity)) {
      if (findings.length > 0) {
        log(`\n${severity.toUpperCase()}:`, colors[severity === 'critical' ? 'red' : severity === 'high' ? 'red' : 'yellow']);
        findings.forEach(finding => {
          log(`  • ${finding.type} in ${finding.file}:${finding.line}`, colors[severity === 'critical' ? 'red' : severity === 'high' ? 'red' : 'yellow']);
          log(`    ${finding.context}`, 'reset');
        });
      }
    }
  } else {
    log('\n✅ No secrets found!', 'green');
  }
  
  // Save report
  const reportPath = join(projectRoot, 'secrets-scan-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Report saved to: ${reportPath}`, 'blue');
  
  // Exit with error code if critical or high severity findings
  if (report.critical > 0 || report.high > 0) {
    log('\n❌ Secrets scan failed! Critical or high severity findings detected.', 'red');
    process.exit(1);
  } else if (report.medium > 0 || report.low > 0) {
    log('\n⚠️  Secrets scan passed with warnings.', 'yellow');
    process.exit(0);
  } else {
    log('\n✅ Secrets scan passed!', 'green');
    process.exit(0);
  }
}

// Import writeFileSync
import { writeFileSync } from 'fs';

main();